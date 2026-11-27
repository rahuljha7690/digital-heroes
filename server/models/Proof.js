import mongoose from 'mongoose';

const proofSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    version: {
      type: Number,
      required: true,
      min: 1,
    },

    previewUrl: {
      type: String,
      required: true,
      trim: true,
    },

    notes: {
      type: String,
      default: '',
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'changes_requested', 'superseded'],
      default: 'pending',
    },

    customerComment: {
      type: String,
      default: '',
      maxlength: 2000,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

proofSchema.index({ order: 1, version: 1 }, { unique: true });

const Proof = mongoose.model('Proof', proofSchema);

export default Proof;
