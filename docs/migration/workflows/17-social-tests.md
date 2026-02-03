# Workflow 17: Social Domain E2E Tests

## Objective
Write comprehensive E2E tests for the social domain - the most complex domain with multiple entities and real-time features.

## Prerequisites
- Auth module working
- Understanding of multi-entity relationships

## Scope Boundaries

### IN SCOPE
- Room tests (create, members, roles)
- Collection tests (CRUD within rooms)
- Link post tests (CRUD within collections)
- Comment tests
- View tracking tests
- Reader annotation tests

### OUT OF SCOPE
- Social module implementation
- Socket.IO real-time (separate workflow)
- Link preview scraping (mocked)

---

## Phase 1: Explore Social Domain

### Step 1.1: Map All Social Endpoints

**READ this file:**

```
backend/src/routes/socialRoutes.ts
```

**DOCUMENT all endpoints (expected to be numerous):**

**Rooms:**
- `GET /api/social/rooms` - List user's rooms
- `POST /api/social/rooms` - Create room
- `GET /api/social/rooms/:id` - Get room
- `PUT /api/social/rooms/:id` - Update room
- `DELETE /api/social/rooms/:id` - Delete room
- `POST /api/social/rooms/:id/members` - Add member
- `DELETE /api/social/rooms/:id/members/:userId` - Remove member
- `PUT /api/social/rooms/:id/members/:userId/role` - Change role

**Collections:**
- `GET /api/social/rooms/:roomId/collections` - List collections
- `POST /api/social/rooms/:roomId/collections` - Create collection
- `PUT /api/social/collections/:id` - Update collection
- `DELETE /api/social/collections/:id` - Delete collection

**Links:**
- `GET /api/social/collections/:collectionId/links` - List links
- `POST /api/social/collections/:collectionId/links` - Post link
- `GET /api/social/links/:id` - Get link
- `PUT /api/social/links/:id` - Update link
- `DELETE /api/social/links/:id` - Delete link

**Comments:**
- `GET /api/social/links/:linkId/comments` - List comments
- `POST /api/social/links/:linkId/comments` - Add comment
- `PUT /api/social/comments/:id` - Update comment
- `DELETE /api/social/comments/:id` - Delete comment

**Reader:**
- `GET /api/social/links/:id/reader` - Get reader content
- `POST /api/social/links/:id/annotations` - Add annotation
- `GET /api/social/links/:id/annotations` - List annotations

### Step 1.2: Explore Social Models

**READ these files:**

```
backend/src/models/Room.ts
backend/src/models/Collection.ts
backend/src/models/LinkPost.ts
backend/src/models/LinkComment.ts
backend/src/models/LinkView.ts
backend/src/models/ReaderAnnotation.ts
backend/src/models/ReaderContentCache.ts
```

**DOCUMENT for each:**
- Fields and relationships
- Member roles (admin, member, etc.)
- Permissions model
- Encryption fields

### Step 1.3: Explore Social Services

**READ these files:**

```
backend/src/services/socialService.ts
backend/src/services/roomService.ts
backend/src/services/collectionService.ts
backend/src/services/linkService.ts
backend/src/services/readerService.ts
```

**UNDERSTAND:**
- Permission checking logic
- Role-based access control
- Cross-entity operations

---

## Phase 2: Room Tests

### Step 2.1: Room CRUD Tests

```
describe('Rooms', () => {
  describe('GET /api/social/rooms', () => {
    it('should return rooms user is member of')
    it('should return rooms user created')
    it('should not return rooms user is not in')
    it('should include member count')
  })

  describe('POST /api/social/rooms', () => {
    it('should create room')
    it('should set creator as admin')
    it('should reject duplicate name')
  })

  describe('GET /api/social/rooms/:id', () => {
    it('should return room for member')
    it('should return 403 for non-member')
    it('should include members list')
    it('should include collections')
  })

  describe('PUT /api/social/rooms/:id', () => {
    it('should update room as admin')
    it('should reject update from member')
    it('should reject update from non-member')
  })

  describe('DELETE /api/social/rooms/:id', () => {
    it('should delete room as admin')
    it('should cascade delete collections and links')
    it('should reject delete from non-admin')
  })
})
```

### Step 2.2: Room Membership Tests

```
describe('Room Membership', () => {
  describe('POST /api/social/rooms/:id/members', () => {
    it('should add member as admin')
    it('should reject adding existing member')
    it('should reject from non-admin')
    it('should set default role')
  })

  describe('DELETE /api/social/rooms/:id/members/:userId', () => {
    it('should remove member as admin')
    it('should allow self-removal')
    it('should prevent removing last admin')
    it('should reject from non-admin')
  })

  describe('PUT /api/social/rooms/:id/members/:userId/role', () => {
    it('should change role as admin')
    it('should prevent demoting last admin')
    it('should reject from non-admin')
  })
})
```

