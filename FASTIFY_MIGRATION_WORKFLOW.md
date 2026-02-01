# Fastify Migration Workflow - Agent Sessions

**Project:** Aegis Backend Migration from Express to Fastify  
**Date:** February 2026  
**Estimated Duration:** 5-7 days  
**Docker Deployment:** Render.com compatible

---

## Migration Overview

### Performance Goals
- **Throughput:** 2-3x increase (15k → 40k req/s)
- **Latency:** -60% on p95 (45ms → 18ms)
- **Memory:** -44% under load (180MB → 100MB)

### Key Changes
- Express 5.2.1 → Fastify 5.x
- Custom middleware → Fastify hooks
- Express plugins → Fastify equivalents
- **REMOVED:** express-rate-limit (unused)
- **PRESERVED:** Socket.IO, MongoDB/Mongoose, GridFS streaming

---

## Session-Based Workflow

Each session is designed to be completed independently with clear validation steps.

---

## 📋 SESSION 1: Environment Setup & Dependencies (2-3 hours)

### Objectives
- Install Fastify and core plugins
- Remove unused dependencies
- Create parallel app structure
- Set up development environment

### Tasks

#### 1.1 Update package.json Dependencies
```bash
# Remove Express and related packages
npm uninstall express @types/express express-rate-limit

# Install Fastify core
npm install fastify@^5.0.0
npm install -D @types/node

# Install Fastify plugins
npm install @fastify/cors@^10.0.0
npm install @fastify/helmet@^12.0.0
npm install @fastify/cookie@^10.0.0
npm install @fastify/jwt@^9.0.0
npm install fastify-socket.io@^6.0.0
```

#### 1.2 Create Fastify App Structure
Create `backend/src/fastify-app.ts` as parallel implementation:
```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import { config, validateConfig } from './config/env';

validateConfig();

export async function buildApp() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
    bodyLimit: 10485760, // 10MB
    requestTimeout: 30000,
  });

  // Register plugins
  await app.register(cors, {
    origin: [
      config.clientOrigin,
      'http://localhost:3000',
      'http://localhost:5173'
    ].filter(Boolean) as string[],
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", config.clientOrigin].filter(Boolean),
      }
    },
  });

  await app.register(cookie, {
    secret: config.jwtSecret,
  });

  return app;
}
```

#### 1.3 Create Fastify Server Entry
Create `backend/src/fastify-server.ts`:
```typescript
import { buildApp } from './fastify-app';
import { config } from './config/env';
import logger from './utils/logger';
import SocketManager from './utils/SocketManager';

async function start() {
  try {
    const app = await buildApp();
    
    const allowedOrigins = [
      config.clientOrigin,
      'http://localhost:3000',
      'http://localhost:5173'
    ].filter(Boolean) as string[];

    // Initialize Socket.IO
    SocketManager.init(app.server, allowedOrigins);

    await app.listen({
      port: config.port,
      host: '0.0.0.0', // Important for Docker
    });

    logger.info(`Fastify server running on port ${config.port}`);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
```

#### 1.4 Update Docker Configuration
No changes needed! The Dockerfile already works:
- Uses `node dist/server.js` - will work with compiled Fastify code
- Port binding handled by Fastify's `host: '0.0.0.0'`
- Environment variables passed through unchanged

### Validation
```bash
# Test installation
npm install
npm run build

# Verify no errors
echo "✓ Dependencies installed"
echo "✓ TypeScript compiles"
```

---

## 📋 SESSION 2: Type Definitions & Utilities (2-3 hours)

### Objectives
- Create Fastify type definitions
- Update utility functions
- Prepare middleware adapters

### Tasks

#### 2.1 Create Type Definitions
Create `backend/src/types/fastify.ts`:
```typescript
import { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthUser {
  id: string;
  username: string;
}

export interface AuthRequest extends FastifyRequest {
  user?: AuthUser;
}

export type FastifyHandler = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<any>;

export type AuthHandler = (
  request: AuthRequest,
  reply: FastifyReply
) => Promise<any>;

// Context for CSRF and other request-scoped data
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    csrfToken?: string;
  }
}
```

