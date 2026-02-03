# Pre-Migration Checklist

## Before Starting Any Workflow

Complete this checklist before beginning migration work.

---

## Environment Setup

### Required Software
- [ ] Node.js 20+ installed (`node --version`)
- [ ] npm 9+ installed (`npm --version`)
- [ ] Git configured (`git config user.email`)
- [ ] MongoDB running locally OR connection string available

### Repository State
- [ ] On latest main branch (`git pull origin main`)
- [ ] No uncommitted changes (`git status`)
- [ ] Express backend runs successfully:
  ```bash
  cd backend
  npm install
  npm run dev
  # Verify: http://localhost:5000/api/health
  ```

### Environment Variables
- [ ] `backend/.env` exists with required variables
- [ ] `MONGO_URI` points to valid database
- [ ] `JWT_SECRET` is set
- [ ] `CSRF_SECRET` is set

---

## Verify Express Backend

### Health Check
```bash
curl http://localhost:5000/api/health
# Should return: { "status": "ok", ... }
```

### Database Connection
```bash
# In backend directory
npm run dev
# Check logs for: "MongoDB Connected (primary): ..."
```

### Sample API Test
```bash
# Register a test user (should work)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"testuser","password":"TestPass123!"}'
```

---

## For NestJS Development (After Workflow 01)

### NestJS Project Ready
- [ ] `backend-nest/` directory exists
- [ ] Dependencies installed (`cd backend-nest && npm install`)
- [ ] App starts on port 3001:
  ```bash
  npm run start:dev
  # Verify: http://localhost:3001/health
  ```

### Test Infrastructure
- [ ] Test database configured (MongoDB Memory Server or separate DB)
- [ ] E2E tests run: `npm run test:e2e`
- [ ] Test helpers available in `test/helpers/`

---

## Workflow-Specific Checklists

### Before Test Workflows (03, 05, 07, 09, 11, 13, 15, 17)

- [ ] Express backend running on port 5000
- [ ] Test helpers created (if not first test workflow)
- [ ] Previous test workflow completed (if applicable)
- [ ] Understand the domain by reading:
  - Route file
  - Controller file
  - Service file
  - Model file(s)

### Before Migration Workflows (04, 06, 08, 10, 12, 14, 16, 18)

- [ ] Corresponding test workflow completed
- [ ] All E2E tests passing against Express
- [ ] Base patterns from Workflow 02 available
- [ ] Previous domain migrations stable

---

## Code Quality Checks

### Before Committing

- [ ] TypeScript compiles without errors: `npm run build`
- [ ] No console.log statements (use logger)
- [ ] No hardcoded values (use config)
- [ ] All new code has tests

### After Each Workflow

- [ ] All tests pass: `npm run test:e2e`
- [ ] No regressions in previous domains
- [ ] Code committed with descriptive message
- [ ] Workflow checklist in README.md updated

---

## Common Pre-Workflow Issues

### Issue: Express backend won't start
**Check:**
1. MongoDB running?
2. `.env` file exists?
3. Port 5000 free?
4. Dependencies installed?

### Issue: NestJS backend won't start
**Check:**
1. Port 3001 free?
2. Dependencies installed?
3. TypeScript errors?
4. Config module set up?

### Issue: Tests fail to connect to database
**Check:**
1. Test environment variables set?
2. MongoDB Memory Server installed?
3. Test setup file running?

### Issue: CSRF errors in tests
**Check:**
1. Using `getCsrfToken()` helper?
2. Sending CSRF header with mutations?
3. Cookie jar enabled in supertest?

---

## Quick Reference Commands

```bash
# Start Express backend
cd backend && npm run dev

# Start NestJS backend
cd backend-nest && npm run start:dev

# Run all NestJS E2E tests
cd backend-nest && npm run test:e2e

# Run specific test file
npm run test:e2e -- --grep "auth"

# Check TypeScript errors
npm run build

# View test coverage
npm run test:cov
```

---

## Emergency Rollback

If a workflow breaks things:

```bash
# Discard all changes
git checkout -- .

# Or reset to last commit
git reset --hard HEAD

# Or reset to specific commit
git log --oneline  # Find good commit
git reset --hard <commit-hash>
```

---

## Contacts

- Migration Lead: TBD
- Backend Team: TBD
- Emergency: TBD
