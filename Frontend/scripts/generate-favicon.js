/**
 * generate-favicon.js
 * Generates transparent desktop website favicons:
 * - favicon.ico (multi-size: 16x16, 32x32, 48x48) with PNG frames
 * - favicon.svg (vector favicon for desktop browsers)
 * - favicon-32x32.png
 * - favicon-16x16.png
 * - src/app/icon.png
 * - src/app/favicon.ico
 * - public/favicon.ico
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, 'logo-mark.svg');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const APP_DIR = path.join(__dirname, '..', 'src', 'app');

const rawSvg = fs.readFileSync(SVG_PATH, 'utf8');

function createIco(pngBuffers) {
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(numImages, 4);

  const entries = [];
  let offset = 6 + (16 * numImages);

  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

async function renderTransparentLeaf(size) {
  // Fit leaf inside square with small padding so it looks great in browser tab
  const pad = Math.max(1, Math.round(size * 0.05));
  const innerH = size - pad * 2;
  const aspect = 128 / 220; // viewBox ratio
  const innerW = Math.round(innerH * aspect);

  const svgWithDims = rawSvg.replace(
    '<svg ',
    `<svg width="${innerW}" height="${innerH}" `
  );

  const leafBuffer = await sharp(Buffer.from(svgWithDims))
    .resize(innerW, innerH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100 })
    .toBuffer();

  const offsetX = Math.round((size - innerW) / 2);
  const offsetY = pad;

  return await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: leafBuffer, left: offsetX, top: offsetY }])
    .png({ quality: 100 })
    .toBuffer();
}

async function main() {
  console.log('Generating transparent favicons from logo-mark.svg...');

  // 1. Copy SVG favicon to public/favicon.svg
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), rawSvg);
  console.log('✅ public/favicon.svg written');

  // 2. Render PNGs for 16, 32, 48, 64, 128
  const buf16 = await renderTransparentLeaf(16);
  const buf32 = await renderTransparentLeaf(32);
  const buf48 = await renderTransparentLeaf(48);
  const buf64 = await renderTransparentLeaf(64);
  const buf128 = await renderTransparentLeaf(128);

  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-16x16.png'), buf16);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-32x32.png'), buf32);
  console.log('✅ public/favicon-16x16.png & 32x32.png written');

  // 3. Create ICO containing 16x16, 32x32, 48x48
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: buf16 },
    { width: 32, height: 32, buffer: buf32 },
    { width: 48, height: 48, buffer: buf48 }
  ]);

  // Write favicon.ico to public/ and src/app/
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(APP_DIR, 'favicon.ico'), icoBuffer);
  console.log('✅ public/favicon.ico & src/app/favicon.ico written');

  // Also update src/app/icon.png with sharp transparent 128x128
  fs.writeFileSync(path.join(APP_DIR, 'icon.png'), buf128);
  console.log('✅ src/app/icon.png written (128x128 transparent)');

  console.log('\n🎉 Desktop favicons generation complete!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
