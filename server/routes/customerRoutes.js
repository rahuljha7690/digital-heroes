import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getDashboard, updateProfile } from '../controllers/customerController.js';

const router = express.Router();
router.use(protect, authorize('customer'));
router.get('/dashboard', getDashboard);
router.patch('/profile', updateProfile);

export default router;