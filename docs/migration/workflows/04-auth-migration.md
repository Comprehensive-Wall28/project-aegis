# Workflow 04: Auth Module Migration

## Objective
Implement the NestJS auth module, passing all E2E tests from Workflow 03.

## Prerequisites
- Workflow 01 completed (NestJS foundation)
- Workflow 02 completed (base patterns)
- Workflow 03 completed (auth E2E tests passing against Express)

## Scope Boundaries

### IN SCOPE
- User model/schema for NestJS
- UserRepository implementation
- AuthService with all methods
- AuthController with all endpoints
- JwtAuthGuard
- CsrfGuard
- JWT and cookie handling

### OUT OF SCOPE
- Other domain modules
- Modifying Express backend
- New features not in Express

---

## Phase 1: User Model

### Step 1.1: Explore Current User Model

**READ this file:**

```
backend/src/models/User.ts
```

**DOCUMENT all fields:**
- Basic fields (email, username, password hash)
- Profile fields
- Encryption fields (public keys, etc.)
- WebAuthn credential fields
- Token version field
- Timestamps

**UNDERSTAND:**
- Index definitions
- Virtual fields
- Instance methods (if any)
- Pre/post hooks (if any)

### Step 1.2: Create User Schema

**TASKS:**
1. Create `user.schema.ts` in `backend-nest/src/modules/auth/`
2. Define schema using `@nestjs/mongoose` decorators
3. Match ALL fields exactly from Express model
4. Configure same indexes
5. Port any hooks or virtuals

**VALIDATION:**
- [ ] All fields present
- [ ] Types match exactly
- [ ] Indexes created

---

## Phase 2: User Repository

### Step 2.1: Explore Current UserRepository

**READ this file:**

```
backend/src/repositories/UserRepository.ts
```

**DOCUMENT custom methods beyond BaseRepository:**
- `findByEmail(email)`
- `findByUsername(username)`
- `findByEmailOrUsername(identifier)`
- `incrementTokenVersion(userId)`
- WebAuthn credential methods

### Step 2.2: Create UserRepository

**TASKS:**
1. Create `user.repository.ts`
2. Extend `BaseRepository<User>`
3. Implement all custom methods
4. Use QuerySanitizer for all queries

**CRITICAL:**
- `findByEmail` - case-insensitive?
- `findByUsername` - case-insensitive?
- ID handling must use string IDs

**VALIDATION:**
- [ ] All methods from Express version ported
- [ ] Unit tests for custom methods

---

## Phase 3: Auth Service

### Step 3.1: Explore Current AuthService

**READ this file:**

```
backend/src/services/authService.ts
```

**DOCUMENT all methods:**

**Registration:**
- `register(userData)` - What's validated? What's returned?
- How is password hashed (argon2 options)?
- What encryption keys are generated?

**Login:**
- `login(identifier, password)` - Email vs username detection
- `verifyPassword(hash, password)` - Argon2 verification
- What's returned on success?

**Logout:**
- `logout(userId)` - Token version increment

**Token Management:**
- `generateToken(user)` - JWT payload, expiry
- `verifyToken(token)` - Validation steps
- Token version checking

**WebAuthn:**
- `generateRegistrationOptions(user)`
- `verifyRegistration(user, response)`
- `generateLoginOptions(identifier)`
- `verifyLogin(response)`

### Step 3.2: Create AuthService

**TASKS:**
1. Create `auth.service.ts`
2. Extend `BaseService<User, UserRepository>`
3. Implement ALL methods matching Express exactly:
   - Same validation rules
   - Same error messages and codes
   - Same JWT payload structure
   - Same cookie names

**DEPENDENCIES to install:**
- `argon2` - password hashing
- `jsonwebtoken` or `@nestjs/jwt` - JWT handling
- `@simplewebauthn/server` - WebAuthn

**CRITICAL DETAILS:**
- JWT secret from ConfigService
- Cookie settings (httpOnly, secure, sameSite)
- Token expiry times
- Argon2 options (memory, time, parallelism)

**VALIDATION:**
- [ ] Registration creates user correctly
- [ ] Login verifies password correctly
- [ ] JWT payload matches Express format
- [ ] WebAuthn flows work

---

## Phase 4: JWT Auth Guard

### Step 4.1: Explore Current Auth Middleware

**READ this file:**

```
backend/src/middleware/authMiddleware.ts
```

**UNDERSTAND:**
- How is JWT extracted (cookie? header?)
- How is token verified?
- How is token version checked?
- What's attached to request on success?
- What errors are returned?

### Step 4.2: Create JwtAuthGuard

**TASKS:**
1. Create `jwt-auth.guard.ts` in `backend-nest/src/modules/auth/guards/`
2. Implement `CanActivate` interface
3. Extract JWT from cookies (match Express behavior)
4. Verify token with secret
5. Check token version against database
6. Attach user to request
7. Return appropriate error responses

**NESTJS PATTERNS:**
- Use `@UseGuards(JwtAuthGuard)` on protected routes
- Consider creating `@Public()` decorator for unprotected routes
- Create `@CurrentUser()` parameter decorator

