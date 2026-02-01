# Agent Session Workflow: Express to NestJS Parity Verification

> **Purpose:** Define a standardized workflow for each AI agent session to systematically verify and achieve parity between Express and NestJS backends.

## Session Structure

Each agent session should follow this workflow:

### 1. Session Setup (2 min)

```
1. Read PARITY_CHECKLIST.md to find unchecked sections
2. Pick ONE section to work on (claim it by marking 🔄)
3. Run parity checker for that module: npm run parity:check -- --module=<name>
4. Review the generated report in scripts/parity-reports/
```

### 2. Deep Comparison (15-20 min)

For each item in the chosen section:

#### A. Read Both Implementations
```
Express file: backend/src/<category>/<file>.ts
NestJS file:  backend-nest/src/modules/<module>/<file>.ts
```

#### B. Check These Aspects

| Aspect | What to Verify |
|--------|----------------|
| **Endpoints** | Same HTTP methods, paths, and parameters |
| **Auth** | Same guards/middleware applied |
| **Validation** | Same input validation rules |
| **Logic** | Same business logic flow |
| **Audit Logging** | Same actions logged |
| **Error Handling** | Same error types and messages |
| **Response Format** | Same response structure |

#### C. Document Findings

For each method/endpoint, record:
- ✅ Match: No action needed
- ⚠️ Minor diff: Document the acceptable variance
- ❌ Gap: Create fix immediately or add to action items

### 3. Fix Issues (10-15 min)

Priority order:
1. Missing endpoints/methods
2. Missing audit logging
3. Auth/CSRF mismatches
4. Validation differences
5. Response format differences

### 4. Update Checklist (2 min)

```markdown
1. Mark all verified items with ✅, ⚠️, or ❌
2. Add entry to "Agent Session Log" table
3. Update "Action Items" if new issues found
4. Commit changes with message: "parity: verify <module> module"
```

---

## Module Verification Order

Recommended order (dependencies first):

1. **Auth** - Foundation for all other modules
2. **Users** - User data used everywhere
3. **Tasks** - Simple CRUD, good baseline
4. **Notes** - Medium complexity
5. **Folders** - Nested structure
6. **Calendar** - Date handling
7. **GPA** - Calculation logic
8. **Vault** - File handling, encryption
9. **Social** - Complex relationships
10. **Activity/Audit** - Logging consistency
11. **Share** ❌ - CREATE THIS MODULE
12. **PublicShare** ❌ - CREATE THIS MODULE
13. **Mention** - Wire up existing service

---

## Comparison Templates

### Controller Method Template

```markdown
#### `METHOD /path` - handlerName()

| Aspect | Express | NestJS | Match |
|--------|---------|--------|-------|
| HTTP Method | GET | GET | ✅ |
| Path | /api/tasks | /api/tasks | ✅ |
| Auth Guard | withAuth | @UseGuards(JwtAuthGuard) | ✅ |
| CSRF | csrfProtection | @UseGuards(CsrfGuard) | ✅ |
| Query Params | status, priority | status, priority | ✅ |
| Body DTO | - | - | ✅ |
| Response | { tasks: [...] } | { tasks: [...] } | ✅ |

**Notes:** None
```

### Service Method Template

```markdown
#### serviceName.methodName()

| Aspect | Express | NestJS | Match |
|--------|---------|--------|-------|
| Parameters | (userId, data, req) | (userId, dto) | ⚠️ |
| Return Type | Promise<ITask> | Promise<Task> | ✅ |
| Audit Action | TASK_CREATE | TASK_CREATE | ✅ |
| Validation | Manual checks | DTO decorators | ✅ |
| Repo Methods | create, findById | create, findById | ✅ |

**Notes:** NestJS doesn't pass req object; acceptable.
```

### Schema Field Template

```markdown
#### SchemaName

| Field | Express | NestJS | Match |
|-------|---------|--------|-------|
| _id | ObjectId | ObjectId | ✅ |
| userId | ref: 'User' | ref: 'User' | ✅ |
| title | String, required | string, @Prop({ required: true }) | ✅ |
| status | enum: [...] | enum TaskStatus | ✅ |
| createdAt | timestamps | @Prop({ default: Date.now }) | ⚠️ |

**Notes:** Timestamps handled differently but equivalent.
```

---

## Common Parity Issues & Fixes

### Issue: Missing Audit Logging

**Express:**
```typescript
await this.logAction(userId, 'TASK_CREATE', 'SUCCESS', req, { taskId: task._id });
```

**Fix for NestJS:**
```typescript
// Inject AuditService in constructor
constructor(
  private readonly auditService: AuditService,
) {}

// Add to method
await this.auditService.log({
  userId,
  action: 'TASK_CREATE',
  status: 'SUCCESS',
  metadata: { taskId: task._id },
  ip: req?.ip,
  userAgent: req?.headers?.['user-agent'],
});
```

### Issue: HTTP Method Mismatch

**Express:** `router.put('/reorder', reorderTasks)`
**NestJS:** `@Patch('reorder')`

**Fix:** Change NestJS to `@Put('reorder')`

### Issue: Missing Guard

**Express:** `router.use(protect)`
**NestJS:** Missing `@UseGuards(JwtAuthGuard)`

**Fix:** Add decorator to controller or method:
```typescript
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController { ... }
```

### Issue: Response Format Difference

**Express:**
```typescript
res.status(200).json({ success: true, data: tasks });
```

**NestJS:**
```typescript
return tasks; // Raw data
```

**Decision:** Document as acceptable variance OR create interceptor for consistent wrapping.

---

## Creating Missing Modules

When a module is completely missing (Share, PublicShare), use this structure:

```
backend-nest/src/modules/<module-name>/
├── <module-name>.module.ts
├── <module-name>.controller.ts
├── <module-name>.service.ts
├── repositories/
│   └── <entity>.repository.ts
├── schemas/
│   └── <entity>.schema.ts
├── dto/
│   ├── create-<entity>.dto.ts
│   └── update-<entity>.dto.ts
└── <module-name>.controller.spec.ts
```

### Steps:
1. Copy Express model to create schema
2. Create repository extending BaseRepository
3. Create service with all methods from Express
4. Create controller with same routes
5. Add audit logging to all mutations
6. Create DTOs with class-validator decorators
7. Register module in app.module.ts
8. Run parity checker to verify

---

## Session Completion Checklist

Before ending a session:

- [ ] All items in section marked with status
- [ ] PARITY_CHECKLIST.md updated
- [ ] Agent Session Log entry added
- [ ] Any new action items documented
- [ ] Parity checker re-run to confirm fixes
- [ ] Changes committed with descriptive message

---

## Useful Commands

```bash
# Run parity check for specific module
npm run parity:check -- --module=tasks

# Run full parity check
npm run parity:check

# View HTML report
open scripts/parity-reports/parity-report.html

# Search for audit logging in Express
grep -r "logAction" backend/src/services/

# Search for audit logging in NestJS
grep -r "auditService" backend-nest/src/modules/

# Find all Express routes
grep -r "router\." backend/src/routes/

# Find all NestJS routes
grep -rE "@(Get|Post|Put|Patch|Delete)" backend-nest/src/modules/
```

---

## Questions to Ask During Comparison

1. **Does NestJS handle the same edge cases?**
2. **Are error messages identical for same scenarios?**
3. **Does pagination work the same way?**
4. **Are query filters implemented identically?**
5. **Do both return same HTTP status codes?**
6. **Is the audit trail equivalent?**
7. **Are authorization checks identical?**
