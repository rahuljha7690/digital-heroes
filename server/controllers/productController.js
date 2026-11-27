import Product from '../models/Product.js';
import { calculateQuote } from '../utils/pricing.js';

// Get all active products, optionally filtered by division
export const getProducts = async (req, res) => {
  try {
    const { division, search } = req.query;

    const filter = { isActive: true };

    if (division) {
      filter.division = division;
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(filter)
      .select('-configuration -pricing')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error('Get products error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch products',
    });
  }
};

// Get one product by slug
export const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error('Get product error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch product',
    });
  }
};

// Calculate a live product quote

export const calculateProductQuote = async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const quote = calculateQuote(
      product,
      req.body.quantity,
      req.body.options || {}
    );

    return res.status(200).json({
      success: true,
      quote,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to calculate product quote.',
    });
  }
};
