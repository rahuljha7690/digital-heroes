import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { PRINT_AREA } from './printSpecs.js';
import { UPLOAD_ROOT } from './paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};
const FONT_STACK = "Helvetica, Arial, 'Liberation Sans', 'DejaVu Sans', sans-serif";

const mmToPx = (mm, dpi) => Math.round((mm / 25.4) * dpi);
const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const paint = (value, fallback = '#000000') => (typeof value === 'string' && value ? value : fallback);

// ---------- text measuring (Helvetica metrics, same as Arial) ----------
let measurer;
export const measureText = (text, fontSize, { bold = false, charSpacing = 0 } = {}) => {
  measurer ??= new PDFDocument({ size: 'A4' });
  measurer.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
  const chars = [...text].length;
  return measurer.widthOfString(text) + (charSpacing / 1000) * fontSize * Math.max(chars - 1, 0);
};

/**
 * Per-placeholder fitting: shrink-to-fit first (down to minFontSize),
 * then tighten tracking (down to minCharSpacing). Reports if it still overflows.
 */
export const fitText = (text, { fontSize, charSpacing = 0, bold }, maxWidth, rules = {}) => {
  const minFont = num(rules.minFontSize, 8);
  const maxFont = num(rules.maxFontSize, fontSize);
  const minSpacing = num(rules.minCharSpacing, -60);
  const lines = text.split(/\r?\n/);
  const widest = (size, spacing) =>
    Math.max(0, ...lines.map((line) => measureText(line, size, { bold, charSpacing: spacing })));

  let size = Math.min(fontSize, maxFont);
  let spacing = charSpacing;
  while (widest(size, spacing) > maxWidth && size > minFont) size -= 0.5;
  while (widest(size, spacing) > maxWidth && spacing > minSpacing) spacing -= 5;

  return { size, spacing, overflow: widest(size, spacing) > maxWidth };
};

