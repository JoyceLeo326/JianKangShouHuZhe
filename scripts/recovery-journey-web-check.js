const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const webRoot = path.join(root, 'release', 'github-pages-deploy');
const evidenceDir = path.join(root, 'release', 'recovery-web-check');
const interactiveSelector = [
  'button', 'a[href]', 'input:not([type="hidden"])', 'textarea', 'select',
  '[role="button"]', '[role="link"]', '[role="radio"]', '[role="checkbox"]', '[role="tab"]',
  '[role="switch"]', '[role="slider"]', '[role="spinbutton"]', '[role="combobox"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');
const repairedControlLabels = [
  '登录或注册健康守护者账号',
  '记录今日康复打卡',
  '查看全部重点患者',
  '查看来源：RUH Hand Therapy',
  '查看来源：NICE NG236',
  '查看来源：RUH FAQ',
];
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
            : extension === '.ttf' ? 'font/ttf'
              : extension === '.webp' ? 'image/webp' : 'application/octet-stream';
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
  const outcome = await page.evaluate(`(() => {
    const target = Array.from(document.querySelectorAll('[aria-label]'))
      .find((element) => element.getAttribute('aria-label') === ${JSON.stringify(label)});
    if (!target) return { found: false };
    target.scrollIntoView({ block: 'center' });
    const rect = target.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const pointerReachable = Boolean(hit && (hit === target || target.contains(hit)));
    target.click();
    return { found: true, pointerReachable };
  })()`);
  assert(outcome?.found, `Could not find control: ${label}`);
  assert(outcome.pointerReachable, `Control is visually blocked after scrolling into view: ${label}`);
  await wait(180);
}

async function clickStoryScene(page, number) {
  const prefix = `查看康复叙事第 ${number} 幕：`;
  const clicked = await page.evaluate(`(() => {
    const target = Array.from(document.querySelectorAll('[aria-label]'))
      .find((element) => element.getAttribute('aria-label').startsWith(${JSON.stringify(prefix)}));
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = target.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const pointerReachable = Boolean(hit && (hit === target || target.contains(hit)));
    target.click();
    return pointerReachable;
  })()`);
  assert(clicked, `Recovery story scene ${number} is missing or visually blocked.`);
  const sceneId = String(number).padStart(2, '0');
  await waitForExpression(
    page,
    `document.querySelector('[data-recovery-story-scene="${sceneId}"][data-recovery-story-loaded="true"]')`,
    `Recovery story scene ${sceneId} did not finish loading.`,
  );
  return page.evaluate(`(() => {
    const element = document.querySelector('[data-recovery-story-scene="${sceneId}"]');
    const nestedImage = element && element.querySelector('img');
    const background = element ? getComputedStyle(element).backgroundImage : '';
    return {
      scene: element && element.getAttribute('data-recovery-story-scene'),
      source: (nestedImage && (nestedImage.currentSrc || nestedImage.src)) || background || '',
    };
  })()`);
}

