const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const filePath = path.join(root, 'release', 'mobile-preview.html');
const startPort = Number(process.env.PORT || 8088);
const apiBaseUrl = process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001';

const proxyPrefixes = [
  '/api/',
  '/health',
  '/privacy',
  '/terms',
  '/account-deletion',
  '/health-disclaimer'
];

function localAddresses(port) {
  const urls = [`http://127.0.0.1:${port}`];
  const interfaces = os.networkInterfaces();
  for (const list of Object.values(interfaces)) {
    for (const item of list || []) {
      if (item.family === 'IPv4' && !item.internal) urls.push(`http://${item.address}:${port}`);
    }
  }
  return urls;
}

function createServer(port) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === '/h5-health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, page: '健康守护者' }));
      return;
    }
    if (proxyPrefixes.some((prefix) => url.pathname === prefix || url.pathname.startsWith(prefix))) {
      proxyToApi(req, res, url);
      return;
    }
    fs.readFile(filePath, 'utf8', (error, html) => {
      if (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`无法读取预览文件：${error.message}`);
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(html);
    });
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < startPort + 20) {
      createServer(port + 1);
      return;
    }
    console.error(error.message);
    process.exit(1);
  });

  server.listen(port, '0.0.0.0', () => {
    console.log('健康守护者 H5 预览服务已启动：');
    for (const url of localAddresses(port)) console.log(url);
    console.log(`后端代理：${apiBaseUrl}`);
    console.log('手机和电脑连接同一个 Wi-Fi 或热点后，用手机浏览器打开局域网地址。');
  });
}

function proxyToApi(req, res, parsedUrl) {
  const target = new URL(parsedUrl.pathname + parsedUrl.search, apiBaseUrl);
  const headers = { ...req.headers, host: target.host };
  const proxyReq = http.request(target, { method: req.method, headers }, (proxyRes) => {
    const responseHeaders = { ...proxyRes.headers };
    responseHeaders['access-control-allow-origin'] = '*';
    res.writeHead(proxyRes.statusCode || 500, responseHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'BAD_GATEWAY', message: `后端服务不可用：${error.message}` }));
  });

  req.pipe(proxyReq);
}

createServer(startPort);