**VALIDATION:**
- [ ] Guard rejects requests without token
- [ ] Guard rejects invalid tokens
- [ ] Guard rejects tokens with old version
- [ ] Guard attaches user to request
- [ ] E2E tests pass

---

## Phase 5: CSRF Guard

### Step 5.1: Explore Current CSRF Middleware

**READ this file:**

```
backend/src/middleware/customCsrf.ts
```

**UNDERSTAND:**
- Double-submit cookie pattern
- How is token generated?
- How is it signed (HMAC)?
- Which methods require CSRF (POST, PUT, DELETE)?
- How is token validated?
- Cookie name and header name

### Step 5.2: Create CsrfGuard

**TASKS:**
1. Create `csrf.guard.ts` in `backend-nest/src/modules/auth/guards/`
2. Implement double-submit validation
3. Match cookie name exactly
4. Match header name exactly
5. Use same HMAC signing approach

**TASKS for CSRF token endpoint:**
1. Add endpoint in AuthController
2. Generate signed token
3. Set cookie with token

**VALIDATION:**
- [ ] POST/PUT/DELETE require CSRF
- [ ] GET does not require CSRF
- [ ] Token generation matches Express
- [ ] E2E tests pass

---

## Phase 6: Auth Controller

### Step 6.1: Explore Current AuthController

**READ this file:**

```
backend/src/controllers/authController.ts
```

**DOCUMENT all handlers:**

| Method | Path | Auth | CSRF | Handler |
|--------|------|------|------|---------|
| POST | /register | No | No | register |
| POST | /login | No | No | login |
| POST | /logout | Yes | Yes | logout |
| GET | /me | Yes | No | getCurrentUser |
| GET | /csrf-token | No | No | getCsrfToken |
| POST | /webauthn/register-options | Yes | Yes | ... |
| POST | /webauthn/register-verify | Yes | Yes | ... |
| POST | /webauthn/login-options | No | No | ... |
| POST | /webauthn/login-verify | No | No | ... |

**UNDERSTAND for each:**
- Request body validation
- Response shape
- Cookie setting
- Error responses

### Step 6.2: Create AuthController

**TASKS:**
1. Create `auth.controller.ts`
2. Use `@Controller('api/auth')` to match Express path
3. Implement all endpoints
4. Apply guards appropriately:
   - `@Public()` for register, login, csrf-token
   - `@UseGuards(JwtAuthGuard)` for protected
   - `@UseGuards(CsrfGuard)` for state-changing
5. Use DTOs for request validation
6. Set cookies in responses (use Fastify's reply)

**CREATE DTOs:**
- `RegisterDto` - email, username, password, etc.
- `LoginDto` - identifier, password
- WebAuthn DTOs as needed

**FASTIFY COOKIE HANDLING:**
```typescript
// In controller method with @Res() decorator
reply.setCookie('token', jwt, { ... });
```

**VALIDATION:**
- [ ] All endpoints accessible at correct paths
- [ ] Request validation working
- [ ] Responses match Express format
- [ ] Cookies set correctly
- [ ] E2E tests pass

---

## Phase 7: Module Assembly

### Step 7.1: Create Auth Module

**TASKS:**
1. Create `auth.module.ts`
2. Import required modules:
   - ConfigModule
   - DatabaseModule (for User model)
   - JwtModule (if using @nestjs/jwt)
3. Register providers:
   - UserRepository
   - AuthService
4. Register controllers:
   - AuthController
5. Export services for other modules (if needed)

### Step 7.2: Integrate with App Module

**TASKS:**
1. Import AuthModule in AppModule
2. Apply global guards if using that pattern
3. Configure cookie parsing for Fastify

---

## Phase 8: Run E2E Tests

### Step 8.1: Configure Tests for NestJS

**TASKS:**
1. Update test helpers to target NestJS (port 3001)
2. Ensure test database is isolated

### Step 8.2: Run All Auth Tests

**TASKS:**
1. Run: `npm run test:e2e -- --grep "auth"`
2. Fix any failing tests
3. Ensure ALL tests from Workflow 03 pass

**COMMON ISSUES:**
- Cookie format differences
- Response shape differences
- Error message differences
- Token format differences

**VALIDATION:**
- [ ] All 38+ auth tests passing against NestJS
- [ ] No regressions in Express (tests still pass there too)

---

## Completion Checklist

Before marking this workflow complete:

- [ ] User schema created with all fields
- [ ] UserRepository with custom methods
- [ ] AuthService with all methods
- [ ] JwtAuthGuard working
- [ ] CsrfGuard working
- [ ] AuthController with all endpoints
- [ ] All DTOs with validation
- [ ] AuthModule assembled
- [ ] All E2E tests from Workflow 03 passing
- [ ] Code committed

## Files Created (Expected)

```
backend-nest/src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── user.schema.ts
├── user.repository.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── csrf.guard.ts
├── decorators/
│   ├── public.decorator.ts
│   └── current-user.decorator.ts
└── dto/
    ├── register.dto.ts
    ├── login.dto.ts
    └── webauthn.dto.ts
```

## Next Workflow
After completing this workflow, proceed to [05-tasks-tests.md](./05-tasks-tests.md) to write E2E tests for the tasks domain.
