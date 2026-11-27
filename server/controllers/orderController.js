
import crypto from 'crypto';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Design from '../models/Design.js';
import { calculateQuote } from '../utils/pricing.js';

export const createOrder = async (req, res) => {
  try {
    const { productId, quantity, options = {}, designId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid product ID is required.',
      });
    }

    const product = await Product.findOne({
      _id: productId,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Always calculate the final amount on the server.
    const pricing = calculateQuote(product, quantity, options);

    let design = null;

    if (designId) {
      if (!mongoose.Types.ObjectId.isValid(designId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid design ID.',
        });
      }

      design = await Design.findOne({
        _id: designId,
        customer: req.user._id,
        product: product._id,
        status: { $in: ['draft', 'submitted'] },
      });

      if (!design) {
        return res.status(404).json({
          success: false,
          message: 'Your editable design was not found.',
        });
      }
    }

    const orderNumber = `DH-${Date.now()}-${crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase()}`;

    const order = await Order.create({
      orderNumber,
      customer: req.user._id,
      product: product._id,
      design: design?._id,
      configuration: {
        quantity: pricing.quantity,
        options,
      },
      pricing,
      status: 'order',
      paymentStatus: 'pending',
    });

    if (design) {
      design.status = 'submitted';
      await design.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order,
    });
  } catch (error) {
    console.error('Create order error:', error);

    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to place order.',
    });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      customer: req.user._id,
    })
      .populate('product', 'name slug division image')
      .populate('design', 'name previewUrl status')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error('Get customer orders error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load your orders.',
    });
  }
};
