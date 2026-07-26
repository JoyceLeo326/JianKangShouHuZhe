const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const port = 3100 + Math.floor(Math.random() * 2000);
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jkshz-smoke-'));
const baseUrl = `http://127.0.0.1:${port}`;

function fail(message) {
  throw new Error(message);
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') && text ? JSON.parse(text) : text;
  if (!response.ok) {
    const message = body && body.message ? body.message : `${response.status} ${response.statusText}`;
    fail(`${pathname} failed: ${message}`);
  }
  return body;
}

async function waitForServer(child) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) fail(`server exited with code ${child.exitCode}`);
    try {
      const health = await request('/health');
      if (health.ok) return;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  fail('server did not become healthy in time');
}

async function main() {
  const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  if (appConfig.expo.name !== '健康守护者') fail('app.json name mismatch');
  if (appConfig.expo.android.package !== 'com.jerry.jiankangshouhuzhe') fail('android package mismatch');
  if (!Array.isArray(appConfig.expo.android.permissions) || appConfig.expo.android.permissions.length !== 0) fail('android permissions should stay empty for current build');

  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      JWT_SECRET: 'smoke-test-secret-change-in-production',
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  try {
    await waitForServer(child);

    const primaryEmail = `primary-${Date.now()}@jiankang.app`;
    const primaryRegistration = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: primaryEmail, password: 'Password2026', name: '测试使用者', role: '康复师' }),
    });
    if (primaryRegistration.user.role !== 'patient') fail('public registration granted an unverified professional role');

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: primaryEmail, password: 'Password2026' }),
    });
    if (!login.token || !login.user || !login.appData) fail('login payload incomplete');
    if (login.appData.patients.length || login.appData.devices.length || login.appData.records.length) fail('new database must not seed fictional health data');

    const auth = { Authorization: `Bearer ${login.token}` };
    const me = await request('/api/me', { headers: auth });
    if (me.user.email !== primaryEmail) fail('me endpoint returned wrong user');

    const nextData = {
      ...login.appData,
      patients: [{ id: 'p-check', name: '赵先生', age: '66', diagnosis: '术后康复', side: '右手', stage: '第1周', risk: '低风险', next: '待安排', phone: '' }],
      consents: [{ id: 'consent-check', version: 'privacy-2026-07', status: 'granted' }],
      auditEvents: [{ id: 'audit-check', action: 'patient_created', actorRole: 'patient' }],
      aiRuns: [{ id: 'airun-check', status: 'waiting_for_review' }],
      outbox: [{ id: 'outbox-check', status: 'waiting_for_remote' }],
      syncConflicts: [{ id: 'conflict-check', status: 'needs_review' }],
    };
    await request('/api/app-data', {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ appData: nextData }),
    });
    const saved = await request('/api/app-data', { headers: auth });
    if (saved.appData.patients[0].name !== '赵先生') fail('app data persistence failed');
    for (const field of ['consents', 'auditEvents', 'aiRuns', 'outbox', 'syncConflicts']) {
      if (!Array.isArray(saved.appData[field]) || saved.appData[field].length !== 1) fail(`${field} persistence failed`);
    }

    const patched = await request('/api/me', {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ name: '测试医生', role: '康复师' }),
    });
    if (patched.user.name !== '测试医生') fail('profile update failed');
    if (patched.user.role !== 'patient') fail('profile update must not allow self-assigned professional roles');

    const email = `smoke-${Date.now()}@jiankang.app`;
    const registered = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'Password2026', name: '注册测试', role: '医生' }),
    });
    if (registered.user.email !== email) fail('register endpoint failed');
    if (registered.user.role !== 'patient') fail('public registration must not grant a professional role');
    if (registered.appData.patients.length || registered.appData.devices.length || registered.appData.records.length) fail('registered account must start with an empty health-data ledger');
    await request('/api/account', { method: 'DELETE', headers: { Authorization: `Bearer ${registered.token}` } });

    const privacy = await request('/privacy', { headers: { Accept: 'text/html' } });
    if (!String(privacy).includes('健康守护者隐私政策')) fail('privacy page missing expected title');

    console.log('Smoke test passed: API, persistence, account deletion, legal pages, and app config are valid.');
  } finally {
    child.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
    if (child.exitCode !== null && child.exitCode !== 0 && stderr) {
      process.stderr.write(stderr);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
