import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
  getAdminOrderDetails,
  getAdminOrderProofs,
} from '../controllers/adminController.js';
import {
  getPrintFileInfo,
  downloadPrintFile,
  csvMerge,
  downloadUploadedArtwork,
} from '../controllers/printFileController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, path.extname(file.originalname).toLowerCase() === '.csv'),
});

router.use(protect, authorize('admin'));

router.get('/dashboard/stats', getDashboardStats);

router.get('/orders', getAllOrders);
router.get('/orders/:orderId', getAdminOrderDetails);
router.get('/orders/:orderId/proofs', getAdminOrderProofs);
router.patch('/orders/:orderId/status', updateOrderStatus);

// Print-file engine
router.get('/orders/:orderId/print-files', getPrintFileInfo);
router.get('/orders/:orderId/print-files/download', downloadPrintFile);
router.post('/orders/:orderId/csv-merge', csvUpload.single('file'), csvMerge);
router.get('/orders/:orderId/artwork/:storedName', downloadUploadedArtwork);

export default router;