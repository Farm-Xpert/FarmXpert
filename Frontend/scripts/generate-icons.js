/**
 * generate-icons.js
 * Renders the FarmXpert LogoMark SVG into high-quality PNGs for PWA.
 *
 * Mobile OSes (Android + iOS) do NOT support transparent PWA icons:
 *   - Android fills transparency with white on home screen, black on splash
 *   - iOS fills transparency with black
 *
 * Solution: bake the background color into the icon so it looks clean everywhere.
 *   - "any" icons use #fbf7f1 (cream — matches background_color in manifest)
 *     → On splash screen the icon blends seamlessly (appears "no background")
 *     → On home screen it appears as a clean cream icon
 *   - "maskable" icon uses #0f4a2e (forest green) for the adaptive safe-zone
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SVG_PATH = path.join(__dirname, 'logo-mark.svg');

const rawSvg = fs.readFileSync(SVG_PATH, 'utf8');

// Brand colors
const CREAM  = { r: 251, g: 247, b: 241, alpha: 1 };  // #fbf7f1 — page/splash bg
const GREEN  = { r: 15,  g: 74,  b: 46,  alpha: 1 };   // #0f4a2e — brand green

async function generateIcon(size, outputName, { background, padding = 0.15 } = {}) {
  const pad = Math.round(size * padding);
  const innerH = size - pad * 2;
  const aspect = 128 / 220;  // viewBox ratio
  const innerW = Math.round(innerH * aspect);

  const svgWithDims = rawSvg.replace(
    '<svg ',
    `<svg width="${innerW}" height="${innerH}" `
  );

  const leafBuffer = await sharp(Buffer.from(svgWithDims))
    .resize(innerW, innerH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

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
  if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

  // ── "any" icons — cream background (#fbf7f1) ──
  // Matches manifest background_color → splash screen looks seamless
  await generateIcon(192, 'icon-192x192.png', {
    background: CREAM,
    padding: 0.12
  });

  await generateIcon(512, 'icon-512x512.png', {
    background: CREAM,
    padding: 0.12
  });

  // ── Apple Touch Icon — cream background ──
  await generateIcon(180, 'apple-touch-icon.png', {
    background: CREAM,
    padding: 0.15
  });

  // ── Maskable icon — forest green for adaptive icon ring ──
  await generateIcon(512, 'icon-maskable-512x512.png', {
    background: GREEN,
    padding: 0.22
  });

  console.log('\n🎉 All icons generated!');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
