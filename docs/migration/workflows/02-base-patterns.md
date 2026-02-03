# Workflow 02: Base Patterns Port

## Objective
Port the repository and service base classes from Express backend, preserving exact ObjectID handling and query sanitization patterns.

## Prerequisites
- Workflow 01 completed (NestJS foundation running)
- Understanding of Mongoose ODM
- Understanding of TypeScript generics

## Scope Boundaries

### IN SCOPE
- `QuerySanitizer` class for NoSQL injection prevention
- `SafeFilter<T>` and `QueryOptions` types
- `BaseRepository<T>` abstract class with all methods
- `RepositoryError` class with error codes
- `BaseService<T, R>` abstract class
- `ServiceError` class
- Unit tests for base classes

### OUT OF SCOPE
- Any concrete repository implementations
- Any concrete service implementations
- Domain-specific logic

---

## Critical: ObjectID Handling

### THE MOST COMMON MIGRATION BUG

The existing backend has a specific pattern for handling MongoDB ObjectIDs that MUST be preserved:

1. **API Layer**: All IDs are strings
2. **Service Layer**: All IDs are strings
3. **Repository Layer**: Validates string IDs before use
4. **Mongoose**: Auto-casts valid strings to ObjectId

**If you deviate from this pattern, you will break queries against existing data.**

---

## Phase 1: Query Sanitization

### Step 1.1: Explore Current QuerySanitizer

**READ this file thoroughly:**

```
backend/src/repositories/base/QuerySanitizer.ts
```

**UNDERSTAND:**
- What operators are BLOCKED (dangerous)?
- What operators are ALLOWED?
- How is `sanitizeObjectId()` implemented?
- How does `sanitizeFilter()` recursively process queries?
- How does `sanitizeUpdate()` handle update operations?

**KEY PATTERNS TO PRESERVE:**
- Double ObjectId validation (isValid + toString check)
- Recursive operator checking
- Blocked dangerous operators: `$where`, `$function`, `$accumulator`, `$expr`, `$jsonSchema`

### Step 1.2: Port QuerySanitizer

**TASKS:**
1. Create `QuerySanitizer` class in `backend-nest/src/common/database/`
2. Port ALL methods exactly:
   - `sanitizeObjectId(id: unknown): string | null`
   - `sanitizeFilter<T>(filter: unknown): SafeFilter<T>`
   - `sanitizeUpdate<T>(update: unknown): UpdateQuery<T>`
3. Port the operator allowlist/blocklist exactly
4. Write unit tests for edge cases:
   - Valid ObjectId strings
   - Invalid ObjectId strings (wrong length, invalid chars)
   - ObjectId-like but invalid (12 chars but not hex)
   - Nested operators in filters
   - Blocked operators rejection

**VALIDATION:**
- [ ] `sanitizeObjectId("507f1f77bcf86cd799439011")` returns the string
- [ ] `sanitizeObjectId("invalid")` returns null
- [ ] `sanitizeObjectId(123)` returns null (not a string)
- [ ] Filters with `$where` throw error
- [ ] Nested `$and`/`$or` filters work correctly

---

## Phase 2: Type Definitions

### Step 2.1: Explore Current Types

**READ this file:**

```
backend/src/repositories/base/types.ts
```

**UNDERSTAND:**
- How is `SafeFilter<T>` structured?
- What comparison operators are allowed in filters?
- What is `QueryOptions` interface?
- How are populate options typed?

### Step 2.2: Port Type Definitions

**TASKS:**
1. Create `types.ts` in `backend-nest/src/common/database/`
2. Port all types exactly:
   - `SafeFilter<T>` - the constrained filter type
   - `QueryOptions` - sort, limit, skip, select, lean, populate
   - `PopulateOptions` - nested population config
3. Ensure TypeScript correctly constrains filter usage

**VALIDATION:**
- [ ] Cannot use arbitrary operators in SafeFilter
- [ ] Type errors for invalid filter structures
- [ ] QueryOptions accepts all documented fields

---

## Phase 3: Repository Error Handling

### Step 3.1: Explore Current Error Pattern

**READ this file:**

```
backend/src/repositories/base/BaseRepository.ts
```

