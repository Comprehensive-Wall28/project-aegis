# Workflow 08: Calendar Module Migration

## Objective
Implement NestJS calendar module passing all Workflow 07 tests.

## Prerequisites
- Workflow 07 completed (calendar tests passing against Express)

---

## Implementation Steps

Follow the same pattern as Tasks (Workflow 06):

1. **Create CalendarEvent Schema**
   - READ: `backend/src/models/CalendarEvent.ts`
   - Port all fields including date/time handling

2. **Create CalendarEventRepository**
   - READ: `backend/src/repositories/CalendarEventRepository.ts`
   - Port date range query methods

3. **Create CalendarService**
   - READ: `backend/src/services/calendarService.ts`
   - Port validation and business logic

4. **Create CalendarController**
   - READ: `backend/src/controllers/calendarController.ts`
   - Create DTOs for validation

5. **Assemble CalendarModule**
   - Import in AppModule
   - Run E2E tests

---

## Files Created

```
backend-nest/src/modules/calendar/
├── calendar.module.ts
├── calendar.controller.ts
├── calendar.service.ts
├── calendar-event.schema.ts
├── calendar-event.repository.ts
└── dto/
    ├── create-event.dto.ts
    └── update-event.dto.ts
```

## Completion Checklist
- [ ] All Workflow 07 tests passing against NestJS
- [ ] Code committed

## Next Workflow
Proceed to [09-folders-tests.md](./09-folders-tests.md)
