import crypto from 'crypto';
import path from 'path';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Design from '../models/Design.js';
import Proof from '../models/Proof.js';
import { calculateQuote } from '../utils/pricing.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { buildInvoicePdf } from '../utils/invoicePdf.js';
import { notifyCustomer } from '../utils/notify.js';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

export const createOrder = async (req, res) => {
  try {
    const { productId, quantity, options = {}, designId } = req.body;

    if (!isValidId(productId)) {
      return res.status(400).json({ success: false, message: 'Valid product ID is required.' });
    }

    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    // Always calculate the final amount on the server.
    const pricing = calculateQuote(product, quantity, options);

    let design = null;
    if (designId) {
      if (!isValidId(designId)) {
        return res.status(400).json({ success: false, message: 'Invalid design ID.' });
      }
      design = await Design.findOne({
        _id: designId,
        customer: req.user._id,
        product: product._id,
        status: { $in: ['draft', 'submitted', 'approved'] },
      });
      if (!design) {
        return res.status(404).json({ success: false, message: 'Your design was not found.' });
      }
    }

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      customer: req.user._id,
      product: product._id,
      design: design?._id,
      configuration: { quantity: pricing.quantity, options },
      pricing,
      status: 'order',
      paymentStatus: 'pending',
    });

    if (design && design.status === 'draft') {
      design.status = 'submitted';
      await design.save();
    }

    notifyCustomer(order._id, 'order_placed');

    return res.status(201).json({ success: true, message: 'Order placed successfully.', order });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Unable to place order.' });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('product', 'name slug division image')
      .populate('design', 'name previewUrl status')
      .populate('currentProof', 'version status')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Get customer orders error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load your orders.' });
  }
};

// POST /api/orders/:orderId/reorder  — one-click reorder from saved artwork
export const reorderOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!isValidId(orderId)) return res.status(400).json({ success: false, message: 'Invalid order ID.' });

    const source = await Order.findOne({ _id: orderId, customer: req.user._id });
    if (!source) return res.status(404).json({ success: false, message: 'Order not found.' });

    const product = await Product.findOne({ _id: source.product, isActive: true });
    if (!product) {
      return res.status(409).json({ success: false, message: 'This product is no longer available.' });
    }

    // Re-price on the server with today's prices; quantity can be overridden.
    const quantity = req.body?.quantity ?? source.configuration?.quantity;
    const pricing = calculateQuote(product, quantity, source.configuration?.options || {});

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      customer: req.user._id,
      product: product._id,
      design: source.design,
      configuration: { quantity: pricing.quantity, options: source.configuration?.options || {} },
      pricing,
      status: 'order',
      paymentStatus: 'pending',
      reorderOf: source._id,
    });

    // Carry the approved proof over as v1 so the approval gate and audit trail stay intact.
    if (source.proofApproved && source.currentProof) {
      const approved = await Proof.findOne({ _id: source.currentProof, status: 'approved' });
      if (approved) {
        const carried = await Proof.create({
          order: order._id,
          customer: req.user._id,
          version: 1,
          previewUrl: approved.previewUrl,
          notes: `Carried over from ${source.orderNumber} (proof v${approved.version}, approved ${approved.reviewedAt?.toISOString?.().slice(0, 10)}).`,
          status: 'approved',
          reviewedBy: req.user._id,
          reviewedAt: approved.reviewedAt || new Date(),
        });
        order.currentProof = carried._id;
        order.proofApproved = true;
        await order.save();
      }
    }

    notifyCustomer(order._id, 'order_placed');
    return res.status(201).json({ success: true, message: 'Reorder placed.', order });
  } catch (error) {
    console.error('Reorder error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Unable to reorder.' });
  }
};

// GET /api/orders/:orderId/invoice
export const getInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!isValidId(orderId)) return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    const order = await Order.findOne({ _id: orderId, customer: req.user._id }).populate('product', 'name');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const pdf = await buildInvoicePdf(order, req.user, order.product);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${order.orderNumber}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error('Invoice error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate invoice.' });
  }
};

// POST /api/orders/:orderId/artwork  — upload finished artwork (multer runs in the route)
export const uploadOrderArtwork = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Please attach a PDF, SVG, AI, PNG or JPG file.' });
    const order = await Order.findOne({ _id: req.params.orderId, customer: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Artwork can no longer be added to this order.' });
    }
    order.artworkFiles.push({
      originalName: path.basename(req.file.originalname).slice(0, 200),
      storedName: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
    await order.save();
    return res.status(201).json({ success: true, message: 'Artwork uploaded.', artworkFiles: order.artworkFiles });
  } catch (error) {
    console.error('Upload artwork error:', error);
    return res.status(500).json({ success: false, message: 'Unable to upload artwork.' });
  }
};

export const artworkStoredName = (originalName) =>
  `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(originalName).toLowerCase()}`;