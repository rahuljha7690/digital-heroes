import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { createCheckout, confirmPayment } from '../controllers/paymentController.js';

const router = express.Router();
router.use(protect, authorize('customer'));
router.post('/orders/:orderId/checkout', createCheckout);
router.post('/orders/:orderId/confirm', confirmPayment);

export default router;