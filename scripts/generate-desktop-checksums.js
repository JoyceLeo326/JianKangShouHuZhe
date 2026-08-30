const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'dist', 'windows');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const artifactNames = [
  `HealthGuardian-${version}-Windows-x64.exe`,
  `HealthGuardian-${version}-Windows-x64.zip`,
  path.join('win-unpacked', 'HealthGuardian.exe'),
];

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

const lines = artifactNames.map((artifactName) => {
  const filePath = path.join(outputDir, artifactName);
  if (!fs.existsSync(filePath)) throw new Error(`Windows artifact is missing: ${filePath}`);
  return `${sha256(filePath)}  ${artifactName.replaceAll('\\', '/')}`;
});

fs.writeFileSync(path.join(outputDir, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${lines.length} SHA256 checksums to dist/windows/SHA256SUMS.txt.`);