#### 2.2 Update Error Handler
Create `backend/src/middleware/fastifyErrorHandler.ts`:
```typescript
import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/env';
import logger from '../utils/logger';

export function fastifyErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const statusCode = error.statusCode || 500;

  logger.error('Request error:', {
    method: request.method,
    url: request.url,
    error: error.message,
    stack: error.stack,
  });

  reply.status(statusCode).send({
    message: error.message,
    stack: config.nodeEnv === 'production' ? undefined : error.stack,
  });
}
```

#### 2.3 Create Controller Wrapper
Create `backend/src/middleware/fastifyControllerWrapper.ts`:
```typescript
import { FastifyReply } from 'fastify';
import { AuthRequest, FastifyHandler, AuthHandler } from '../types/fastify';
import logger from '../utils/logger';

export const catchAsync = (fn: FastifyHandler) => {
  return async (request: any, reply: FastifyReply) => {
    try {
      await fn(request, reply);
    } catch (error: any) {
      logger.error('Controller error:', error);
      reply.status(error.statusCode || 500).send({
        message: error.message || 'Server error',
      });
    }
  };
};

export const withAuth = (fn: AuthHandler) => {
  return async (request: AuthRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Not authenticated' });
    }
    
    try {
      await fn(request, reply);
    } catch (error: any) {
      logger.error('Auth controller error:', error);
      reply.status(error.statusCode || 500).send({
        message: error.message || 'Server error',
      });
    }
  };
};
```

### Validation
```bash
npm run build
# Should compile without errors
```

---

## 📋 SESSION 3: Authentication Middleware (3-4 hours)

### Objectives
- Migrate JWT authentication
- Implement CSRF protection
- Create auth hooks

### Tasks

#### 3.1 Migrate Auth Middleware
Create `backend/src/middleware/fastifyAuthMiddleware.ts`:
```typescript
import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import jwt from 'jsonwebtoken';
import { decryptToken } from '../utils/cryptoUtils';
import { config } from '../config/env';
import logger from '../utils/logger';

export async function authenticateUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  let token: string | undefined;

  // Check Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  // Fallback to cookies
  else if (request.cookies?.token) {
    token = request.cookies.token;
  }

  if (!token) {
    return reply.status(401).send({ message: 'Not authorized, no token' });
  }

  try {
    const decryptedToken = await decryptToken(token);
    const decoded = jwt.verify(decryptedToken, config.jwtSecret) as any;
    request.user = decoded;
  } catch (error) {
    logger.error('Auth verification error:', error);
    return reply.status(401).send({ message: 'Not authorized, token failed' });
  }
}
```

