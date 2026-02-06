# E2E Testing Guide for Migrated Routes

## Purpose

Ensure each migrated route maintains exact compatibility with the existing Express backend, including:
- Response structure and data types
- HTTP status codes
- Error messages and formats
- Authentication and authorization behavior
- Database state changes

---

## Test Structure

### Location
`backend-nest/test/e2e/{module}/{descriptive-name}.e2e-spec.ts`

Examples:
- `backend-nest/test/e2e/auth/register.e2e-spec.ts`
- `backend-nest/test/e2e/vault/upload-file.e2e-spec.ts`
- `backend-nest/test/e2e/social/create-room.e2e-spec.ts`

### Test File Organization

Each test file should:
1. Set up test app with proper configuration
2. Clean up database before/after tests
3. Test happy path first
4. Test error cases
5. Verify authentication/authorization
6. Check database state changes

---

## What to Test

### 1. Happy Path (Required)
- Valid request with all required fields
- Expected successful response
- Correct HTTP status code
- Response matches old backend structure exactly
- Database records created/updated/deleted correctly

### 2. Authentication (If Protected Route)
- Request without token returns 401
- Request with invalid token returns 401
- Request with expired token returns 401
- Request with valid token succeeds

### 3. CSRF Protection (If Applied)
- Request without CSRF token returns 403 (if protected)
- Request with invalid CSRF token returns 403
- Request with valid CSRF token succeeds

### 4. Validation (All Routes)
- Missing required fields return 400 with validation errors
- Invalid data types return 400
- Invalid formats return 400
- Error messages match old backend

### 5. Authorization (If Applicable)
- User can only access their own resources
- Cannot access other users' resources
- Proper 403 or 404 responses

### 6. Edge Cases (Route Specific)
- Empty arrays/objects
- Very long strings
- Special characters
- Boundary values
- Concurrent requests (if relevant)

### 7. Database State (Critical)
- Data persisted correctly
- Related documents updated
- Indexes working
- Timestamps set
- Soft deletes working (if applicable)

---

## Test Helpers

### Setup Test Database
- Use separate test database or in-memory MongoDB
- Clear relevant collections before each test
- Seed required data (users, rooms, etc.)

### Create Test Users
- Generate valid JWT tokens
- Create users with different roles/permissions
- Use consistent test data

### Generate CSRF Tokens
- Obtain token from `/api/auth/csrf-token`
- Include in subsequent requests

### Assertions
- Use exact response structure from old backend
- Compare JSON schemas
- Check all fields, including optional ones
- Verify null vs undefined handling

---

## Testing Patterns

### For routes that create resources:
1. Create resource
2. Verify response contains new resource with ID
3. Query database to confirm persistence
4. Verify timestamps set
5. Check related documents updated

### For routes that read resources:
1. Seed database with test data
2. Query resource
3. Verify all fields returned correctly
4. Verify filtering/pagination works
5. Verify sensitive fields excluded

### For routes that update resources:
1. Create resource
2. Update with new data
3. Verify response reflects changes
4. Query database to confirm update
5. Verify timestamps updated
6. Verify only intended fields changed

### For routes that delete resources:
1. Create resource
2. Delete resource
3. Verify success response
4. Query database to confirm deletion
5. Verify cascade deletes (if applicable)
6. Verify soft delete vs hard delete

### For file upload routes:
1. Upload file in chunks (if chunked)
2. Verify each chunk accepted
3. Verify file metadata created
4. Verify GridFS/storage has file
5. Verify user storage quota updated

### For file download routes:
1. Upload file first
2. Download file
3. Verify correct content-type header
4. Verify content matches uploaded file
5. Verify streaming works for large files

---

## Fastify-Specific Testing

Use `app.inject()` for testing instead of supertest:

```typescript
const response = await app.inject({
  method: 'POST',
  url: '/api/auth/register',
  payload: { /* data */ },
  headers: {
    'cookie': 'token=...',
    'x-csrf-token': '...'
  }
});
```

### Response Properties
- `response.statusCode` - HTTP status
- `response.json()` - Parse JSON body
- `response.headers` - Response headers
- `response.cookies` - Get set cookies

---

## Compatibility Verification

### Response Structure Matching
Compare against actual Express backend response:
1. Run same request on old backend
2. Save response JSON
3. Compare structure in test
4. Ensure all fields present with correct types

### Error Format Matching
Ensure errors match old backend:
- Same status codes
- Same error message text
- Same error object structure
- Same field names in validation errors

### Cookie Compatibility
Verify cookies work across backends:
- Same cookie name
- Same encryption/signing
- Same domain/path settings
- Same expiration behavior

### JWT Compatibility
Ensure tokens work across backends:
- Generate token in NestJS backend
- Verify works in Express backend (and vice versa)
- Same payload structure
- Same expiration

---

## Test Data Management

### Fixtures
Create reusable test data:
- Valid user objects
- Valid room objects
- Valid file metadata
- Invalid data for error testing

### Cleanup
Always clean up after tests:
- Delete test users
- Delete test files
- Clear test rooms
- Reset sequences/counters

### Isolation
Each test should be independent:
- Don't rely on other tests' data
- Use unique identifiers
- Don't share mutable state

---

## Running Tests

### Single test file:
```bash
npm run test:e2e -- auth/register.e2e-spec.ts
```

### All tests in module:
```bash
npm run test:e2e -- auth/
```

### All tests:
```bash
npm run test:e2e
```

### Watch mode:
```bash
npm run test:e2e -- --watch
```

---

## Debugging Failed Tests

1. Check response body for error details
2. Verify database state manually
3. Check logs for errors
4. Compare with old backend behavior
5. Verify middleware applied correctly
6. Check guards and decorators

---

## Performance Considerations

While not primary focus, note if:
- Response times significantly different
- Database queries inefficient
- Memory usage concerning
- Many N+1 query problems

Document for later optimization but don't block migration.

---

## When to Skip E2E Test

Only skip if:
- Route is trivial GET with no logic
- Route is deprecated and unused
- Route is internal/admin only

Document reason for skipping in checklist.

---

## Example Test Checklist per Route

- [ ] Test passes with valid data
- [ ] Response structure matches old backend
- [ ] HTTP status codes correct
- [ ] Authentication working (if protected)
- [ ] CSRF protection working (if applicable)
- [ ] Validation errors match old backend
- [ ] Database state correct
- [ ] Error messages match exactly
- [ ] Edge cases handled
- [ ] Test runs reliably (no flaky behavior)
