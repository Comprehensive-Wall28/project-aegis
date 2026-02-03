# Workflow 05: Tasks E2E Tests

## Objective
Write comprehensive E2E tests for all task endpoints. This is a template for simple CRUD domain testing.

## Prerequisites
- Workflow 03-04 completed (auth working in NestJS)
- Authenticated test helpers available

## Scope Boundaries

### IN SCOPE
- E2E tests for all `/api/tasks/*` endpoints
- Test fixtures for tasks
- Kanban reorder testing

### OUT OF SCOPE
- Task module implementation
- Socket.IO notifications

---

## Phase 1: Explore Task Routes

### Step 1.1: Map All Task Endpoints

**READ this file:**

```
backend/src/routes/taskRoutes.ts
```

**DOCUMENT all endpoints with:**
- Method, path, auth required, CSRF required
- Request body schema
- Query parameters (filters, pagination)
- Response schema

**Expected endpoints:**
1. `GET /api/tasks` - List with filters
2. `POST /api/tasks` - Create task
3. `GET /api/tasks/:id` - Get single task
4. `PUT /api/tasks/:id` - Update task
5. `DELETE /api/tasks/:id` - Delete task
6. `PUT /api/tasks/reorder` - Kanban reorder
7. `GET /api/tasks/upcoming` - Upcoming tasks (if exists)

### Step 1.2: Explore Task Model

**READ this file:**

```
backend/src/models/Task.ts
```

**DOCUMENT:**
- All fields (especially encrypted ones)
- Status enum values
- Priority enum values
- Index definitions

### Step 1.3: Explore Task Service

**READ this file:**

```
backend/src/services/taskService.ts
```

**DOCUMENT:**
- Validation rules
- Filter logic
- Reorder algorithm

---

## Phase 2: Test Fixtures

### Step 2.1: Create Task Fixtures

**TASKS:**
1. Create `test/fixtures/tasks.fixture.ts`
2. Define valid task data (with encryption fields)
3. Define tasks in different statuses
4. Define tasks with different priorities
5. Define tasks for reorder testing

---

## Phase 3: CRUD Tests

### Step 3.1: List Tasks Tests

```
describe('GET /api/tasks', () => {
  describe('Success cases', () => {
    it('should return empty array when no tasks')
    it('should return user tasks only')
    it('should not return other user tasks')
  })

  describe('Filtering', () => {
    it('should filter by status')
    it('should filter by priority')
    it('should filter by date range')
    it('should combine multiple filters')
  })

  describe('Pagination', () => {
    it('should respect limit parameter')
    it('should support cursor-based pagination')
  })

  describe('Auth required', () => {
    it('should return 401 without auth')
  })
})
```

### Step 3.2: Create Task Tests

```
describe('POST /api/tasks', () => {
  describe('Success cases', () => {
    it('should create task with required fields')
    it('should create task with all fields')
    it('should return created task')
    it('should set correct userId')
  })

  describe('Validation', () => {
    it('should reject missing required fields')
    it('should reject invalid status')
    it('should reject invalid priority')
    it('should reject invalid date format')
  })

  describe('Auth and CSRF', () => {
    it('should require authentication')
    it('should require CSRF token')
  })
})
```

### Step 3.3: Get Single Task Tests

```
describe('GET /api/tasks/:id', () => {
  it('should return task by id')
  it('should return 404 for non-existent task')
  it('should return 404 for other user task')
  it('should return 400 for invalid id format')
})
```

### Step 3.4: Update Task Tests

```
describe('PUT /api/tasks/:id', () => {
  describe('Success cases', () => {
    it('should update task fields')
    it('should update status')
    it('should update priority')
    it('should return updated task')
  })

  describe('Validation', () => {
    it('should reject invalid status')
    it('should reject invalid priority')
  })

  describe('Authorization', () => {
    it('should not update other user task')
    it('should return 404 for non-existent')
  })
})
```

### Step 3.5: Delete Task Tests

```
describe('DELETE /api/tasks/:id', () => {
  it('should delete task')
  it('should return 404 after deletion')
  it('should not delete other user task')
  it('should return 404 for non-existent')
})
```

---

## Phase 4: Special Operations Tests

### Step 4.1: Reorder Tests

**READ in taskService.ts:**
- Reorder logic (Kanban column movement)

```
describe('PUT /api/tasks/reorder', () => {
  describe('Success cases', () => {
    it('should reorder tasks in same column')
    it('should move task to different column')
    it('should update positions correctly')
  })

  describe('Validation', () => {
    it('should reject invalid task id')
    it('should reject invalid target position')
  })

  describe('Edge cases', () => {
    it('should handle move to empty column')
    it('should handle move to end of column')
  })
})
```

### Step 4.2: Upcoming Tasks Tests (if applicable)

```
describe('GET /api/tasks/upcoming', () => {
  it('should return tasks due soon')
  it('should respect time window parameter')
  it('should exclude completed tasks')
})
```

---

## Completion Checklist

- [ ] All endpoints documented
- [ ] Task fixtures created
- [ ] List tests (6+ cases)
- [ ] Create tests (6+ cases)
- [ ] Get single tests (4+ cases)
- [ ] Update tests (6+ cases)
- [ ] Delete tests (4+ cases)
- [ ] Reorder tests (5+ cases)
- [ ] All tests passing against Express
- [ ] Code committed

## Test Count Target: 30+

## Files Created

```
backend-nest/test/
├── fixtures/
│   └── tasks.fixture.ts
└── tasks/
    └── tasks.e2e-spec.ts
```

## Next Workflow
Proceed to [06-tasks-migration.md](./06-tasks-migration.md)
