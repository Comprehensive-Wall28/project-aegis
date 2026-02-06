# Initial NestJS Setup Workflow

## Objective
Bootstrap a new NestJS backend with Fastify adapter that maintains full compatibility with the existing Express backend.

## Steps

### 1. Project Initialization
- Create `backend-nest/` directory at repository root
- Initialize NestJS project with CLI using Fastify
- Configure TypeScript with same settings as existing backend
- Set up folder structure following 3-tier architecture (controllers → services → repositories)

### 2. Install Dependencies
Install NestJS core packages:
- `@nestjs/platform-fastify` for Fastify adapter
- `@nestjs/mongoose` for MongoDB integration
- `@nestjs/config` for environment configuration
- `@nestjs/jwt` and `@nestjs/passport` for authentication
- `@fastify/cookie`, `@fastify/csrf-protection`, `@fastify/helmet` for security
- `class-validator` and `class-transformer` for validation

Port existing dependencies from `backend/package.json` that are still needed.

### 3. Environment Configuration
- Create `src/config/configuration.ts` using NestJS ConfigModule
- Port all environment variables from `backend/src/config/env.ts`
- Add class-validator schemas for environment validation
- Ensure same defaults and validation rules

### 4. Database Setup with Runtime Switching
Create database module that supports:
- Multiple MongoDB connections (primary + secondary)
- Runtime URI switching capability
- Automatic fallback on connection failure
- Health check for all connections

Key files:
- `src/config/database/database.module.ts` - Module definition
- `src/config/database/database-manager.service.ts` - Connection manager with switching logic
- `src/config/database/database.providers.ts` - Connection providers

Requirements:
- Expose method to switch active connection at runtime
- Monitor connection health and auto-fallback
- Log all connection events
- Maintain connection pool settings from existing backend

### 5. Common Infrastructure
Create shared utilities in `src/common/`:

**Guards:**
- `JwtAuthGuard` - JWT authentication (compatible with existing tokens)
- `CsrfGuard` - CSRF protection matching current implementation
- `PublicGuard` - Decorator to mark routes as public

**Decorators:**
- `@CurrentUser()` - Extract user from request
- `@Public()` - Skip authentication

**Interceptors:**
- `AnalyticsInterceptor` - Port from `backend/src/middleware/analyticsMiddleware.ts`
- `TransformInterceptor` - Standardize response format

**Filters:**
- `HttpExceptionFilter` - Port from `backend/src/middleware/errorHandler.ts`
- Match exact same error response structure

**Pipes:**
- `ValidationPipe` - Global validation using class-validator

### 6. Main Application Setup
Configure `main.ts`:
- Initialize Fastify adapter with same options as Express (trustProxy, etc.)
- Register fastify plugins (cookie, csrf, helmet)
- Configure CORS with same origins from existing backend
- Apply global pipes, interceptors, filters
- Set up security headers matching current helmet config
- Listen on port 5000

### 7. Health & Monitoring Endpoints
Create health module with endpoints:
- `GET /health` - Basic health check
- `GET /health/db` - Database connections status
- `POST /admin/db/switch/:name` - Switch active database connection (protected)

### 8. Verification
Run verification tests:
- Application starts successfully on port 5000
- Health endpoint responds
- Primary database connection established
- Secondary database connection established
- Environment variables loaded correctly
- Can manually trigger database switching
- Fallback works when primary connection drops
- Fastify logs show proper initialization

## Success Criteria
- [ ] NestJS app starts without errors
- [ ] Both database connections active
- [ ] Health endpoints respond correctly
- [ ] Database switching works manually
- [ ] Auto-fallback works when connection drops
- [ ] Environment validation catches missing variables
- [ ] Logging matches existing backend format

## Notes
- Do NOT implement any business logic yet
- Focus on infrastructure and compatibility
- Test database switching thoroughly before proceeding
- Ensure JWT secret and cookie encryption key match existing backend