async function focusLabel(page, label) {
  return page.evaluate(`(() => {
    const target = Array.from(document.querySelectorAll('[aria-label]'))
      .find((element) => element.getAttribute('aria-label') === ${JSON.stringify(label)});
    if (!target) return null;
    target.scrollIntoView({ block: 'center' });
    target.focus();
    const rect = target.getBoundingClientRect();
    return {
      active: document.activeElement === target,
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      visualViewportHeight: Math.round(window.visualViewport ? window.visualViewport.height : window.innerHeight),
    };
  })()`);
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
    const accessibleName = (element) => {
      const direct = (element.getAttribute('aria-label') || '').trim();
      if (direct) return direct;
      const labelledBy = (element.getAttribute('aria-labelledby') || '').trim();
      if (labelledBy) {
        const referenced = labelledBy.split(' ').map((id) => document.getElementById(id)?.textContent || '').join(' ').trim();
        if (referenced) return referenced;
      }
      const alternate = (element.getAttribute('alt') || element.getAttribute('title') || '').trim();
      if (alternate) return alternate;
      return (element.textContent || '').trim();
    };
    const controls = Array.from(new Set(document.querySelectorAll(${JSON.stringify(interactiveSelector)})));
    const targets = controls.map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const name = accessibleName(element);
      return {
        element,
        name,
        label: name || element.getAttribute('role') || element.tagName.toLowerCase(),
        role: element.getAttribute('role') || element.tagName.toLowerCase(),
        left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom),
        rawWidth: rect.width, rawHeight: rect.height,
        width: Math.round(rect.width), height: Math.round(rect.height),
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
      };
    }).filter((target) => target.visible);
    const navigationLabels = ['工作台', '训练', 'AI助手', '数据', '我的'];
    const tabTargets = targets.filter((target) => navigationLabels.includes(target.label));
    const navBounds = tabTargets.length ? {
      top: Math.min(...tabTargets.map((target) => target.top)),
      bottom: Math.max(...tabTargets.map((target) => target.bottom)),
    } : null;
    const blockedByNav = navBounds ? targets.filter((target) => {
      if (navigationLabels.includes(target.label)) return false;
      if (target.bottom <= navBounds.top || target.top >= navBounds.bottom) return false;
      const x = Math.max(1, Math.min(window.innerWidth - 1, (target.left + target.right) / 2));
      const y = (Math.max(target.top, navBounds.top) + Math.min(target.bottom, navBounds.bottom)) / 2;
      return document.elementsFromPoint(x, y).some((element) => element === target.element || target.element.contains(element));
    }).map((target) => target.label) : [];
    return {
      viewportWidth: width,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - width,
      interactiveCount: targets.length,
      undersized: targets.filter((target) => target.rawWidth < 44 || target.rawHeight < 44)
        .map(({ label, role, width: targetWidth, height: targetHeight }) => ({ label, role, width: targetWidth, height: targetHeight })),
      unnamed: targets.filter((target) => !target.name).map((target) => target.role),
      targets: targets.map(({ element, visible, rawWidth, rawHeight, ...target }) => target),
      radioCount: targets.filter((target) => target.role === 'radio').length,
      navigationCount: tabTargets.length,
      navBounds,
      blockedByNav,
      visualViewportHeight: Math.round(window.visualViewport ? window.visualViewport.height : window.innerHeight),
    };
  })()`);
}

async function inspectKeyboardAccess(page) {
  return page.evaluate(`(async () => {
    const accessibleName = (element) => {
      const direct = (element.getAttribute('aria-label') || '').trim();
      if (direct) return direct;
      const labelledBy = (element.getAttribute('aria-labelledby') || '').trim();
      if (labelledBy) {
        const referenced = labelledBy.split(' ').map((id) => document.getElementById(id)?.textContent || '').join(' ').trim();
        if (referenced) return referenced;
      }
      const alternate = (element.getAttribute('alt') || element.getAttribute('title') || '').trim();
      if (alternate) return alternate;
      return (element.textContent || '').trim();
    };
    const controls = Array.from(new Set(document.querySelectorAll(${JSON.stringify(interactiveSelector)}))).filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    });
    const enabled = controls.filter((element) => !element.disabled && element.getAttribute('aria-disabled') !== 'true');
    const repairedLabels = ${JSON.stringify(repairedControlLabels)};
    const focusFailures = [];
    const repairedSeen = [];
    const repairedFocusFailures = [];
    for (const element of enabled) {
      const name = accessibleName(element);
      element.focus({ preventScroll: true });
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const active = document.activeElement === element || element.contains(document.activeElement);
      if (!active) focusFailures.push(name || element.getAttribute('role') || element.tagName.toLowerCase());
      if (repairedLabels.includes(name)) {
        repairedSeen.push(name);
        const style = getComputedStyle(element);
        const outlineVisible = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth || '0') >= 2;
        if (!active || !outlineVisible) repairedFocusFailures.push(name);
      }
    }
    if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
    return {
      focusableCount: enabled.length,
      focusFailures,
      repairedSeen: Array.from(new Set(repairedSeen)),
      repairedMissing: repairedLabels.filter((label) => !repairedSeen.includes(label)),
      repairedFocusFailures,
    };
  })()`);
}

async function saveScreenshot(page, name) {
  const screenshot = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  fs.writeFileSync(path.join(evidenceDir, `${name}.png`), Buffer.from(screenshot.data, 'base64'));
}

async function waitForDownload(downloadDir, filesBefore = new Set()) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    const files = fs.readdirSync(downloadDir).filter((name) => !name.endsWith('.crdownload'));
    const created = files.find((name) => !filesBefore.has(name) && fs.statSync(path.join(downloadDir, name)).size > 0);
    if (created) return path.join(downloadDir, created);
    await wait(120);
  }
  throw new Error('The recovery handoff download did not produce a real file.');
}

function assertLayout(layout, viewportName, expectedRadios) {
  assert(layout.overflowX === 0, `${viewportName} viewport has ${layout.overflowX}px horizontal overflow.`);
  assert(layout.undersized.length === 0, `${viewportName} viewport has touch targets below 44px: ${JSON.stringify(layout.undersized)}`);
  assert(layout.unnamed.length === 0, `${viewportName} viewport has interactive controls without accessible names: ${JSON.stringify(layout.unnamed)}`);
  assert(layout.radioCount === expectedRadios, `${viewportName} viewport expected ${expectedRadios} candidates, found ${layout.radioCount}.`);
  assert(layout.navBounds, `${viewportName} viewport lost the bottom navigation.`);
  assert(layout.navigationCount === 5, `${viewportName} viewport expected five navigation controls, found ${layout.navigationCount}.`);
  assert(layout.navBounds.bottom <= layout.visualViewportHeight + 2, `${viewportName} bottom navigation extends beyond the safe viewport.`);
  assert(layout.blockedByNav.length === 0, `${viewportName} bottom navigation overlaps controls: ${layout.blockedByNav.join(', ')}`);
}

async function assertKeyboardAccess(page, viewportName) {
  const keyboard = await inspectKeyboardAccess(page);
  assert(keyboard.focusFailures.length === 0, `${viewportName} viewport has controls that cannot receive keyboard focus: ${keyboard.focusFailures.join(', ')}`);
  assert(keyboard.repairedMissing.length === 0, `${viewportName} viewport is missing repaired controls: ${keyboard.repairedMissing.join(', ')}`);
  assert(keyboard.repairedFocusFailures.length === 0, `${viewportName} viewport repaired controls lack a visible focus indicator: ${keyboard.repairedFocusFailures.join(', ')}`);
  return keyboard;
}

async function resetJourney(page) {
  await page.evaluate(`(() => { localStorage.clear(); sessionStorage.clear(); return true; })()`);
  await page.send('Page.reload', { ignoreCache: true });
  await waitForExpression(page, `document.body.innerText.includes('从今天的状态，到一份可复核结果')`, 'Guest-first recovery journey did not load.');
  await waitForExpression(page, `document.body.innerText.includes('暂无上次反馈')`, 'Stored feedback reader did not settle.');
  await page.evaluate(`window.alert = () => {}; window.confirm = () => true; true;`);
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
    const results = [];
    for (const viewport of [
      { name: 'small', width: 320, height: 720, scale: 2 },
      { name: 'standard', width: 390, height: 844, scale: 3 },
      { name: 'large', width: 430, height: 932, scale: 3 },
      { name: 'desktop', width: 1440, height: 900, scale: 1 },
    ]) {
      const viewportDownloadDir = path.join(downloadDir, viewport.name);
      fs.mkdirSync(viewportDownloadDir);
      await page.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: viewportDownloadDir });
      await setViewport(page, viewport);
      await resetJourney(page);
      assert(!(await page.evaluate(`document.body.innerText.includes('请先登录后使用')`)), 'Login unexpectedly gates the recovery journey.');
      await waitForExpression(page, `document.querySelector('[data-recovery-story-scene="01"][data-recovery-story-loaded="true"]')`, `${viewport.name} initial story scene did not load.`);
      assert((await page.evaluate(`document.querySelectorAll('[data-recovery-story-scene]').length`)) === 1, `${viewport.name} must render only the current recovery scene for lazy loading.`);
      let layout = await inspectLayout(page);
      assertLayout(layout, viewport.name, 0);
      let keyboardAudit = await assertKeyboardAccess(page, viewport.name);
      let maximumInteractiveControls = layout.interactiveCount;
      let maximumKeyboardFocusableControls = keyboardAudit.focusableCount;
      let minimumTouchTarget = Math.min(...layout.targets.map((item) => Math.min(item.width, item.height)));
      await saveScreenshot(page, `${viewport.name}-01-start`);

      const keyboard = await focusLabel(page, '当前疼痛（0-10）');
      assert(keyboard?.active, `${viewport.name} could not focus the pain input.`);
      assert(keyboard.bottom <= keyboard.visualViewportHeight, `${viewport.name} focused input is obscured by the visual viewport.`);
      await saveScreenshot(page, `${viewport.name}-02-keyboard-focus`);

      await clickLabel(page, '已有已批准处方');
      await clickLabel(page, '评估风险与候选');
      await waitForExpression(page, `document.body.innerText.includes('当前未触发停止或复盘条件')`, 'Baseline recommendation did not render.');
      await waitForExpression(page, `document.body.innerText.includes('收益：') && document.body.innerText.includes('权衡：')`, 'Candidate safety tradeoffs did not render.');
      await clickLabel(page, '选择方案：按已批准处方执行');
      layout = await inspectLayout(page);
      assertLayout(layout, viewport.name, 3);
      keyboardAudit = await assertKeyboardAccess(page, viewport.name);
      maximumInteractiveControls = Math.max(maximumInteractiveControls, layout.interactiveCount);
      maximumKeyboardFocusableControls = Math.max(maximumKeyboardFocusableControls, keyboardAudit.focusableCount);
      minimumTouchTarget = Math.min(minimumTouchTarget, ...layout.targets.map((item) => Math.min(item.width, item.height)));
      await saveScreenshot(page, `${viewport.name}-03-candidates-tradeoffs`);

      const storySources = [];
      for (let number = 1; number <= 24; number += 1) {
        const loadedScene = await clickStoryScene(page, number);
        assert(loadedScene.scene === String(number).padStart(2, '0'), `${viewport.name} loaded the wrong scene for chapter ${number}.`);
        assert(loadedScene.source.includes('.webp'), `${viewport.name} scene ${number} did not resolve to a WebP resource.`);
        storySources.push(loadedScene.source);
      }
      assert(new Set(storySources).size === 24, `${viewport.name} did not load 24 independent story resources.`);

      await clickLabel(page, '人工确认这个选择');
      await saveScreenshot(page, `${viewport.name}-04-human-confirmation`);
      await clickLabel(page, '出现不适');
      await saveScreenshot(page, `${viewport.name}-05-discomfort-feedback`);
      await clickLabel(page, '保存到下次复盘');
      await waitForExpression(page, `document.body.innerText.includes('反馈已进入下一次复盘')`, 'Feedback did not save.');
      await saveScreenshot(page, `${viewport.name}-06-feedback-saved`);

      await clickLabel(page, '评估风险与候选');
      await waitForExpression(page, `document.body.innerText.includes('上次反馈为“出现不适”，所以')`, 'Saved discomfort did not causally change the next review.');
      layout = await inspectLayout(page);
      assertLayout(layout, viewport.name, 3);
      keyboardAudit = await assertKeyboardAccess(page, viewport.name);
      maximumInteractiveControls = Math.max(maximumInteractiveControls, layout.interactiveCount);
      maximumKeyboardFocusableControls = Math.max(maximumKeyboardFocusableControls, keyboardAudit.focusableCount);
      minimumTouchTarget = Math.min(minimumTouchTarget, ...layout.targets.map((item) => Math.min(item.width, item.height)));
      await saveScreenshot(page, `${viewport.name}-07-next-review-priority`);

      await clickLabel(page, '人工确认这个选择');
      const filesBefore = new Set(fs.readdirSync(viewportDownloadDir));
      await clickLabel(page, '导出今日交接单');
      const downloadedPath = await waitForDownload(viewportDownloadDir, filesBefore);
      const downloadedText = fs.readFileSync(downloadedPath, 'utf8');
      const downloadedPriority = downloadedText.match(/^建议优先级：.*$/m)?.[0] || '建议优先级字段缺失';
      assert(downloadedText.includes('建议优先级：优先复盘'), `${viewport.name} downloaded handoff has the wrong priority: ${downloadedPriority}`);
      assert(downloadedText.includes('方案收益：') && downloadedText.includes('方案权衡：'), `${viewport.name} downloaded handoff is missing the selected safety tradeoff.`);
      await saveScreenshot(page, `${viewport.name}-08-real-download`);
      layout = await inspectLayout(page);
      assertLayout(layout, viewport.name, 3);
      keyboardAudit = await assertKeyboardAccess(page, viewport.name);
      maximumInteractiveControls = Math.max(maximumInteractiveControls, layout.interactiveCount);
      maximumKeyboardFocusableControls = Math.max(maximumKeyboardFocusableControls, keyboardAudit.focusableCount);
      minimumTouchTarget = Math.min(minimumTouchTarget, ...layout.targets.map((item) => Math.min(item.width, item.height)));

      results.push({
        viewport: `${viewport.width}x${viewport.height}`,
        fullJourney: true,
        keyboardVisibleControl: true,
        candidates: 3,
        storyResources: new Set(storySources).size,
        lazySingleScene: true,
        feedbackCausality: '出现不适 -> 优先复盘',
        realDownloadBytes: Buffer.byteLength(downloadedText),
        overflowX: layout.overflowX,
        minimumTouchTarget,
        maximumInteractiveControls,
        maximumKeyboardFocusableControls,
        accessibleNames: true,
        repairedFocusIndicators: true,
        navigationSafe: layout.navBounds.bottom <= layout.visualViewportHeight + 2 && layout.blockedByNav.length === 0,
        actionHitTests: true,
      });
    }

    assert(page.errors.length === 0, `Browser errors: ${page.errors.join(' | ')}`);
    const screenshotNames = fs.readdirSync(evidenceDir).filter((name) => /^(small|standard|large|desktop)-0[1-8]-.*\.png$/.test(name));
    assert(screenshotNames.length === 32, `Expected 32 dual-end journey screenshots, found ${screenshotNames.length}.`);
    console.log(JSON.stringify({
      guestAccess: true,
      independentStoryResources: 24,
      fullJourneyPerViewport: true,
      viewports: results,
      screenshotCount: screenshotNames.length,
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
