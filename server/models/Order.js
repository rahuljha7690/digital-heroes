import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    design: { type: mongoose.Schema.Types.ObjectId, ref: 'Design' },
    configuration: { type: mongoose.Schema.Types.Mixed, default: {} },
    pricing: { type: mongoose.Schema.Types.Mixed, required: true },
    currentProof: { type: mongoose.Schema.Types.ObjectId, ref: 'Proof', default: null },
    proofApproved: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['quote', 'order', 'artwork', 'proof', 'production', 'completed', 'cancelled'],
      default: 'order',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentReference: { type: String, default: '' },

    // Set when this order was created with one click from a previous order.
    reorderOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },

    // Finished artwork supplied by the customer (PDF / SVG / AI / PNG / JPG).
    artworkFiles: {
      type: [
        {
          originalName: String,
          storedName: String,
          mimetype: String,
          size: Number,
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    // Completed work is archived (kept, hidden from the live queue) for fast repeat/event lookups.
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;