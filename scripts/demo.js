'use strict';
/* 跨平台演示启动器：检测/启动 Metro，自动用默认浏览器打开 mobile-preview.html。
 * Windows 用户也可直接双击根目录的「演示.bat」。
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const PREVIEW = path.join(ROOT, 'mobile-preview.html');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => { resolve(res.statusCode); res.resume(); });
    req.on('error', () => resolve(0));
    req.setTimeout(1500, () => { req.destroy(); resolve(0); });
  });
}

function openInBrowser(target) {
  const platform = process.platform;
  if (platform === 'win32') {
    spawn('cmd', ['/c', 'start', '""', target], { detached: true, stdio: 'ignore' }).unref();
  } else if (platform === 'darwin') {
    spawn('open', [target], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [target], { detached: true, stdio: 'ignore' }).unref();
  }
}

(async () => {
  console.log('\n=== 健康守护者 · 演示启动器 ===\n');

  const code = await ping('http://localhost:8081');
  if (code === 200) {
    console.log('  ✓ Metro 已在运行');
  } else {
    console.log('  ▸ Metro 未运行，正在启动 ...');
    const isWin = process.platform === 'win32';
    const child = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'web'], {
      cwd: ROOT,
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();

    let waited = 0;
    process.stdout.write('  ▸ 等待 Metro 完成首次编译 ');
    while (waited < 50) {
      await sleep(2000);
      waited += 2;
      process.stdout.write('.');
      const c = await ping('http://localhost:8081');
      if (c === 200) { console.log(`\n  ✓ Metro 就绪（用时 ${waited}s）`); break; }
    }
    const finalCheck = await ping('http://localhost:8081');
    if (finalCheck !== 200) {
      console.error('\n  ! Metro 启动超时，请手动运行 npm run web 查看错误信息');
      process.exit(1);
    }
  }

  if (!fs.existsSync(PREVIEW)) {
    console.error('  ! 找不到 mobile-preview.html');
    process.exit(1);
  }

  console.log('  ▸ 打开预览：' + PREVIEW);
  openInBrowser(PREVIEW);

  console.log('\n  演示已启动，直接在手机框内点击操作即可。');
  console.log('  关闭浏览器和 Metro 窗口即结束演示。\n');
})();
