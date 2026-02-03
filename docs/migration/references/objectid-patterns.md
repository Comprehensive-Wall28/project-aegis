# ObjectID Handling Patterns

## Critical Reference for AI Agents

This document describes the EXACT patterns for handling MongoDB ObjectIDs in the migration. Deviating from these patterns will cause bugs with existing data.

---

## The Golden Rule

**IDs are STRINGS at all layers except Mongoose queries.**

```
API Layer  →  Service Layer  →  Repository Layer  →  Mongoose
  string         string            string           auto-cast
```

---

## Pattern 1: API Input

**Express (current):**
```typescript
// In controller
const { id } = req.params;  // string
const task = await taskService.getTask(req.user.id, id);
```

**NestJS (target):**
```typescript
// In controller
@Get(':id')
async getTask(@Param('id') id: string, @CurrentUser() user: User) {
  return this.taskService.getTask(user.id, id);
}
```

**NEVER do this:**
```typescript
// WRONG - Don't convert to ObjectId in controller
@Get(':id')
async getTask(@Param('id') id: string) {
  const objectId = new Types.ObjectId(id);  // ❌ WRONG
  return this.taskService.getTask(objectId);
}
```

---

## Pattern 2: Service Validation

**Express (current):**
```typescript
// In BaseService
protected validateId(id: unknown, fieldName: string = 'id'): string {
  if (typeof id !== 'string') {
    throw new ServiceError(`Invalid ${fieldName}: must be a string`, 400, 'INVALID_ID');
  }
  // Delegate to QuerySanitizer for ObjectId format validation
  const sanitized = QuerySanitizer.sanitizeObjectId(id);
  if (!sanitized) {
    throw new ServiceError(`Invalid ${fieldName} format`, 400, 'INVALID_ID');
  }
  return sanitized;  // Returns STRING
}
```

**PRESERVE this exactly in NestJS.**

---

## Pattern 3: Repository Queries

**Express (current):**
```typescript
// In BaseRepository
async findById(id: string, options?: QueryOptions): Promise<T | null> {
  const validId = this.validateId(id);  // Returns string
  return this.model.findById(validId);  // Mongoose auto-casts
}
```

**NestJS (target):**
```typescript
// Same pattern
async findById(id: string, options?: QueryOptions): Promise<T | null> {
  const validId = this.validateId(id);
  return this.model.findById(validId).exec();
}
```

---

## Pattern 4: SafeFilter Usage

**Express (current):**
```typescript
// IDs in filters are strings, Mongoose auto-casts
const filter: SafeFilter<ITask> = {
  userId: { $eq: userId },  // string
  _id: { $eq: taskId },     // string
};
const task = await this.findOne(filter);
```

**PRESERVE this exactly. Never convert to ObjectId in filter construction.**

---

## Pattern 5: QuerySanitizer.sanitizeObjectId

**Express (current):**
```typescript
static sanitizeObjectId(id: unknown): string | null {
  // Must be a string
  if (typeof id !== 'string') return null;
  
  // Must be valid ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  
  // Double-check: convert and verify string matches
  const objectId = new mongoose.Types.ObjectId(id);
  if (objectId.toString() !== id) return null;
  
  return id;  // Return the ORIGINAL STRING
}
```

**This double-check is critical:**
- Some strings pass `isValid()` but aren't real ObjectIds
- Converting and comparing catches these edge cases
- The function returns the STRING, not the ObjectId

---

## Pattern 6: Relationships and Population

**Express (current):**
```typescript
// In model definition
userId: { type: Schema.Types.ObjectId, ref: 'User' }

// In repository
const note = await this.model.findById(id).populate('userId');
// note.userId is populated User document, but note.userId._id is ObjectId
```

**When accessing populated fields:**
```typescript
// To get the ID as string:
const userIdString = note.userId._id.toString();

// In response, IDs should be strings:
res.json({
  id: note._id.toString(),
  userId: note.userId._id.toString(),
  ...
});
```

---

## Pattern 7: Creating Documents

**Express (current):**
```typescript
// In service
async createTask(userId: string, data: CreateTaskDto) {
  const validUserId = this.validateId(userId, 'userId');
  return this.repository.create({
    ...data,
    userId: validUserId,  // string - Mongoose converts on save
  });
}
```

---

## Pattern 8: Updating with IDs

**Express (current):**
```typescript
// In repository
async updateById(id: string, data: UpdateQuery<T>): Promise<T | null> {
  const validId = this.validateId(id);
  // Don't sanitize ID fields in update data - let Mongoose handle
  return this.model.findByIdAndUpdate(validId, data, { new: true });
}
```

---

## Common Bugs to Avoid

### Bug 1: Converting ID too early
```typescript
// ❌ WRONG
const id = new Types.ObjectId(req.params.id);
await service.getItem(id);

// ✅ CORRECT
const id = req.params.id;  // string
await service.getItem(id);
```

### Bug 2: Comparing ObjectId with string
```typescript
// ❌ WRONG - comparison will fail
if (task.userId === req.user.id) { ... }

// ✅ CORRECT - convert to string for comparison
if (task.userId.toString() === req.user.id) { ... }
```

### Bug 3: Storing ObjectId in response
```typescript
// ❌ WRONG - ObjectId in JSON response
res.json({ id: task._id });  // May serialize weirdly

// ✅ CORRECT - explicit string conversion
res.json({ id: task._id.toString() });

// Or use toJSON transform in schema
```

### Bug 4: Forgetting validation
```typescript
// ❌ WRONG - no validation
const task = await repository.findById(id);

// ✅ CORRECT - always validate
const validId = this.validateId(id);
const task = await repository.findById(validId);
```

---

## Testing ObjectID Handling

### Test Cases to Include

```typescript
describe('ObjectID handling', () => {
  it('should accept valid 24-char hex string');
  it('should reject invalid format');
  it('should reject non-string input');
  it('should reject 12-char string (old format)');
  it('should reject ObjectId-like but invalid');
});
```

### Example Invalid Inputs
```typescript
const invalidIds = [
  '',                           // empty
  '123',                        // too short
  '123456789012345678901234xx',  // invalid chars
  'aaaaaaaaaaaa',               // 12 chars (old ObjectId format)
  123456789012345678901234,     // number, not string
  null,
  undefined,
  { $ne: null },                // injection attempt
];
```

---

## Schema Definition Pattern

**Express Mongoose schema:**
```typescript
const TaskSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  // ... other fields
});
```

**NestJS Mongoose schema (same):**
```typescript
@Schema()
export class Task {
  @Prop({ 
    type: Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  })
  userId: Types.ObjectId;
}
```

**Note:** The schema stores ObjectId, but all service/repository code uses strings.

---

## Summary Checklist

Before completing any migration workflow, verify:

- [ ] All IDs passed as strings through API
- [ ] Service methods accept string IDs
- [ ] `validateId()` called on all ID inputs
- [ ] `QuerySanitizer.sanitizeObjectId()` used for validation
- [ ] Filters use string IDs (Mongoose auto-casts)
- [ ] Response IDs are strings (`.toString()` if needed)
- [ ] No early ObjectId conversion in controllers
- [ ] Populated field IDs converted for responses
