import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes';
import positionRoutes from './routes/positionRoutes';
import paymentRoutes from './routes/paymentRoutes';
import securitizedLoanRoutes from './routes/securitizedLoanRoutes';
import { LoanService } from './services/loanService';
import { requestLogger } from './middleware/requestLogger';
import { API_LIMITS } from './config/constants';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limit: 100 requests per 15 min per IP (memory-safe, no frontend change)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware: body size limit (backpressure / memory safety), then CORS
app.use(express.json({ limit: `${API_LIMITS.MAX_BODY_SIZE_KB}kb` }));
app.use(cors());
app.use(requestLogger);

// Rate limit only API routes (health check stays unlimited)
app.use('/api', limiter);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/securitized-loans', securitizedLoanRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/collateral-crypto';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start background job to check late payments
    setInterval(async () => {
      try {
        await LoanService.checkLatePayments();
      } catch (error) {
        console.error('Error checking late payments:', error);
      }
    }, 24 * 60 * 60 * 1000); // Run daily

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
