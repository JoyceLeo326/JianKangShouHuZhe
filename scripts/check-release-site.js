const childProcess = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const webRoot = path.join(root, 'dist', 'release-site');
const evidenceRoot = path.join(root, 'dist', 'release-site-check');
const forbiddenProductWords = /Demo|演示|样例版|原型|预览版/i;
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.webp': 'image/webp',
  }[extension] || 'application/octet-stream';
}

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  const normalized = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const candidate = path.resolve(webRoot, `.${normalized}`);
  if (!candidate.startsWith(`${path.resolve(webRoot)}${path.sep}`)) return null;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  if (pathname.startsWith('/app/')) return path.join(webRoot, 'app', 'index.html');
  return null;
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const filePath = resolveRequestPath(request.url);
      if (!filePath) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }
      response.writeHead(200, {
        'Content-Type': contentType(filePath),
        'Cache-Control': 'no-store',
        'Service-Worker-Allowed': '/',
      });
      fs.createReadStream(filePath).pipe(response);
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function findChrome() {
  const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate));
  if (!chrome) throw new Error('Chrome or Edge is required for release-site browser acceptance.');
  return chrome;
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method: options.method || 'GET' }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`${url} returned ${response.statusCode}: ${body.slice(0, 200)}`));
          return;
        }
        try { resolve(body ? JSON.parse(body) : {}); } catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.end();
  });
}

async function waitForJson(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try { return await requestJson(url); } catch (error) { lastError = error; }
    await wait(160);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

class CdpPage {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.errors = [];
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result || {});
        return;
      }
      if (message.method === 'Runtime.exceptionThrown') {
        this.errors.push(message.params.exceptionDetails?.text || 'Runtime exception');
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        this.errors.push(message.params.args?.map((item) => item.value || item.description || '').join(' ') || 'console error');
      }
    };
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 20000);
    });
  }

  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Browser evaluation failed.');
    return response.result?.value;
  }
}

async function openPage(debugPort, url) {
  await requestJson(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
  const target = targets.find((item) => item.type === 'page' && item.url.startsWith(url))
    || targets.find((item) => item.type === 'page');
  assert(target?.webSocketDebuggerUrl, 'Browser page did not expose a debugging socket.');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  const page = new CdpPage(socket);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  return page;
}

async function setViewport(page, viewport) {
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.scale,
    mobile: viewport.width < 720,
  });
}

async function navigate(page, url) {
  await page.send('Page.navigate', { url });
  await waitForExpression(page, 'document.readyState === "complete"', `Page did not finish loading: ${url}`);
}

async function waitForExpression(page, expression, message, timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await page.evaluate(`Boolean(${expression})`)) return;
    } catch (error) {
      // The page can briefly lose its execution context during navigation.
    }
    await wait(160);
  }
  throw new Error(message);
}

async function saveScreenshot(page, fileName) {
  const screenshot = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(path.join(evidenceRoot, fileName), Buffer.from(screenshot.data, 'base64'));
}

const pageAuditExpression = `(() => ({
  title: document.title,
  text: document.body.innerText,
  viewportWidth: document.documentElement.clientWidth,
  scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href') || '',
  appEntry: document.querySelector('a[href="/app/"]')?.getAttribute('href') || '',
  androidDisabled: document.querySelector('[data-release-target="android"] .download-primary')?.getAttribute('aria-disabled') || '',
  windowsDisabled: document.querySelector('[data-release-target="windows"] .download-primary')?.getAttribute('aria-disabled') || '',
}))()`;

function assertPageAudit(audit, name, expectedTitle) {
  assert(audit.title.includes(expectedTitle), `${name} has unexpected title: ${audit.title}`);
  assert(audit.scrollWidth <= audit.viewportWidth + 2, `${name} has horizontal overflow: ${audit.scrollWidth} > ${audit.viewportWidth}`);
  assert(!forbiddenProductWords.test(audit.text), `${name} exposes an internal product-status word.`);
}

async function clickAccessible(page, label) {
  const result = await page.evaluate(`(() => {
    const wanted = ${JSON.stringify(label)};
    const controls = Array.from(document.querySelectorAll('button,a,[role="button"],[role="radio"],[role="checkbox"]'));
    const control = controls.find((element) => (element.getAttribute('aria-label') || element.textContent || '').trim() === wanted);
    if (!control) return false;
    control.click();
    return true;
  })()`);
  assert(result, `Could not activate control: ${label}`);
  await wait(180);
}

