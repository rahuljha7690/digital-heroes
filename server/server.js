import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Digital Heroes API is running!',
    timestamp: new Date()
  });
});

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to Digital Heroes Backend');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