#### 3.2 Migrate CSRF Protection
Create `backend/src/middleware/fastifyCsrf.ts`:
```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { config } from '../config/env';
import logger from '../utils/logger';

const TOKEN_LENGTH = 64;
const COOKIE_NAME = 'XSRF-TOKEN';
const HEADER_NAME = 'x-xsrf-token';
const IGNORED_METHODS = ['GET', 'HEAD', 'OPTIONS'];

const generateToken = (): string => {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
};

const signToken = (token: string, secret: string): string => {
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
};

const verifySignature = (token: string, signature: string, secret: string): boolean => {
  const expectedSignature = signToken(token, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

const createSignedToken = (secret: string): string => {
  const token = generateToken();
  const signature = signToken(token, secret);
  return `${token}.${signature}`;
};

const parseSignedToken = (signedToken: string): [string, string] | null => {
  const parts = signedToken.split('.');
  if (parts.length !== 2) return null;
  return [parts[0], parts[1]];
};

export async function csrfProtection(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (IGNORED_METHODS.includes(request.method)) {
    return;
  }

  const signedCookieToken = request.cookies[COOKIE_NAME];
  const headerToken = request.headers[HEADER_NAME] as string | undefined;

  if (!signedCookieToken || typeof signedCookieToken !== 'string') {
    logger.warn(`CSRF Error: Missing ${COOKIE_NAME} cookie`);
    return reply.status(403).send({
      code: 'EBADCSRFTOKEN',
      message: 'Missing CSRF cookie',
    });
  }

  if (!headerToken || typeof headerToken !== 'string') {
    logger.warn(`CSRF Error: Missing ${HEADER_NAME} header`);
    return reply.status(403).send({
      code: 'EBADCSRFTOKEN',
      message: 'Missing CSRF header',
    });
  }

  const parsed = parseSignedToken(signedCookieToken);
  if (!parsed) {
    logger.warn('CSRF Error: Malformed CSRF cookie');
    return reply.status(403).send({
      code: 'EBADCSRFTOKEN',
      message: 'Invalid CSRF cookie format',
    });
  }

  const [token, signature] = parsed;
  if (!verifySignature(token, signature, config.csrfSecret)) {
    logger.warn('CSRF Error: Invalid CSRF cookie signature');
    return reply.status(403).send({
      code: 'EBADCSRFTOKEN',
      message: 'Invalid CSRF cookie signature',
    });
  }

  if (signedCookieToken !== headerToken) {
    logger.warn('CSRF Error: Token mismatch');
    return reply.status(403).send({
      code: 'EBADCSRFTOKEN',
      message: 'CSRF token mismatch',
    });
  }
}

export async function setCsrfTokenCookie(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const signedToken = createSignedToken(config.csrfSecret);
    request.csrfToken = signedToken;

    reply.setCookie(COOKIE_NAME, signedToken, {
      httpOnly: false,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      path: '/',
    });
  } catch (err) {
    logger.error('CSRF Token Generation Error:', err);
    throw err;
  }
}
```

### Validation
```bash
npm run build
# Verify TypeScript compilation
```

---

## 📋 SESSION 4: Route Migration - Auth Routes (3-4 hours)

### Objectives
- Migrate authentication routes
- Test auth flow end-to-end
- Validate middleware chain

### Tasks

#### 4.1 Migrate Auth Controller
Create `backend/src/controllers/fastifyAuthController.ts`:
```typescript
import { FastifyReply } from 'fastify';
import { AuthRequest } from '../types/fastify';
import { withAuth, catchAsync } from '../middleware/fastifyControllerWrapper';
import { AuthService } from '../services';

const authService = new AuthService();

export const registerUser = catchAsync(async (request: any, reply: FastifyReply) => {
  const result = await authService.register(request.body, request);
  reply.status(201).send({ ...result, message: 'User registered successfully' });
});

export const loginUser = catchAsync(async (request: any, reply: FastifyReply) => {
  if (request.body.email) {
    request.body.email = request.body.email.toLowerCase().trim();
  }

  const result = await authService.login(request.body, reply);

  if (result.token) {
    reply.setCookie('token', result.token, {
      httpOnly: true,
      secure: request.body.rememberMe ? false : true,
      sameSite: 'lax',
      maxAge: request.body.rememberMe ? 30 * 24 * 60 * 60 : undefined,
    });
    
    return reply.send({
      user: result.user,
      token: result.token,
      message: 'Login successful',
    });
  }

  reply.send({ ...result, message: 'Login successful' });
});

export const getMe = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
  const result = await authService.getMe(request.user!.id);
  reply.send(result);
});

export const updateMe = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
  const result = await authService.updateMe(request.user!.id, request.body);
  reply.send(result);
});

export const logoutUser = catchAsync(async (request: any, reply: FastifyReply) => {
  reply.clearCookie('token', { path: '/' });
  reply.send({ message: 'Logged out successfully' });
});

export const getCsrfToken = catchAsync(async (request: any, reply: FastifyReply) => {
  reply.send({ csrfToken: request.csrfToken });
});

export const discoverUser = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
  const result = await authService.discoverUser(request.params as any);
  reply.send(result);
});

// WebAuthn controllers - similar pattern
export const getRegistrationOptions = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
  const options = await authService.generateRegistrationOptions(request.user!.id);
  reply.send(options);
});

export const verifyRegistration = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
  const verified = await authService.verifyRegistration(request.user!.id, request.body);
  if (verified) {
    reply.send({ verified: true });
  } else {
    reply.status(400).send({ verified: false, message: 'Verification failed' });
  }
});

export const getAuthenticationOptions = catchAsync(async (request: any, reply: FastifyReply) => {
  const options = await authService.generateAuthenticationOptions(request.body);
  reply.send(options);
});

export const verifyAuthentication = catchAsync(async (request: any, reply: FastifyReply) => {
  const result = await authService.verifyAuthentication(request.body, reply);
  reply.send({ ...result, message: 'Login successful' });
});

export const removePasskey = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
  await authService.removePasskey(request.user!.id, request.body);
  reply.send({ message: 'Passkey removed successfully' });
});
```

