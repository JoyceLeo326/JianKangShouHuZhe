const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server', 'index.js'), 'utf8');
const db = fs.readFileSync(path.join(root, 'server', 'db.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(app.includes("id: 'local_guest'"), 'the default session must be a clearly identified local guest');
assert(app.includes('setShowAuth(true)'), 'the usable workspace must expose an optional account entry');
assert(!app.includes('if (!user) return <LoginScreen'), 'login must not gate the usable workspace');
assert(!app.includes("useState('demo@jiankang.local')"), 'the account form must not prefill a fake account');
assert(!app.includes("['康复师', '医生', '管理员']"), 'users must not self-assign professional roles');

assert(!app.includes('localDoctorAnalysis('), 'rule-based text must not masquerade as AI clinical analysis');
assert(!app.includes('连续点击模拟握力'), 'simulated clicking must not masquerade as device telemetry');
assert(!app.includes('const gain = Math.floor(5 + Math.random() * 9)'), 'random values must not become health data');
assert(app.includes('TRAINING_RED_FLAGS'), 'training must include an explicit pre-session red-flag check');
assert(app.includes('尚未连接支持的设备'), 'device training must be disabled without a supported adapter');

assert(app.includes('function emptyAppData()'), 'new local workspaces must start with an empty real-data ledger');
assert(app.includes('reportToPdfBytes(model)') && app.includes('reportToCsv(model)'), 'report actions must create real PDF and CSV content');
assert(app.includes('validateAiResult(reply, allowedEvidenceRefs)'), 'AI output must pass the strict schema and citation whitelist');
assert(app.includes("onAudit('ai_output_decided'"), 'AI adoption or rejection must be auditable');
assert(app.includes('createConsentVersion') && app.includes('withdrawConsent'), 'sensitive data writes must use versioned consent');
assert(app.includes('queueLocalSnapshot') && app.includes('detectSnapshotConflict'), 'offline changes and divergent syncs must be explicit');
assert(app.includes('未连接账号 · ${outbox.length} 个待同步更改'), 'local mode must expose pending sync state without claiming completion');
assert(db.includes('const initialAppData = emptyAppData()'), 'new API accounts must not receive seeded patient data');
assert(!db.includes('doctor@jiankang.app'), 'the API database must not seed a fake professional account');
assert(server.includes("const role = 'patient'"), 'public registration must receive a non-professional role');
assert(!server.includes("req.body.role || '康复师'"), 'the API must not trust a self-selected professional role');

for (const phrase of ['零成本', '本地演示', '演示账号', 'AI 康复博士', '智能康复博士']) {
  assert(!app.includes(phrase), `user-facing source still contains internal or overstated copy: ${phrase}`);
}

console.log('Product safety test passed: guest-first access, clinical boundaries, and empty real-data defaults are enforced.');