async function runRecoveryPersistence(page) {
  await page.evaluate('localStorage.clear(); sessionStorage.clear(); true;');
  await page.send('Page.reload', { ignoreCache: true });
  await waitForExpression(
    page,
    `document.body.innerText.includes('从今天的状态，到一份可复核结果')`,
    'The full recovery journey did not load.',
  );
  await clickAccessible(page, '已有已批准处方');
  await clickAccessible(page, '评估风险与候选');
  await waitForExpression(page, `document.body.innerText.includes('当前未触发停止或复盘条件')`, 'Safety evaluation did not complete.');
  await clickAccessible(page, '选择方案：按已批准处方执行');
  await clickAccessible(page, '人工确认这个选择');
  await clickAccessible(page, '出现不适');
  await clickAccessible(page, '保存到下次复盘');
  await waitForExpression(page, `document.body.innerText.includes('反馈已进入下一次复盘')`, 'Recovery feedback was not stored.');
  const storedBeforeReload = await page.evaluate(`localStorage.getItem('JKSHZ_RECOVERY_FEEDBACK_V1')`);
  assert(storedBeforeReload?.includes('出现不适'), 'Recovery feedback is missing from local persistence.');
  await page.send('Page.reload', { ignoreCache: true });
  await waitForExpression(page, `document.body.innerText.includes('上次反馈“出现不适”')`, 'Stored feedback was not read after refresh.');
  const storedAfterReload = await page.evaluate(`localStorage.getItem('JKSHZ_RECOVERY_FEEDBACK_V1')`);
  assert(storedAfterReload === storedBeforeReload, 'Local recovery feedback changed across refresh.');
}

async function main() {
  assert(fs.existsSync(path.join(webRoot, 'index.html')), 'Run npm run build:web:release before browser acceptance.');
  fs.mkdirSync(evidenceRoot, { recursive: true });
  const releaseManifest = JSON.parse(fs.readFileSync(path.join(webRoot, 'release-manifest.json'), 'utf8'));
  assert(releaseManifest.version === '1.1.0', `Expected release 1.1.0, found ${releaseManifest.version}.`);
  assert(fs.existsSync(path.join(webRoot, 'app', 'index.html')), 'The composed site is missing /app/index.html.');
  assert(fs.existsSync(path.join(webRoot, 'sw.js')), 'The composed site is missing its service worker.');

  const { server, port } = await startStaticServer();
  const debugPort = 10400 + Math.floor(Math.random() * 500);
  const profileRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'health-release-site-'));
  const chrome = childProcess.spawn(findChrome(), [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--disable-default-apps',
    '--hide-scrollbars',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileRoot}`,
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
    const baseUrl = `http://127.0.0.1:${port}`;
    const page = await openPage(debugPort, `${baseUrl}/`);
    const results = [];
    for (const viewport of [
      { name: 'mobile', width: 390, height: 844, scale: 2 },
      { name: 'desktop', width: 1440, height: 900, scale: 1 },
    ]) {
      await setViewport(page, viewport);
      await navigate(page, `${baseUrl}/`);
      await waitForExpression(page, `document.body.innerText.includes('让每日康复更清楚')`, 'Product root did not render.');
      const rootAudit = await page.evaluate(pageAuditExpression);
      assertPageAudit(rootAudit, `${viewport.name} product root`, '健康守护者');
      assert(rootAudit.manifest === '/manifest.webmanifest', 'Product root does not expose the PWA manifest.');
      assert(rootAudit.appEntry === '/app/', 'Product root does not link to the complete app.');
      for (const platform of ['android', 'windows']) {
        const metadata = releaseManifest.downloads[platform];
        const disabled = rootAudit[`${platform}Disabled`] === 'true';
        assert(metadata.primaryUrl ? !disabled : disabled, `${platform} download state does not match the release manifest.`);
      }
      await saveScreenshot(page, `${viewport.name}-product-root.png`);

      await navigate(page, `${baseUrl}/app/`);
      await waitForExpression(page, `document.body.innerText.includes('从今天的状态，到一份可复核结果')`, 'Complete app did not render under /app/.');
      const appAudit = await page.evaluate(pageAuditExpression);
      assertPageAudit(appAudit, `${viewport.name} full app`, '健康守护者');
      assert(appAudit.manifest === '/manifest.webmanifest', 'Full app does not expose the shared PWA manifest.');
      await runRecoveryPersistence(page);
      await saveScreenshot(page, `${viewport.name}-full-app.png`);
      results.push({
        viewport: `${viewport.width}x${viewport.height}`,
        productRootOverflow: rootAudit.scrollWidth - rootAudit.viewportWidth,
        fullAppOverflow: appAudit.scrollWidth - appAudit.viewportWidth,
        refreshPersistence: true,
      });
    }
    assert(page.errors.length === 0, `Browser errors: ${page.errors.join(' | ')}`);
    console.log(JSON.stringify({
      site: 'https://jiankang-shouhuzhe.netlify.app',
      version: releaseManifest.version,
      results,
      screenshots: path.relative(root, evidenceRoot),
    }, null, 2));
  } finally {
    server.close();
    chrome.kill();
    await wait(250);
    const resolvedProfile = path.resolve(profileRoot);
    assert(resolvedProfile.startsWith(path.resolve(os.tmpdir())), 'Refusing to remove a browser profile outside the temp directory.');
    fs.rmSync(resolvedProfile, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
