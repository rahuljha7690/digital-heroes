
import express from 'express';
import {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
  getAdminOrderDetails,
  getAdminOrderProofs,
} from '../controllers/adminController.js';

import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/dashboard/stats', getDashboardStats);

router.get('/orders', getAllOrders);

router.get('/orders/:orderId', getAdminOrderDetails);

router.get('/orders/:orderId/proofs', getAdminOrderProofs);

router.patch('/orders/:orderId/status', updateOrderStatus);

export default router;
