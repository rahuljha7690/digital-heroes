import PDFDocument from 'pdfkit';

// Helvetica has no ₹ glyph, so amounts are printed as "INR 1,234.00".
const money = (value, currency = 'INR') =>
  `${currency} ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const buildInvoicePdf = (order, customer, product) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Invoice ${order.orderNumber}` } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const p = order.pricing || {};
    const paid = order.paymentStatus === 'paid';
    const seller = process.env.COMPANY_NAME || 'Digital Heroes';

    doc.fontSize(22).font('Helvetica-Bold').text(seller.toUpperCase());
    doc.fontSize(9).font('Helvetica').fillColor('#555').text(process.env.COMPANY_ADDRESS || 'digitalheroes.co.in');
    if (process.env.COMPANY_TAX_ID) doc.text(`GSTIN / Tax ID: ${process.env.COMPANY_TAX_ID}`);

    doc.moveDown(1.5).fillColor('#000').fontSize(16).font('Helvetica-Bold')
      .text(paid ? 'TAX INVOICE / RECEIPT' : 'PROFORMA INVOICE (UNPAID)');
    doc.fontSize(10).font('Helvetica')
      .text(`Invoice no: INV-${order.orderNumber}`)
      .text(`Order no: ${order.orderNumber}`)
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`)
      .text(`Payment: ${order.paymentStatus}${order.paymentReference ? ` (${order.paymentReference})` : ''}`);

    doc.moveDown().font('Helvetica-Bold').text('Billed to').font('Helvetica')
      .text(customer.name).text(customer.email);

    doc.moveDown(1.5);
    const top = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, top).text('Qty', 330, top, { width: 40, align: 'right' })
      .text('Unit', 380, top, { width: 70, align: 'right' }).text('Amount', 460, top, { width: 85, align: 'right' });
    doc.moveTo(50, top + 16).lineTo(545, top + 16).stroke('#999');

    const rowY = top + 24;
    doc.font('Helvetica');
    doc.text(product?.name || 'Custom print order', 50, rowY, { width: 270 })
      .text(String(p.quantity ?? ''), 330, rowY, { width: 40, align: 'right' })
      .text(money(p.unitPrice, p.currency), 380, rowY, { width: 70, align: 'right' })
      .text(money(p.subtotal, p.currency), 460, rowY, { width: 85, align: 'right' });

    let y = rowY + 50;
    const line = (label, value, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(label, 330, y, { width: 120, align: 'right' })
        .text(value, 460, y, { width: 85, align: 'right' });
      y += 18;
    };
    line('Subtotal', money(p.subtotal, p.currency));
    if (p.discountAmount) line(`Discount (${p.discountPercent}%)`, `- ${money(p.discountAmount, p.currency)}`);
    line(`Tax (${Math.round((p.taxRate || 0) * 100)}%)`, money(p.taxAmount, p.currency));
    line('TOTAL', money(p.total, p.currency), true);

    doc.fontSize(8).fillColor('#777').text('Prices include tax where applicable. Thank you for your order.', 50, 760, { align: 'center', width: 495 });
    doc.end();
  });