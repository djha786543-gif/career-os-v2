/**
 * Generate PNG icons for the CareerOS PWA.
 * Run once: node scripts/generate-pwa-icons.js
 *
 * Requires: npm install canvas  (or: npm install --save-dev canvas)
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [192, 512, 180]; // 180 = Apple touch icon

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.188; // corner radius (matches SVG rx=96/512)

  // Background
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = '#0369a1';
  ctx.fill();

  const sc = size / 512;

  // Arc (career path)
  ctx.beginPath();
  ctx.moveTo(128 * sc, 352 * sc);
  ctx.bezierCurveTo(128 * sc, 200 * sc, 384 * sc, 200 * sc, 384 * sc, 352 * sc);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 20 * sc;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Target outer circle
  ctx.beginPath();
  ctx.arc(256 * sc, 176 * sc, 48 * sc, 0, Math.PI * 2);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 16 * sc;
  ctx.stroke();

  // Target inner dot
  ctx.beginPath();
  ctx.arc(256 * sc, 176 * sc, 24 * sc, 0, Math.PI * 2);
  ctx.fillStyle = '#38bdf8';
  ctx.fill();

  // Briefcase body
  ctx.beginPath();
  const bx = 176 * sc, by = 292 * sc, bw = 160 * sc, bh = 108 * sc, br = 12 * sc;
  ctx.moveTo(bx + br, by);
  ctx.lineTo(bx + bw - br, by);
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
  ctx.lineTo(bx + bw, by + bh - br);
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
  ctx.lineTo(bx + br, by + bh);
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
  ctx.lineTo(bx, by + br);
  ctx.quadraticCurveTo(bx, by, bx + br, by);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();

  // Briefcase handle
  ctx.beginPath();
  ctx.roundRect(220 * sc, 276 * sc, 72 * sc, 28 * sc, 8 * sc);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 10 * sc;
  ctx.stroke();

  // Divider lines
  ctx.strokeStyle = '#0369a1';
  ctx.lineWidth = 8 * sc;
  ctx.beginPath();
  ctx.moveTo(256 * sc, 292 * sc);
  ctx.lineTo(256 * sc, 400 * sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(176 * sc, 346 * sc);
  ctx.lineTo(336 * sc, 346 * sc);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

const outDir = path.join(__dirname, '../public/icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of SIZES) {
  const buf = drawIcon(size);
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log(`Generated: public/icons/${name}`);
}

console.log('\nDone! PNG icons are ready in public/icons/');
