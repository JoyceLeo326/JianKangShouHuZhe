const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'dist', 'windows');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const expectedArtifacts = [
  { name: `HealthGuardian-${version}-Windows-x64.exe`, magic: Buffer.from('MZ') },
  { name: `HealthGuardian-${version}-Windows-x64.zip`, magic: Buffer.from('PK') },
  { name: path.join('win-unpacked', 'HealthGuardian.exe'), magic: Buffer.from('MZ') },
];

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function readChecksums() {
  const checksumPath = path.join(outputDir, 'SHA256SUMS.txt');
  assert.equal(fs.existsSync(checksumPath), true, `missing checksum manifest: ${checksumPath}`);
  const entries = new Map();
  for (const line of fs.readFileSync(checksumPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([0-9a-f]{64})\s+\*?(.+)$/i);
    if (match) entries.set(match[2].replaceAll('\\', '/'), match[1].toLowerCase());
  }
  return entries;
}

function main() {
  const checksums = readChecksums();
  const results = [];

  for (const artifact of expectedArtifacts) {
    const filePath = path.join(outputDir, artifact.name);
    assert.equal(fs.existsSync(filePath), true, `missing Windows artifact: ${filePath}`);
    const stat = fs.statSync(filePath);
    assert.equal(stat.isFile(), true, `artifact is not a file: ${filePath}`);
    assert.equal(stat.size > 5 * 1024 * 1024, true, `artifact is unexpectedly small: ${filePath}`);
    const header = Buffer.alloc(artifact.magic.length);
    const handle = fs.openSync(filePath, 'r');
    try {
      fs.readSync(handle, header, 0, header.length, 0);
    } finally {
      fs.closeSync(handle);
    }
    assert.deepEqual(header, artifact.magic, `artifact header mismatch: ${filePath}`);

    const relativeName = artifact.name.replaceAll('\\', '/');
    const digest = sha256(filePath);
    assert.equal(checksums.get(relativeName), digest, `SHA256 mismatch for ${relativeName}`);
    results.push({ file: relativeName, bytes: stat.size, sha256: digest });
  }

  console.log(JSON.stringify({ ok: true, artifacts: results }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`Desktop artifact smoke test failed: ${error.message}`);
  process.exit(1);
}
