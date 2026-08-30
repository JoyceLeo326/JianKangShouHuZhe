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
