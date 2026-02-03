# Workflow 07: Calendar E2E Tests

## Objective
Write E2E tests for calendar event endpoints. Follows same pattern as Tasks (Workflow 05).

## Prerequisites
- Auth module working
- Tasks workflow pattern understood

---

## Phase 1: Explore Calendar Domain

### Step 1.1: Map Endpoints

**READ:**
```
backend/src/routes/calendarRoutes.ts
backend/src/controllers/calendarController.ts
backend/src/services/calendarService.ts
backend/src/models/CalendarEvent.ts
```

**Expected endpoints:**
- `GET /api/calendar/events` - List events (with date range)
- `POST /api/calendar/events` - Create event
- `GET /api/calendar/events/:id` - Get event
- `PUT /api/calendar/events/:id` - Update event
- `DELETE /api/calendar/events/:id` - Delete event

---

## Phase 2: Test Cases

### Date Range Queries
```
describe('GET /api/calendar/events', () => {
  it('should filter by date range')
  it('should return events within range')
  it('should handle timezone correctly')
})
```

### CRUD Tests
Follow Tasks pattern for standard CRUD operations.

### Recurring Events (if applicable)
```
describe('Recurring events', () => {
  it('should create recurring event')
  it('should return instances in range')
  it('should update single instance')
  it('should update all instances')
})
```

---

## Completion Checklist
- [ ] All endpoints documented
- [ ] Date range tests
- [ ] CRUD tests (similar to Tasks)
- [ ] 25+ tests passing against Express

## Next Workflow
Proceed to [08-calendar-migration.md](./08-calendar-migration.md)