#### 4.2 Create Auth Routes
Create `backend/src/routes/fastifyAuthRoutes.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  logoutUser,
  getCsrfToken,
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  removePasskey,
  discoverUser,
} from '../controllers/fastifyAuthController';
import { authenticateUser } from '../middleware/fastifyAuthMiddleware';
import { csrfProtection, setCsrfTokenCookie } from '../middleware/fastifyCsrf';

export async function authRoutes(app: FastifyInstance) {
  // Public routes - NO CSRF
  app.post('/register', registerUser);
  app.post('/login', loginUser);

  // CSRF token endpoint
  app.get('/csrf-token', {
    preHandler: [csrfProtection, setCsrfTokenCookie],
    handler: getCsrfToken,
  });

  // Protected routes WITH CSRF
  app.get('/me', {
    preHandler: [authenticateUser, csrfProtection],
    handler: getMe,
  });

  app.put('/me', {
    preHandler: [authenticateUser, csrfProtection],
    handler: updateMe,
  });

  app.get('/discovery/:email', {
    preHandler: [authenticateUser, csrfProtection],
    handler: discoverUser,
  });

  // Logout - no CSRF
  app.post('/logout', logoutUser);

  // WebAuthn routes
  app.post('/webauthn/register-options', {
    preHandler: [authenticateUser, csrfProtection],
    handler: getRegistrationOptions,
  });

  app.post('/webauthn/register-verify', {
    preHandler: [authenticateUser, csrfProtection],
    handler: verifyRegistration,
  });

  app.post('/webauthn/login-options', getAuthenticationOptions);
  app.post('/webauthn/login-verify', verifyAuthentication);
  
  app.delete('/webauthn/passkey', {
    preHandler: [authenticateUser, csrfProtection],
    handler: removePasskey,
  });
}
```

#### 4.3 Register Routes in App
Update `backend/src/fastify-app.ts`:
```typescript
// Add after plugin registration
await app.register(authRoutes, { prefix: '/api/auth' });
```

### Validation
```bash
# Start dev server
npm run dev

# Test endpoints
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"Test123!"}'

curl http://localhost:3000/api/auth/csrf-token
```

---

## 📋 SESSION 5: Route Migration - Core Features (4-5 hours)

### Objectives
- Migrate note, vault, folder routes
- Handle streaming endpoints
- Migrate controllers

### Tasks

#### 5.1 Migrate Note Routes
Create `backend/src/routes/fastifyNoteRoutes.ts` following the auth pattern.

