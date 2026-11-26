
import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// Test database write and read
router.get('/db-test', async (req, res) => {
  try {
    const userCount = await User.countDocuments();

    res.status(200).json({
      success: true,
      message: 'MongoDB database is working!',
      totalUsers: userCount,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
