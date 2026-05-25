const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const path = require('path');

const root = path.resolve(__dirname, '..');
const releaseDir = path.join(root, 'release');
const startPort = Number(process.env.PORT || 8088);
const urlFile = path.join(releaseDir, 'public-preview-url.txt');
const qrFile = path.join(releaseDir, 'public-preview-qr.png');

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

function request(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`${url} returned ${res.statusCode}: ${body.slice(0, 200)}`));
          return;
        }
        resolve(body);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function waitForLocal(port) {
  const url = `http://127.0.0.1:${port}/h5-health`;
  let lastError;
  for (let i = 0; i < 80; i += 1) {
    try {
      await request(url);
      return;
    } catch (error) {
      lastError = error;
      await wait(250);
    }
  }
  throw lastError || new Error('Local H5 service did not start.');
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

function spawnProcess(command, args, options = {}) {
  const child = childProcess.spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...options.env },
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
    shell: options.shell || false,
    windowsHide: true,
  });
  child.once('error', (error) => {
    console.error(error.message);
  });
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

async function start() {
  fs.mkdirSync(releaseDir, { recursive: true });
  const port = await findFreePort();
  const localUrl = `http://127.0.0.1:${port}`;
  let preview;
  let tunnel;
  const cleanup = () => {
    if (tunnel && !tunnel.killed) tunnel.kill();
    if (preview && !preview.killed) preview.kill();
  };
  try {
    preview = spawnProcess(process.execPath, [path.join(root, 'scripts', 'serve-h5-preview.js')], {
      env: { PORT: String(port) },
    });
    preview.stdout.on('data', (data) => process.stdout.write(data));
    preview.stderr.on('data', (data) => process.stderr.write(data));
    await waitForLocal(port);

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

    const shutdown = () => {
      cleanup();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    cleanup();
    throw error;
  }
}

start().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
