import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config'; // loads .env before the local modules below read process.env

import connectDB from './config/db.js';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import designRoutes from './routes/designRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import proofRoutes from './routes/proofRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Behind Render / Vercel / Nginx the real protocol comes from the proxy header.
app.set('trust proxy', 1);

// Uploaded images are loaded by the client on another origin, so allow cross-origin reads.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));

app.use(express.json({ limit: '2mb' })); // canvas JSON can be a little large
app.use(express.urlencoded({ extended: true }));

// Slow down password guessing.
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

app.use('/api/auth', authRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/proofs', proofRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Digital Heroes API is running!' });
});

app.get('/api/health/db', (_req, res) => {
  const connected = app.locals.dbConnected;
  res.status(connected ? 200 : 503).json({ success: connected, database: connected ? 'Connected' : 'Disconnected' });
});

// Unknown API route -> JSON 404
app.use('/api', (_req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));

// Last-resort error handler: always JSON, never a stack trace.
// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  console.error('Unhandled error:', error);
  res.status(error.status || 500).json({ success: false, message: 'Something went wrong on the server.' });
});

const startServer = async () => {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set. Refusing to start.');
    process.exit(1);
  }
  await connectDB();
  app.locals.dbConnected = true;
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();