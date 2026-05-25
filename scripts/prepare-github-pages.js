const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'release', 'github-pages-deploy');
const indexPath = path.join(outDir, 'index.html');
const nojekyllPath = path.join(outDir, '.nojekyll');

if (!fs.existsSync(indexPath)) {
  throw new Error(`Missing ${indexPath}. Run npm run build:pages after exporting the web app.`);
}

let html = fs.readFileSync(indexPath, 'utf8');

html = html
  .replace(/(href|src)="\/(favicon\.ico|_expo\/|assets\/)/g, '$1="./$2')
  .replace(/url\("\/(_expo\/|assets\/)/g, 'url("./$1')
  .replace(/url\(\/(_expo\/|assets\/)/g, 'url(./$1');

if (!html.includes('background: #DDE6E1;')) {
  html = html.replace(
    /body\s*\{\s*overflow:\s*hidden;\s*\}/,
    `body {
        overflow: hidden;
        background: #DDE6E1;
      }`,
  );
}

if (!html.includes('justify-content: center;')) {
  html = html.replace(
    /#root\s*\{\s*display:\s*flex;\s*height:\s*100%;\s*flex:\s*1;\s*\}/,
    `#root {
        display: flex;
        height: 100%;
        flex: 1;
        justify-content: center;
        background: #DDE6E1;
      }`,
  );
}

if (!html.includes('#root > *')) {
  html = html.replace(
    '</style>',
    `      #root > * {
        width: 100% !important;
        max-width: 430px !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }
    </style>`,
  );
}

fs.writeFileSync(indexPath, html, 'utf8');
fs.writeFileSync(nojekyllPath, '', 'utf8');

console.log(`Prepared GitHub Pages output: ${path.relative(root, outDir)}`);
