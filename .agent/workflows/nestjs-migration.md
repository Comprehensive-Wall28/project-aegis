---
description: Complete NestJS migration guide for Aegis backend - Fastify + In-Memory Caching + Embedded Scraper
---

# 🚀 Aegis Backend NestJS Migration Guide

> **Target Stack:** NestJS 11 + Fastify + Mongoose + In-Memory Caching  
> **Source:** Express 5.2.1 backend in `/backend/src`  
> **Destination:** New NestJS backend in `/backend-nest`  
> **Estimated Duration:** 8-12 weeks across multiple agent sessions

---

## 📋 Agent Session Requirements

> [!IMPORTANT]
> **READ THIS SECTION FIRST.** This migration will span multiple agent chat sessions. Each session should handle ONE PHASE or a major sub-section of a phase.

### Session Context Protocol

At the **start of each session**, the agent MUST:

1. **Check migration status** by reading `/backend-nest/MIGRATION_STATUS.md`
2. **Verify the current phase** is complete before proceeding to the next
3. **Review any `TODO.md`** files left by previous sessions
4. **Run tests** for previously completed phases to ensure nothing is broken

At the **end of each session**, the agent MUST:

1. **Update `/backend-nest/MIGRATION_STATUS.md`** with:
   - Completed items (checked off)
   - Blockers or issues encountered
   - Next steps for the following session
2. **Run all tests** written so far
3. **Commit progress** with descriptive messages
4. **Create `TODO.md`** in the current phase folder if work is incomplete

### File Structure Convention

```
/backend-nest/
├── MIGRATION_STATUS.md          # Track overall progress
├── src/
│   ├── app.module.ts            # Root module
│   ├── common/                  # Shared utilities, filters, guards
│   ├── config/                  # Configuration modules
│   ├── modules/                 # Feature modules
│   │   ├── auth/
│   │   ├── tasks/
│   │   ├── notes/
│   │   ├── vault/
│   │   ├── calendar/
│   │   ├── gpa/
│   │   ├── social/              # Link preview, share, scraper
│   │   ├── folders/
│   │   └── websocket/
│   └── main.ts                  # Fastify bootstrap
├── test/
│   ├── unit/                    # Jest unit tests
│   ├── integration/             # Database integration tests
│   └── e2e/                     # End-to-end API tests
└── TODO.md                      # Session handoff notes
```

### Reference Material

Always use the **old Express backend** at `/backend/src` as reference:
- **Models:** `/backend/src/models` → Copy schemas, add decorators
- **Services:** `/backend/src/services` → Convert to @Injectable
- **Controllers:** `/backend/src/controllers` → Convert to @Controller
- **Repositories:** `/backend/src/repositories` → Convert to injectable providers
- **Utils:** `/backend/src/utils` → Migrate to common modules

---

## 🔧 Phase 0: Preparation & Package Selection

**Duration:** 1-2 sessions  
**Goal:** Initialize NestJS project with optimal package selection

### Step 0.1: Initialize NestJS Project

```bash
# Create new NestJS project with Fastify
cd /home/comprehensive-wall28/codium/aegis
npx -y @nestjs/cli@latest new backend-nest --strict --skip-git --package-manager npm
```

After initialization:
1. Replace Express adapter with Fastify in `main.ts`
2. Configure strict TypeScript settings matching `/backend/tsconfig.json`

### Step 0.2: Install Core Dependencies

> [!WARNING]
> **Do NOT reuse old packages blindly.** Use NestJS-native alternatives where they exist.

#### Package Migration Map

