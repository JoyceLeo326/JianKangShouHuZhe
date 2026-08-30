const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function configuredWindowsTargets(build) {
  const targets = build && build.win && build.win.target;
  return (Array.isArray(targets) ? targets : [targets])
    .filter(Boolean)
    .flatMap((target) => (typeof target === 'string' ? [target] : [target.target]))
    .filter(Boolean);
}

test('desktop release declares the formal Windows x64 products', () => {
  assert.equal(packageJson.version, '1.1.0');
  assert.equal(packageJson.devDependencies?.electron?.length > 0, true, 'electron must be pinned as a development dependency');
  assert.equal(packageJson.devDependencies?.['electron-builder']?.length > 0, true, 'electron-builder must be pinned as a development dependency');
  assert.match(packageJson.scripts?.['build:desktop:web'] || '', /expo export --platform web/);
  assert.match(packageJson.scripts?.['build:desktop:win'] || '', /electron-builder/);
  assert.match(packageJson.scripts?.['build:desktop:win'] || '', /ensure-electron-runtime\.js/);
  assert.match(packageJson.scripts?.['test:desktop'] || '', /windows-release\.test\.js/);
  assert.equal(packageJson.build?.appId, 'com.joyceleo.healthguardian.desktop');
  assert.equal(packageJson.build?.productName, '健康守护者');
  assert.equal(packageJson.build?.electronDist, 'node_modules/electron/dist');
  assert.equal(packageJson.build?.extraMetadata?.main, 'desktop/main.cjs');
  assert.equal(packageJson.build?.directories?.output, 'dist/windows');
  assert.equal(packageJson.build?.win?.executableName, 'HealthGuardian');
  assert.equal(packageJson.build?.win?.icon, 'assets/icon.png');
  assert.deepEqual(new Set(configuredWindowsTargets(packageJson.build)), new Set(['portable', 'zip']));
  assert.equal(packageJson.build?.asar, true);
  assert.equal(packageJson.build?.artifactName, 'HealthGuardian-${version}-Windows-${arch}.${ext}');
});

test('desktop main process enforces isolation, a single instance, and safe external navigation', () => {
  const mainPath = path.join(root, 'desktop', 'main.cjs');
  assert.equal(fs.existsSync(mainPath), true, 'desktop/main.cjs must exist');
  const source = fs.readFileSync(mainPath, 'utf8');

  assert.match(source, /requestSingleInstanceLock\s*\(/);
  assert.match(source, /new BrowserWindow\s*\(/);
  assert.match(source, /contextIsolation\s*:\s*true/);
  assert.match(source, /nodeIntegration\s*:\s*false/);
  assert.match(source, /sandbox\s*:\s*true/);
  assert.match(source, /webSecurity\s*:\s*true/);
  assert.match(source, /allowRunningInsecureContent\s*:\s*false/);
  assert.match(source, /setWindowOpenHandler\s*\(/);
  assert.match(source, /will-navigate/);
  assert.match(source, /shell\.openExternal\s*\(/);
  assert.match(source, /setPermissionRequestHandler\s*\(/);
  assert.doesNotMatch(source, /loadURL\s*\(\s*['"]https?:\/\//, 'the packaged app must not depend on a remote UI');
});

test('desktop shell serves the Expo Web export from a stable local origin and persists app data', () => {
  const mainPath = path.join(root, 'desktop', 'main.cjs');
  assert.equal(fs.existsSync(mainPath), true, 'desktop/main.cjs must exist');
  const source = fs.readFileSync(mainPath, 'utf8');

  assert.match(source, /registerSchemesAsPrivileged/);
  assert.match(source, /protocol\.handle\s*\(/);
  assert.match(source, /healthguardian:\/\/app\/index\.html/);
  assert.match(source, /app\.setPath\s*\(\s*['"]userData['"]/);
  assert.match(source, /HealthGuardian/);
  assert.match(source, /localStorage\.setItem/);
  assert.match(source, /localStorage\.getItem/);
  assert.match(source, /desktop-smoke-write/);
  assert.match(source, /desktop-smoke-read/);
  assert.match(source, /verifyCoreNavigation/);
  assert.match(source, /训练中心/);
  assert.match(source, /数据中心/);
  assert.match(source, /今日守护/);
});