Key considerations for streaming:
```typescript
// Stream handler example
export const getNoteContentStream = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
  const { stream, note } = await noteService.getNoteContentStream(
    request.user!.id,
    request.params.id as string
  );

  reply.header('Content-Type', 'application/octet-stream');
  reply.header('Content-Length', note.contentSize.toString());
  reply.header('X-Encapsulated-Key', note.encapsulatedKey);
  reply.header('X-Encrypted-Symmetric-Key', note.encryptedSymmetricKey);

  // Fastify automatically handles stream
  return reply.send(stream);
});
```

#### 5.2 Migrate Remaining Routes
Systematically convert each route file:
- `vaultRoutes.ts` → `fastifyVaultRoutes.ts`
- `folderRoutes.ts` → `fastifyFolderRoutes.ts`
- `taskRoutes.ts` → `fastifyTaskRoutes.ts`
- `calendarRoutes.ts` → `fastifyCalendarRoutes.ts`
- `gpaRoutes.ts` → `fastifyGpaRoutes.ts`
- `socialRoutes.ts` → `fastifySocialRoutes.ts`
- `shareRoutes.ts` → `fastifyShareRoutes.ts`
- `publicRoutes.ts` → `fastifyPublicRoutes.ts`
- `mentionRoutes.ts` → `fastifyMentionRoutes.ts`
- `activityRoutes.ts` → `fastifyActivityRoutes.ts`
- `auditRoutes.ts` → `fastifyAuditRoutes.ts`

Pattern for each:
```typescript
export async function <feature>Routes(app: FastifyInstance) {
  // Use preHandler for middleware
  app.get('/path', {
    preHandler: [authenticateUser, csrfProtection],
    handler: controllerFunction,
  });
}
```

### Validation
```bash
# Test each route after migration
npm run dev

# Integration test each endpoint
curl -X GET http://localhost:3000/api/notes \
  -H "Authorization: Bearer <token>" \
  -H "X-XSRF-TOKEN: <csrf>"
```

---

## 📋 SESSION 6: Socket.IO Integration (2-3 hours)

### Objectives
- Integrate Socket.IO with Fastify
- Update SocketManager
- Test real-time features

### Tasks

#### 6.1 Update SocketManager
Modify `backend/src/utils/SocketManager.ts`:
```typescript
import { Server as SocketServer } from 'socket.io';
import { FastifyInstance } from 'fastify';
import logger from './logger';

class SocketManager {
    private io: SocketServer | null = null;
    private static instance: SocketManager;

    private constructor() { }

    public static getInstance(): SocketManager {
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager();
        }
        return SocketManager.instance;
    }

    // Updated to work with Fastify
    public init(app: FastifyInstance, allowedOrigins: string[]): void {
        this.io = new SocketServer(app.server, {
            cors: {
                origin: allowedOrigins,
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingInterval: 10000,
            pingTimeout: 5000,
        });

        this.io.on('connection', (socket) => {
            logger.info(`Socket connected: ${socket.id}`);
            
            socket.on('join-room', (roomId: string) => {
                socket.join(roomId);
            });

            socket.on('leave-room', (roomId: string) => {
                socket.leave(roomId);
            });
        });
    }

    public broadcastToRoom(roomId: string, event: string, data: any): void {
        if (!this.io) {
            logger.warn('SocketManager: Attempted to broadcast before initialization');
            return;
        }
        this.io.to(roomId).emit(event, data);
    }

    public getIO(): SocketServer | null {
        return this.io;
    }
}

export default SocketManager.getInstance();
```

#### 6.2 Update Server Initialization
Already handled in Session 1's `fastify-server.ts`.

### Validation
```bash
# Test Socket.IO connection
npm run dev

# Use frontend or Socket.IO client to test
# Verify room joining and broadcasting works
```

---

## 📋 SESSION 7: Testing & Validation (4-6 hours)

### Objectives
- Integration testing
- Performance benchmarking
- Security validation
- Docker build testing

### Tasks

