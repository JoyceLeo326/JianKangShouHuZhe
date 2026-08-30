const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'web-release');
const outputRoot = path.join(root, 'dist', 'release-site');
const appOutput = path.join(outputRoot, 'app');
const expoCli = path.join(root, 'node_modules', 'expo', 'bin', 'cli');

function assertInside(parent, target) {
  const relative = path.relative(path.resolve(parent), path.resolve(target));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing unsafe path outside ${parent}: ${target}`);
  }
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveReleaseManifest() {
  const manifest = readJson(path.join(sourceRoot, 'release-manifest.json'));
  for (const [platform, download] of Object.entries(manifest.downloads)) {
    for (const field of ['primaryUrl', 'fallbackUrl', 'sha256']) {
      const environmentName = download.environment?.[field];
      const environmentValue = environmentName ? process.env[environmentName]?.trim() : '';
      if (environmentValue) download[field] = environmentValue;
    }
    for (const urlField of ['primaryUrl', 'fallbackUrl']) {
      const value = download[urlField];
      if (value && !/^https:\/\//i.test(value) && !value.startsWith('/')) {
        throw new Error(`${platform}.${urlField} must be an HTTPS or root-relative URL.`);
      }
    }
    if (download.sha256 && !/^[a-f\d]{64}$/i.test(download.sha256)) {
      throw new Error(`${platform}.sha256 must contain exactly 64 hexadecimal characters.`);
    }
  }
  return manifest;
}

function resizePng(source, destination, size) {
  const input = PNG.sync.read(fs.readFileSync(source));
  const output = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y += 1) {
    const sourceY = Math.min(input.height - 1, Math.floor((y / size) * input.height));
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.min(input.width - 1, Math.floor((x / size) * input.width));
      const sourceOffset = (sourceY * input.width + sourceX) * 4;
      const outputOffset = (y * size + x) * 4;
      input.data.copy(output.data, outputOffset, sourceOffset, sourceOffset + 4);
    }
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, PNG.sync.write(output));
}

function exportExpoApp() {
  if (!fs.existsSync(expoCli)) {
    throw new Error('Expo CLI is missing. Run npm ci before building the release site.');
  }
  const result = spawnSync(
    process.execPath,
    [expoCli, 'export', '--platform', 'web', '--output-dir', appOutput],
    {
      cwd: root,
      env: { ...process.env, CI: '1', EXPO_BASE_URL: '/app' },
      stdio: 'inherit',
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Expo web export failed with exit code ${result.status}.`);
}

