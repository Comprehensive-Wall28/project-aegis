import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import connectDB from './config/database';
import authRoutes from './routes/authRoutes';
import vaultRoutes from './routes/vaultRoutes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

connectDB();

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// CORS restricted to frontend origin
app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);

app.use(errorHandler);

export default app;