| Old Package | New Package | Reason |
|-------------|-------------|--------|
| `express` | `@nestjs/platform-fastify` | 2x throughput |
| Manual validation | `class-validator` + `class-transformer` | Native NestJS support |
| `cookie-parser` | `@fastify/cookie` | Fastify-native |
| `cors` | `@fastify/cors` | Fastify-native |
| `helmet` | `@fastify/helmet` | Fastify-native |
| `express-rate-limit` | `@nestjs/throttler` | Native guards + decorators |
| `csrf-csrf` | Custom guard + `@fastify/csrf-protection` | Fastify-compatible |
| `jsonwebtoken` | `@nestjs/jwt` | Better DI integration |
| `winston` | `@nestjs/common` Logger or `nestjs-pino` | Structured logging + Fastify |
| Manual caching | `@nestjs/cache-manager` | Built-in in-memory caching |
| `metascraper` + plugins | Keep all of them | No better alternative |
| `open-graph-scraper` | Keep | Still optimal |
| `playwright` | Keep | Core functionality |
| `@simplewebauthn/*` | **REMOVE** | User request: deprecated |
| `@noble/post-quantum` | Keep | PQC crypto |
| `mongoose` | `@nestjs/mongoose` + `mongoose` | NestJS wrapper |
| `socket.io` | `@nestjs/websockets` + `@nestjs/platform-socket.io` | Native gateways |
| `p-queue` | Keep | Concurrency control |
| `axios` | Keep or use native fetch | HTTP client |

#### Install Commands

```bash
cd backend-nest

# Core NestJS + Fastify
npm i @nestjs/platform-fastify @fastify/cookie @fastify/cors @fastify/helmet @fastify/static @fastify/multipart

# Database
npm i @nestjs/mongoose mongoose

# Validation & Transformation
npm i class-validator class-transformer

# Authentication & Security
npm i @nestjs/jwt @nestjs/passport passport passport-jwt @nestjs/throttler
npm i argon2 @noble/post-quantum

# Caching (In-Memory)
npm i @nestjs/cache-manager cache-manager

# WebSocket
npm i @nestjs/websockets @nestjs/platform-socket.io socket.io

# Scraping (keep existing)
npm i playwright metascraper metascraper-amazon metascraper-audio metascraper-author \
    metascraper-clearbit metascraper-description metascraper-image metascraper-instagram \
    metascraper-logo metascraper-spotify metascraper-title metascraper-twitter \
    metascraper-url metascraper-video metascraper-youtube open-graph-scraper p-queue

# Utils
npm i @mozilla/readability googleapis

# Logging (pick one)
npm i nestjs-pino pino pino-pretty  # OR use built-in Logger

# Dev dependencies
npm i -D @types/node @nestjs/testing jest ts-jest supertest @types/supertest
```

### Step 0.3: Configure Base Files

1. **`main.ts`** - Fastify bootstrap with **Global Prefix API**:
```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );
  
  // MATCHING OLD BACKEND PREFIX
  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Trust proxy for Render
  const adapter = app.getHttpAdapter().getInstance();
  adapter.trustProxy = 1;

  await app.listen(process.env.PORT || 5000, '0.0.0.0');
}
bootstrap();
```

2. **`app.module.ts`** - Root module with config
3. **Environment configuration** using `@nestjs/config`

### Step 0.4: Create MIGRATION_STATUS.md

Create `/backend-nest/MIGRATION_STATUS.md`:

```markdown
# NestJS Migration Status

## Current Phase: 0 - Preparation
## Last Updated: [DATE]
## Last Agent Session: [SESSION_ID]

### Phase 0: Preparation
- [ ] Project initialized with Fastify
- [ ] All packages installed
- [ ] Base configuration complete
- [ ] TypeScript configured
- [ ] MIGRATION_STATUS.md created

### Phase 1: Foundation
- [ ] Database connections (main + audit)
- [ ] Base repository provider
- [ ] Base service abstract
- [ ] Exception filters
- [ ] Logger module
- [ ] Config module

### Phase 2: Core Services
- [ ] Auth module (Login, Register, JWT, PQC - NO WebAuthn)
- [ ] Task module
- [ ] Note module
- [ ] Folder module
- [ ] Calendar module
- [ ] GPA module

### Phase 3: Complex Features
- [ ] Vault module (GridFS)
- [ ] Scraper module (Embedded)
- [ ] WebSocket gateway
- [ ] Google Drive OAuth

### Phase 4: Testing
- [ ] Unit tests (80% coverage)
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance validation

### Phase 5: Deployment
- [ ] Dockerfile updated (Browser support)
- [ ] CI/CD configured
- [ ] Parallel running validated
- [ ] Full cutover
```

### Phase 0 Tests

**Create `/backend-nest/test/e2e/app.e2e-spec.ts`:**
(See previous implementation - update to check `/api/health` if you added a health check controller)

