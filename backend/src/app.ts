import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import connectDB from './config/database';
import authRoutes from './routes/authRoutes';
import vaultRoutes from './routes/vaultRoutes';
import integrityRoutes from './routes/integrityRoutes';
import mongoSanitize from 'express-mongo-sanitize';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

connectDB();

const app = express();

const allowedOrigins = [
    process.env.CLIENT_ORIGIN,
    'http://localhost:3000',
    'http://localhost:5173'
].filter((origin): origin is string => !!origin);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());
app.use(mongoSanitize());
app.use(cookieParser());

// Apply Rate Limiting
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter); // Stricter limit for auth

app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/integrity', integrityRoutes);

app.use(errorHandler);

export default app;
