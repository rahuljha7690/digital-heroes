import express from 'express';

import {
  getProducts,
  getProductBySlug,
  calculateProductQuote,
} from '../controllers/productController.js';

const router = express.Router();

router.get('/', getProducts);
router.post('/:slug/quote', calculateProductQuote);
router.get('/:slug', getProductBySlug);

export default router;