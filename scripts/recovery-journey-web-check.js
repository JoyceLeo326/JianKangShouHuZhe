const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const webRoot = path.join(root, 'release', 'github-pages-deploy');
const evidenceDir = path.join(root, 'release', 'recovery-web-check');
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

function findChrome() {
  const executable = chromeCandidates.find((item) => fs.existsSync(item));
  if (!executable) throw new Error('Chrome or Edge is required for the recovery web check.');
  return executable;
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

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
      const filePath = path.resolve(webRoot, relativePath);
      if (!filePath.startsWith(`${webRoot}${path.sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      fs.readFile(filePath, (error, body) => {
        if (error) {
          response.writeHead(404).end('Not found');
          return;
        }
        const extension = path.extname(filePath);
        const type = extension === '.js' ? 'text/javascript; charset=utf-8'
          : extension === '.html' ? 'text/html; charset=utf-8'
            : extension === '.ttf' ? 'font/ttf' : 'application/octet-stream';
        response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
        response.end(body);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
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
        if (message.error) pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
        else pending.resolve(message.result || {});
        return;
      }
      if (message.method === 'Runtime.exceptionThrown') {
        this.errors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || 'Runtime exception');
      }
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
        this.errors.push(message.params.entry.text || 'Browser log error');
      }
      if (message.method === 'Page.javascriptDialogOpening') {
        this.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
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
      }, 15000);
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime evaluation failed');
    return result.result?.value;
  }
}

async function openPage(debugPort, url, downloadPath) {
  await requestJson(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  const tabs = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
  const tab = tabs.find((item) => item.type === 'page' && item.url.startsWith(url)) || tabs.find((item) => item.type === 'page');
  assert(tab?.webSocketDebuggerUrl, 'Could not open the browser debugging page.');
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  const page = new CdpPage(socket);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Log.enable');
  await page.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath });
  return page;
}

async function waitForExpression(page, expression, message, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await page.evaluate(`Boolean(${expression})`)) return;
    await wait(120);
  }
  throw new Error(message);
}

async function clickLabel(page, label) {
  const clicked = await page.evaluate(`(() => {
    const target = Array.from(document.querySelectorAll('[aria-label]'))
      .find((element) => element.getAttribute('aria-label') === ${JSON.stringify(label)});
    if (!target) return false;
    target.scrollIntoView({ block: 'center' });
    target.click();
    return true;
  })()`);
  assert(clicked, `Could not find control: ${label}`);
  await wait(180);
}

async function clickRole(page, role) {
  const clicked = await page.evaluate(`(() => {
    const target = document.querySelector('[role=${JSON.stringify(role)}]');
    if (!target) return false;
    target.scrollIntoView({ block: 'center' });
    target.click();
    return true;
  })()`);
  assert(clicked, `Could not find role: ${role}`);
  await wait(180);
}

async function setViewport(page, viewport) {
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.scale || 2,
    mobile: true,
  });
  await wait(180);
}

async function inspectLayout(page) {
  return page.evaluate(`(() => {
    const width = document.documentElement.clientWidth;
    const labels = [
      '已有已批准处方', '没有或不确定', '疼痛突然明显加重', '皮肤变色或明显肿胀',
      '呼吸困难或意识异常', '评估风险与候选', '导出今日交接单', '保存到下次复盘'
    ];
    const labelled = labels.map((label) => Array.from(document.querySelectorAll('[aria-label]'))
      .find((element) => element.getAttribute('aria-label') === label)).filter(Boolean);
    const decisionControls = Array.from(document.querySelectorAll('[role="radio"], [role="checkbox"]'));
    const controls = Array.from(new Set([...labelled, ...decisionControls]));
    const targets = controls.map((element) => {
      const rect = element.getBoundingClientRect();
      return { label: element.getAttribute('aria-label') || element.getAttribute('role'), width: Math.round(rect.width), height: Math.round(rect.height) };
    });
    return {
      viewportWidth: width,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - width,
      undersized: targets.filter((target) => target.width < 44 || target.height < 44),
      targets,
      radioCount: decisionControls.filter((element) => element.getAttribute('role') === 'radio').length,
    };
  })()`);
}

async function saveScreenshot(page, name) {
  const screenshot = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  fs.writeFileSync(path.join(evidenceDir, `${name}.png`), Buffer.from(screenshot.data, 'base64'));
}

async function waitForDownload(downloadDir) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    const files = fs.readdirSync(downloadDir).filter((name) => !name.endsWith('.crdownload'));
    if (files.length) return path.join(downloadDir, files[0]);
    await wait(120);
  }
  throw new Error('The recovery handoff download did not produce a real file.');
}

async function main() {
  assert(fs.existsSync(path.join(webRoot, 'index.html')), 'Run npm run build:pages before this check.');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jkshz-recovery-check-'));
  const profileDir = path.join(runRoot, 'profile');
  const downloadDir = path.join(runRoot, 'downloads');
  fs.mkdirSync(profileDir);
  fs.mkdirSync(downloadDir);
  const { server, port } = await startStaticServer();
  const debugPort = 9800 + Math.floor(Math.random() * 500);
  const chrome = childProcess.spawn(findChrome(), [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--disable-default-apps',
    '--hide-scrollbars',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
    const page = await openPage(debugPort, `http://127.0.0.1:${port}/`, downloadDir);
    await setViewport(page, { width: 390, height: 844, scale: 3 });
    await waitForExpression(page, `document.body.innerText.includes('从今天的状态，到一份可复核结果')`, 'Guest-first recovery journey did not load.');
    assert(!(await page.evaluate(`document.body.innerText.includes('请先登录后使用')`)), 'Login unexpectedly gates the recovery journey.');
    await waitForExpression(page, `document.body.innerText.includes('暂无上次反馈')`, 'Stored feedback reader did not settle.');

    await clickLabel(page, '已有已批准处方');
    await clickLabel(page, '评估风险与候选');
    await waitForExpression(page, `document.body.innerText.includes('当前未触发停止或复盘条件')`, 'Baseline recommendation did not render.');
    assert((await page.evaluate(`document.querySelectorAll('[role="radio"]').length`)) === 3, 'The baseline review must expose three candidates.');

    await clickRole(page, 'checkbox');
    await clickLabel(page, '出现不适');
    await clickLabel(page, '保存到下次复盘');
    await waitForExpression(page, `document.body.innerText.includes('反馈已进入下一次复盘')`, 'Feedback did not save.');
    await clickLabel(page, '评估风险与候选');
    await waitForExpression(page, `document.body.innerText.includes('上次反馈为“出现不适”，所以')`, 'Saved discomfort did not causally change the next review.');
    assert((await page.evaluate(`document.querySelectorAll('[role="radio"]').length`)) === 3, 'The feedback-driven review must expose three candidates.');

    await clickRole(page, 'checkbox');
    await page.evaluate(`window.alert = () => {}; true;`);
    await clickLabel(page, '导出今日交接单');
    const downloadedPath = await waitForDownload(downloadDir);
    const downloadedText = fs.readFileSync(downloadedPath, 'utf8');
    assert(downloadedText.includes('建议优先级：优先复盘'), 'Downloaded handoff is missing the feedback-driven priority.');
    assert(downloadedText.includes('方案权衡：'), 'Downloaded handoff is missing the selected tradeoff.');

    const results = [];
    for (const viewport of [
      { name: 'small', width: 320, height: 720, scale: 2 },
      { name: 'standard', width: 390, height: 844, scale: 3 },
      { name: 'large', width: 430, height: 932, scale: 3 },
    ]) {
      await setViewport(page, viewport);
      const layout = await inspectLayout(page);
      assert(layout.overflowX <= 2, `${viewport.name} viewport has ${layout.overflowX}px horizontal overflow.`);
      assert(layout.undersized.length === 0, `${viewport.name} viewport has touch targets below 44px: ${JSON.stringify(layout.undersized)}`);
      assert(layout.radioCount === 3, `${viewport.name} viewport lost recovery candidates.`);
      await saveScreenshot(page, `feedback-review-${viewport.name}`);
      results.push({ viewport: `${viewport.width}x${viewport.height}`, overflowX: layout.overflowX, minimumTouchTarget: Math.min(...layout.targets.map((item) => Math.min(item.width, item.height))) });
    }

    assert(page.errors.length === 0, `Browser errors: ${page.errors.join(' | ')}`);
    console.log(JSON.stringify({
      guestAccess: true,
      feedbackCausality: '出现不适 -> 优先复盘',
      candidates: 3,
      realDownloadBytes: Buffer.byteLength(downloadedText),
      viewports: results,
      screenshots: path.relative(root, evidenceDir),
    }, null, 2));
  } finally {
    server.close();
    chrome.kill();
    await wait(250);
    const resolvedRunRoot = path.resolve(runRoot);
    assert(resolvedRunRoot.startsWith(path.resolve(os.tmpdir())), 'Refusing to remove a temp directory outside the system temp root.');
    fs.rmSync(resolvedRunRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
