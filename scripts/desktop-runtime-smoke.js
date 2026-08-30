const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'dist', 'windows');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const unpackedExe = path.join(outputDir, 'win-unpacked', 'HealthGuardian.exe');
const portableExe = path.join(outputDir, `HealthGuardian-${version}-Windows-x64.exe`);
const token = `desktop-persistence-${process.pid}-${Date.now()}`;

function runApplication(executable, args, label) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(executable, args, {
      cwd: outputDir,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      if (stderr.length < 8000) stderr += chunk.toString();
    });
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`${label} timed out`));
    }, 120000);
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`${label} exited with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`));
        return;
      }
      resolve({ label, exitCode: code, durationMs: Date.now() - startedAt });
    });
  });
}

async function main() {
  for (const filePath of [unpackedExe, portableExe]) {
    if (!fs.existsSync(filePath)) throw new Error(`Windows executable is missing: ${filePath}`);
  }

  const runs = [];
  runs.push(await runApplication(unpackedExe, [`--desktop-smoke-write=${token}`], 'unpacked write'));
  runs.push(await runApplication(unpackedExe, [`--desktop-smoke-read=${token}`], 'unpacked read'));
  runs.push(await runApplication(portableExe, [`--desktop-smoke-read=${token}`, '--desktop-smoke-clear'], 'portable read'));

  const evidence = {
    ok: true,
    verifiedAt: new Date().toISOString(),
    checks: [
      'unpacked executable launched',
      'formal application UI rendered and training/data/workbench navigation completed',
      'localStorage value survived an application restart',
      'portable executable launched and read the persisted value',
    ],
    runs,
  };
  fs.writeFileSync(path.join(outputDir, 'RUNTIME-SMOKE.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  console.error(`Desktop runtime smoke test failed: ${error.message}`);
  process.exit(1);
});
