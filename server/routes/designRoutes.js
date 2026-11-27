import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { createDesign, getMyDesigns, getDesignById, updateDesign, deleteDesign } from '../controllers/designController.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '../uploads/design-assets');
fs.mkdirSync(uploadDir, { recursive: true });
const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, allowedTypes.has(file.mimetype)),
});

router.use(protect, authorize('customer'));
router.post('/assets', (req, res, next) => upload.single('file')(req, res, (error) => {
  if (error) return res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'File must be 5 MB or smaller.' : 'Only PNG, JPG and WEBP images are allowed.' });
  next();
}), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Please select an image file.' });
  return res.status(201).json({ success: true, assetUrl: `${req.protocol}://${req.get('host')}/uploads/design-assets/${req.file.filename}` });
});
router.route('/').post(createDesign).get(getMyDesigns);
router.route('/:id').get(getDesignById).patch(updateDesign).delete(deleteDesign);

export default router;
