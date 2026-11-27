
export const calculateQuote = (product, quantity, options = {}) => {
  const qty = Number(quantity);

  if (!Number.isInteger(qty) || qty < 1 || qty > 100000) {
    throw new Error('Quantity must be between 1 and 100000.');
  }

  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('Invalid product options.');
  }

  const configuration = product.configuration || {};
  const pricing = product.pricing || {};

  for (const [key, value] of Object.entries(options)) {
    const allowedValues = configuration[key];

    if (Array.isArray(allowedValues) && !allowedValues.includes(value)) {
      throw new Error(`Invalid option: ${key}`);
    }
  }

  const basePrice = Number(pricing.basePrice);

  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new Error('Product pricing is not configured correctly.');
  }

  const selectedSize = options.size || options.sizes;
  const selectedMaterial = options.material || options.materials;

  const sizeMultiplier = selectedSize
    ? Number(pricing.sizeMultipliers?.[selectedSize] ?? 1)
    : 1;

  const materialMultiplier = selectedMaterial
    ? Number(pricing.materialMultipliers?.[selectedMaterial] ?? 1)
    : 1;

  if (
    !Number.isFinite(sizeMultiplier) ||
    sizeMultiplier < 0 ||
    !Number.isFinite(materialMultiplier) ||
    materialMultiplier < 0
  ) {
    throw new Error('Invalid product pricing configuration.');
  }

  let optionAddons = 0;

  for (const [key, value] of Object.entries(options)) {
    if (['widthCm', 'heightCm'].includes(key)) continue;

    const addon = Number(pricing.optionAddons?.[key]?.[value] ?? 0);

    if (!Number.isFinite(addon) || addon < 0) {
      throw new Error(`Invalid pricing for option: ${key}`);
    }

    optionAddons += addon;
  }

  let dimensionCharge = 0;
  const dimensionConfig = configuration.dimensions;

  if (dimensionConfig?.enabled) {
    const width = Number(options.widthCm);
    const height = Number(options.heightCm);

    const {
      minWidthCm = 1,
      maxWidthCm = 200,
      minHeightCm = 1,
      maxHeightCm = 200,
    } = dimensionConfig;

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < minWidthCm ||
      width > maxWidthCm ||
      height < minHeightCm ||
      height > maxHeightCm
    ) {
      throw new Error('Invalid product dimensions.');
    }

    const pricePerSqCm = Number(pricing.dimensionPricePerSqCm ?? 0);

    if (!Number.isFinite(pricePerSqCm) || pricePerSqCm < 0) {
      throw new Error('Invalid dimension pricing.');
    }

    dimensionCharge = width * height * pricePerSqCm;
  }

  const unitPrice =
    basePrice * sizeMultiplier * materialMultiplier +
    optionAddons +
    dimensionCharge;

  const subtotal = unitPrice * qty;

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
    throw new Error('Invalid quantity discount configuration.');
  }

  const discountAmount = subtotal * (discountPercent / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxRate = Number(pricing.taxRate ?? 0);

  if (!Number.isFinite(taxRate) || taxRate < 0) {
    throw new Error('Invalid tax configuration.');
  }

  const taxAmount = taxableAmount * taxRate;
  const total = taxableAmount + taxAmount;
  const round = (value) => Number(value.toFixed(2));

  return {
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
  };
};
