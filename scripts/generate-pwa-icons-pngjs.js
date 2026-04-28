/**
 * Generate PNG icons using pngjs (pure JS, no native deps).
 * Run: node scripts/generate-pwa-icons-pngjs.js
 */
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const SIZES = [192, 512, 180];

// Colors (RGB)
const BG_COLOR   = [3,   105, 161]; // #0369a1
const ICON_COLOR = [56,  189, 248]; // #38bdf8
const WHITE      = [255, 255, 255];

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return [r, g, b];
}

function createIcon(size) {
  const png = new PNG({ width: size, height: size, filterType: -1 });
  const sc = size / 512;
  const r = Math.round(size * 0.188); // corner radius

  function idx(x, y) { return (y * size + x) * 4; }

  function setPixel(x, y, rgb, alpha = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = idx(x, y);
    png.data[i]   = rgb[0];
    png.data[i+1] = rgb[1];
    png.data[i+2] = rgb[2];
    png.data[i+3] = alpha;
  }

  // ── Rounded rectangle background ──────────────────────────────────────────
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Check if inside rounded rect
      let inside = false;
      if (x >= r && x < size - r) {
        inside = (y >= 0 && y < size);
      } else if (y >= r && y < size - r) {
        inside = (x >= 0 && x < size);
      } else {
        // corner quadrants
        const cx = x < r ? r : size - r - 1;
        const cy = y < r ? r : size - r - 1;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        inside = dist <= r;
      }
      if (inside) {
        setPixel(x, y, BG_COLOR);
      } else {
        setPixel(x, y, [0, 0, 0], 0); // transparent
      }
    }
  }

  // ── Helper: draw thick line (anti-aliased via thickness) ──────────────────
  function drawLine(x1, y1, x2, y2, color, thickness) {
    const dx = x2 - x1, dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2;
    const t = Math.ceil(thickness / 2);
    for (let i = 0; i <= steps; i++) {
      const px = Math.round(x1 + dx * i / steps);
      const py = Math.round(y1 + dy * i / steps);
      for (let ox = -t; ox <= t; ox++) {
        for (let oy = -t; oy <= t; oy++) {
          if (ox*ox + oy*oy <= t*t) setPixel(px+ox, py+oy, color);
        }
      }
    }
  }

  // ── Helper: draw circle outline ───────────────────────────────────────────
  function drawCircleOutline(cx, cy, radius, color, thickness) {
    const t = Math.ceil(thickness / 2);
    for (let deg = 0; deg < 360; deg += 0.5) {
      const rad = deg * Math.PI / 180;
      const px = Math.round(cx + radius * Math.cos(rad));
      const py = Math.round(cy + radius * Math.sin(rad));
      for (let ox = -t; ox <= t; ox++) {
        for (let oy = -t; oy <= t; oy++) {
          if (ox*ox + oy*oy <= t*t) setPixel(px+ox, py+oy, color);
        }
      }
    }
  }

  // ── Helper: fill circle ────────────────────────────────────────────────────
  function fillCircle(cx, cy, radius, color) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if ((x-cx)**2 + (y-cy)**2 <= radius**2) setPixel(x, y, color);
      }
    }
  }

  // ── Helper: draw bezier curve ──────────────────────────────────────────────
  function drawBezier(points, color, thickness) {
    const steps = 200;
    const t2 = Math.ceil(thickness / 2);
    let prevX, prevY;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Cubic bezier: 4 control points
      const [p0, p1, p2, p3] = points;
      const px = Math.round(
        (1-t)**3 * p0[0] + 3*(1-t)**2*t * p1[0] + 3*(1-t)*t**2 * p2[0] + t**3 * p3[0]
      );
      const py = Math.round(
        (1-t)**3 * p0[1] + 3*(1-t)**2*t * p1[1] + 3*(1-t)*t**2 * p2[1] + t**3 * p3[1]
      );
      for (let ox = -t2; ox <= t2; ox++) {
        for (let oy = -t2; oy <= t2; oy++) {
          if (ox*ox + oy*oy <= t2*t2) setPixel(px+ox, py+oy, color);
        }
      }
    }
  }

  // Draw the icon at the correct scale
  const sw = Math.round(20 * sc); // stroke width for arcs
  const lw = Math.round(8 * sc);  // line width

  // Career arc (cubic bezier from 128,352 to 384,352 with control at 128,200 and 384,200)
  drawBezier(
    [[128*sc, 352*sc], [128*sc, 200*sc], [384*sc, 200*sc], [384*sc, 352*sc]],
    ICON_COLOR, sw
  );

  // Target outer ring
  drawCircleOutline(256*sc, 176*sc, Math.round(48*sc), ICON_COLOR, Math.round(16*sc));
  // Target inner dot
  fillCircle(256*sc, 176*sc, Math.round(24*sc), ICON_COLOR);

  // Briefcase body (filled white rectangle)
  const bx = Math.round(176*sc), by = Math.round(292*sc);
  const bw = Math.round(160*sc), bh = Math.round(108*sc);
  for (let y = by; y < by+bh; y++) {
    for (let x = bx; x < bx+bw; x++) {
      setPixel(x, y, WHITE);
    }
  }

  // Briefcase handle (white outline rectangle)
  const hx = Math.round(220*sc), hy = Math.round(276*sc);
  const hw = Math.round(72*sc), hh = Math.round(28*sc);
  const ht = Math.round(10*sc);
  for (let y = hy; y < hy+hh; y++) {
    for (let x = hx; x < hx+hw; x++) {
      if (y < hy+ht || y >= hy+hh-ht || x < hx+ht || x >= hx+hw-ht) {
        setPixel(x, y, WHITE);
      }
    }
  }

  // Vertical divider
  drawLine(256*sc, 292*sc, 256*sc, 400*sc, BG_COLOR, lw);
  // Horizontal divider
  drawLine(176*sc, 346*sc, 336*sc, 346*sc, BG_COLOR, lw);

  return png;
}

const outDir = path.join(__dirname, '../public/icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of SIZES) {
  const png = createIcon(size);
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  const buf = PNG.sync.write(png);
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log(`Generated: public/icons/${name} (${size}x${size})`);
}

console.log('\nDone! Run `git add public/icons/` to include icons in your deploy.');
