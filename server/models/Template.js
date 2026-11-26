
import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    previewImage: {
      type: String,
      default: '',
    },

    canvasWidth: {
      type: Number,
      required: true,
    },

    canvasHeight: {
      type: Number,
      required: true,
    },

    printableArea: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    placeholders: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Template = mongoose.model('Template', templateSchema);

export default Template;
