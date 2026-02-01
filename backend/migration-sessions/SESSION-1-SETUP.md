# SESSION 1: Environment Setup & Dependencies

**Duration:** 2-3 hours  
**Prerequisites:** None  
**Agent Role:** Setup and dependency management

---

## Objectives
- [x] Install Fastify and core plugins
- [x] Remove unused dependencies (express-rate-limit)
- [x] Create parallel Fastify app structure
- [x] Configure development environment
- [x] Verify Docker compatibility

---

## Step 1: Dependency Management

### 1.1 Remove Express Dependencies
```bash
cd backend
npm uninstall express @types/express express-rate-limit
```

**Reason:** Migrating to Fastify, rate-limiting not used

### 1.2 Install Fastify Core
```bash
npm install fastify@^5.0.0
npm install @fastify/cors@^10.0.0
npm install @fastify/helmet@^12.0.0
npm install @fastify/cookie@^10.0.0
npm install @fastify/jwt@^9.0.0
```

### 1.3 Install Socket.IO Plugin
```bash
npm install fastify-socket.io@^6.0.0
```

**Note:** Socket.IO client library remains unchanged

### 1.4 Verify Installation
```bash
npm install
npm run build
```

**Expected:** No errors, TypeScript compiles successfully

---

## Step 2: Create Fastify App Structure

### 2.1 Create `src/fastify-app.ts`
```typescript
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import './config/initDatabase'; // Initialize DB first
import { config, validateConfig } from './config/env';
import logger from './utils/logger';

// Validate config on startup
validateConfig();

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
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
    frameguard: { action: 'deny' },
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

  logger.info('Fastify app configured successfully');
  return app;
}
```

**File Location:** `backend/src/fastify-app.ts`

---

## Step 3: Create Fastify Server Entry Point

### 3.1 Create `src/fastify-server.ts`
```typescript
import { buildApp } from './fastify-app';
import { config } from './config/env';
import logger from './utils/logger';
import SocketManager from './utils/SocketManager';

async function start() {
  try {
    // Build Fastify app
    const app = await buildApp();

    // Configure Socket.IO
    const allowedOrigins = [
      config.clientOrigin,
      'http://localhost:3000',
      'http://localhost:5173',
    ].filter((origin): origin is string => !!origin);

    // Initialize Socket.IO with Fastify server
    SocketManager.init(app.server, allowedOrigins);

    // Start listening
    await app.listen({
      port: config.port,
      host: '0.0.0.0', // Critical for Docker - binds to all interfaces
    });

    logger.info(`🚀 Fastify server running on port ${config.port} in ${config.nodeEnv} mode`);
    logger.info(`📡 Socket.IO initialized`);
    logger.info(`🔗 CORS allowed origins: ${allowedOrigins.join(', ')}`);
  } catch (err) {
    logger.error('Failed to start Fastify server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`\n${signal} received. Shutting down gracefully...`);

  try {
    const app = await buildApp();
    await app.close();
    logger.info('Fastify server closed');

    // Close Socket.IO
    const io = SocketManager.getIO();
    if (io) {
      io.close(() => {
        logger.info('Socket.IO connections closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  } catch (err) {
    logger.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
start();
```

**File Location:** `backend/src/fastify-server.ts`

---

## Step 4: Update Development Configuration

### 4.1 Update `nodemon.json`
```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.spec.ts"],
  "exec": "tsx src/fastify-server.ts",
  "env": {
    "NODE_ENV": "development"
  }
}
```

### 4.2 Update `package.json` scripts
```json
{
  "scripts": {
    "start": "node --env-file=.env dist/fastify-server.js",
    "dev": "nodemon",
    "build": "tsc",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

---

## Step 5: Docker Configuration Review

### 5.1 Verify Dockerfile Compatibility
**Current Dockerfile:** ✅ **NO CHANGES NEEDED**

Your Dockerfile is already compatible:
- Multi-stage build: ✅ Works with Fastify
- `npm run build`: ✅ Compiles TypeScript
- `CMD ["node", "dist/server.js"]`: ⚠️ Will need update

### 5.2 Update Dockerfile CMD (Later)
After all routes migrated, update the entry point:
```dockerfile
# Change from:
CMD [ "node", "dist/server.js" ]

# To:
CMD [ "node", "dist/fastify-server.js" ]
```

**Or** rename the compiled output in build step.

### 5.3 Verify Port Binding
Fastify must bind to `0.0.0.0` for Docker (already done above).

---

## Step 6: Validation & Testing

### 6.1 Build Test
```bash
npm run build
```

**Expected:**
- No TypeScript errors
- `dist/fastify-app.js` and `dist/fastify-server.js` created

### 6.2 Development Server Test
```bash
npm run dev
```

**Expected:**
```
[INFO] Fastify app configured successfully
[INFO] 🚀 Fastify server running on port 3000 in development mode
[INFO] 📡 Socket.IO initialized
```

### 6.3 Health Check Test
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": 1738454400000,
  "uptime": 5.234
}
```

### 6.4 CORS Test
```bash
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-XSRF-TOKEN" \
     -X OPTIONS \
     http://localhost:3000/health -v
```

**Expected:**
- Status: 204 or 200
- Headers include `Access-Control-Allow-Origin`

---

## Step 7: SocketManager Update (Preliminary)

### 7.1 Review SocketManager Compatibility
Check `src/utils/SocketManager.ts`:
```typescript
// Current init signature:
public init(server: HttpServer, allowedOrigins: string[]): void

// Works with Fastify because app.server returns HttpServer
```

**Status:** ✅ Compatible as-is (will test in Session 6)

---

## Troubleshooting

### Issue: TypeScript Compilation Errors
**Solution:**
```bash
# Ensure @types/node is up to date
npm install -D @types/node@latest

# Clear build cache
rm -rf dist/
npm run build
```

### Issue: Port Already in Use
**Solution:**
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
```

### Issue: MongoDB Connection Fails
**Solution:**
- Verify `.env` file has correct `MONGODB_URI`
- Check if MongoDB is running
- Review `src/config/initDatabase.ts` logs

---

## Completion Checklist

- [ ] Express and rate-limit removed from package.json
- [ ] Fastify dependencies installed
- [ ] `fastify-app.ts` created and configured
- [ ] `fastify-server.ts` created with graceful shutdown
- [ ] `nodemon.json` updated to use new entry point
- [ ] `package.json` scripts updated
- [ ] Build succeeds without errors
- [ ] Dev server starts successfully
- [ ] Health endpoint responds
- [ ] CORS headers present
- [ ] Socket.IO initializes (logs show confirmation)

---

## Next Session

**SESSION 2:** Type Definitions & Utilities
- Create Fastify type definitions
- Update error handlers
- Prepare middleware adapters

---

## Notes for Agent

- Keep Express files unchanged during parallel development
- Test each step before proceeding
- Document any deviations from this guide
- If errors occur, check logs in `./logs/` directory

**Session Status:** Ready for execution
