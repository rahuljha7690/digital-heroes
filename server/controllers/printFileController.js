import mongoose from 'mongoose';
import path from 'path';
import * as archiver from 'archiver';
import { parse } from 'csv-parse/sync';
import Order from '../models/Order.js';
import { ARTWORK_DIR } from '../utils/paths.js';
import { getPrintSpec, printFileName, toPascal } from '../utils/printSpecs.js';
import { renderArtwork, buildArtworkSvg, svgToPng, pngToPdf, hasPlaceholders } from '../utils/artworkRenderer.js';

const MAX_CSV_ROWS = 500;

// Print-ready files unlock only after the customer approved the current proof.
const isUnlocked = (order) =>
  Boolean(order.proofApproved && order.currentProof && order.currentProof.status === 'approved');

const loadOrder = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) return null;
  return Order.findById(orderId)
    .populate('product', 'name division')
    .populate('design', 'name canvasData status')
    .populate('currentProof', 'status version');
};

const jobTicket = (order, spec, division) =>
  [
    `ORDER        ${order.orderNumber}`,
    `PRODUCT      ${order.product?.name} (${division})`,
    `QUANTITY     ${order.configuration?.quantity}`,
    `OPTIONS      ${JSON.stringify(order.configuration?.options || {})}`,
    `TRIM SIZE    ${spec.widthMm} x ${spec.heightMm} mm`,
    `BLEED        ${spec.bleedMm} mm each side`,
    `RESOLUTION   ${spec.dpi} dpi`,
    `PROOF        v${order.currentProof?.version} approved`,
  ].join('\n');

// GET /api/admin/orders/:orderId/print-files
export const getPrintFileInfo = async (req, res) => {
  const order = await loadOrder(req.params.orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  const division = order.product?.division;
  const spec = getPrintSpec(division);
  const canvasData = order.design?.canvasData;
  const unlocked = isUnlocked(order);

  return res.json({
    success: true,
    unlocked,
    reason: unlocked ? null : 'Customer must approve the current proof before print files unlock.',
    hasDesign: Boolean(canvasData?.objects?.length),
    supportsCsvMerge: hasPlaceholders(canvasData),
    spec,
    fileNames: {
      pdf: printFileName(order, division, 'pdf'),
      png: printFileName(order, division, 'png'),
      zip: `${order.orderNumber}.zip`,
    },
    uploadedArtwork: (order.artworkFiles || []).map((f) => ({
      storedName: f.storedName,
      originalName: f.originalName,
      size: f.size,
      uploadedAt: f.uploadedAt,
    })),
  });
};

// GET /api/admin/orders/:orderId/print-files/download?format=pdf|png|zip
export const downloadPrintFile = async (req, res) => {
  const order = await loadOrder(req.params.orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  if (!isUnlocked(order)) {
    return res.status(403).json({ success: false, message: 'Print files are locked until the proof is approved.' });
  }
  if (!order.design?.canvasData?.objects?.length) {
    return res.status(400).json({
      success: false,
      message: 'This order has no in-browser design. Download the customer-uploaded artwork instead.',
    });
  }

  const format = ['pdf', 'png', 'zip'].includes(req.query.format) ? req.query.format : 'pdf';
  const division = order.product.division;
  const spec = getPrintSpec(division);
  const { png, pdf, warnings } = await renderArtwork(order.design.canvasData, spec, {
    title: order.orderNumber,
  });

  if (format === 'pdf' || format === 'png') {
    const buffer = format === 'pdf' ? pdf : png;
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${printFileName(order, division, format)}"`);
    return res.send(buffer);
  }

  // zip: order-based directory with PDF, PNG and a job ticket
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${order.orderNumber}.zip"`);
  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('error', () => res.destroy());
  archive.pipe(res);
  archive.append(pdf, { name: `${order.orderNumber}/${printFileName(order, division, 'pdf')}` });
  archive.append(png, { name: `${order.orderNumber}/${printFileName(order, division, 'png')}` });
  archive.append(`${jobTicket(order, spec, division)}\n${warnings.length ? `\nWARNINGS\n${warnings.join('\n')}` : ''}`, {
    name: `${order.orderNumber}/job-ticket.txt`,
  });
  return archive.finalize();
};

// POST /api/admin/orders/:orderId/csv-merge   (multipart: file=.csv)
export const csvMerge = async (req, res) => {
  const order = await loadOrder(req.params.orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  if (!isUnlocked(order)) {
    return res.status(403).json({ success: false, message: 'CSV merge is locked until the proof is approved.' });
  }
  if (!req.file) return res.status(400).json({ success: false, message: 'Please attach a .csv file.' });

  const canvasData = order.design?.canvasData;
  if (!hasPlaceholders(canvasData)) {
    return res.status(400).json({
      success: false,
      message: 'The design has no {{placeholder}} text. Use text like {{name}} or {{number}} in the designer.',
    });
  }

  let rows;
  try {
    rows = parse(req.file.buffer, {
      columns: (header) => header.map((h) => String(h).trim()),
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: `Invalid CSV: ${error.message}` });
  }
  if (!rows.length) return res.status(400).json({ success: false, message: 'The CSV has no data rows.' });
  if (rows.length > MAX_CSV_ROWS) {
    return res.status(400).json({ success: false, message: `Maximum ${MAX_CSV_ROWS} rows per merge.` });
  }

  const asNumber = (value) => (value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : undefined);
  const fitDefaults = {
    minFontSize: asNumber(req.body.minFontSize),
    maxFontSize: asNumber(req.body.maxFontSize),
    minCharSpacing: asNumber(req.body.minCharSpacing),
  };
  const includePng = req.body.includePng === 'true';

  const division = order.product.division;
  const spec = getPrintSpec(division);
  const dir = `${order.orderNumber}_CSV`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${order.orderNumber}_${toPascal(division)}_CSVMerge.zip"`);
  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('error', () => res.destroy());
  archive.pipe(res);

  const report = ['row,file,warnings'];
  for (let i = 0; i < rows.length; i += 1) {
    const fields = Object.fromEntries(Object.entries(rows[i]).map(([k, v]) => [k.toLowerCase(), v]));
    const { svg, warnings } = buildArtworkSvg(canvasData, { spec, fields, fitDefaults });
    const png = await svgToPng(svg, spec.dpi);
    const pdf = await pngToPdf(png, spec, `${order.orderNumber} row ${i + 1}`);
    const base = printFileName(order, division, 'pdf', `Row${String(i + 1).padStart(4, '0')}_Output`).replace(/\.pdf$/, '');
    archive.append(pdf, { name: `${dir}/${base}.pdf` });
    if (includePng) archive.append(png, { name: `${dir}/${base}.png` });
    report.push(`${i + 1},${base}.pdf,"${warnings.join(' | ').replaceAll('"', '""')}"`);
  }
  archive.append(report.join('\n'), { name: `${dir}/merge-report.csv` });
  return archive.finalize();
};

// GET /api/admin/orders/:orderId/artwork/:storedName  (customer-uploaded finished artwork)
export const downloadUploadedArtwork = async (req, res) => {
  const order = await loadOrder(req.params.orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  const file = (order.artworkFiles || []).find((f) => f.storedName === req.params.storedName);
  if (!file) return res.status(404).json({ success: false, message: 'File not found.' });
  return res.download(path.join(ARTWORK_DIR, file.storedName), file.originalName);
};