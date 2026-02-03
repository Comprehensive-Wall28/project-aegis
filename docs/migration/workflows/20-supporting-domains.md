# Workflow 20: Supporting Domains Migration

## Objective
Migrate remaining low-complexity domains: GPA, Audit, Mentions, Activity Dashboard.

## Prerequisites
- All major domain migrations complete
- Base patterns established

---

## Domain 1: GPA Module

### Step 1.1: Explore

**READ:**
```
backend/src/routes/gpaRoutes.ts
backend/src/controllers/gpaController.ts
backend/src/services/courseService.ts
backend/src/models/Course.ts
```

**Endpoints:**
- `GET /api/gpa/courses` - List courses
- `POST /api/gpa/courses` - Create course
- `PUT /api/gpa/courses/:id` - Update course
- `DELETE /api/gpa/courses/:id` - Delete course
- `GET /api/gpa/preferences` - GPA preferences
- `PUT /api/gpa/preferences` - Update preferences

### Step 1.2: Implement

1. Create `gpa.module.ts`
2. Port Course schema with `encryptedPayload` field
3. Port CourseRepository
4. Port CourseService
5. Create GpaController
6. Write/run E2E tests

---

## Domain 2: Audit Module

### Step 2.1: Explore

**READ:**
```
backend/src/routes/auditRoutes.ts
backend/src/controllers/auditController.ts
backend/src/services/auditService.ts
backend/src/models/AuditLog.ts
backend/src/repositories/AuditLogRepository.ts
```

**CRITICAL: Secondary Database Connection**

AuditLog uses secondary database instance:
```typescript
export class AuditLogRepository extends BaseRepository<IAuditLog> {
  constructor() {
    super(AuditLog, 'secondary');  // <-- Note 'secondary'
  }
}
```

**Endpoints:**
- `GET /api/audit-logs` - List audit logs
- `GET /api/audit-logs/recent` - Recent activity

### Step 2.2: Implement

1. Create `audit.module.ts`
2. Port AuditLog schema
3. Create AuditLogRepository with SECONDARY connection
4. Port AuditService
5. Create AuditController
6. Write/run E2E tests

**NestJS Multi-Database:**
```typescript
// In module
MongooseModule.forFeature(
  [{ name: AuditLog.name, schema: AuditLogSchema }],
  'secondary'  // Named connection
)
```

---

## Domain 3: Mentions Module

### Step 3.1: Explore

**READ:**
```
backend/src/routes/mentionRoutes.ts
backend/src/controllers/mentionController.ts
```

**Endpoints:**
- `GET /api/mentions/backlinks` - Get backlinks to a note

### Step 3.2: Implement

Mentions may not need its own module - could be part of Notes.
Evaluate if separate module is needed or if it's just an endpoint on Notes.

---

## Domain 4: Activity Dashboard

### Step 4.1: Explore

**READ:**
```
backend/src/routes/activityRoutes.ts
backend/src/controllers/activityController.ts
```

**Endpoints:**
- `GET /api/activity/dashboard` - Aggregated activity stats

### Step 4.2: Implement

Activity Dashboard aggregates data from multiple entities.
May need to inject multiple repositories/services.

```typescript
@Injectable()
export class ActivityService {
  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly taskRepository: TaskRepository,
    private readonly linkRepository: LinkPostRepository,
    // ...
  ) {}

  async getDashboard(userId: string) {
    const [notes, tasks, links] = await Promise.all([
      this.noteRepository.count({ userId: { $eq: userId } }),
      this.taskRepository.count({ userId: { $eq: userId } }),
      this.linkRepository.countByUser(userId),
    ]);
    return { notes, tasks, links, /* ... */ };
  }
}
```

---

## E2E Tests

### Test Count Targets

| Domain | Tests |
|--------|-------|
| GPA | 15 |
| Audit | 8 |
| Mentions | 5 |
| Activity | 5 |
| **Total** | **33** |

---

## Completion Checklist

- [ ] GPA module with all endpoints
- [ ] Audit module with secondary DB
- [ ] Mentions endpoint (or integrated in Notes)
- [ ] Activity dashboard
- [ ] All E2E tests passing
- [ ] Code committed

## Files Created

```
backend-nest/src/modules/gpa/
├── gpa.module.ts
├── gpa.controller.ts
├── course.service.ts
├── course.schema.ts
└── course.repository.ts

backend-nest/src/modules/audit/
├── audit.module.ts
├── audit.controller.ts
├── audit.service.ts
├── audit-log.schema.ts
└── audit-log.repository.ts

backend-nest/src/modules/activity/
├── activity.module.ts
├── activity.controller.ts
└── activity.service.ts
```

## Next Workflow
Proceed to [21-integration-cutover.md](./21-integration-cutover.md)
