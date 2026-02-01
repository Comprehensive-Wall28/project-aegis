import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import './config/initDatabase'; // Initialize DB first
import { config, validateConfig } from './config/env';
import logger from './utils/logger';
import { registerErrorHandler } from './middleware/fastifyErrorHandler';
import { registerPerformanceHooks } from './middleware/performanceMonitoring';

// Validate config on startup
validateConfig();

export async function buildApp(): Promise<FastifyInstance> {
    const app = Fastify({
        logger: {
            level: config.nodeEnv === 'production' ? 'warn' : 'debug',
            transport: config.nodeEnv !== 'production' ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            } : undefined,
        },
        trustProxy: true, // Required for Render.com and behind load balancers
        bodyLimit: 10485760, // 10MB limit
        requestTimeout: 30000, // 30 seconds
        keepAliveTimeout: 72000, // 72 seconds (must be higher than load balancer)
    });

    // Register CORS
    const allowedOrigins = [
        config.clientOrigin,
        'http://localhost:3000',
        'http://localhost:5173',
    ].filter((origin): origin is string => !!origin);

    await app.register(cors, {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN'],
    });

    // Register Helmet for security headers
    await app.register(helmet, {
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', ...allowedOrigins],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null,
            },
        },
    });



    // Register cookie parser
    await app.register(cookie, {
        secret: config.jwtSecret, // For signing cookies if needed
        parseOptions: {}, // Optional: configure cookie parsing
    });

    // Register global error handler
    registerErrorHandler(app);

    // Register performance monitoring (dev only)
    if (config.nodeEnv !== 'production') {
        registerPerformanceHooks(app);
    }

    // Health check endpoint
    app.get('/health', async (request, reply) => {
        return {
            status: 'ok',
            timestamp: Date.now(),
            uptime: process.uptime(),
        };
    });

    // Root endpoint
    app.get('/', async (request, reply) => {
        return { message: 'Aegis Backend API - Fastify' };
    });

    // Register API Routes
    await app.register(async (instance) => {
        const { authRoutes } = await import('./routes/fastifyAuthRoutes');
        await instance.register(authRoutes);
    }, { prefix: '/api/auth' });

    await app.register(async (instance) => {
        const { noteRoutes } = await import('./routes/fastifyNoteRoutes');
        await instance.register(noteRoutes);
    }, { prefix: '/api/notes' });

    await app.register(async (instance) => {
        const { vaultRoutes } = await import('./routes/fastifyVaultRoutes');
        await instance.register(vaultRoutes);
    }, { prefix: '/api/vault' });

    await app.register(async (instance) => {
        const { taskRoutes } = await import('./routes/fastifyTaskRoutes');
        await instance.register(taskRoutes);
    }, { prefix: '/api/tasks' });

    await app.register(async (instance) => {
        const { calendarRoutes } = await import('./routes/fastifyCalendarRoutes');
        await instance.register(calendarRoutes);
    }, { prefix: '/api/calendar' });

    await app.register(async (instance) => {
        const { folderRoutes } = await import('./routes/fastifyFolderRoutes');
        await instance.register(folderRoutes);
    }, { prefix: '/api/folders' });

    await app.register(async (instance) => {
        const { gpaRoutes } = await import('./routes/fastifyGpaRoutes');
        await instance.register(gpaRoutes);
    }, { prefix: '/api/gpa' });

    await app.register(async (instance) => {
        const { socialRoutes } = await import('./routes/fastifySocialRoutes');
        await instance.register(socialRoutes);
    }, { prefix: '/api/social' });

    await app.register(async (instance) => {
        const { shareRoutes } = await import('./routes/fastifyShareRoutes');
        await instance.register(shareRoutes);
    }, { prefix: '/api/share' });

    await app.register(async (instance) => {
        const { publicRoutes } = await import('./routes/fastifyPublicRoutes');
        await instance.register(publicRoutes);
    }, { prefix: '/api/public' });

    await app.register(async (instance) => {
        const { auditRoutes } = await import('./routes/fastifyAuditRoutes');
        await instance.register(auditRoutes);
    }, { prefix: '/api/audit-logs' });

    await app.register(async (instance) => {
        const { activityRoutes } = await import('./routes/fastifyActivityRoutes');
        await instance.register(activityRoutes);
    }, { prefix: '/api/activity' });

    await app.register(async (instance) => {
        const { mentionRoutes } = await import('./routes/fastifyMentionRoutes');
        await instance.register(mentionRoutes);
    }, { prefix: '/api/mentions' });

    await app.register(async (instance) => {
        const { adminRoutes } = await import('./routes/fastifyAdminRoutes');
        await instance.register(adminRoutes);
    }, { prefix: '/api/admin' });

    console.log('✅ Fastify app configured successfully');
    return app;
}
