// ============================================================
// FILE: src/lib/reportPdf.js
//
// Turns the rendered operations report into a real PDF file and downloads
// it - no print dialog, no new tab. Each block marked `data-pdf-block` is
// captured as an image (html-to-image renders through the browser itself,
// so fonts, SVG charts and modern CSS come out exactly as on screen) and
// laid onto A4 pages; a block that would not fit starts a new page, so no
// chart is ever cut in half. Every page gets the website's cream paper,
// faint botanical leaves and a footer. Saving with the same name twice is
// handled by the browser, which adds " (1)", " (2)".
// ============================================================

const A4 = { w: 210, h: 297 };            // mm
const MARGIN = 14;                         // mm, left/right
const TOP = 14;
const BOTTOM = 16;                         // leaves room for the footer
const PAPER = '#fbf8f1';
const LATIN = /U\+0+-FF\b|U\+0000-00FF/i;  // the subset that covers the report's text
const URL_IN_CSS = /url\(["']?([^"')]+)["']?\)/g;

async function rasterise(src, width) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round((img.naturalHeight / img.naturalWidth) * width);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return { data: canvas.toDataURL('image/png'), ratio: canvas.height / canvas.width };
}

const asDataUrl = (blob) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsDataURL(blob);
});

/**
 * @font-face rules for the fonts this app serves itself (next/font: Poppins,
 * Playfair), Latin subset only, each file inlined once as a data URL.
 * The library's own font embedding also fetched every Google font the landing
 * page links, for every block, and never finished.
 */
async function ownFontsCss() {
  const faces = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }            // cross-origin sheet: not ours
    for (const rule of rules) {
      if (rule.type !== CSSRule.FONT_FACE_RULE) continue;
      const range = rule.style.getPropertyValue('unicode-range');
      if (range && !LATIN.test(range)) continue;
      // font URLs are relative to their stylesheet (../media/x.woff2), not the page
      faces.push({ css: rule.cssText, base: sheet.href || window.location.href });
    }
  }
  const cache = new Map();
  const inline = (url) => {
    if (!cache.has(url)) {
      cache.set(url, fetch(url).then((r) => r.blob()).then(asDataUrl).catch(() => url));
    }
    return cache.get(url);
  };
  const out = await Promise.all(faces.map(async ({ css, base }) => {
    let text = css;
    for (const [, u] of css.matchAll(URL_IN_CSS)) {
      text = text.replace(u, await inline(new URL(u, base).href));
    }
    return text;
  }));
  return out.join('\n');
}

export async function downloadReportPdf(root, filename) {
  const [{ jsPDF }, { toJpeg }] = await Promise.all([import('jspdf'), import('html-to-image')]);
  await document.fonts.ready;

  const fontEmbedCSS = await ownFontsCss();                 // once, reused for every block
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const decoCorner = await rasterise('/images/botanical/leaves-corner.svg', 500).catch(() => null);
  const decoFern = await rasterise('/images/botanical/fern.svg', 400).catch(() => null);

  const paper = () => {
    doc.setFillColor(PAPER);
    doc.rect(0, 0, A4.w, A4.h, 'F');
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.12 }));
    if (decoCorner) doc.addImage(decoCorner.data, 'PNG', A4.w - 52, -6, 58, 58 * decoCorner.ratio);
    if (decoFern) doc.addImage(decoFern.data, 'PNG', -10, A4.h - 60, 44, 44 * decoFern.ratio);
    doc.restoreGraphicsState();
  };

  // Copy real style properties plus the design tokens the charts read
  // (--viz-*, --fx-*). Copying every CSS variable (the framework defines
  // hundreds) onto every node made each capture take minutes.
  const includeStyleProperties = Array.from(getComputedStyle(root))
    .filter((p) => !p.startsWith('--') || p.startsWith('--viz') || p.startsWith('--fx'));

  paper();
  let y = 0;
  let first = true;
  for (const block of root.querySelectorAll('[data-pdf-block]')) {
    const full = block.hasAttribute('data-pdf-full');          // the cover band runs edge to edge
    const width = full ? A4.w : A4.w - MARGIN * 2;
    const data = await toJpeg(block, { pixelRatio: 2, quality: 0.92, fontEmbedCSS, includeStyleProperties, backgroundColor: PAPER });
    const height = (block.offsetHeight / block.offsetWidth) * width;
    // a block that would not fit, or one the report marks to open a page (.rp-break)
    if (!first && (y + height > A4.h - BOTTOM || block.classList.contains('rp-break'))) {
      doc.addPage();
      paper();
      y = TOP;
    }
    doc.addImage(data, 'JPEG', full ? 0 : MARGIN, y, width, height, undefined, 'FAST');
    y += height + (full ? 8 : 7);
    first = false;
  }

  // footer on every page
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setDrawColor('#e3dac5');
    doc.setLineWidth(0.2);
    doc.line(MARGIN, A4.h - 11, A4.w - MARGIN, A4.h - 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor('#8c968f');
    doc.text('FarmXpert - operations & budget report - aggregated figures only', MARGIN, A4.h - 7);
    doc.text(`${p} / ${total}`, A4.w - MARGIN, A4.h - 7, { align: 'right' });
  }

  doc.save(filename);
}
