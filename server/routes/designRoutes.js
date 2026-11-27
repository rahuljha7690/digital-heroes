
import express from 'express';
import mongoose from 'mongoose';
import Design from '../models/Design.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All design routes require authentication
router.use(protect);

// Save a new design
router.post('/', async (req, res) => {
  try {
    const { productSlug, name, canvasData, previewUrl } = req.body;

    if (!productSlug || !canvasData) {
      return res.status(400).json({
        success: false,
        message: 'Product and canvas data are required.',
      });
    }

    if (
      typeof canvasData !== 'object' ||
      Array.isArray(canvasData) ||
      canvasData === null
    ) {
      return res.status(400).json({
        success: false,
        message: 'Canvas data must be a valid object.',
      });
    }

    const product = await Product.findOne({
      slug: productSlug,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const design = await Design.create({
      customer: req.user._id,
      product: product._id,
      name: name?.trim() || `${product.name} Design`,
      canvasData,
      previewUrl: previewUrl || '',
      status: 'draft',
    });

    return res.status(201).json({
      success: true,
      message: 'Design saved successfully.',
      design,
    });
  } catch (error) {
    console.error('Save design error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to save design.',
    });
  }
});

// Get all designs belonging to the logged-in customer
router.get('/', async (req, res) => {
  try {
    const designs = await Design.find({
      customer: req.user._id,
    })
      .populate('product', 'name slug image')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: designs.length,
      designs,
    });
  } catch (error) {
    console.error('Get designs error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve designs.',
    });
  }
});

// Get one design owned by the logged-in customer
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid design ID.',
      });
    }

    const design = await Design.findOne({
      _id: req.params.id,
      customer: req.user._id,
    }).populate('product', 'name slug image');

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found.',
      });
    }

    return res.status(200).json({
      success: true,
      design,
    });
  } catch (error) {
    console.error('Get design error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve design.',
    });
  }
});

// Update an existing design owned by the logged-in customer
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid design ID.',
      });
    }

    const { name, canvasData, previewUrl } = req.body;

    if (
      canvasData !== undefined &&
      (
        typeof canvasData !== 'object' ||
        Array.isArray(canvasData) ||
        canvasData === null
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Canvas data must be a valid object.',
      });
    }

    const design = await Design.findOne({
      _id: req.params.id,
      customer: req.user._id,
    });

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found.',
      });
    }

    if (design.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft designs can be edited.',
      });
    }

    if (name !== undefined) {
      design.name = name.trim();
    }

    if (canvasData !== undefined) {
      design.canvasData = canvasData;
      design.markModified('canvasData');
    }

    if (previewUrl !== undefined) {
      design.previewUrl = previewUrl;
    }

    await design.save();

    return res.status(200).json({
      success: true,
      message: 'Design updated successfully.',
      design,
    });
  } catch (error) {
    console.error('Update design error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update design.',
    });
  }
});

export default router;