function patchAppShell() {
  const indexPath = path.join(appOutput, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8')
    .replaceAll('href="/favicon.ico"', 'href="/app/favicon.ico"')
    .replaceAll('src="/_expo/', 'src="/app/_expo/')
    .replaceAll('href="/_expo/', 'href="/app/_expo/');
  if (!html.includes('/manifest.webmanifest')) {
    html = html.replace(
      '</head>',
      '  <meta name="theme-color" content="#08745f" />\n'
        + '  <link rel="manifest" href="/manifest.webmanifest" />\n'
        + '  <link rel="apple-touch-icon" href="/assets/pwa-icon-192.png" />\n'
        + '</head>',
    );
  }
  if (!html.includes('/pwa-bootstrap.js')) {
    html = html.replace('</body>', '  <script src="/pwa-bootstrap.js" defer></script>\n</body>');
  }
  fs.writeFileSync(indexPath, html, 'utf8');

  const bundleRoot = path.join(appOutput, '_expo', 'static', 'js', 'web');
  if (fs.existsSync(bundleRoot)) {
    for (const bundlePath of walkFiles(bundleRoot).filter((file) => file.endsWith('.js'))) {
      const bundle = fs.readFileSync(bundlePath, 'utf8')
        .replace(/(["'])\/assets\//g, '$1/app/assets/')
        .replace(/(["'])\/_expo\//g, '$1/app/_expo/');
      fs.writeFileSync(bundlePath, bundle, 'utf8');
    }
  }
}

function walkFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

function isPublicPrecacheAsset(file) {
  const relative = path.relative(outputRoot, file).split(path.sep).join('/');
  return !file.endsWith('.map')
    && relative !== 'sw.js'
    && relative !== '.nojekyll'
    && relative !== '_redirects';
}

function generateServiceWorker(version) {
  const cacheableFiles = walkFiles(outputRoot)
    .filter(isPublicPrecacheAsset)
    .map((file) => `/${path.relative(outputRoot, file).split(path.sep).join('/')}`)
    .sort();
  const precache = Array.from(new Set(['/', '/app/', ...cacheableFiles]));
  const contentHash = crypto.createHash('sha256');
  for (const relativeUrl of precache) contentHash.update(relativeUrl);
  const cacheVersion = `${version}-${contentHash.digest('hex').slice(0, 12)}`;
  const template = fs.readFileSync(path.join(sourceRoot, 'sw-template.js'), 'utf8');
  const worker = template
    .replaceAll('__CACHE_VERSION__', cacheVersion)
    .replace('__PRECACHE_ASSETS__', JSON.stringify(precache, null, 2));
  fs.writeFileSync(path.join(outputRoot, 'sw.js'), worker, 'utf8');
}

function copyProductSite(manifest) {
  copyFile(path.join(sourceRoot, 'index.html'), path.join(outputRoot, 'index.html'));
  copyFile(path.join(sourceRoot, 'site.css'), path.join(outputRoot, 'assets', 'site.css'));
  copyFile(path.join(sourceRoot, 'site.js'), path.join(outputRoot, 'assets', 'site.js'));
  copyFile(path.join(sourceRoot, 'manifest.webmanifest'), path.join(outputRoot, 'manifest.webmanifest'));
  copyFile(path.join(sourceRoot, 'pwa-bootstrap.js'), path.join(outputRoot, 'pwa-bootstrap.js'));
  copyFile(path.join(root, 'assets', 'icon.png'), path.join(outputRoot, 'assets', 'product-icon.png'));
  copyFile(path.join(root, 'assets', 'favicon.png'), path.join(outputRoot, 'assets', 'favicon.png'));
  copyFile(path.join(root, 'docs', 'readme-hero.png'), path.join(outputRoot, 'assets', 'product-overview.png'));
  resizePng(path.join(root, 'assets', 'icon.png'), path.join(outputRoot, 'assets', 'pwa-icon-192.png'), 192);
  resizePng(path.join(root, 'assets', 'icon.png'), path.join(outputRoot, 'assets', 'pwa-icon-512.png'), 512);
  copyFile(path.join(root, 'release', 'privacy-policy.html'), path.join(outputRoot, 'privacy-policy.html'));
  copyFile(path.join(root, 'release', 'user-agreement.html'), path.join(outputRoot, 'user-agreement.html'));
  fs.writeFileSync(path.join(outputRoot, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outputRoot, '_redirects'), '/app/*  /app/index.html  200\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, '.nojekyll'), '', 'utf8');
  fs.writeFileSync(
    path.join(outputRoot, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${manifest.siteUrl}/sitemap.xml\n`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(outputRoot, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${manifest.siteUrl}/</loc></url><url><loc>${manifest.appUrl}</loc></url></urlset>\n`,
    'utf8',
  );
}

function main() {
  assertInside(path.join(root, 'dist'), outputRoot);
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  const manifest = resolveReleaseManifest();
  exportExpoApp();
  patchAppShell();
  copyProductSite(manifest);
  generateServiceWorker(manifest.version);
  const files = walkFiles(outputRoot);
  const oversizedFiles = files.filter((file) => fs.statSync(file).size > 10 * 1024 * 1024);
  if (oversizedFiles.length) {
    throw new Error(`Netlify publish files must stay at or below 10 MiB: ${oversizedFiles.join(', ')}`);
  }
  const bytes = files.reduce((total, file) => total + fs.statSync(file).size, 0);
  const largestFileBytes = Math.max(...files.map((file) => fs.statSync(file).size));
  console.log(JSON.stringify({
    output: path.relative(root, outputRoot),
    app: path.relative(root, appOutput),
    version: manifest.version,
    files: files.length,
    bytes,
    largestFileBytes,
  }, null, 2));
}

main();
