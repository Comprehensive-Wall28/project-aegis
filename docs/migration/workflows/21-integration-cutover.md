# Workflow 21: Integration & Cutover

## Objective
Final integration testing, performance validation, and cutover preparation.

## Prerequisites
- All domain migrations complete (Workflows 01-20)
- All E2E tests passing against NestJS

---

## Phase 1: Full Regression Testing

### Step 1.1: Run Complete Test Suite

```bash
cd backend-nest
npm run test:e2e
```

**Expected test counts:**
| Domain | Tests |
|--------|-------|
| Auth | 38+ |
| Tasks | 30+ |
| Calendar | 25+ |
| Folders | 25+ |
| Notes | 45+ |
| Sharing | 20+ |
| Vault | 30+ |
| Social | 60+ |
| WebSocket | 10+ |
| Supporting | 33+ |
| **Total** | **316+** |

### Step 1.2: Integration Tests

**Cross-domain scenarios:**

```typescript
describe('Integration flows', () => {
  it('should create note, share link, access via public URL');
  it('should upload file, share in room, download by room member');
  it('should register, create task, complete, verify in activity');
  it('should post link, add annotation, verify backlink in notes');
});
```

---

## Phase 2: Performance Benchmarking

### Step 2.1: Setup Performance Tests

**Tool: autocannon or k6**

```bash
# Install
npm install -g autocannon

# Run against Express
autocannon -c 100 -d 30 http://localhost:5000/api/tasks

# Run against NestJS
autocannon -c 100 -d 30 http://localhost:3001/api/tasks
```

### Step 2.2: Benchmark Key Endpoints

**Endpoints to benchmark:**
- `GET /api/auth/me` - Simple auth check
- `GET /api/tasks` - List with filters
- `POST /api/tasks` - Create (write)
- `GET /api/notes/:id/content` - Streaming
- `GET /api/vault/download/:id` - Large file streaming
- `GET /api/social/rooms/:id` - Complex joins

**Metrics to capture:**
- Requests per second
- Latency (p50, p95, p99)
- Memory usage
- CPU usage

### Step 2.3: Compare Results

Create comparison table:

| Endpoint | Express RPS | NestJS RPS | Diff |
|----------|-------------|------------|------|
| GET /me | ? | ? | +?% |
| GET /tasks | ? | ? | +?% |
| ... | | | |

**Goal: NestJS+Fastify should be at least equal, ideally 10-30% faster**

---

## Phase 3: Database Migration Verification

### Step 3.1: Data Compatibility Check

**Verify NestJS can read existing data:**

```typescript
describe('Data compatibility', () => {
  // Use production-like test database with existing data
  
  it('should read existing users');
  it('should read existing tasks');
  it('should read existing notes');
  it('should read encrypted data correctly');
  it('should handle all ObjectID references');
});
```

### Step 3.2: Schema Validation

```bash
# Export schema from Express models
# Compare with NestJS schemas
# Verify indexes match
```

---

## Phase 4: Logging & Monitoring

### Step 4.1: Verify Logging

**Check all logs are captured:**
- Request logging (method, path, status, duration)
- Error logging (stack traces in dev)
- Audit logging (to secondary DB)
- Performance metrics

### Step 4.2: Setup Health Monitoring

```typescript
// health.controller.ts
@Get()
async healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: await this.dbService.healthCheck(),
  };
}
```

---

## Phase 5: Cutover Preparation

### Step 5.1: Environment Configuration

**Production environment variables:**
- [ ] `MONGO_URI` pointing to production DB
- [ ] `MONGO_URI_SECONDARY` for audit logs
- [ ] `JWT_SECRET` same as Express
- [ ] `CSRF_SECRET` same as Express
- [ ] Google Drive credentials
- [ ] Frontend URL for CORS

### Step 5.2: Deployment Configuration

**Update render.yaml or deployment config:**

```yaml
# Option A: Replace Express
services:
  - type: web
    name: aegis-backend
    env: node
    buildCommand: cd backend-nest && npm install && npm run build
    startCommand: cd backend-nest && npm run start:prod
    envVars:
      - key: PORT
        value: 5000  # Same port as before

# Option B: Blue-Green
services:
  - type: web
    name: aegis-backend-legacy
    # ... Express config (keep running)
  - type: web
    name: aegis-backend-new
    # ... NestJS config (port 3001)
```

### Step 5.3: Rollback Plan

**If issues occur:**
1. Revert deployment to Express
2. Investigate logs
3. Fix in NestJS
4. Re-deploy

**Keep Express backend deployable for at least 2 weeks after cutover.**

---

## Phase 6: Cutover Execution

### Step 6.1: Pre-Cutover Checklist

- [ ] All tests pass
- [ ] Performance acceptable
- [ ] Logs verified
- [ ] Monitoring in place
- [ ] Rollback tested
- [ ] Team notified

### Step 6.2: Cutover Steps

1. **Maintenance window** (if needed)
2. **Deploy NestJS** to production
3. **Verify health endpoint**
4. **Run smoke tests** against production
5. **Monitor error rates** for 30 minutes
6. **Announce completion**

### Step 6.3: Post-Cutover

- [ ] Monitor for 24 hours
- [ ] Check error rates
- [ ] Review performance metrics
- [ ] Gather user feedback
- [ ] Document any issues

---

## Completion Checklist

- [ ] Full regression suite passing (316+ tests)
- [ ] Performance benchmarks acceptable
- [ ] Data compatibility verified
- [ ] Logging working correctly
- [ ] Health monitoring configured
- [ ] Deployment configuration ready
- [ ] Rollback plan documented
- [ ] Cutover executed successfully
- [ ] Post-cutover monitoring complete

---

## Migration Complete! 🎉

### Post-Migration Tasks

1. **Deprecate Express codebase** after 2-week stability period
2. **Update documentation** with NestJS architecture
3. **Train team** on NestJS patterns
4. **Plan future improvements** leveraging NestJS features:
   - GraphQL support
   - Microservices
   - Advanced caching
   - Better testing utilities
