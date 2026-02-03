# Workflow 06: Tasks Module Migration

## Objective
Implement the NestJS tasks module, passing all E2E tests from Workflow 05.

## Prerequisites
- Workflow 04 completed (auth module working)
- Workflow 05 completed (task E2E tests passing against Express)

## Scope Boundaries

### IN SCOPE
- Task schema/model
- TaskRepository
- TaskService
- TaskController
- Task DTOs

### OUT OF SCOPE
- Real-time notifications
- Task sharing

---

## Phase 1: Task Model

### Step 1.1: Explore Current Task Model

**READ this file:**

```
backend/src/models/Task.ts
```

**DOCUMENT:**
- All fields with types
- Encryption-related fields
- Status enum (exact values)
- Priority enum (exact values)
- Position field for ordering
- Indexes

### Step 1.2: Create Task Schema

**TASKS:**
1. Create `task.schema.ts` in `backend-nest/src/modules/tasks/`
2. Match all fields exactly
3. Define status and priority enums
4. Configure indexes

---

## Phase 2: Task Repository

### Step 2.1: Explore Current TaskRepository

**READ this file:**

```
backend/src/repositories/TaskRepository.ts
```

**DOCUMENT custom methods:**
- `findByStatus(userId, status)`
- `findByPriority(userId, priority)`
- `findUpcoming(userId, days)`
- `reorderTasks(userId, taskId, newStatus, newPosition)`
- Any other custom queries

### Step 2.2: Create TaskRepository

**TASKS:**
1. Create `task.repository.ts`
2. Extend BaseRepository<Task>
3. Implement all custom methods
4. Ensure proper SafeFilter usage

**CRITICAL: Position/Reorder Logic**
- How are positions calculated?
- What happens when tasks are moved between columns?
- Are gaps allowed in positions?

---

## Phase 3: Task Service

### Step 3.1: Explore Current TaskService

**READ this file:**

```
backend/src/services/taskService.ts
```

**DOCUMENT all methods:**
- `getTasks(userId, filters)` - filter logic
- `createTask(userId, data)` - validation, defaults
- `getTask(userId, taskId)` - ownership check
- `updateTask(userId, taskId, data)` - what's updatable
- `deleteTask(userId, taskId)` - soft or hard delete?
- `reorderTasks(userId, data)` - reorder algorithm

### Step 3.2: Create TaskService

**TASKS:**
1. Create `task.service.ts`
2. Extend BaseService<Task, TaskRepository>
3. Implement all methods with exact validation
4. Use ServiceError for errors

**REORDER ALGORITHM:**
- Understand the exact algorithm from Express
- Preserve behavior exactly
- Handle edge cases (empty column, first item, last item)

---

## Phase 4: Task Controller

### Step 4.1: Explore Current TaskController

**READ this file:**

```
backend/src/controllers/taskController.ts
```

**DOCUMENT:**
- Route handlers
- Request parsing
- Response formatting
- Error handling

### Step 4.2: Create TaskController

**TASKS:**
1. Create `task.controller.ts`
2. Use `@Controller('api/tasks')`
3. Apply `@UseGuards(JwtAuthGuard)` to all
4. Apply `@UseGuards(CsrfGuard)` to mutations
5. Create DTOs for validation

**CREATE DTOs:**
- `CreateTaskDto`
- `UpdateTaskDto`
- `ReorderTaskDto`
- `TaskFilterDto` (query params)

---

## Phase 5: Module Assembly & Testing

### Step 5.1: Create Tasks Module

**TASKS:**
1. Create `tasks.module.ts`
2. Import AuthModule (for guards)
3. Register Task model
4. Register TaskRepository, TaskService
5. Register TaskController

### Step 5.2: Run E2E Tests

**TASKS:**
1. Run all Workflow 05 tests against NestJS
2. Fix any failures
3. Ensure 30+ tests pass

---

## Completion Checklist

- [ ] Task schema with all fields
- [ ] TaskRepository with custom methods
- [ ] TaskService with all methods
- [ ] TaskController with all endpoints
- [ ] All DTOs with validation
- [ ] TasksModule assembled
- [ ] All E2E tests passing
- [ ] Code committed

## Files Created

```
backend-nest/src/modules/tasks/
├── tasks.module.ts
├── task.controller.ts
├── task.service.ts
├── task.schema.ts
├── task.repository.ts
└── dto/
    ├── create-task.dto.ts
    ├── update-task.dto.ts
    ├── reorder-task.dto.ts
    └── task-filter.dto.ts
```

## Next Workflow
Proceed to [07-calendar-tests.md](./07-calendar-tests.md) (follows same pattern as Tasks)
