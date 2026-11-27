import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { ARTWORK_DIR } from '../utils/paths.js';
import {
  createOrder,
  getMyOrders,
  reorderOrder,
  getInvoice,
  uploadOrderArtwork,
  artworkStoredName,
} from '../controllers/orderController.js';

const router = express.Router();

fs.mkdirSync(ARTWORK_DIR, { recursive: true });
const ALLOWED_EXT = new Set(['.pdf', '.svg', '.ai', '.png', '.jpg', '.jpeg']);
const artworkUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ARTWORK_DIR),
    filename: (_req, file, cb) => cb(null, artworkStoredName(file.originalname)),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_EXT.has(path.extname(file.originalname).toLowerCase())),
});

router.use(protect, authorize('customer'));

router.post('/', createOrder);
router.get('/my', getMyOrders);
router.post('/:orderId/reorder', reorderOrder);
router.get('/:orderId/invoice', getInvoice);
router.post(
  '/:orderId/artwork',
  (req, res, next) =>
    artworkUpload.single('file')(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.code === 'LIMIT_FILE_SIZE' ? 'File must be 25 MB or smaller.' : 'Upload failed.',
        });
      }
      return next();
    }),
  uploadOrderArtwork
);

export default router;