---

## 🏗️ Phase 1: Foundation

**Duration:** 2-3 sessions  
**Goal:** Database connections, base classes, global features

### Step 1.1: Configuration Module

Create `/backend-nest/src/config/`:

1. **`configuration.ts`** - Environment validation and typing
2. **`database.config.ts`** - MongoDB connection options
3. **`cache.config.ts`** - **In-Memory** caching configuration
4. **`security.config.ts`** - JWT, CSRF, rate limit settings

Reference: `/backend/src/config/` for environment variables

### Step 1.2: Database Connections

> [!IMPORTANT]
> The existing backend uses TWO separate MongoDB databases: main and audit.

```typescript
// app.module.ts
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get('MONGO_URI'),
      }),
    }),
    MongooseModule.forRootAsync({
      connectionName: 'audit',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get('AUDIT_MONGO_URI'),
      }),
    }),
  ],
})
```

### Step 1.3: Migrate Mongoose Models

**Source:** `/backend/src/models/`  
**Destination:** `/backend-nest/src/modules/[feature]/schemas/`

For each model:
1. Copy the schema definition
2. Add `@Schema()` and `@Prop()` decorators
3. Create the matching `Document` type
4. Export via the feature module

Example:
```typescript
// Old: /backend/src/models/taskModel.ts
// New: /backend-nest/src/modules/tasks/schemas/task.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Task {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  // ... all other fields from old model
}

export type TaskDocument = Task & Document;
export const TaskSchema = SchemaFactory.createForClass(Task);
```

### Step 1.4: Base Repository Provider

**Source:** `/backend/src/repositories/baseRepository.ts`  
**Destination:** `/backend-nest/src/common/repositories/base.repository.ts`

Convert to generic injectable:
```typescript
@Injectable()
export abstract class BaseRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  // Keep existing methods: findById, findOne, create, update, delete
  // Add sanitization for NoSQL injection prevention
}
```

### Step 1.5: Base Service Abstract

**Source:** `/backend/src/services/baseService.ts`  
**Destination:** `/backend-nest/src/common/services/base.service.ts`

### Step 1.6: Global Exception Filter

Create `/backend-nest/src/common/filters/all-exceptions.filter.ts`:
- Handle `ServiceError` and `RepositoryError`
- Map to NestJS `HttpException` types

### Step 1.7: Logger Module

Using `nestjs-pino` for structured logging with Fastify.

### Phase 1 Tests

**Unit tests for:**
- Configuration loading
- Database connection
- Base repository CRUD operations
- Exception filter error mapping

---

## 🔐 Phase 2: Core Services Migration

**Duration:** 3-4 sessions  
**Goal:** Migrate all 13 services with their controllers, DTOs, and tests

### Migration Order (by dependency)

1. **Session 1:** Auth Module (No WebAuthn)
2. **Session 2:** Folder, Calendar, GPA Modules
3. **Session 3:** Task, Note Modules (interdependent)
4. **Session 4:** Share, Public Share, Social features

### Step 2.1: Auth Module

**Source files:** `/backend/src/services/authService.ts`
**Destination:** `/backend-nest/src/modules/auth/`

> [!WARNING]
> **REMOVE all WebAuthn logic.** The user specifically requested this deprecation.

**Components to create:**
```
auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── csrf.guard.ts
│   └── throttle.guard.ts
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   └── ... (No WebAuthn DTOs)
```

**Key migrations:**
- **Remove** `/generate-registration-options`, `/verify-registration`, etc.
- Keep standard email/password flow (Argon2)
- Keep JWT generation/validation

### Step 2.2: Simple Modules (Folder, Calendar, GPA)

Migrate standard CRUD services.

### Step 2.3: Task & Note Modules (with Mentions)

> [!IMPORTANT]
> Use `forwardRef` or a shared `MentionService` to resolve circular dependencies between Tasks and Notes.

### Step 2.4: Caching Implementation (In-Memory)

Use the default in-memory cache provider.

```typescript
// app.module.ts
CacheModule.register({
  isGlobal: true,
  ttl: 5 * 60 * 1000, // 5 minutes default
  max: 100, // Max items in memory
});
```

