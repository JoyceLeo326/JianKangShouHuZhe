const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, Menu, net, protocol, session, shell } = require('electron');

const APP_SCHEME = 'healthguardian';
const APP_ENTRY_URL = 'healthguardian://app/index.html';
const SMOKE_STORAGE_KEY = 'healthGuardian.desktopSmoke.v1';

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      codeCache: true,
    },
  },
]);

app.enableSandbox();
app.setName('健康守护者');
app.setPath('userData', path.join(app.getPath('appData'), 'HealthGuardian'));

let mainWindow = null;

function commandValue(prefix) {
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

function desktopSmokeRequest() {
  return {
    write: commandValue('--desktop-smoke-write='),
    read: commandValue('--desktop-smoke-read='),
    clear: process.argv.includes('--desktop-smoke-clear'),
  };
}

function isApplicationUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === `${APP_SCHEME}:` && parsed.hostname === 'app';
  } catch {
    return false;
  }
}

function openSafeExternal(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (!['https:', 'mailto:'].includes(parsed.protocol)) return;
    void shell.openExternal(parsed.toString()).catch(() => {});
  } catch {
    // Malformed links stay blocked inside the desktop application.
  }
}

function responseWithSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:; media-src 'self' data: blob:; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'",
  );
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function servePackagedWeb(request) {
  try {
    const requestUrl = new URL(request.url);
    if (requestUrl.hostname !== 'app') return new Response('Not found', { status: 404 });

    const webRoot = path.resolve(app.getAppPath(), 'dist', 'desktop-web');
    const pathname = decodeURIComponent(requestUrl.pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(webRoot, relativePath);
    const rootPrefix = `${webRoot}${path.sep}`;

    if (filePath !== path.join(webRoot, 'index.html') && !filePath.startsWith(rootPrefix)) {
      return new Response('Forbidden', { status: 403 });
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return new Response('Not found', { status: 404 });
    }

    const response = await net.fetch(pathToFileURL(filePath).toString());
    return responseWithSecurityHeaders(response);
  } catch {
    return new Response('Bad request', { status: 400 });
  }
}

function lockDownSession(targetSession) {
  targetSession.setPermissionCheckHandler(() => false);
  targetSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
}

async function verifyCoreNavigation(window) {
  const result = await window.webContents.executeJavaScript(`
    (async () => {
      const waitFor = async (predicate, label, timeoutMs = 20000) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          if (predicate()) return;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error('Timed out waiting for ' + label);
      };
      const bodyContains = (text) => Boolean(document.body && document.body.innerText.includes(text));
      const findTab = (label) => Array.from(document.querySelectorAll('[role="tab"]'))
        .find((element) => element.getAttribute('aria-label') === label);
      const navigate = async (label, expectedText) => {
        await waitFor(() => Boolean(findTab(label)), label + ' tab');
        findTab(label).click();
        await waitFor(() => bodyContains(expectedText), expectedText);
        return label;
      };

      await waitFor(() => bodyContains('健康守护者'), 'formal product UI');
      const navigation = [];
      navigation.push(await navigate('训练', '训练中心'));
      navigation.push(await navigate('数据', '数据中心'));
      navigation.push(await navigate('工作台', '今日守护'));
      return { productRendered: true, navigation };
    })();
  `, true);

  if (!result || !result.productRendered || result.navigation.join(',') !== '训练,数据,工作台') {
    throw new Error('formal product navigation check failed');
  }
}

async function runDesktopSmoke(window, request) {
  const expected = request.write || request.read;
  if (!expected) return;

  try {
    await verifyCoreNavigation(window);
    let storedValue;
    if (request.write) {
      storedValue = await window.webContents.executeJavaScript(
        `localStorage.setItem(${JSON.stringify(SMOKE_STORAGE_KEY)}, ${JSON.stringify(request.write)}); localStorage.getItem(${JSON.stringify(SMOKE_STORAGE_KEY)});`,
        true,
      );
    } else {
      storedValue = await window.webContents.executeJavaScript(
        `localStorage.getItem(${JSON.stringify(SMOKE_STORAGE_KEY)});`,
        true,
      );
    }

    const matched = storedValue === expected;
    if (matched && request.clear) {
      await window.webContents.executeJavaScript(
        `localStorage.removeItem(${JSON.stringify(SMOKE_STORAGE_KEY)});`,
        true,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    app.exit(matched ? 0 : 41);
  } catch {
    app.exit(42);
  }
}

function createMainWindow() {
  const smokeRequest = desktopSmokeRequest();
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: '健康守护者',
    backgroundColor: '#F4FAF7',
    autoHideMenuBar: true,
    icon: path.join(app.getAppPath(), 'assets', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      navigateOnDragDrop: false,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!isApplicationUrl(url)) openSafeExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (isApplicationUrl(url)) return;
    event.preventDefault();
    openSafeExternal(url);
  });
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.webContents.once('did-finish-load', () => {
    if (smokeRequest.write || smokeRequest.read) {
      void runDesktopSmoke(window, smokeRequest);
    }
  });
  window.once('ready-to-show', () => {
    if (!smokeRequest.write && !smokeRequest.read) window.show();
  });
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });

  void window.loadURL(APP_ENTRY_URL);
  return window;
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady()
    .then(async () => {
      app.setAppUserModelId('com.joyceleo.healthguardian.desktop');
      Menu.setApplicationMenu(null);
      lockDownSession(session.defaultSession);
      await protocol.handle(APP_SCHEME, servePackagedWeb);
      mainWindow = createMainWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
      });
    })
    .catch(() => app.exit(43));

  app.on('window-all-closed', () => app.quit());
}
