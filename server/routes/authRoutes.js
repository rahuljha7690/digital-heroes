import express from 'express';

import {
  registerUser,
  loginUser,
  getMe,
} from '../controllers/authController.js';

import {
  protect,
  authorize,
} from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

// Any logged-in user
router.get('/me', protect, getMe);

// Admin-only test route
router.get('/admin-test', protect, authorize('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome, Admin!',
  });
});

export default router;