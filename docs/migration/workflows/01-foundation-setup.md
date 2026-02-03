# Workflow 01: Foundation Setup

## Objective
Create a new NestJS project with Fastify adapter running on port 3001, with logging infrastructure, performance interceptors, and test setup.

## Prerequisites
- Node.js 20+ installed
- Access to the existing Express backend at `backend/`
- MongoDB running locally or connection string available

## Scope Boundaries

### IN SCOPE
- NestJS project initialization in `backend-nest/`
- Fastify adapter configuration
- Environment configuration module
- Database connection module (multi-database support)
- Winston logging integration
- Performance/audit interceptor (logs only, no DB persistence yet)
- Global exception filter
- Jest + Supertest + MongoDB Memory Server setup
- Health check endpoint

### OUT OF SCOPE
- Any domain modules (auth, tasks, etc.)
- Actual business logic
- Socket.IO/WebSocket setup
- CI/CD configuration

---

## Phase 1: Project Initialization

### Step 1.1: Explore Current Backend Structure

**READ these files to understand the current setup:**

```
backend/package.json          # Dependencies and versions
backend/tsconfig.json         # TypeScript configuration
backend/src/server.ts         # Server entry point
backend/src/app.ts            # Express app configuration
```

**UNDERSTAND:**
- What Node.js version is targeted?
- What TypeScript version and settings are used?
- How is the Express app structured?
- What middleware is applied globally?

### Step 1.2: Initialize NestJS Project

**TASKS:**
1. Create new NestJS project in `backend-nest/` directory
2. Use `@nestjs/platform-fastify` instead of default Express
3. Match TypeScript strict mode settings from existing backend
4. Configure `package.json` scripts: `start`, `start:dev`, `build`, `test`, `test:e2e`

**VALIDATION:**
- [ ] `npm run start:dev` starts server on port 3001
- [ ] `curl http://localhost:3001` returns response
- [ ] TypeScript compilation has no errors

---

## Phase 2: Configuration Module

### Step 2.1: Explore Current Environment Config

**READ these files:**

```
backend/src/config/env.ts     # Environment variable handling
backend/.env.example          # (if exists) Example env file
```

**UNDERSTAND:**
- What environment variables are required vs optional?
- How are defaults handled for development?
- What validation is performed on startup?

### Step 2.2: Create ConfigModule

