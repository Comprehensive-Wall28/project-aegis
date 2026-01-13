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
import auditRoutes from './routes/auditRoutes';
import calendarRoutes from './routes/calendarRoutes';
import taskRoutes from './routes/taskRoutes';
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
    frameguard: {
        action: 'deny'
    },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        }
    }
}));
app.use(express.json());
app.use(cookieParser());

// CSRF Protection is applied per-route via middleware/csrfMiddleware.ts
// Login/register are excluded to prevent race conditions on fresh page loads.
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter); // Stricter limit for auth

app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/integrity', integrityRoutes);
app.use('/api/gpa', gpaRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/tasks', taskRoutes);

app.use(errorHandler);

export default app;
