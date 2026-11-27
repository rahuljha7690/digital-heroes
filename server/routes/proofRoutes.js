import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { createProof, generateProof, getOrderProofs, reviewProof } from '../controllers/proofController.js';

const router = express.Router();

// Admin creates a new proof revision (from a URL, or rendered from the customer's design).
router.post('/orders/:orderId', protect, authorize('admin'), createProof);
router.post('/orders/:orderId/generate', protect, authorize('admin'), generateProof);

// Customer views proof history.
router.get('/orders/:orderId', protect, authorize('customer'), getOrderProofs);

// Customer approves or requests changes.
router.patch('/:proofId/review', protect, authorize('customer'), reviewProof);

export default router;