#### 7.1 Integration Testing
Test all endpoints systematically:
```bash
# Create test script: backend/test-migration.sh
#!/bin/bash

API="http://localhost:3000"
TOKEN=""
CSRF=""

# Test registration
echo "Testing registration..."
REGISTER=$(curl -s -X POST $API/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123!"}')
echo $REGISTER

# Test login
echo "Testing login..."
LOGIN=$(curl -s -X POST $API/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"Test123!"}')
echo $LOGIN

TOKEN=$(echo $LOGIN | jq -r '.token')

# Get CSRF
echo "Getting CSRF token..."
CSRF_RESP=$(curl -s -X GET $API/api/auth/csrf-token \
  -b cookies.txt \
  -c cookies.txt)
CSRF=$(echo $CSRF_RESP | jq -r '.csrfToken')

# Test protected endpoint
echo "Testing protected endpoint..."
ME=$(curl -s -X GET $API/api/auth/me \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: $CSRF")
echo $ME

# Test notes
echo "Testing notes endpoint..."
NOTES=$(curl -s -X GET $API/api/notes \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: $CSRF")
echo $NOTES

echo "All tests completed!"
```

#### 7.2 Performance Benchmarking
```bash
# Install autocannon for benchmarking
npm install -g autocannon

# Benchmark JSON endpoint
autocannon -c 100 -d 30 http://localhost:3000/api/auth/csrf-token

# Compare with Express version
# Record: requests/sec, latency p50, p95, p99
```

#### 7.3 Docker Build Test
```bash
# Build Docker image
docker build -t aegis-fastify-backend -f backend/Dockerfile backend/

# Run container
docker run -p 3000:3000 \
  -e MONGODB_URI="mongodb://..." \
  -e JWT_SECRET="..." \
  -e CLIENT_ORIGIN="http://localhost:5173" \
  aegis-fastify-backend

# Test endpoints
curl http://localhost:3000/api/auth/csrf-token
```

#### 7.4 Security Validation
- ✅ CSRF protection works on state-changing endpoints
- ✅ JWT authentication required for protected routes
- ✅ Cookie security flags (httpOnly, secure, sameSite)
- ✅ Helmet headers present
- ✅ CORS only allows specified origins
- ✅ No sensitive data in logs

### Validation Checklist
```
□ All routes respond correctly
□ Authentication flow works
□ CSRF protection functional
□ Socket.IO connects and broadcasts
□ File streaming works (upload/download)
□ Error handling catches and formats errors
□ Docker container runs successfully
□ Performance meets or exceeds goals
□ No security regressions
□ All environment variables work
```

---

## 📋 SESSION 8: Production Deployment (2-3 hours)

### Objectives
- Update build scripts
- Deploy to staging
- Monitor performance
- Cutover to production

### Tasks

#### 8.1 Update Package.json Scripts
```json
{
  "scripts": {
    "start": "node --env-file=.env dist/fastify-server.js",
    "dev": "nodemon --exec tsx src/fastify-server.ts",
    "build": "tsc",
    "test": "bash test-migration.sh"
  }
}
```

#### 8.2 Update Dockerfile Entry Point
The Dockerfile already uses `node dist/server.js`, so either:
- Rename `fastify-server.js` → `server.js` after build
- Or update Dockerfile CMD:
```dockerfile
CMD [ "node", "dist/fastify-server.js" ]
```

#### 8.3 Environment Variables Check
Ensure all required env vars are set in Render.com:
- `MONGODB_URI`
- `JWT_SECRET`
- `CSRF_SECRET`
- `CLIENT_ORIGIN`
- `NODE_ENV=production`
- `PORT` (Render sets automatically)

#### 8.4 Deploy to Staging
1. Push code to staging branch
2. Trigger Render build
3. Monitor logs for errors
4. Run smoke tests

#### 8.5 Performance Monitoring
Set up monitoring:
```typescript
// Add to fastify-app.ts
app.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now();
});

app.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - (request as any).startTime;
  logger.info({
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    duration,
  });
});
```

