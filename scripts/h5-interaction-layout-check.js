const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'release', 'mobile-preview.html');
const screenshotDir = path.join(root, 'release', 'layout-check-screenshots');

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

function findChrome() {
  const found = chromeCandidates.find((item) => fs.existsSync(item));
  if (!found) throw new Error('未找到 Chrome 或 Edge，无法执行 H5 自动化验收。');
  return found;
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: options.method || 'GET' }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`${url} returned ${res.statusCode}: ${body.slice(0, 200)}`));
          return;
        }
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs = 10000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      return await requestJson(url);
    } catch (error) {
      lastError = error;
      await wait(180);
    }
  }
  throw lastError || new Error(`等待失败：${url}`);
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      fs.readFile(htmlPath, 'utf8', (error, html) => {
        if (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(error.message);
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(html);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

class CdpPage {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.errors = [];
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
        else resolve(message.result || {});
        return;
      }
      if (message.method === 'Runtime.exceptionThrown') {
        this.errors.push(message.params.exceptionDetails?.text || 'Runtime exception');
      }
      if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
        this.errors.push(message.params.args?.map((arg) => arg.value || arg.description || '').join(' ') || message.params.type);
      }
    };
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 15000);
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed');
    return result.result?.value;
  }
}

async function openCdpPage(debugPort, url) {
  await requestJson(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  const list = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
  const tab = list.find((item) => item.type === 'page' && item.url.includes(url.split('?')[0])) || list.find((item) => item.type === 'page');
  if (!tab?.webSocketDebuggerUrl) throw new Error('无法取得 Chrome 调试页面。');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  const page = new CdpPage(ws);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Log.enable').catch(() => {});
  await page.send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: path.join(os.tmpdir(), `jkshz-download-${Date.now()}`),
  }).catch(() => {});
  return page;
}

async function navigate(page, url, viewport) {
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.scale || 2,
    mobile: true,
  });
  await page.send('Page.navigate', { url });
  await wait(650);
}

async function saveScreenshot(page, name) {
  const shot = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(path.join(screenshotDir, `${name}.png`), Buffer.from(shot.data, 'base64'));
}

const layoutExpression = `(() => {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const app = document.querySelector('.app') || document.body;
  const isVisible = (el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && rect.bottom > -2 && rect.top < viewportHeight + 300;
  };
  const describe = (el) => ({
    tag: el.tagName.toLowerCase(),
    className: String(el.className || '').slice(0, 90),
    text: (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 90),
    rect: (() => {
      const r = el.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), top: Math.round(r.top), bottom: Math.round(r.bottom) };
    })(),
  });
  const overflowElements = Array.from(document.querySelectorAll('body *')).filter((el) => {
    if (!isVisible(el)) return false;
    if (el.closest('.tabs')) return false;
    const r = el.getBoundingClientRect();
    return r.left < -2 || r.right > viewportWidth + 2;
  }).slice(0, 8).map(describe);
  const clippedText = Array.from(document.querySelectorAll('button,.btn,.badge,.title,h1,h2,h3,label,span,strong')).filter((el) => {
    if (!isVisible(el)) return false;
    if (el.closest('.tabs') || el.closest('.nav')) return false;
    const style = getComputedStyle(el);
    if (style.whiteSpace !== 'nowrap') return false;
    return el.scrollWidth > el.clientWidth + 2;
  }).slice(0, 8).map(describe);
  const nav = document.querySelector('.nav');
  const navOk = !nav || (isVisible(nav) && Array.from(nav.querySelectorAll('button')).length === 5 && Array.from(nav.querySelectorAll('button')).every((button) => button.getBoundingClientRect().width > 36));
  return {
    title: document.title,
    pageText: app.innerText.slice(0, 180),
    viewportWidth,
    viewportHeight,
    documentScrollWidth: document.documentElement.scrollWidth,
    appScrollWidth: app.scrollWidth,
    overflowX: Math.max(document.documentElement.scrollWidth - viewportWidth, app.scrollWidth - viewportWidth),
    overflowElements,
    clippedText,
    navOk,
    bodyAttrAutotest: document.body.getAttribute('data-autotest') || '',
  };
})()`;

function assertLayout(name, result) {
  const problems = [];
  if (result.overflowX > 2) problems.push(`横向溢出 ${result.overflowX}px`);
  if (result.overflowElements.length) problems.push(`可见元素越界：${JSON.stringify(result.overflowElements)}`);
  if (result.clippedText.length) problems.push(`按钮或标签文字裁切：${JSON.stringify(result.clippedText)}`);
  if (!result.navOk) problems.push('底部导航异常');
  if (result.bodyAttrAutotest && result.bodyAttrAutotest !== 'ok') problems.push(`autotest=${result.bodyAttrAutotest}`);
  if (problems.length) throw new Error(`${name}: ${problems.join('; ')}`);
}

async function expectText(page, expected, statement = '') {
  const ok = await page.evaluate(`document.body.innerText.includes(${JSON.stringify(expected)})`);
  if (!ok) {
    const text = await page.evaluate(`document.body.innerText.slice(0, 500)`);
    throw new Error(`未出现预期内容：${expected}${statement ? `；语句：${statement}` : ''}；当前文本：${text}`);
  }
}

