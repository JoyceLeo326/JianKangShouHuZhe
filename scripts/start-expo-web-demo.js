const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const path = require('path');

const root = path.resolve(__dirname, '..');
const webDir = path.join(root, 'dist', 'wechat-demo');
const releaseDir = path.join(root, 'release');
const startPort = Number(process.env.PORT || 8090);
const urlFile = path.join(releaseDir, 'wechat-expo-web-url.txt');
const qrFile = path.join(releaseDir, 'wechat-expo-web-qr.png');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

async function findFreePort() {
  for (let port = startPort; port < startPort + 30; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port found from ${startPort} to ${startPort + 29}.`);
}

function safePath(requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const candidate = path.join(webDir, normalized === '/' ? 'index.html' : normalized);
  const resolved = path.resolve(candidate);
  return resolved.startsWith(webDir) ? resolved : path.join(webDir, 'index.html');
}

function serveWeb(port) {
  const server = http.createServer((req, res) => {
    let filePath = safePath(req.url || '/');
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(webDir, 'index.html');
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(error.message);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': contentTypes[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=31536000, immutable',
      });
      res.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => resolve(server));
  });
}

function spawnProcess(command, args, options = {}) {
  const child = childProcess.spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...options.env },
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
    shell: options.shell || false,
    windowsHide: true,
  });
  child.once('error', (error) => console.error(error.message));
  return child;
}

function startTunnelmole(port) {
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const tunnel = spawnProcess(npxCommand, ['--yes', 'tunnelmole', String(port)], {
    shell: process.platform === 'win32',
  });
  const publicUrlPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for Tunnelmole URL.')), 90000);
    const scan = (data) => {
      const text = data.toString();
      process.stdout.write(text);
      const match = text.match(/https:\/\/[a-z0-9-]+\.tunnelmole\.net/i);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    };
    tunnel.stdout.on('data', scan);
    tunnel.stderr.on('data', scan);
    tunnel.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`tunnelmole exited with code ${code}`));
    });
  });
  return { tunnel, publicUrlPromise };
}

function download(url, output, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(output);
    https.get(url, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        file.close(() => fs.unlink(output, () => {}));
        if (redirectCount >= 8) {
          reject(new Error(`Too many redirects for ${url}`));
          return;
        }
        const nextUrl = new URL(res.headers.location, url).toString();
        download(nextUrl, output, redirectCount + 1).then(resolve, reject);
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        file.close(() => fs.unlink(output, () => {}));
        reject(new Error(`QR download returned ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (error) => {
      file.close(() => fs.unlink(output, () => {}));
      reject(error);
    });
  });
}

async function start() {
  if (!fs.existsSync(path.join(webDir, 'index.html'))) {
    throw new Error('dist/wechat-demo/index.html not found. Run: npx expo export --platform web --output-dir dist\\wechat-demo');
  }
  fs.mkdirSync(releaseDir, { recursive: true });

  const port = await findFreePort();
  const server = await serveWeb(port);
  console.log(`Local Expo Web demo: http://127.0.0.1:${port}`);

  let tunnel;
  const cleanup = () => {
    if (tunnel && !tunnel.killed) tunnel.kill();
    server.close();
  };

  try {
    const tunnelResult = startTunnelmole(port);
    tunnel = tunnelResult.tunnel;
    const publicUrl = await tunnelResult.publicUrlPromise;
    fs.writeFileSync(urlFile, `${publicUrl}\n`, 'utf8');

    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=720x720&margin=16&data=${encodeURIComponent(publicUrl)}`;
    await download(qrApi, qrFile);

    console.log('');
    console.log(`WeChat demo URL: ${publicUrl}`);
    console.log(`QR image: ${qrFile}`);
    console.log('Keep this process running while scanning and presenting.');

    process.on('SIGINT', () => { cleanup(); process.exit(0); });
    process.on('SIGTERM', () => { cleanup(); process.exit(0); });
    while (true) await wait(60 * 1000);
  } catch (error) {
    cleanup();
    throw error;
  }
}

start().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
