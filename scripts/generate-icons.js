'use strict';

/*
 * 健康守护者 App 图标生成器
 * 设计：青绿渐变底 + 白色「手托心跳」标识（一只托起的手 + 心电脉搏波形）。
 * 纯解析式 SDF 渲染，自带抗锯齿，无需外部图像工具。
 * 输出：icon.png / adaptive-icon.png / adaptive-icon-bg.png / splash-icon.png / favicon.png
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ASSETS = path.resolve(__dirname, '..', 'assets');

function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function mix(a, b, t) { return a + (b - a) * t; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

// 品牌翡翠绿渐变（左上亮 -> 右下深）
const TEAL_LIGHT = hexToRgb('#14A57F');
const TEAL_DARK = hexToRgb('#0A6A50');
const WHITE = [255, 255, 255];

// ---- 标识几何（1024 基准坐标系）----
// 心电脉搏折线（加粗圆角描边），简洁有力，象征健康体征监护
const PULSE = [
  [232, 512], [368, 512], [428, 380], [500, 644], [560, 512], [792, 512],
];
const PULSE_HALF = 30;

const MARK_CX = 512, MARK_CY = 512;

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay;
  const bax = bx - ax, bay = by - ay;
  const denom = bax * bax + bay * bay;
  let h = denom ? (pax * bax + pay * bay) / denom : 0;
  h = h < 0 ? 0 : h > 1 ? 1 : h;
  return Math.hypot(pax - bax * h, pay - bay * h);
}

// 标识的有符号距离场（<0 在内部）
function markSDF(x, y) {
  if (x < 180 || x > 844 || y < 330 || y > 694) {
    return 200;
  }
  let d = 1e9;
  for (let i = 0; i < PULSE.length - 1; i++) {
    const s = sdSegment(x, y, PULSE[i][0], PULSE[i][1], PULSE[i + 1][0], PULSE[i + 1][1]) - PULSE_HALF;
    if (s < d) d = s;
  }
  return d;
}

// 圆角矩形有符号距离场
function roundRectSDF(x, y, w, h, r) {
  const qx = Math.abs(x - w / 2) - (w / 2 - r);
  const qy = Math.abs(y - h / 2) - (h / 2 - r);
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

function render(opts) {
  const { size, hasBg, rounded, decor, drawMark, markScale } = opts;
  const png = new PNG({ width: size, height: size });
  const k = size / 1024; // 输出像素 / 基准单位

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const X = (px + 0.5) / k;
      const Y = (py + 0.5) / k;
      let r = 0, g = 0, b = 0, a = 0;

      if (hasBg) {
        let bgCov = 1;
        if (rounded != null) {
          bgCov = clamp01(0.5 - roundRectSDF(X, Y, 1024, 1024, rounded) * k);
        }
        if (bgCov > 0) {
          const t = clamp01((X + Y) / 2048);
          r = mix(TEAL_LIGHT[0], TEAL_DARK[0], t);
          g = mix(TEAL_LIGHT[1], TEAL_DARK[1], t);
          b = mix(TEAL_LIGHT[2], TEAL_DARK[2], t);
          if (decor) {
            const f1 = clamp01(0.5 - (Math.hypot(X - 884, Y - 150) - 312) * k) * 0.12;
            r = mix(r, 255, f1); g = mix(g, 255, f1); b = mix(b, 255, f1);
            const f2 = clamp01(0.5 - (Math.hypot(X - 132, Y - 952) - 286) * k) * 0.09;
            r = mix(r, 255, f2); g = mix(g, 255, f2); b = mix(b, 255, f2);
          }
          a = 255 * bgCov;
        }
      }

      if (drawMark) {
        const mx = (X - MARK_CX) / markScale + MARK_CX;
        const my = (Y - MARK_CY) / markScale + MARK_CY;
        const mCov = clamp01(0.5 - markSDF(mx, my) * markScale * k);
        if (mCov > 0) {
          const af = a / 255;
          const outA = mCov + af * (1 - mCov);
          r = (WHITE[0] * mCov + r * af * (1 - mCov)) / outA;
          g = (WHITE[1] * mCov + g * af * (1 - mCov)) / outA;
          b = (WHITE[2] * mCov + b * af * (1 - mCov)) / outA;
          a = outA * 255;
        }
      }

      const idx = (py * size + px) << 2;
      png.data[idx] = Math.round(clamp01(r / 255) * 255);
      png.data[idx + 1] = Math.round(clamp01(g / 255) * 255);
      png.data[idx + 2] = Math.round(clamp01(b / 255) * 255);
      png.data[idx + 3] = Math.round(clamp01(a / 255) * 255);
    }
  }
  return png;
}

function save(png, name) {
  fs.writeFileSync(path.join(ASSETS, name), PNG.sync.write(png));
  console.log('  ✓ ' + name + '  (' + png.width + 'x' + png.height + ')');
}

console.log('生成 App 图标中...');
save(render({ size: 1024, hasBg: true, rounded: null, decor: false, drawMark: true, markScale: 1.03 }), 'icon.png');
save(render({ size: 1024, hasBg: false, rounded: null, decor: false, drawMark: true, markScale: 1.12 }), 'adaptive-icon.png');
save(render({ size: 1024, hasBg: true, rounded: null, decor: false, drawMark: false, markScale: 1 }), 'adaptive-icon-bg.png');
save(render({ size: 1024, hasBg: true, rounded: 232, decor: false, drawMark: true, markScale: 0.92 }), 'splash-icon.png');
save(render({ size: 256, hasBg: true, rounded: 58, decor: false, drawMark: true, markScale: 1.0 }), 'favicon.png');
console.log('完成。');