async function runInteractionChecks(page, baseUrl) {
  await navigate(page, `${baseUrl}/`, { width: 390, height: 844, scale: 2 });
  await page.evaluate(`localStorage.clear(); true;`);
  await navigate(page, `${baseUrl}/?fresh=${Date.now()}`, { width: 390, height: 844, scale: 2 });
  await expectText(page, '登录');
  await page.evaluate(`document.querySelector('#loginEmail').value='reviewer@jiankang.app'; document.querySelector('#loginPassword').value='Review2026'; login();`);
  await expectText(page, '工作台');
  assertLayout('login-flow', await page.evaluate(layoutExpression));

  const actions = [
    [`setTab('device')`, '设备管理'],
    [`syncDevice(state.devices[0].id)`, '设备数据已同步'],
    [`toggleDevice(state.devices[0].id)`, '待连接'],
    [`toggleDevice(state.devices[0].id)`, '在线'],
    [`setTab('training'); setTraining('patients')`, '患者档案'],
    [`openModal('patient')`, '新增患者'],
    [`document.querySelector('#patientName').value='陈女士'; document.querySelector('#patientAge').value='59'; addPatient()`, '陈女士'],
    [`setTraining('assessment'); openModal('assessment')`, '新建康复评估'],
    [`addAssessment()`, '评估已保存'],
    [`setTraining('prescription'); openModal('prescription')`, '智能生成处方'],
    [`addPrescription()`, '处方已生成'],
    [`setTraining('game'); startGame(); tapGrip(); tapGrip(); finishGame()`, '训练结束，记录已生成'],
    [`setTab('data'); setData('records')`, '训练记录'],
    [`openModal('record')`, '新增训练记录'],
    [`addRecord()`, '训练记录已保存'],
    [`setData('reports'); openModal('report')`, '生成康复报告'],
    [`addReport()`, '康复报告已生成'],
    [`viewReport(state.reports[0].id)`, '报告详情'],
    [`closeModal(); exportReport(state.reports[0].id)`, '报告已导出'],
    [`setData('analytics')`, '趋势分析'],
    [`setData('storage')`, '资料仓储'],
    [`setTab('profile')`, '账号服务'],
    [`openModal('profile')`, '编辑资料'],
    [`document.querySelector('#profileName').value='张医生'; document.querySelector('#profileRole').value='康复师'; saveProfile()`, '资料已保存'],
    [`openModal('about')`, '关于健康守护者'],
    [`closeModal(); openModal('privacy')`, '隐私政策'],
    [`closeModal(); openModal('agreement')`, '用户协议'],
    [`closeModal(); toggleSetting('notification'); toggleSetting('sync'); toggleSetting('privacy')`, '系统设置'],
    [`window.confirm=()=>true; setTab('data'); setData('records'); removeRecord(state.records[0].id); setData('reports'); removeReport(state.reports[0].id); setTab('device'); removeDevice(state.devices[0].id);`, '设备管理'],
  ];

  for (const [statement, expected] of actions) {
    await page.evaluate(`${statement}; true;`);
    await wait(160);
    await expectText(page, expected, statement);
    assertLayout(`interaction ${expected}`, await page.evaluate(layoutExpression));
  }
}

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const { server, port } = await startStaticServer();
  const debugPort = 9333 + Math.floor(Math.random() * 400);
  const profile = path.join(os.tmpdir(), `jkshz-layout-${Date.now()}`);
  fs.mkdirSync(profile, { recursive: true });

  const chrome = childProcess.spawn(findChrome(), [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--disable-default-apps',
    '--hide-scrollbars',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`, 15000);
    const baseUrl = `http://127.0.0.1:${port}`;
    const page = await openCdpPage(debugPort, `${baseUrl}/`);

    const viewports = [
      { name: 'small', width: 320, height: 720, scale: 2 },
      { name: 'standard', width: 390, height: 844, scale: 3 },
      { name: 'large', width: 430, height: 932, scale: 3 },
    ];
    const screens = ['home', 'device', 'training', 'reports'];
    for (const viewport of viewports) {
      await navigate(page, `${baseUrl}/`, viewport);
      assertLayout(`login-${viewport.name}`, await page.evaluate(layoutExpression));
      await saveScreenshot(page, `login-${viewport.name}`);
      for (const screen of screens) {
        await navigate(page, `${baseUrl}/?autotest&screen=${screen}`, viewport);
        assertLayout(`${screen}-${viewport.name}`, await page.evaluate(layoutExpression));
        await saveScreenshot(page, `${screen}-${viewport.name}`);
      }
    }

    await runInteractionChecks(page, baseUrl);
    if (page.errors.length) throw new Error(`浏览器运行错误：${page.errors.join(' | ')}`);
    console.log(`H5 layout and interaction checks passed. Screenshots: ${screenshotDir}`);
  } finally {
    server.close();
    chrome.kill();
    await wait(300);
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
