
import express from 'express';
import cors from 'cors';
import testRoutes from './routes/testRoutes.js';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import dotenv from 'dotenv';
import connectDB from './config/db.js';


dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/test', testRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Digital Heroes API is running!'
  });
});

// Database health check
app.get('/api/health/db', (req, res) => {
  const connected = app.locals.dbConnected;

  res.status(connected ? 200 : 503).json({
    success: connected,
    database: connected ? 'Connected' : 'Disconnected'
  });
});

// Start server after database connection
const startServer = async () => {
  await connectDB();

  app.locals.dbConnected = true;

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
