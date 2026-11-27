
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Proof from '../models/Proof.js';

// ADMIN: Create a new proof revision.
export const createProof = async (req, res) => {
  try {
    const { previewUrl, notes = '' } = req.body;
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }

    if (
      typeof previewUrl !== 'string' ||
      !previewUrl.trim() ||
      previewUrl.length > 2048
    ) {
      return res.status(400).json({
        success: false,
        message: 'A valid proof preview URL is required.',
      });
    }

    if (typeof notes !== 'string' || notes.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Proof notes must be 2000 characters or fewer.',
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    if (['cancelled', 'completed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create a proof for this order.',
      });
    }

    const latestProof = await Proof.findOne({ order: order._id })
      .sort({ version: -1 });

    const nextVersion = latestProof
      ? latestProof.version + 1
      : 1;

    // Previous proof revisions remain in history.
    await Proof.updateMany(
      { order: order._id, status: 'pending' },
      { $set: { status: 'superseded' } }
    );

    const proof = await Proof.create({
      order: order._id,
      customer: order.customer,
      version: nextVersion,
      previewUrl: previewUrl.trim(),
      notes: notes.trim(),
      status: 'pending',
    });

    order.currentProof = proof._id;
    order.proofApproved = false;
    order.status = 'proof';

    await order.save();

    return res.status(201).json({
      success: true,
      message: `Proof v${nextVersion} created successfully.`,
      proof,
    });
  } catch (error) {
    console.error('Create proof error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to create proof.',
    });
  }
};

// CUSTOMER: Get proof history for an order.
export const getOrderProofs = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      customer: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const proofs = await Proof.find({ order: order._id })
      .populate('reviewedBy', 'name')
      .sort({ version: -1 });

    return res.json({
      success: true,
      proofs,
      proofApproved: order.proofApproved,
    });
  } catch (error) {
    console.error('Get proof history error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load proof history.',
    });
  }
};

// CUSTOMER: Approve a proof or request changes.
export const reviewProof = async (req, res) => {
  try {
    const { proofId } = req.params;
    const { action, comment = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(proofId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid proof ID.',
      });
    }

    if (!['approve', 'request_changes'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid proof review action.',
      });
    }

    if (
      typeof comment !== 'string' ||
      comment.length > 2000 ||
      (action === 'request_changes' && !comment.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid comment when requesting changes.',
      });
    }

    const proof = await Proof.findOne({
      _id: proofId,
      customer: req.user._id,
    });

    if (!proof) {
      return res.status(404).json({
        success: false,
        message: 'Proof not found.',
      });
    }

    const order = await Order.findOne({
      _id: proof.order,
      customer: req.user._id,
    });

    if (!order || String(order.currentProof) !== String(proof._id)) {
      return res.status(409).json({
        success: false,
        message: 'Only the latest proof can be reviewed.',
      });
    }

    if (proof.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'This proof has already been reviewed.',
      });
    }

    const newStatus = action === 'approve'
      ? 'approved'
      : 'changes_requested';

    // Atomic update prevents duplicate reviews.
    const updatedProof = await Proof.findOneAndUpdate(
      { _id: proof._id, status: 'pending' },
      {
        $set: {
          status: newStatus,
          customerComment: comment.trim(),
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedProof) {
      return res.status(409).json({
        success: false,
        message: 'This proof has already been reviewed.',
      });
    }

    order.proofApproved = action === 'approve';

    if (action === 'request_changes') {
      order.status = 'artwork';
    }

    await order.save();

    return res.json({
      success: true,
      message: action === 'approve'
        ? 'Proof approved successfully.'
        : 'Changes requested successfully.',
      proof: updatedProof,
      proofApproved: order.proofApproved,
    });
  } catch (error) {
    console.error('Review proof error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to review proof.',
    });
  }
};
