
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
    },

    division: {
      type: String,
      required: true,
      enum: [
        'labels-stickers',
        'race-event-numbers',
        'mtb-boards',
        'stamps',
        'trophies',
        'laser-cut-work',
      ],
    },

    description: {
      type: String,
      default: '',
    },

    image: {
      type: String,
      default: '',
    },

    configuration: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    pricing: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);

export default Product;