**FIND:**
- `RepositoryError` class definition
- `RepositoryErrorCode` enum
- How errors are thrown for different scenarios

### Step 3.2: Port RepositoryError

**TASKS:**
1. Create `repository.error.ts` in `backend-nest/src/common/database/`
2. Port `RepositoryErrorCode` enum with all values:
   - `NOT_FOUND`
   - `VALIDATION_ERROR`
   - `DUPLICATE_KEY`
   - `INVALID_ID`
   - `QUERY_ERROR`
   - `CONNECTION_ERROR`
3. Port `RepositoryError` class preserving:
   - `code` property
   - `cause` for error chaining
   - Proper Error inheritance

**VALIDATION:**
- [ ] Error codes match exactly
- [ ] `instanceof RepositoryError` works
- [ ] Error cause chain preserved

---

## Phase 4: BaseRepository Abstract Class

### Step 4.1: Explore Current BaseRepository

**READ this file completely:**

```
backend/src/repositories/base/BaseRepository.ts
```

**UNDERSTAND (document each method):**

**Constructor:**
- How is the Mongoose model injected?
- How is DatabaseManager accessed?
- What is `dbInstance` parameter for?

**Read Operations:**
- `findById(id, options)` - How is ID validated?
- `findOne(filter, options)` - How is filter sanitized?
- `findMany(filter, options)` - Pagination considerations?
- `findPaginated(filter, options)` - Cursor-based pagination logic?

**Write Operations:**
- `create(data)` - Any transformations?
- `updateById(id, data, options)` - How is update sanitized?
- `updateOne(filter, data, options)` - Upsert handling?
- `updateMany(filter, data)` - Return value?

**Delete Operations:**
- `deleteById(id)` - Return type?
- `deleteOne(filter)` - How different from deleteById?
- `deleteMany(filter)` - Return value?

**Other:**
- `bulkWrite(operations, options)` - How are ops validated?
- `aggregate(pipeline)` - Any sanitization?
- `count(filter)` - Optional filter handling?
- `exists(filter)` - Implementation approach?
- `withTransaction(operation)` - Session management?
- `applyOptions(query, options)` - How are options applied?

### Step 4.2: Port BaseRepository

**TASKS:**
1. Create `base.repository.ts` in `backend-nest/src/common/database/`
2. Port the abstract class with ALL 17+ methods
3. Ensure proper integration with NestJS DI:
   - Inject `Connection` from `@nestjs/mongoose`
   - Support named connections for multi-database
4. Preserve exact validation logic:
   - `validateId()` must use `QuerySanitizer.sanitizeObjectId()`
   - All filters go through `QuerySanitizer.sanitizeFilter()`
   - All updates go through `QuerySanitizer.sanitizeUpdate()`

**CRITICAL IMPLEMENTATION NOTES:**
- Do NOT change method signatures
- Do NOT change return types
- Do NOT change error throwing behavior
- Mongoose model access pattern may differ in NestJS - adapt accordingly

### Step 4.3: Write BaseRepository Tests

**TASKS:**
1. Create test file for BaseRepository
2. Create a concrete test repository (e.g., `TestEntityRepository`)
3. Test all CRUD operations:
   - findById with valid/invalid ID
   - findOne with various filters
   - findMany with sorting/pagination
   - create and verify returned document
   - updateById and verify changes
   - deleteById and verify removal
4. Test error scenarios:
   - Invalid ID format
   - Not found scenarios
   - Duplicate key errors
5. Test transaction support

**VALIDATION:**
- [ ] All 17+ methods have test coverage
- [ ] Invalid IDs return proper error
- [ ] Transactions rollback on error
- [ ] Pagination cursors work correctly

---

## Phase 5: Service Error Handling

### Step 5.1: Explore Current ServiceError

**READ this file:**

```
backend/src/services/base/BaseService.ts
```

**FIND:**
- `ServiceError` class definition
- How `statusCode` and `code` properties are used
- Error mapping from repository to service layer

### Step 5.2: Port ServiceError

**TASKS:**
1. Create `service.error.ts` in `backend-nest/src/common/services/`
2. Port `ServiceError` class:
   - `message: string`
   - `statusCode: number` (default 500)
   - `code?: string`
