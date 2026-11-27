import Product from '../models/Product.js';

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
    const { slug } = req.params;
    const { quantity = 1, options = {} } = req.body;

    const product = await Product.findOne({
      slug,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty < 1 || qty > 100000) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a whole number between 1 and 100000',
      });
    }

    const configuration = product.configuration || {};
    const pricing = product.pricing || {};

    // Validate selected options against the product configuration
    for (const [key, value] of Object.entries(options)) {
      const allowedValues = configuration[key];

      if (
        Array.isArray(allowedValues) &&
        !allowedValues.includes(value)
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid option: ${key}`,
        });
      }
    }

    const basePrice = Number(pricing.basePrice);

    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Product pricing is not configured correctly',
      });
    }

    // Apply selected size multiplier
    const size = options.size || options.sizes;
    const sizeMultiplier = size
      ? Number(pricing.sizeMultipliers?.[size] ?? 1)
      : 1;

    if (!Number.isFinite(sizeMultiplier) || sizeMultiplier < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid size pricing configuration',
      });
    }

    // Add any configured option surcharges
    let optionAddons = 0;

    for (const [key, value] of Object.entries(options)) {
      const addon = Number(pricing.optionAddons?.[key]?.[value] ?? 0);

      if (!Number.isFinite(addon) || addon < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid option pricing configuration',
        });
      }

      optionAddons += addon;
    }

    const unitPrice = (basePrice * sizeMultiplier) + optionAddons;
    const subtotal = unitPrice * qty;

    // Find the highest eligible quantity discount
    const discounts = [...(pricing.quantityDiscounts || [])]
      .filter((item) => qty >= Number(item.minQty))
      .sort((a, b) => Number(b.minQty) - Number(a.minQty));

    const discountPercent = discounts.length
      ? Number(discounts[0].percent)
      : 0;

    if (
      !Number.isFinite(discountPercent) ||
      discountPercent < 0 ||
      discountPercent > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quantity discount configuration',
      });
    }

    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;

    // Set taxRate in the product pricing data when the applicable rate is confirmed.
    const taxRate = Number(pricing.taxRate ?? 0);
    const taxAmount = taxableAmount * taxRate;
    const total = taxableAmount + taxAmount;

    const round = (amount) => Number(amount.toFixed(2));

    return res.status(200).json({
      success: true,
      quote: {
        product: product.name,
        quantity: qty,
        currency: pricing.currency || 'INR',
        unitPrice: round(unitPrice),
        subtotal: round(subtotal),
        discountPercent,
        discountAmount: round(discountAmount),
        taxRate,
        taxAmount: round(taxAmount),
        total: round(total),
      },
    });
  } catch (error) {
    console.error('Product quote error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to calculate product quote',
    });
  }
};