# Single Route Migration Workflow

## Input Required
- **Route**: HTTP method and path (e.g., `POST /api/auth/register`)
- **Module**: Target module name (`auth`, `vault`, or `social`)

## Process

### 1. Analyze Current Implementation

Read the following files to understand the route:
- Route definition: `backend/src/routes/{module}Routes.ts`
- Controller handler: `backend/src/controllers/{module}Controller.ts`
- Service logic: `backend/src/services/{ModuleService}.ts` or `backend/src/services/{module}/`
- Repository: `backend/src/repositories/{Entity}Repository.ts`
- Models/Schemas: `backend/src/models/{Entity}.ts`
- Related utilities: Check imports for crypto, validation, external services

Note:
- What middleware is applied? (protect, csrfProtection, etc.)
- What request body/params/query are expected?
- What response structure is returned?
- What error cases are handled?
- Any special dependencies (GridFS, Socket.IO, external APIs)?

### 2. Create/Update Mongoose Schema

**Only if schema doesn't exist yet:**

Location: `backend-nest/src/modules/{module}/schemas/{entity}.schema.ts`

- Copy schema structure from `backend/src/models/{Entity}.ts`
- Use `@nestjs/mongoose` decorators (`@Schema`, `@Prop`)
- Keep exact same field names, types, and defaults
- Maintain all indexes
- Add timestamps if present in original

### 3. Create/Update Repository

Location: `backend-nest/src/modules/{module}/repositories/{entity}.repository.ts`

- Extend BaseRepository (if created in setup)
- Port custom query methods from old repository
- Use dependency injection for DatabaseManager
- Ensure queries use the active database connection
- Keep query sanitization from original

### 4. Create/Update DTOs

Location: `backend-nest/src/modules/{module}/dto/`

Create separate files for request/response:
- `{action}-request.dto.ts` - For request validation
- `{action}-response.dto.ts` - For response typing

- Match exact field structure from old backend
- Add `class-validator` decorators for validation
- Use `@ApiProperty()` for Swagger (optional)
- Include all optional fields
- Match error messages from old validation

### 5. Implement/Update Service Method

Location: `backend-nest/src/modules/{module}/{module}.service.ts`

- Inject required repositories via constructor
- Port business logic exactly from old service
- Maintain same error handling and messages
- Keep same validation logic
- Preserve transaction handling if present
- Use same external service integrations

**Special cases:**
- File uploads: Use Fastify multipart handling
- WebAuthn: Port `@simplewebauthn/server` logic exactly
- Crypto operations: Use same utilities
- Socket emissions: Inject SocketManager if needed

### 6. Implement/Update Controller Endpoint

Location: `backend-nest/src/modules/{module}/{module}.controller.ts`

Or for complex modules: `backend-nest/src/modules/{module}/controllers/{submodule}.controller.ts`

- Add route with exact same HTTP method and path
- Apply guards: `@UseGuards(JwtAuthGuard)` if protected, `@UseGuards(CsrfGuard)` if CSRF protected
- Use `@Public()` decorator if no auth required
- Use `@CurrentUser()` decorator to get authenticated user
- Add validation: `@Body(ValidationPipe)` for request body
- Call service method
- Return response in exact same format

**Route-specific adaptations:**
- Public routes: Only apply guards needed
- File downloads: Use Fastify streaming
- Chunked uploads: Handle multipart properly
- Query params: Use `@Query()` decorator
- Path params: Use `@Param()` decorator

### 7. Update Module

Location: `backend-nest/src/modules/{module}/{module}.module.ts`

- Add new controller if not present
- Add new service provider if not present
- Add new repository provider if not present
- Import required schemas
- Import dependencies (JwtModule, etc.)
- Export services if needed by other modules

### 8. Write E2E Test

Location: `backend-nest/test/e2e/{module}/{route-name}.e2e-spec.ts`

Test must verify:
- Happy path with valid data
- Authentication (if protected)
- CSRF protection (if applicable)
- Error cases (validation, not found, unauthorized)
- Response structure matches old backend exactly
- Database state changes correctly

Use `app.inject()` for Fastify testing.

### 9. Run and Verify

Execute tests:
```bash
npm run test:e2e -- {test-file-name}
```

Verify:
- [ ] Test passes
- [ ] Response structure identical to old backend
- [ ] HTTP status codes match
- [ ] Error messages match
- [ ] Database operations work
- [ ] Authentication/CSRF work correctly

### 10. Manual Integration Test (Optional)

If route needs complex testing:
- Start NestJS backend on different port (e.g., 5001)
- Point frontend to new backend temporarily
- Test actual frontend interaction
- Verify cookies, sessions work
- Check browser console for errors

### 11. Update Checklist

Mark route as completed in `.workflows/migration-checklist.md`:
```markdown
- [x] POST /api/auth/register
```

Add notes if there were any deviations or issues.

## Dynamic Adaptations

### For routes with file uploads:
- Configure Fastify multipart
- Use streaming for large files
- Match chunk handling from old backend

### For routes with WebAuthn:
- Port challenge storage mechanism
- Ensure same credential validation
- Maintain same error responses

### For routes with complex queries:
- Port query sanitization
- Maintain same pagination
- Keep same sorting/filtering logic

### For routes with Socket.IO:
- Inject SocketManager service
- Emit events with same structure
- Maintain room/namespace logic

### For routes with external APIs:
- Port integration services
- Keep same error handling
- Maintain same retry logic

## Common Pitfalls

- Don't forget CSRF on mutating operations
- Match exact error response structure
- Keep same validation messages
- Maintain same cookie options
- Use same JWT token format
- Preserve transaction boundaries
- Keep same rate limiting (if present)

## Commit Strategy

After successful test:
```bash
git add .
git commit -m "feat(nest): migrate {METHOD} {path}"
```

Keep commits atomic - one route per commit.
