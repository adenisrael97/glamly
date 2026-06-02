#!/usr/bin/env node
/**
 * Generates Glamly PWA icons as PNG files using only Node.js built-ins.
 * Outputs to apps/web/public/icons/
 *
 * Brand: rose-600 background (#e11d48) with a centred white rounded "G" lettermark.
 *
 * Usage: node scripts/generate-icons.mjs
 */

import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "apps", "web", "public", "icons");

// ─── Minimal PNG encoder ─────────────────────────────────────────────────────

function crc32(buf) {
  if (!crc32.table) {
    crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crc32.table[i] = c;
    }
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = (crc >>> 8) ^ crc32.table[(crc ^ b) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function u32(n) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32BE(n);
  return b;
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  return Buffer.concat([u32(data.length), t, data, u32(crc32(Buffer.concat([t, data])))]);
}

/**
 * Render a single pixel (r, g, b, a) for position (x, y) within a canvas of
 * `size` × `size`. Returns [r, g, b, a].
 *
 * Design:
 *  - Rounded-rect background (brand rose).
 *  - White sans-serif "G" glyph in the safe zone (≥ 10 % padding for maskable).
 *    The glyph is drawn as a pixel-art bitmap scaled to the safe zone.
 */
function renderPixel(x, y, size) {
  const R_BG = 225, G_BG = 29, B_BG = 72; // rose-600 #e11d48
  const R_FG = 255, G_FG = 255, B_FG = 255;

  // Rounded-rect corner radius: ~22 % of size
  const radius = Math.round(size * 0.22);

  // Check if inside rounded rect
  function insideRoundedRect(px, py) {
    const inX = px >= 0 && px < size;
    const inY = py >= 0 && py < size;
    if (!inX || !inY) return false;
    const cx = Math.min(px - radius, 0) + Math.min(size - 1 - px - radius, 0);
    const cy = Math.min(py - radius, 0) + Math.min(size - 1 - py - radius, 0);
    return cx * cx + cy * cy <= 0; // corners
  }

  // Proper rounded rect: clip corners
  function inBg(px, py) {
    const minX = radius, maxX = size - 1 - radius;
    const minY = radius, maxY = size - 1 - radius;

    // Inside the non-corner zones
    if (px >= minX && px <= maxX) return true;
    if (py >= minY && py <= maxY) return true;

    // Corner test
    const nearX = px < minX ? minX : maxX;
    const nearY = py < minY ? minY : maxY;
    const dx = px - nearX, dy = py - nearY;
    return dx * dx + dy * dy <= radius * radius;
  }

  if (!inBg(x, y)) return [0, 0, 0, 0]; // transparent

  // Safe zone padding: 15 % on each side for maskable spec
  const pad = Math.round(size * 0.18);
  const sz = size - pad * 2; // safe zone size

  // Pixel-art "G" bitmap (9×9 grid, scaled to safe zone)
  // 1 = white foreground, 0 = transparent
  const G_GRID = [
    [0, 1, 1, 1, 1, 1, 0, 0, 0],
    [1, 1, 0, 0, 0, 1, 1, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 1, 1, 1, 1, 0, 0],
    [1, 0, 0, 0, 0, 1, 1, 0, 0],
    [1, 1, 0, 0, 0, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];

  const rows = G_GRID.length;
  const cols = G_GRID[0].length;
  // Scale the glyph to ~62 % of safe zone, centred
  const glyphW = Math.round(sz * 0.62);
  const glyphH = Math.round(sz * 0.62);
  const glyphX = pad + Math.round((sz - glyphW) / 2);
  const glyphY = pad + Math.round((sz - glyphH) / 2);

  const lx = x - glyphX;
  const ly = y - glyphY;

  if (lx >= 0 && lx < glyphW && ly >= 0 && ly < glyphH) {
    const col = Math.floor((lx / glyphW) * cols);
    const row = Math.floor((ly / glyphH) * rows);
    if (G_GRID[row]?.[col] === 1) return [R_FG, G_FG, B_FG, 255];
  }

  return [R_BG, G_BG, B_BG, 255];
}

function createPNG(size) {
  // IHDR: RGBA (color type 6)
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter: adaptive
  ihdr[12] = 0; // interlace: none

  // Raw scanlines: [filter_byte, r, g, b, a, ...] per row
  const rowLen = 1 + size * 4;
  const raw = Buffer.allocUnsafe(size * rowLen);

  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = renderPixel(x, y, size);
      const o = y * rowLen + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }

  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG signature
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ─── Main ────────────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of SIZES) {
  const buf = createPNG(size);
  const filename = `icon-${size}.png`;
  writeFileSync(join(OUT_DIR, filename), buf);
  process.stdout.write(`  ✓ ${filename}  (${(buf.length / 1024).toFixed(1)} KB)\n`);
}

// Badge icon: small, no lettermark — just solid rose circle (for push notification badge)
function createBadgePNG(size) {
  const R_BG = 225, G_BG = 29, B_BG = 72;
  const rowLen = 1 + size * 4;
  const raw = Buffer.allocUnsafe(size * rowLen);
  const cx = size / 2, cy = size / 2, r2 = (size / 2 - 1) ** 2;

  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const inside = dx * dx + dy * dy <= r2;
      const o = y * rowLen + 1 + x * 4;
      raw[o] = inside ? R_BG : 0;
      raw[o + 1] = inside ? G_BG : 0;
      raw[o + 2] = inside ? B_BG : 0;
      raw[o + 3] = inside ? 255 : 0;
    }
  }

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const badge = createBadgePNG(72);
writeFileSync(join(OUT_DIR, "badge-72.png"), badge);
process.stdout.write(`  ✓ badge-72.png  (${(badge.length / 1024).toFixed(1)} KB)\n`);

process.stdout.write(`\nAll icons written to ${OUT_DIR}\n`);
