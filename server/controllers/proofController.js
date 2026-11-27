import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Proof from '../models/Proof.js';
import Design from '../models/Design.js';
import { UPLOAD_ROOT } from '../utils/paths.js';
import { getPrintSpec } from '../utils/printSpecs.js';
import { renderArtwork } from '../utils/artworkRenderer.js';
import { notifyCustomer, notifyAdmins } from '../utils/notify.js';

const PROOF_DIR = path.join(UPLOAD_ROOT, 'proofs');

// Creates the next proof version (v1, v2, ...) and supersedes any pending one.
const createProofRevision = async (order, previewUrl, notes) => {
  const latestProof = await Proof.findOne({ order: order._id }).sort({ version: -1 });
  const nextVersion = latestProof ? latestProof.version + 1 : 1;

  await Proof.updateMany({ order: order._id, status: 'pending' }, { $set: { status: 'superseded' } });

  const proof = await Proof.create({
    order: order._id,
    customer: order.customer,
    version: nextVersion,
    previewUrl,
    notes,
    status: 'pending',
  });

  order.currentProof = proof._id;
  order.proofApproved = false;
  order.status = 'proof';
  await order.save();

  notifyCustomer(order._id, 'proof_ready', { version: proof.version });
  return proof;
};

// ADMIN: Create a new proof revision from a preview URL.
export const createProof = async (req, res) => {
  try {
    const { previewUrl, notes = '' } = req.body;
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }
    if (typeof previewUrl !== 'string' || !previewUrl.trim() || previewUrl.length > 2048) {
      return res.status(400).json({ success: false, message: 'A valid proof preview URL is required.' });
    }
    if (typeof notes !== 'string' || notes.length > 2000) {
      return res.status(400).json({ success: false, message: 'Proof notes must be 2000 characters or fewer.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (['cancelled', 'completed'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot create a proof for this order.' });
    }

    const proof = await createProofRevision(order, previewUrl.trim(), notes.trim());
    return res.status(201).json({ success: true, message: `Proof v${proof.version} created successfully.`, proof });
  } catch (error) {
    console.error('Create proof error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create proof.' });
  }
};

// ADMIN: Render the customer's saved design into a proof image automatically.
export const generateProof = async (req, res) => {
  try {
    const { orderId } = req.params;
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 2000) : '';
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const order = await Order.findById(orderId).populate('product', 'division');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (['cancelled', 'completed'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot create a proof for this order.' });
    }

    const design = order.design ? await Design.findById(order.design) : null;
    if (!design?.canvasData?.objects?.length) {
      return res.status(400).json({
        success: false,
        message: 'This order has no in-browser design to render. Create the proof from a preview URL instead.',
      });
    }

    // Proof = trimmed artwork (no bleed) at screen-friendly resolution.
    const spec = { ...getPrintSpec(order.product.division), bleedMm: 0, dpi: 150 };
    const { png } = await renderArtwork(design.canvasData, spec, { title: order.orderNumber });

    fs.mkdirSync(PROOF_DIR, { recursive: true });
    const fileName = `${order.orderNumber}-${crypto.randomBytes(4).toString('hex')}.png`;
    fs.writeFileSync(path.join(PROOF_DIR, fileName), png);
    const previewUrl = `${req.protocol}://${req.get('host')}/uploads/proofs/${fileName}`;

    const proof = await createProofRevision(order, previewUrl, notes);
    return res.status(201).json({ success: true, message: `Proof v${proof.version} generated from the design.`, proof });
  } catch (error) {
    console.error('Generate proof error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate proof.' });
  }
};

// CUSTOMER: Get proof history for an order.
export const getOrderProofs = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }
    const order = await Order.findOne({ _id: orderId, customer: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const proofs = await Proof.find({ order: order._id }).populate('reviewedBy', 'name').sort({ version: -1 });
    return res.json({ success: true, proofs, proofApproved: order.proofApproved });
  } catch (error) {
    console.error('Get proof history error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load proof history.' });
  }
};

// CUSTOMER: Approve a proof or request changes.
export const reviewProof = async (req, res) => {
  try {
    const { proofId } = req.params;
    const { action, comment = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(proofId)) {
      return res.status(400).json({ success: false, message: 'Invalid proof ID.' });
    }
    if (!['approve', 'request_changes'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid proof review action.' });
    }
    if (typeof comment !== 'string' || comment.length > 2000 || (action === 'request_changes' && !comment.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid comment when requesting changes.' });
    }

    const proof = await Proof.findOne({ _id: proofId, customer: req.user._id });
    if (!proof) return res.status(404).json({ success: false, message: 'Proof not found.' });

    const order = await Order.findOne({ _id: proof.order, customer: req.user._id });
    if (!order || String(order.currentProof) !== String(proof._id)) {
      return res.status(409).json({ success: false, message: 'Only the latest proof can be reviewed.' });
    }
    if (proof.status !== 'pending') {
      return res.status(409).json({ success: false, message: 'This proof has already been reviewed.' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'changes_requested';

    // Atomic update prevents duplicate reviews.
    const updatedProof = await Proof.findOneAndUpdate(
      { _id: proof._id, status: 'pending' },
      { $set: { status: newStatus, customerComment: comment.trim(), reviewedBy: req.user._id, reviewedAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!updatedProof) {
      return res.status(409).json({ success: false, message: 'This proof has already been reviewed.' });
    }

    order.proofApproved = action === 'approve';
    if (action === 'request_changes') order.status = 'artwork';
    await order.save();

    // Approved artwork is frozen and stored on the account for reuse / reorder.
    if (action === 'approve' && order.design) {
      await Design.updateOne({ _id: order.design }, { $set: { status: 'approved' } });
    }

    notifyAdmins(order, updatedProof, action, comment.trim());

    return res.json({
      success: true,
      message: action === 'approve' ? 'Proof approved successfully.' : 'Changes requested successfully.',
      proof: updatedProof,
      proofApproved: order.proofApproved,
    });
  } catch (error) {
    console.error('Review proof error:', error);
    return res.status(500).json({ success: false, message: 'Unable to review proof.' });
  }
};