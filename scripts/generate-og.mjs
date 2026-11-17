#!/usr/bin/env node
/** Genera public/og.png (1200×630) sin dependencias nativas. */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const W = 1200;
const H = 630;

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Fondo piedra + franja viridian + píxeles de texto aproximados (bitmap 5x7)
const bg = [0xe8, 0xe6, 0xe1];
const ink = [0x1a, 0x1c, 0x1e];
const live = [0x0b, 0x6e, 0x4f];

const glyphs = {
  d: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  e: ['11111', '10000', '11110', '10000', '10000', '10000', '11111'],
  b: ['10000', '10000', '11110', '10001', '10001', '10001', '11110'],
  u: ['10001', '10001', '10001', '10001', '10001', '10001', '01111'],
  g: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  s: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  i: ['00100', '00000', '01100', '00100', '00100', '00100', '01110'],
  t: ['11111', '00100', '00100', '00100', '00100', '00100', '00110'],
  o: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00100', '00100'],
  c: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  l: ['01100', '00100', '00100', '00100', '00100', '00100', '01110'],
  k: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

const raw = Buffer.alloc((W * H * 3) + H);
for (let y = 0; y < H; y++) {
  const row = y * (W * 3 + 1);
  raw[row] = 0;
  for (let x = 0; x < W; x++) {
    const i = row + 1 + x * 3;
    let c = bg;
    if (y > 520 && y < 560) c = live;
    if (x < 48) c = live;
    raw[i] = c[0];
    raw[i + 1] = c[1];
    raw[i + 2] = c[2];
  }
}

function drawText(text, ox, oy, scale, color) {
  let cx = ox;
  for (const ch of text) {
    const g = glyphs[ch] || glyphs[' '];
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (g[gy][gx] !== '1') continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const x = cx + gx * scale + sx;
            const y = oy + gy * scale + sy;
            if (x < 0 || x >= W || y < 0 || y >= H) continue;
            const i = y * (W * 3 + 1) + 1 + x * 3;
            raw[i] = color[0];
            raw[i + 1] = color[1];
            raw[i + 2] = color[2];
          }
        }
      }
    }
    cx += 6 * scale;
  }
}

drawText('debugsito', 80, 180, 10, ink);
drawText('debugsito.click', 80, 320, 4, live);
drawText('devops · lima', 80, 400, 3, ink);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 2;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = join(__dirname, '../public/og.png');
writeFileSync(out, png);
console.log('og.png →', out, png.length, 'bytes');
