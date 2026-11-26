
import mongoose from 'mongoose';

const designSchema = new mongoose.Schema(
  {
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

    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
    },

    name: {
      type: String,
      default: 'Untitled Design',
    },

    canvasData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    previewUrl: {
      type: String,
      default: '',
    },

    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'archived'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

const Design = mongoose.model('Design', designSchema);

export default Design;
