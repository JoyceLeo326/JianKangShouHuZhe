const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const electronDirectory = path.join(root, 'node_modules', 'electron');
const executable = path.join(electronDirectory, 'dist', 'electron.exe');
const installer = path.join(electronDirectory, 'install.js');

if (fs.existsSync(executable)) {
  console.log('Electron runtime is available locally.');
  process.exit(0);
}
if (!fs.existsSync(installer)) {
  console.error('Electron package is missing. Run npm ci before building Windows artifacts.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [installer], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_MIRROR: process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/',
  },
});

if (result.error) throw result.error;
if (result.status !== 0 || !fs.existsSync(executable)) {
  console.error(`Electron runtime installation failed with exit code ${result.status}.`);
  process.exit(result.status || 1);
}

console.log('Electron runtime installed for the Windows build.');