3. Ensure proper Error inheritance

**VALIDATION:**
- [ ] Works with NestJS exception filter
- [ ] Status code used in HTTP response
- [ ] Error code available for client handling

---

## Phase 6: BaseService Abstract Class

### Step 6.1: Explore Current BaseService

**READ this file:**

```
backend/src/services/base/BaseService.ts
```

**UNDERSTAND:**

**Constructor:**
- How is the repository injected?
- Generic type constraints `<T extends Document, R extends BaseRepository<T>>`

**Validation Helpers:**
- `validateId(id, fieldName)` - How does it differ from repository's validateId?
- `validateEnum(value, validValues, fieldName)` - Error messages?
- `validateRequired(data, requiredFields)` - What does it check?

**Error Handling:**
- `handleRepositoryError(error)` - How are repo errors mapped to service errors?
- What HTTP status codes map to which repository error codes?

**Audit Logging:**
- `logAction(userId, action, status, req, details)` - Fire-and-forget pattern?
- What parameters are passed?

### Step 6.2: Port BaseService

**TASKS:**
1. Create `base.service.ts` in `backend-nest/src/common/services/`
2. Port abstract class with all helper methods
3. Adapt for NestJS DI:
   - Repository injected via constructor
   - Consider using `@Injectable()` decorator
4. Port error mapping exactly:
   | Repository Error | Service Error | HTTP Status |
   |-----------------|---------------|-------------|
   | NOT_FOUND | NOT_FOUND | 404 |
   | VALIDATION_ERROR | VALIDATION_ERROR | 400 |
   | DUPLICATE_KEY | DUPLICATE | 409 |
   | INVALID_ID | INVALID_ID | 400 |
   | * | INTERNAL_ERROR | 500 |

5. Port audit logging interface (implementation deferred):
   - Define `AuditAction` enum
   - Define `AuditStatus` enum
   - Create placeholder `logAction()` that logs to console

### Step 6.3: Write BaseService Tests

**TASKS:**
1. Create test file for BaseService
2. Create concrete test service
3. Test validation helpers:
   - validateId with valid/invalid
   - validateEnum with valid/invalid values
   - validateRequired with missing fields
4. Test error mapping:
   - Each RepositoryError maps to correct ServiceError
   - Status codes are correct

**VALIDATION:**
- [ ] All validation helpers tested
- [ ] Error mapping preserves codes
- [ ] Audit logging called (even if placeholder)

---

## Phase 7: Module Integration

### Step 7.1: Create Common Module

**TASKS:**
1. Create `CommonModule` that exports:
   - QuerySanitizer (as provider)
   - BaseRepository (abstract, no export needed)
   - BaseService (abstract, no export needed)
2. Ensure error classes are importable
3. Create barrel exports (`index.ts` files)

**VALIDATION:**
- [ ] Other modules can import from `@common/database`
- [ ] Other modules can import from `@common/services`
- [ ] Type definitions available

---

## Completion Checklist

Before marking this workflow complete:

- [ ] QuerySanitizer ported with all methods
- [ ] QuerySanitizer unit tests passing
- [ ] SafeFilter and QueryOptions types defined
- [ ] RepositoryError and codes ported
- [ ] BaseRepository abstract class ported (17+ methods)
- [ ] BaseRepository tests with concrete implementation
- [ ] ServiceError ported
- [ ] BaseService abstract class ported
- [ ] BaseService tests with concrete implementation
- [ ] Error mapping verified
- [ ] All code committed

## Files Created (Expected)

```
backend-nest/src/common/
├── database/
│   ├── index.ts
│   ├── query-sanitizer.ts
│   ├── types.ts
│   ├── repository.error.ts
│   └── base.repository.ts
├── services/
│   ├── index.ts
│   ├── service.error.ts
│   └── base.service.ts
└── common.module.ts

backend-nest/test/
├── common/
│   ├── query-sanitizer.spec.ts
│   ├── base.repository.spec.ts
│   └── base.service.spec.ts
```

## Next Workflow
After completing this workflow, proceed to [03-auth-e2e-tests.md](./03-auth-e2e-tests.md) to write E2E tests for the auth endpoints.