---

## Phase 3: Collection Tests

### Step 3.1: Collection CRUD Tests

```
describe('Collections', () => {
  describe('GET /api/social/rooms/:roomId/collections', () => {
    it('should return collections in room')
    it('should require room membership')
    it('should include link count')
  })

  describe('POST /api/social/rooms/:roomId/collections', () => {
    it('should create collection')
    it('should require room membership')
    it('should reject for non-member')
  })

  describe('PUT /api/social/collections/:id', () => {
    it('should update collection')
    it('should require room membership')
  })

  describe('DELETE /api/social/collections/:id', () => {
    it('should delete collection')
    it('should cascade delete links')
    it('should require admin or creator')
  })
})
```

---

## Phase 4: Link Post Tests

### Step 4.1: Link CRUD Tests

```
describe('Link Posts', () => {
  describe('GET /api/social/collections/:collectionId/links', () => {
    it('should return links in collection')
    it('should include view counts')
    it('should include comment counts')
    it('should paginate results')
  })

  describe('POST /api/social/collections/:collectionId/links', () => {
    it('should create link post')
    it('should fetch link metadata')  // mocked
    it('should allow title override')
    it('should allow description')
  })

  describe('GET /api/social/links/:id', () => {
    it('should return link details')
    it('should increment view count')
    it('should require room membership')
  })

  describe('PUT /api/social/links/:id', () => {
    it('should update link')
    it('should require poster or admin')
  })

  describe('DELETE /api/social/links/:id', () => {
    it('should delete link')
    it('should cascade delete comments')
    it('should require poster or admin')
  })
})
```

---

## Phase 5: Comment Tests

### Step 5.1: Comment CRUD Tests

```
describe('Comments', () => {
  describe('GET /api/social/links/:linkId/comments', () => {
    it('should return comments')
    it('should sort by date')
    it('should include commenter info')
  })

  describe('POST /api/social/links/:linkId/comments', () => {
    it('should add comment')
    it('should require room membership')
  })

  describe('PUT /api/social/comments/:id', () => {
    it('should update own comment')
    it('should reject updating others comment')
  })

  describe('DELETE /api/social/comments/:id', () => {
    it('should delete own comment')
    it('should allow admin to delete any')
  })
})
```

---

## Phase 6: Reader & Annotation Tests

### Step 6.1: Reader Content Tests

```
describe('Reader', () => {
  describe('GET /api/social/links/:id/reader', () => {
    it('should return readable content')
    it('should cache content')
    it('should handle uncacheable URLs')
  })
})
```

### Step 6.2: Annotation Tests

```
describe('Annotations', () => {
  describe('POST /api/social/links/:id/annotations', () => {
    it('should create annotation')
    it('should store position data')
    it('should store highlighted text')
  })

  describe('GET /api/social/links/:id/annotations', () => {
    it('should return user annotations')
    it('should return shared annotations')
  })

  describe('DELETE /api/social/annotations/:id', () => {
    it('should delete own annotation')
  })
})
```

---

## Phase 7: Permission Integration Tests

### Step 7.1: Cross-Entity Permission Tests

```
describe('Permission Integration', () => {
  describe('Room membership cascade', () => {
    it('removing member should revoke collection access')
    it('removing member should revoke link access')
  })

  describe('Role-based access', () => {
    it('admin can do everything')
    it('member can read and post')
    it('member cannot delete others content')
  })
})
```

---

## Completion Checklist

- [ ] All social endpoints documented
- [ ] Room CRUD tests (10+ cases)
- [ ] Room membership tests (10+ cases)
- [ ] Collection tests (8+ cases)
- [ ] Link post tests (12+ cases)
- [ ] Comment tests (8+ cases)
- [ ] Reader tests (3+ cases)
- [ ] Annotation tests (4+ cases)
- [ ] Permission tests (5+ cases)
- [ ] All tests passing against Express

## Test Count Target: 60+

## Files Created

```
backend-nest/test/
├── fixtures/
│   ├── rooms.fixture.ts
│   ├── collections.fixture.ts
│   ├── links.fixture.ts
│   └── social-users.fixture.ts
└── social/
    ├── rooms.e2e-spec.ts
    ├── collections.e2e-spec.ts
    ├── links.e2e-spec.ts
    ├── comments.e2e-spec.ts
    └── reader.e2e-spec.ts
```

## Next Workflow
Proceed to [18-social-migration.md](./18-social-migration.md)
