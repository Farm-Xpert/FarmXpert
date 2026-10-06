/**
 * generate-icons.js
 * Renders the FarmXpert LogoMark SVG into high-quality transparent PNGs
 * for PWA icons and Apple Touch Icon.
 *
 * Uses sharp (bundled with Next.js) for pixel-perfect SVG-to-PNG conversion.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SVG_PATH = path.join(__dirname, 'logo-mark.svg');

// Read the raw SVG
const rawSvg = fs.readFileSync(SVG_PATH, 'utf8');

// The SVG viewBox is "0 0 128 220" — a tall leaf shape.
// We want to center it in a square canvas with generous padding so it looks
// like a proper app icon (not edge-to-edge).

async function generateIcon(size, outputName, { background = { r: 0, g: 0, b: 0, alpha: 0 }, padding = 0.15 } = {}) {
  // padding = fraction of size reserved on each side
  const pad = Math.round(size * padding);
  const innerH = size - pad * 2;  // available height for the leaf
  // viewBox is 128 wide × 220 tall, so aspect = 128/220 ≈ 0.582
  const aspect = 128 / 220;
  const innerW = Math.round(innerH * aspect);

  // Render SVG at the inner dimensions (sharp will rasterise at this res)
  const svgWithDims = rawSvg.replace(
    '<svg ',
    `<svg width="${innerW}" height="${innerH}" `
  );

  const leafBuffer = await sharp(Buffer.from(svgWithDims))
    .resize(innerW, innerH, { fit: 'contain', background })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  // Composite onto a square canvas
  const offsetX = Math.round((size - innerW) / 2);
  const offsetY = pad;

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background
    }
  })
    .composite([{ input: leafBuffer, left: offsetX, top: offsetY }])
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(ICONS_DIR, outputName));

  console.log(`✅ ${outputName} (${size}×${size}) written`);
}

async function main() {
  // Ensure output dir exists
  if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

  // ── Android / general PWA icons (fully transparent background) ──
  await generateIcon(192, 'icon-192x192.png', {
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    padding: 0.12
  });

  await generateIcon(512, 'icon-512x512.png', {
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    padding: 0.12
  });

  // ── Apple Touch Icon ──
  // iOS always clips to a rounded-rect and does NOT support transparency.
  // We use a rich forest green (#0f4a2e) that matches the brand.
  await generateIcon(180, 'apple-touch-icon.png', {
    background: { r: 15, g: 74, b: 46, alpha: 1 },
    padding: 0.18
  });

  // ── Maskable icon for Android adaptive icons ──
  // Needs a solid background + extra safe-zone padding (≥10% per spec, we use 20%)
  await generateIcon(512, 'icon-maskable-512x512.png', {
    background: { r: 15, g: 74, b: 46, alpha: 1 },
    padding: 0.22
  });

  console.log('\n🎉 All icons generated successfully!');
}

main().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
