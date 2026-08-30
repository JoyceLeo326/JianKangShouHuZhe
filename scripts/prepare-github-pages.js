const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'dist', 'release-site');
const outDir = path.join(root, 'release', 'github-pages-deploy');
const basePath = '/JianKangShouHuZhe';
const netlifyOrigin = 'https://jiankang-shouhuzhe.netlify.app';
const pagesSiteUrl = `https://joyceleo326.github.io${basePath}`;

function assertInside(parent, target) {
  const relative = path.relative(path.resolve(parent), path.resolve(target));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing unsafe path outside ${parent}: ${target}`);
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

function rewriteRootPaths(content) {
  return content
    .replaceAll(netlifyOrigin, pagesSiteUrl)
    .replace(/(["'`])\/(?!\/)/g, `$1${basePath}/`)
    .replace(/url\(\s*\/(?!\/)/g, `url(${basePath}/`);
}

function preparePagesMirror() {
  if (!fs.existsSync(path.join(sourceDir, 'index.html'))) {
    throw new Error(`Missing ${sourceDir}. Run npm run build:web:release first.`);
  }

  assertInside(path.join(root, 'release'), outDir);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, outDir, { recursive: true });

  for (const requiredFile of ['manifest.webmanifest', 'release-manifest.json', 'sw.js', 'app/index.html']) {
    if (!fs.existsSync(path.join(outDir, requiredFile))) {
      throw new Error(`GitHub Pages mirror is missing ${requiredFile}.`);
    }
  }

  const textExtensions = new Set(['.css', '.html', '.js', '.json', '.txt', '.webmanifest', '.xml']);
  for (const file of walkFiles(outDir)) {
    if (!textExtensions.has(path.extname(file))) continue;
    const content = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, rewriteRootPaths(content), 'utf8');
  }

  fs.writeFileSync(path.join(outDir, '.nojekyll'), '', 'utf8');
  console.log(JSON.stringify({
    output: path.relative(root, outDir),
    basePath,
    siteUrl: `${pagesSiteUrl}/`,
    files: walkFiles(outDir).length,
  }, null, 2));
}

preparePagesMirror();