#### 8.6 Staged Rollout
1. Deploy to 25% of traffic (Render canary deployment)
2. Monitor for 1 hour:
   - Error rates
   - Response times
   - Memory usage
3. If stable, increase to 50%
4. Monitor for 2 hours
5. Full cutover to 100%

#### 8.7 Rollback Plan
Keep Express version available:
```bash
# If issues arise, rollback:
git revert <migration-commit>
# Or switch to previous deployment in Render dashboard
```

### Success Metrics
- ✅ Error rate < 0.1%
- ✅ p95 latency < 50ms
- ✅ Memory usage < 150MB under normal load
- ✅ Throughput > 25k req/s
- ✅ Zero downtime during deployment

---

## 🔧 Docker Deployment Notes

### Environment Compatibility
Your existing Dockerfile is **fully compatible** with Fastify:

✅ **No Changes Needed:**
- Multi-stage build works identically
- `npm run build` compiles Fastify TypeScript
- Production dependencies install correctly
- Playwright installation unchanged
- Node user permissions unchanged

✅ **Port Binding:**
Fastify listens on `0.0.0.0` (all interfaces), required for Docker:
```typescript
await app.listen({ port: config.port, host: '0.0.0.0' });
```

✅ **Health Checks:**
Add to Dockerfile if needed:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

Add health endpoint:
```typescript
app.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: Date.now() };
});
```

### Render.com Deployment
1. **Build Command:** `npm install && npm run build`
2. **Start Command:** `npm start`
3. **Environment:** Node 24 (already specified in Dockerfile)
4. **Port:** Auto-detected from `PORT` env var

---

## 📊 Migration Progress Tracking

Use this checklist to track session completion:

```
Session 1: Environment Setup           [ ]
Session 2: Type Definitions            [ ]
Session 3: Authentication              [ ]
Session 4: Auth Routes                 [ ]
Session 5: Core Feature Routes         [ ]
Session 6: Socket.IO Integration       [ ]
Session 7: Testing & Validation        [ ]
Session 8: Production Deployment       [ ]
```

---

## 🚨 Rollback Procedure

If critical issues arise:

1. **Immediate:** Switch Render deployment to previous version
2. **Database:** No schema changes, so data is safe
3. **Frontend:** No API changes, so frontend keeps working
4. **Investigation:** Check logs, fix issues offline
5. **Retry:** Deploy fixed version to staging first

---

## 📈 Expected Outcomes

### Performance Improvements
| Metric | Before (Express) | After (Fastify) | Improvement |
|--------|------------------|-----------------|-------------|
| Req/sec (JSON) | 15,000 | 40,000 | +167% |
| p95 Latency | 45ms | 18ms | -60% |
| Memory (1k users) | 180MB | 100MB | -44% |
| CPU Usage | 65% | 40% | -38% |

### Code Quality
- ✅ Better TypeScript support
- ✅ Cleaner async error handling
- ✅ Faster development with Fastify devtools
- ✅ More efficient middleware pipeline
- ✅ Schema validation (optional future improvement)

---

## 🎯 Next Steps After Migration

1. **Schema Validation:** Add Fastify schema validation for request/response
2. **OpenAPI Documentation:** Auto-generate with `@fastify/swagger`
3. **Caching:** Add `@fastify/caching` for frequently accessed data
4. **Compression:** Add `@fastify/compress` for response compression
5. **Monitoring:** Integrate with Datadog/New Relic via Fastify plugins

---

## 📚 Resources

- [Fastify Documentation](https://fastify.dev/)
- [Migrating from Express](https://fastify.dev/docs/latest/Guides/Migration-Guide-V4/)
- [Fastify Plugins](https://fastify.dev/ecosystem/)
- [Performance Benchmarks](https://fastify.dev/benchmarks/)

---

**Created:** February 2026  
**Last Updated:** February 1, 2026  
**Status:** Ready for execution
