const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const siteRoot = path.join(root, 'web-release');
const forbiddenProductWords = /Demo|演示|样例版|原型|预览版/i;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('release site has a formal product root and a complete app entry', () => {
  const html = read('web-release/index.html');

  assert.match(html, /<title>健康守护者/);
  assert.match(html, /href="\/app\/"/);
  assert.match(html, /data-release-target="android"/);
  assert.match(html, /data-release-target="windows"/);
  assert.match(html, /data-install-app/);
  assert.match(html, /不提供诊断/);
  assert.match(html, /不替代专业人员或急救服务/);
  assert.match(html, /数据默认保存在当前设备/);
  assert.doesNotMatch(html, forbiddenProductWords);
});

test('Android release copy promises a direct installed-app workflow', () => {
  const html = read('web-release/index.html');
  const androidCard = html.match(/<article class="download-card" data-release-target="android">([\s\S]*?)<\/article>/)?.[1];
  const readme = read('README.md');
  const releaseReadme = read('web-release/README.md');
  const releaseNotes = read('docs/releases/v1.1.0.md');
  const nextSteps = read('release/README-下一步操作.md');

  assert.match(html, /Android 安装后打开即用/);
  assert.ok(androidCard, 'Android download card is required');
  assert.match(androidCard, /下载签名 APK.*安装后.*桌面图标.*直接进入工作台/);
  assert.doesNotMatch(androidCard, /Demo|演示|样例版|原型|预览版|体验|叙事|画廊|章节|介绍/i);
  for (const [label, content] of [
    ['README', readme],
    ['release site README', releaseReadme],
    ['release notes', releaseNotes],
    ['next steps', nextSteps],
  ]) {
    assert.match(content, /APK/i, `${label} must identify the installable APK`);
    assert.match(content, /安装/, `${label} must explain installation`);
    assert.match(content, /桌面[^。\n]{0,48}图标/, `${label} must explain launcher icon access`);
    assert.match(content, /直接进入工作台/, `${label} must promise a direct tool entry`);
  }
});

test('release site exposes one manifest-driven Android and Windows release source', () => {
  const manifest = JSON.parse(read('web-release/release-manifest.json'));

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.version, '1.1.0');
  for (const platform of ['android', 'windows']) {
    const release = manifest.downloads[platform];
    assert.ok(release, `${platform} release metadata is required`);
    assert.equal(typeof release.fileName, 'string');
    assert.equal(typeof release.primaryUrl, 'string');
    assert.equal(typeof release.fallbackUrl, 'string');
    assert.equal(typeof release.sha256, 'string');
    assert.equal(typeof release.environment.primaryUrl, 'string');
    assert.equal(typeof release.environment.fallbackUrl, 'string');
    assert.equal(typeof release.environment.sha256, 'string');
  }
  assert.match(manifest.downloads.android.primaryUrl, /github\.com\/JoyceLeo326\/JianKangShouHuZhe\/releases\/download\/v1\.1\.0\//);
  assert.match(manifest.downloads.windows.primaryUrl, /github\.com\/JoyceLeo326\/JianKangShouHuZhe\/releases\/download\/v1\.1\.0\//);
  assert.equal(manifest.downloads.android.environment.fallbackUrl, 'HEALTH_ANDROID_FALLBACK_URL');

  const siteScript = read('web-release/site.js');
  assert.match(siteScript, /fetch\(['"]\.\/release-manifest\.json['"]/);
  assert.match(siteScript, /beforeinstallprompt/);
});

test('PWA metadata and offline shell target the full app', () => {
  const manifest = JSON.parse(read('web-release/manifest.webmanifest'));

  assert.equal(manifest.name, '健康守护者');
  assert.equal(manifest.id, '/app/');
  assert.equal(manifest.start_url, '/app/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));

  const workerTemplate = read('web-release/sw-template.js');
  assert.match(workerTemplate, /__CACHE_VERSION__/);
  assert.match(workerTemplate, /__PRECACHE_ASSETS__/);
  assert.match(workerTemplate, /addEventListener\(['"]install['"]/);
  assert.match(workerTemplate, /addEventListener\(['"]fetch['"]/);

  const bootstrap = read('web-release/pwa-bootstrap.js');
  assert.match(bootstrap, /serviceWorker\.register\(['"]\/sw\.js['"]/);
});

test('Netlify and package scripts publish the composed release site', () => {
  const packageJson = JSON.parse(read('package.json'));
  assert.equal(packageJson.scripts['test:release-site'], 'node --test tests/release-site-structure.test.js');
  assert.equal(packageJson.scripts['build:web:release'], 'node scripts/build-release-site.js');
  assert.equal(packageJson.scripts['check:web:release'], 'node scripts/check-release-site.js');

  const netlify = read('netlify.toml');
  assert.match(netlify, /command\s*=\s*"npm run build:web:release"/);
  assert.match(netlify, /publish\s*=\s*"dist\/release-site"/);
  assert.match(netlify, /from\s*=\s*"\/app\/\*"/);
  assert.match(netlify, /to\s*=\s*"\/app\/index\.html"/);
  assert.match(netlify, /status\s*=\s*200/);

  assert.ok(fs.existsSync(path.join(root, 'scripts', 'build-release-site.js')));
  assert.ok(fs.existsSync(path.join(root, 'scripts', 'check-release-site.js')));
  assert.ok(fs.existsSync(siteRoot));
});