Usage:
```typescript
@UseInterceptors(CacheInterceptor)
@Get()
findAll() { ... }
```

> [!NOTE]
> In-memory caching means cache is NOT shared between multiple instances. Since Render deployment is "standard", this is acceptable but be aware of memory usage.

### Phase 2 Tests

**For each module, create:**
- Unit tests (Service, Controller)
- Integration tests (DB operations)

---

## ⚡ Phase 3: Complex Features Migration

**Duration:** 2-3 sessions  
**Goal:** Migrate Playwright scraper, GridFS streaming, WebSocket gateway

### Step 3.1: Scraper Module (Embedded)

> [!CAUTION]
> The Scraper runs in the **same container** as the API. Memory management is critical to avoid OOM kills on Render.

**Source:** `/backend/src/utils/scraperUtils.ts`

**Implementation:**
- **Singleton Browser:** Must reuse the browser instance.
- **Concurrency Limit:** Set low (e.g., 2) to fit in Render memory.

```typescript
// scraper.module.ts
@Module({
  providers: [
    {
      provide: 'SCRAPER_QUEUE',
      useFactory: () => new PQueue({ 
        concurrency: 2, // Low concurrency for shared resources
        timeout: 60000 
      }),
      scope: Scope.DEFAULT
    },
    ScraperService
  ]
})
```

**Browser Lifecycle:**
- Launch chromium with necessary args (`--no-sandbox`, etc.)
- Implement strict idle timeouts to release memory when not scraping

### Step 3.2: Vault Module (GridFS Streaming)

**Source:** `/backend/src/services/vaultService.ts`

**Key implementation:**
- Use `GridFSBucket` with `openUploadStream`
- Integrate with Fastify multipart for streaming uploads without buffering the whole file in RAM.

### Step 3.3: WebSocket Gateway

**Destination:** `/backend-nest/src/modules/websocket/`

Migrate to `@WebSocketGateway` with correct CORS settings. Standard adapter (no Redis) is fine for single-instance deployment.

### Step 3.4: Google Drive OAuth

Wrap existing `googleapis` logic in a NestJS service.

### Phase 3 Tests

**Scraper tests:**
- Mock Playwright
- Test queue limits
- Verify browser cleanup hooks

---

## 🧪 Phase 4: Testing & Verification

**Duration:** 2-3 sessions  
**Goal:** 80% test coverage, performance validation

### Step 4.1: Complete Unit Test Coverage
### Step 4.2: Integration Tests (DB)
### Step 4.3: E2E Tests

**Critical flows to test:**
1. Auth without WebAuthn
2. Task/Note CRUD
3. File upload streaming
4. Scraper (mocked browser)

---

## 🚀 Phase 5: Deployment & Cutover

**Duration:** 1-2 sessions  
**Goal:** Production deployment with zero downtime

### Step 5.1: Update Dockerfile

> [!IMPORTANT]
> Must install Playwright dependencies and fonts, similar to the existing Dockerfile.

```dockerfile
# Stage 1: Build
FROM node:24-slim AS build
WORKDIR /usr/src/app
COPY package*.json ./
# Skip chromium download (we install system deps later)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:24-slim
WORKDIR /usr/src/app
COPY package*.json ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install --omit=dev

# --- PLAYWRIGHT SETUP (Critical for Scraper) ---
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# Install dependencies + Chromium
RUN npx playwright install --with-deps chromium \
  && chmod -R 777 /ms-playwright

# Install fonts (Emoji, CJK)
RUN apt-get update && apt-get install -y \
  fonts-noto-color-emoji \
  fonts-liberation \
  fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*
# -----------------------------------------------

COPY --from=build /usr/src/app/dist ./dist
RUN chown -R node:node /usr/src/app
USER node

# Start NestJS (Fastify)
CMD [ "node", "dist/main.js" ]
```

### Step 5.2: Validation

1. **Local Dev:** Ensure `npm run dev` works and browser launches successfully.
2. **Docker Build:** Verify the Dockerfile builds and the scraper works inside the container.

### Step 5.3: Cutover

Switch traffic to the new container.

---

*Last Updated: January 31, 2026*
*Version: 1.1*