**TASKS:**
1. Install `@nestjs/config` and `joi` for validation
2. Create config module with schema validation
3. Create typed configuration service
4. Ensure all 13 environment variables from existing backend are supported:
   - `NODE_ENV`, `PORT`
   - `MONGO_URI`, `MONGO_URI_SECONDARY`
   - `JWT_SECRET`, `COOKIE_ENCRYPTION_KEY`
   - `FRONTEND_URL`, `WEBAUTHN_RP_ID`
   - `CSRF_SECRET`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID`
   - `LOG_LEVEL`

**VALIDATION:**
- [ ] App fails to start if required vars missing (in production mode)
- [ ] App starts with sensible defaults in development
- [ ] Config values accessible via dependency injection

---

## Phase 3: Database Module

### Step 3.1: Explore Current Database Setup

**READ these files:**

```
backend/src/config/DatabaseManager.ts    # Multi-connection manager
backend/src/config/initDatabase.ts       # Startup initialization
```

**UNDERSTAND:**
- How does the singleton pattern work?
- How are primary vs secondary connections managed?
- What connection pool settings are used?
- How is connection health checked?

### Step 3.2: Create DatabaseModule

**TASKS:**
1. Install `@nestjs/mongoose`
2. Create database module supporting multiple named connections
3. Configure connection pooling matching existing settings:
   - `maxPoolSize: 10`
   - `minPoolSize: 2`
   - `serverSelectionTimeoutMS: 5000`
   - `socketTimeoutMS: 45000`
4. Implement health check method
5. Handle graceful shutdown

**VALIDATION:**
- [ ] Primary connection established on startup
- [ ] Secondary connection established if URI provided
- [ ] `/health` endpoint reports database status
- [ ] Clean shutdown closes all connections

---

## Phase 4: Logging Infrastructure

### Step 4.1: Explore Current Logging

**READ these files:**

```
backend/src/utils/logger.ts              # Winston setup
backend/src/middleware/errorHandler.ts   # How errors are logged
```

**UNDERSTAND:**
- What log format is used (JSON vs simple)?
- What metadata is attached to logs?
- How does log level configuration work?
- What's the difference between production and development output?

### Step 4.2: Create LoggingModule

**TASKS:**
1. Create Winston-based logger service matching existing format
2. Create `LoggingInterceptor` that logs:
   - Request method and URL
   - Response status code
   - Response time in milliseconds
   - User ID (if authenticated)
3. Configure environment-aware formatting:
   - Production: JSON format
   - Development: Simple colored format
4. Add correlation ID to trace requests

**VALIDATION:**
- [ ] All requests logged with timing
- [ ] Log output matches existing format
- [ ] Correlation IDs link related logs

---

## Phase 5: Performance Interceptor

### Step 5.1: Design Performance Tracking

**UNDERSTAND the requirements:**
- Track response time for every request
- Track memory usage (heap)
- Prepare structure for future database persistence
- No actual database writes in this workflow

### Step 5.2: Create PerformanceInterceptor

**TASKS:**
1. Create interceptor that captures:
   - Request start time (high-resolution)
   - Response end time
   - Duration in milliseconds
   - Memory usage (process.memoryUsage())
   - Request metadata (method, path, query params)
2. Create `PerformanceLog` interface for future DB persistence
3. Log performance data via Winston (not DB yet)
4. Add slow request threshold warning (e.g., >1000ms)

**VALIDATION:**
- [ ] Performance logged for every request
- [ ] Slow requests trigger warning logs
- [ ] Memory metrics captured

---

## Phase 6: Exception Handling

### Step 6.1: Explore Current Error Handling

**READ these files:**

```
backend/src/middleware/errorHandler.ts      # Global error handler
backend/src/services/base/BaseService.ts    # ServiceError class
backend/src/repositories/base/BaseRepository.ts  # RepositoryError class
```

**UNDERSTAND:**
- What is the response format for errors?
- How are status codes determined?
- What information is exposed in production vs development?
- How are different error types handled (ServiceError, RepositoryError, unknown)?

### Step 6.2: Create HttpExceptionFilter

**TASKS:**
1. Create global exception filter
2. Handle `ServiceError` with custom status codes
3. Handle standard `HttpException` from NestJS
4. Handle unknown errors (500 Internal Server Error)
5. Match response format exactly:
   ```json
   {
     "message": "Error description",
     "stack": "..." // Only in non-production
   }
   ```
6. Log all errors appropriately

**VALIDATION:**
- [ ] ServiceError returns correct status code
- [ ] Stack trace hidden in production
- [ ] Unknown errors return 500
- [ ] All errors logged

---

## Phase 7: Test Infrastructure

### Step 7.1: Explore Testing Requirements

**UNDERSTAND:**
- E2E tests will run against full NestJS application
- Tests need isolated database (MongoDB Memory Server)
- Tests need authentication helpers
- Tests should be runnable in CI/CD

### Step 7.2: Setup Test Infrastructure

**TASKS:**
1. Install test dependencies:
   - `@nestjs/testing`
   - `mongodb-memory-server`
   - `supertest`
2. Create test utilities:
   - `createTestingModule()` - bootstraps app with test config
   - `getTestDatabase()` - provides isolated MongoDB instance
   - `cleanupDatabase()` - clears all collections
3. Create base test setup file
4. Configure Jest for E2E tests in `test/` directory

**VALIDATION:**
- [ ] `npm run test:e2e` runs successfully
- [ ] Tests use in-memory MongoDB
- [ ] Database cleaned between tests
- [ ] Sample health check test passes

---

## Phase 8: Health Endpoint

### Step 8.1: Create Health Module

**TASKS:**
1. Create `/health` endpoint returning:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-02-03T...",
     "uptime": 12345,
     "database": {
       "primary": "connected",
       "secondary": "connected" // or "not configured"
     }
   }
   ```
2. Return 503 if database unhealthy

**VALIDATION:**
- [ ] `/health` returns 200 when healthy
- [ ] `/health` returns 503 when DB down
- [ ] E2E test for health endpoint passes

---

## Completion Checklist

Before marking this workflow complete:

- [ ] NestJS app starts on port 3001
- [ ] All environment variables supported
- [ ] Primary database connection works
- [ ] Secondary database connection works (if configured)
- [ ] All requests logged with timing
- [ ] Performance metrics captured
- [ ] Errors return correct format
- [ ] `/health` endpoint functional
- [ ] E2E test infrastructure working
- [ ] Sample health check E2E test passes
- [ ] Code committed to git

## Files Created (Expected)

```
backend-nest/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts          # Health endpoint
│   ├── config/
│   │   ├── config.module.ts
│   │   ├── config.service.ts
│   │   └── config.schema.ts       # Joi validation schema
│   ├── database/
│   │   ├── database.module.ts
│   │   └── database.service.ts    # Health check methods
│   └── common/
│       ├── interceptors/
│       │   ├── logging.interceptor.ts
│       │   └── performance.interceptor.ts
│       ├── filters/
│       │   └── http-exception.filter.ts
│       └── logger/
│           └── logger.service.ts
├── test/
│   ├── jest-e2e.json
│   ├── setup.ts                   # Test utilities
│   └── app.e2e-spec.ts           # Health check tests
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── nest-cli.json
```

## Next Workflow
After completing this workflow, proceed to [02-base-patterns.md](./02-base-patterns.md) to port the repository and service base classes.
