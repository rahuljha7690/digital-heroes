
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  createOrder,
  getMyOrders,
} from '../controllers/orderController.js';

const router = express.Router();

router.use(protect, authorize('customer'));

router.post('/', createOrder);
router.get('/my', getMyOrders);

export default router;
