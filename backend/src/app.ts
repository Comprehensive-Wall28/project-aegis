import Fastify from 'fastify';
import './config/initDatabase'; // Initialize DB before other imports
import { config, validateConfig } from './config/env';

// Import plugins
import { corsPlugin } from './plugins/cors';
import { helmetPlugin } from './plugins/helmet';
import jwtPlugin from './plugins/jwt';
import csrfPlugin from './plugins/csrf';
import { analyticsPlugin } from './plugins/analytics';
import { errorHandlerPlugin } from './plugins/errorHandler';

// Import routes (migrated)
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import auditRoutes from './routes/auditRoutes';
import mentionRoutes from './routes/mentionRoutes';
import activityRoutes from './routes/activityRoutes';

// Stub routes for unmigrated modules (Fastify stubs with proper endpoints)
import vaultRoutes from './routes/vaultRoutes.fastify';
import noteRoutes from './routes/noteRoutes.fastify';
import calendarRoutes from './routes/calendarRoutes.fastify';
import gpaRoutes from './routes/gpaRoutes.fastify';
import folderRoutes from './routes/folderRoutes.fastify';
import socialRoutes from './routes/socialRoutes.fastify';
import shareRoutes from './routes/shareRoutes.fastify';
import publicRoutes from './routes/publicRoutes.fastify';
import analyticsRoutes from './routes/analyticsRoutes.fastify';

// Validate config on startup
validateConfig();

const fastify = Fastify({
    logger: false, // Using Winston logger instead
    trustProxy: true, // Trust proxy for secure cookies in production
    bodyLimit: 50 * 1024 * 1024, // 50MB body limit for file uploads
});

async function buildApp() {
    // Register plugins in order
    // MITIGATION: Plugin registration order matches Express middleware order
    await fastify.register(corsPlugin);
    await fastify.register(helmetPlugin);
    await fastify.register(jwtPlugin); // Includes cookie parser
    await fastify.register(csrfPlugin);
    await fastify.register(analyticsPlugin);
    await fastify.register(errorHandlerPlugin);

    // Register routes
    // CSRF Protection is applied per-route via preHandler hooks
    // Login/register are excluded to prevent race conditions on fresh page loads
    
    // ✅ MIGRATED ROUTES
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(taskRoutes, { prefix: '/api/tasks' });
    await fastify.register(auditRoutes, { prefix: '/api/audit-logs' });
    await fastify.register(mentionRoutes, { prefix: '/api/mentions' });
    await fastify.register(activityRoutes, { prefix: '/api/activity' });
    
    // 🔄 STUB ROUTES (Returns 501 - TO BE FULLY MIGRATED)
    // Critical Priority
    await fastify.register(vaultRoutes, { prefix: '/api/vault' });
    await fastify.register(noteRoutes, { prefix: '/api/notes' });
    
    // High Priority
    await fastify.register(calendarRoutes, { prefix: '/api/calendar' });
    await fastify.register(gpaRoutes, { prefix: '/api/gpa' });
    await fastify.register(folderRoutes, { prefix: '/api/folders' });
    
    // Medium Priority
    await fastify.register(socialRoutes, { prefix: '/api/social' });
    await fastify.register(shareRoutes, { prefix: '/api/share' });
    await fastify.register(publicRoutes, { prefix: '/api/public' });
    await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });

    return fastify;
}

export default buildApp;
