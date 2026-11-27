
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';

import {
  createProof,
  getOrderProofs,
  reviewProof,
} from '../controllers/proofController.js';

const router = express.Router();

// Admin creates a new proof revision.
router.post(
  '/orders/:orderId',
  protect,
  authorize('admin'),
  createProof
);

// Customer views proof history.
router.get(
  '/orders/:orderId',
  protect,
  authorize('customer'),
  getOrderProofs
);

// Customer approves or requests changes.
router.patch(
  '/:proofId/review',
  protect,
  authorize('customer'),
  reviewProof
);

export default router;
