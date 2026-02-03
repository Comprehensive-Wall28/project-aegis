# Workflow 13: Sharing E2E Tests

## Objective
Write E2E tests for file and link sharing endpoints.

## Prerequisites
- Auth module working
- Understanding of token-based sharing

---

## Phase 1: Explore Sharing Domain

### Step 1.1: Map Endpoints

**READ:**
```
backend/src/routes/shareRoutes.ts
backend/src/routes/publicShareRoutes.ts
backend/src/controllers/shareController.ts
backend/src/controllers/publicShareController.ts
backend/src/services/shareService.ts
backend/src/services/publicShareService.ts
backend/src/models/SharedLink.ts
backend/src/models/SharedFile.ts
```

**Expected endpoints:**

**Authenticated:**
- `POST /api/share/invite-file` - Invite user to access file
- `POST /api/share/link` - Create shareable link
- `GET /api/share/my-links` - List user's shared links
- `DELETE /api/share/link/:id` - Revoke shared link

**Public:**
- `GET /api/public/share/:token` - Access shared content via token

---

## Phase 2: Test Cases

### Share Link Tests
```
describe('POST /api/share/link', () => {
  it('should create shareable link')
  it('should set expiration date')
  it('should require authentication')
})

describe('GET /api/public/share/:token', () => {
  it('should return shared content')
  it('should reject expired token')
  it('should reject invalid token')
  it('should work without authentication')
})
```

### File Invitation Tests
```
describe('POST /api/share/invite-file', () => {
  it('should invite user by email')
  it('should set permission level')
  it('should notify invited user')
})
```

---

## Completion Checklist
- [ ] Share link tests (8+ cases)
- [ ] File invitation tests (5+ cases)
- [ ] Public access tests (5+ cases)
- [ ] 20+ tests passing against Express

## Next Workflow
Proceed to [14-sharing-migration.md](./14-sharing-migration.md)
