
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    design: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Design',
    },

    configuration: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    pricing: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    currentProof: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proof',
      default: null,
    },

    proofApproved: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: [
        'quote',
        'order',
        'artwork',
        'proof',
        'production',
        'completed',
        'cancelled',
      ],
      default: 'order',
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    paymentReference: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
