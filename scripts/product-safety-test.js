const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server', 'index.js'), 'utf8');
const db = fs.readFileSync(path.join(root, 'server', 'db.js'), 'utf8');
const recoveryDomain = fs.readFileSync(path.join(root, 'src', 'domain', 'recovery-journey.js'), 'utf8');
const recoveryStoryDir = path.join(root, 'assets', 'recovery-story');
const recoveryWebCheck = fs.readFileSync(path.join(root, 'scripts', 'recovery-journey-web-check.js'), 'utf8');
const trackedPublicFiles = require('child_process')
  .execFileSync('git', ['ls-files', '-z'], { cwd: root })
  .toString('utf8')
  .split('\0')
  .filter(Boolean);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const retiredIdentityTerms = [
  ['Jer', 'ry'].join(''),
  ['Jia', 'rui'].join(''),
  ['Liu', ' ', 'Jia', 'rui'].join(''),
  ['Liu', 'jia', 'rui'].join(''),
  ['刘', '佳', '瑞'].join(''),
  ['劉', '佳', '瑞'].join(''),
];
for (const relativePath of trackedPublicFiles) {
  const filePath = path.join(root, relativePath);
  const content = fs.readFileSync(filePath);
  if (content.includes(0)) continue;
  const publicText = content.toString('utf8').toLocaleLowerCase('en-US');
  assert(
    retiredIdentityTerms.every((term) => !publicText.includes(term.toLocaleLowerCase('en-US'))),
    `tracked public file exposes a retired creator name: ${relativePath}`,
  );
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

for (const contract of [
  'function RecoveryJourneyCard',
  'evaluateRecoverySituation',
  'buildRecoveryHandoff',
  'recoveryHandoffToText',
  '今天想完成什么',
  '当前疼痛（0-10）',
  '已批准处方',
  '风险与冲突',
  '人工确认这个选择',
  '导出今日交接单',
  '完成后的真实感受',
  '反馈已进入下一次复盘',
  'Storage.getItem(RECOVERY_FEEDBACK_KEY)',
  '上次反馈会改变本次建议优先级',
  '为什么优先',
  '收益：',
  '权衡：',
]) {
  assert(app.includes(contract), `the recovery journey is missing: ${contract}`);
}

assert(app.includes('minHeight: 44'), 'interactive recovery controls must keep a 44px mobile touch target');
for (const contract of [
  'function FocusableTouchableOpacity',
  'styles.keyboardFocus',
  '登录或注册健康守护者账号',
  '记录今日康复打卡',
  '查看来源：${k.sourceLabel}',
  "height: 44",
  'minWidth: 44, minHeight: 44',
]) {
  assert(app.includes(contract), `the compact mobile accessibility repair is missing: ${contract}`);
}
for (const contract of ['interactiveSelector', 'repairedControlLabels', 'inspectKeyboardAccess', 'layout.unnamed', 'layout.navigationCount === 5']) {
  assert(recoveryWebCheck.includes(contract), `the broad mobile interaction gate is missing: ${contract}`);
}
for (const contract of ["name: 'desktop'", 'width: 1440', 'height: 900']) {
  assert(recoveryWebCheck.includes(contract), `the desktop recovery journey gate is missing: ${contract}`);
}

const recoveryStoryFiles = fs.readdirSync(recoveryStoryDir).filter((name) => name.endsWith('.webp')).sort();
assert(recoveryStoryFiles.length === 24, `the recovery story must contain exactly 24 WebP scenes, found ${recoveryStoryFiles.length}`);
const storyHashes = recoveryStoryFiles.map((name) => crypto.createHash('sha256').update(fs.readFileSync(path.join(recoveryStoryDir, name))).digest('hex'));
assert(new Set(storyHashes).size === 24, 'every recovery story scene must be an independent image');
for (const [index, name] of recoveryStoryFiles.entries()) {
  assert(name.startsWith(String(index + 1).padStart(2, '0')), `recovery story scene numbering is incomplete at ${name}`);
  assert(app.includes(`./assets/recovery-story/${name}`), `the recovery UI does not reference scene: ${name}`);
}
for (const contract of [
  'function RecoveryStoryGallery',
  'activeStoryIndex',
  'setActiveStoryIndex',
  'recoveryStoryImageLoaded',
  'onLoadStart',
  'onLoad',
]) {
  assert(app.includes(contract), `the state-bound lazy recovery story is missing: ${contract}`);
}

for (const phrase of ['无需登录', '无需注册', '零成本', '本地演示', '演示账号', 'AI 康复博士', '智能康复博士']) {
  for (const [sourceName, source] of [['App.js', app], ['src/domain/recovery-journey.js', recoveryDomain]]) {
    assert(!source.includes(phrase), `${sourceName} still contains internal or overstated copy: ${phrase}`);
  }
}

console.log('Product safety test passed: guest-first access, clinical boundaries, and empty real-data defaults are enforced.');
