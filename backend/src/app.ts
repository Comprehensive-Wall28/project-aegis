import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import connectDB from './config/database';
import authRoutes from './routes/authRoutes';
import vaultRoutes from './routes/vaultRoutes';
import integrityRoutes from './routes/integrityRoutes';
import gpaRoutes from './routes/gpaRoutes';
import folderRoutes from './routes/folderRoutes';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

connectDB();

const app = express();

// Trust proxy for secure cookies in production (behind Render/other load balancers)
app.set('trust proxy', 1);

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
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Disable CSP - the frontend is served from a different origin (static site)
    // and has its own security context. The default CSP blocks eval() which
    // some bundlers/libraries use.
    contentSecurityPolicy: false
}));
app.use(express.json());
app.use(cookieParser());

// Apply Rate Limiting
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter); // Stricter limit for auth

app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/integrity', integrityRoutes);
app.use('/api/gpa', gpaRoutes);
app.use('/api/folders', folderRoutes);

app.use(errorHandler);

export default app;
