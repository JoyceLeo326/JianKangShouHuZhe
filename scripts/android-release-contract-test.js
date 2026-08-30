const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertAsset(relativePath, label) {
  assert(typeof relativePath === 'string' && relativePath.length > 0, `${label} path is missing`);
  assert(!/(demo|preview|prototype|sample|演示|样例|原型|预览)/i.test(relativePath), `${label} uses a non-production filename`);
  const absolutePath = path.resolve(root, relativePath);
  assert(absolutePath.startsWith(root), `${label} must stay inside the project`);
  assert(fs.existsSync(absolutePath), `${label} does not exist: ${relativePath}`);
  assert(fs.statSync(absolutePath).size > 1024, `${label} is too small to be a production asset`);
}

const packageJson = readJson('package.json');
const appJson = readJson('app.json');
const easJson = readJson('eas.json');
const appSource = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
const expo = appJson.expo || {};
const android = expo.android || {};
const productionApk = easJson.build && easJson.build['production-apk'];

assert(expo.name === '健康守护者', 'Android launcher name must use the formal product identity');
assert(expo.slug === 'jiankang-shouhuzhe', 'Expo slug must use the stable formal product identity');
assert(/^\d+\.\d+\.\d+$/.test(expo.version || ''), 'Expo version must be a stable semantic version');
assert(expo.version === '1.1.0', 'Android formal release version must be 1.1.0');
assert(packageJson.version === expo.version, 'package.json and app.json must expose the same formal version');
assert(Number.isInteger(android.versionCode) && android.versionCode >= 2, 'Android versionCode must advance beyond the legacy first build');
assert(android.package === 'com.joyceleo.jiankangshouhuzhe', 'Android package id must remain stable');
assert(Array.isArray(android.permissions) && android.permissions.length === 0, 'Android release must not request unused permissions');
const blockedPermissions = new Set(android.blockedPermissions || []);
for (const permission of [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
]) {
  assert(blockedPermissions.has(permission), `Android release must block ${permission}`);
}
assertAsset(expo.icon, 'app icon');
assertAsset(expo.splash && expo.splash.image, 'splash image');
assertAsset(android.adaptiveIcon && android.adaptiveIcon.foregroundImage, 'adaptive icon foreground');

assert(productionApk, 'eas.json must define a production-apk profile');
assert(productionApk && productionApk.environment === 'production', 'production-apk must use the EAS production environment');
assert(productionApk && productionApk.android && productionApk.android.buildType === 'apk', 'production-apk must build an installable APK');
assert(productionApk && productionApk.autoIncrement === true, 'production-apk must auto-increment the Android build number');
assert(!productionApk || productionApk.developmentClient !== true, 'production-apk must not enable the development client');
assert(packageJson.scripts && packageJson.scripts['build:android:apk'] === 'eas build -p android --profile production-apk', 'package scripts must expose the formal production APK build');
assert(!packageJson.scripts || !packageJson.scripts['build:android:preview'], 'the retired Android preview build command must not remain a release entry point');
assert(packageJson.scripts && packageJson.scripts['test:android:release'] === 'node scripts/android-release-contract-test.js', 'the Android release contract must be wired into package scripts');

const bannedProductTerms = /(Demo|演示|样例版|原型|预览版)/i;
for (const [index, line] of appSource.split(/\r?\n/).entries()) {
  assert(!bannedProductTerms.test(line), `App.js contains retired product wording at line ${index + 1}`);
}

console.log('Android release contract passed: formal identity, signed APK profile, assets, permissions, and product copy are valid.');