// ---------- safe image loading (local uploads only: no SSRF) ----------
const resolveImageHref = (src) => {
  if (typeof src !== 'string') return null;
  if (src.startsWith('data:image/')) {
    return /^data:image\/(png|jpeg|webp);base64,/.test(src) ? src : null;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(src, 'http://local').pathname);
  } catch {
    return null;
  }
  if (!pathname.startsWith('/uploads/')) return null;
  const abs = path.resolve(UPLOAD_ROOT, pathname.slice('/uploads/'.length));
  if (!abs.startsWith(UPLOAD_ROOT + path.sep)) return null;
  const mime = MIME_BY_EXT[path.extname(abs).toLowerCase()];
  if (!mime || !fs.existsSync(abs)) return null;
  return `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;
};

const originFactor = (origin) => (origin === 'center' ? 0.5 : origin === 'right' || origin === 'bottom' ? 1 : 0);

const transformOf = (o, w, h) => {
  const sx = (o.flipX ? -1 : 1) * num(o.scaleX, 1);
  const sy = (o.flipY ? -1 : 1) * num(o.scaleY, 1);
  return (
    `translate(${num(o.left)} ${num(o.top)}) rotate(${num(o.angle)}) scale(${sx} ${sy}) ` +
    `translate(${-originFactor(o.originX) * w} ${-originFactor(o.originY) * h})`
  );
};

const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;
const HAS_PLACEHOLDER = /\{\{[^{}]+\}\}/;
export const hasPlaceholders = (canvasData) =>
  (canvasData?.objects || []).some((o) => typeof o?.text === 'string' && HAS_PLACEHOLDER.test(o.text));

/**
 * Convert Fabric.js canvas JSON into an SVG sized for print (bleed included).
 * `fields` (optional) substitutes {{placeholders}} for CSV variable-data merge.
 */
export const buildArtworkSvg = (canvasData = {}, { spec, fields = null, fitDefaults = {} } = {}) => {
  const warnings = [];
  const pxPerMm = PRINT_AREA.width / spec.widthMm;
  const bleedPx = spec.bleedMm * pxPerMm;
  const vb = {
    x: PRINT_AREA.left - bleedPx,
    y: PRINT_AREA.top - bleedPx,
    w: PRINT_AREA.width + 2 * bleedPx,
    h: PRINT_AREA.height + 2 * bleedPx,
  };
  const outW = mmToPx(spec.widthMm + 2 * spec.bleedMm, spec.dpi);
  const outH = mmToPx(spec.heightMm + 2 * spec.bleedMm, spec.dpi);
  const body = [];

  (canvasData.objects || []).forEach((o, index) => {
    if (!o || o.visible === false || o.excludeFromExport) return;
    const type = String(o.type || '').toLowerCase();
    const opacity = num(o.opacity, 1);

    if (type === 'rect') {
      const w = num(o.width);
      const h = num(o.height);
      body.push(
        `<g transform="${transformOf(o, w, h)}" opacity="${opacity}"><rect width="${w}" height="${h}" rx="${num(o.rx)}" ry="${num(o.ry)}" fill="${esc(paint(o.fill, 'none'))}" stroke="${o.stroke ? esc(o.stroke) : 'none'}" stroke-width="${num(o.strokeWidth)}"/></g>`
      );
    } else if (type === 'circle') {
      const r = num(o.radius);
      body.push(
        `<g transform="${transformOf(o, r * 2, r * 2)}" opacity="${opacity}"><circle cx="${r}" cy="${r}" r="${r}" fill="${esc(paint(o.fill, 'none'))}" stroke="${o.stroke ? esc(o.stroke) : 'none'}" stroke-width="${num(o.strokeWidth)}"/></g>`
      );
    } else if (type === 'image') {
      const href = resolveImageHref(o.src);
      if (!href) {
        warnings.push(`Object ${index + 1}: image could not be loaded and was skipped.`);
        return;
      }
      const w = num(o.width);
      const h = num(o.height);
      body.push(
        `<g transform="${transformOf(o, w, h)}" opacity="${opacity}"><image xlink:href="${href}" width="${w}" height="${h}" preserveAspectRatio="none"/></g>`
      );
    } else if (['itext', 'text', 'textbox'].includes(type)) {
      const rawText = typeof o.text === 'string' ? o.text : '';
      const lookup = fields;
      const text = lookup
        ? rawText.replace(PLACEHOLDER, (_, key) => {
            const value = lookup[key.trim().toLowerCase()];
            if (value === undefined) warnings.push(`Object ${index + 1}: no CSV column "${key.trim()}".`);
            return value ?? '';
          })
        : rawText;

      const bold = o.fontWeight === 'bold' || num(o.fontWeight) >= 600;
      let size = num(o.fontSize, 24);
      let spacing = num(o.charSpacing);
      const sx = num(o.scaleX, 1) || 1;
      const hasFit = Boolean(o.fit) || Boolean(lookup && HAS_PLACEHOLDER.test(rawText));

      if (hasFit) {
        const rules = { ...fitDefaults, ...(o.fit || {}) };
        const left = num(o.left);
        const rightEdge = PRINT_AREA.left + PRINT_AREA.width;
        const available =
          rules.maxWidthPx ??
          (o.originX === 'center'
            ? 2 * Math.min(left - PRINT_AREA.left, rightEdge - left)
            : rightEdge - left);
        const fit = fitText(text, { fontSize: size, charSpacing: spacing, bold }, available / sx, rules);
        if (fit.overflow) warnings.push(`Object ${index + 1}: "${text}" still overflows at minimum size.`);
        else if (fit.size < size) warnings.push(`Object ${index + 1}: "${text}" shrunk ${size}→${fit.size}pt.`);
        size = fit.size;
        spacing = fit.spacing;
      }

      const lines = text.split(/\r?\n/);
      const widths = lines.map((line) => measureText(line, size, { bold, charSpacing: spacing }));
      const blockW = Math.max(0, ...widths);
      const lineH = size * num(o.lineHeight, 1.16);
      const align = o.textAlign || 'left';
      const tspans = lines
        .map((line, i) => {
          const dx = align === 'center' ? (blockW - widths[i]) / 2 : align === 'right' ? blockW - widths[i] : 0;
          return `<tspan x="${dx.toFixed(2)}" y="${(size * 0.95 + i * lineH).toFixed(2)}">${esc(line)}</tspan>`;
        })
        .join('');

      body.push(
        `<g transform="${transformOf(o, blockW, lines.length * lineH)}" opacity="${opacity}"><text font-family="${esc(FONT_STACK)}" font-size="${size}" font-weight="${bold ? 'bold' : 'normal'}" fill="${esc(paint(o.fill))}" letter-spacing="${((spacing / 1000) * size).toFixed(3)}" xml:space="preserve">${tspans}</text></g>`
      );
    }
  });

  const background = paint(canvasData.background, '#ffffff');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${outW}" height="${outH}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">` +
    `<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="${esc(background)}"/>` +
    body.join('') +
    `</svg>`;

  return { svg, warnings };
};

export const svgToPng = (svg, dpi) =>
  sharp(Buffer.from(svg)).png().withMetadata({ density: dpi }).toBuffer();

/** Wrap the high-resolution PNG in a PDF page sized trim + bleed, with TrimBox/BleedBox set. */
export const pngToPdf = (png, spec, title = 'Print file') =>
  new Promise((resolve, reject) => {
    const pt = (mm) => (mm * 72) / 25.4;
    const W = pt(spec.widthMm + 2 * spec.bleedMm);
    const H = pt(spec.heightMm + 2 * spec.bleedMm);
    const doc = new PDFDocument({
      size: [W, H],
      margin: 0,
      info: { Title: title, Producer: 'Digital Heroes Print Engine' },
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      const bleed = pt(spec.bleedMm);
      const data = doc.page.dictionary.data;
      data.TrimBox = [bleed, bleed, W - bleed, H - bleed];
      data.BleedBox = [0, 0, W, H];
    } catch {
      /* boxes are a nicety; the PDF is still valid without them */
    }
    doc.image(png, 0, 0, { width: W, height: H });
    doc.end();
  });

/** One call: canvas JSON -> { png, pdf, warnings } */
export const renderArtwork = async (canvasData, spec, options = {}) => {
  const { svg, warnings } = buildArtworkSvg(canvasData, { spec, ...options });
  const png = await svgToPng(svg, spec.dpi);
  const pdf = await pngToPdf(png, spec, options.title);
  return { png, pdf, warnings };
};