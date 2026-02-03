# Workflow 03: Auth E2E Tests

## Objective
Write comprehensive E2E tests for all authentication endpoints. Tests run against the EXISTING Express backend first, then will validate the NestJS migration.

## Prerequisites
- Workflow 01 completed (test infrastructure ready)
- Workflow 02 completed (base patterns available)
- Express backend running on port 5000

## Scope Boundaries

### IN SCOPE
- E2E tests for all `/api/auth/*` endpoints
- Test utilities for authentication flows
- Test data fixtures for users
- Cookie and CSRF token handling in tests

### OUT OF SCOPE
- Actual NestJS auth module implementation
- Modifying Express backend
- WebAuthn device simulation (mock only)

---

## Phase 1: Explore Auth Routes

### Step 1.1: Map All Auth Endpoints

**READ this file:**

```
backend/src/routes/authRoutes.ts
```

**DOCUMENT all endpoints:**
- HTTP method
- Path
- Required authentication (yes/no)
- CSRF protection (yes/no)
- Request body schema
- Response schema
- Error responses

**Expected endpoints to find:**
1. `POST /api/auth/register`
2. `POST /api/auth/login`
3. `POST /api/auth/logout`
4. `GET /api/auth/me`
5. `GET /api/auth/csrf-token`
6. WebAuthn registration flow
7. WebAuthn login flow

### Step 1.2: Explore Auth Controller

**READ this file:**

```
backend/src/controllers/authController.ts
```

**UNDERSTAND:**
- What validation is performed on inputs?
- What are the success response shapes?
- What are the error response shapes and status codes?
- How are cookies set (names, options)?

### Step 1.3: Explore Auth Service

**READ this file:**

```
backend/src/services/authService.ts
```

**UNDERSTAND:**
- Password hashing approach (argon2)
- JWT token generation
- Token version invalidation
- WebAuthn credential storage

---

## Phase 2: Test Utilities

### Step 2.1: Create Auth Test Helpers

**TASKS:**
1. Create `test/helpers/auth.helper.ts` with:
   - `registerUser(app, userData)` - registers and returns user + tokens
   - `loginUser(app, credentials)` - logs in and returns tokens
   - `getAuthenticatedAgent(app, user)` - returns supertest agent with auth
   - `getCsrfToken(app, agent)` - gets CSRF token for protected requests
   - `extractCookies(response)` - parses Set-Cookie headers

### Step 2.2: Create Test Fixtures

**TASKS:**
1. Create `test/fixtures/users.fixture.ts` with:
   - `validUserData` - complete valid registration data
   - `invalidUserData` - various invalid scenarios
   - `existingUser` - user that will be seeded

**CONSIDER the User model fields:**
```
backend/src/models/User.ts
```
- What fields are required for registration?
- What encryption-related fields exist?
- What WebAuthn fields exist?

---

## Phase 3: Registration Tests

### Step 3.1: Explore Registration Flow

**READ in authController.ts:**
- `register` handler

**READ in authService.ts:**
- `register` method

**UNDERSTAND:**
- Required fields
- Validation rules (email format, password strength, username rules)
- What's returned on success
- What errors can occur

### Step 3.2: Write Registration Tests

**TEST CASES:**

```
describe('POST /api/auth/register', () => {
  describe('Success cases', () => {
    it('should register a new user with valid data')
    it('should return user object without sensitive fields')
    it('should set authentication cookies')
    it('should hash the password (not store plain)')
  })

  describe('Validation errors', () => {
    it('should reject missing email')
    it('should reject invalid email format')
    it('should reject missing password')
    it('should reject weak password')
    it('should reject missing username')
    it('should reject username with invalid characters')
    it('should reject username that is too short/long')
  })

  describe('Duplicate handling', () => {
    it('should reject duplicate email')
    it('should reject duplicate username')
  })

  describe('Security', () => {
    it('should not expose password hash in response')
    it('should not expose internal IDs inappropriately')
  })
})
```

**VALIDATION:**
- [ ] All test cases written
- [ ] Tests pass against Express backend
- [ ] Edge cases covered

---

## Phase 4: Login Tests

### Step 4.1: Explore Login Flow

**READ in authController.ts:**
- `login` handler

**READ in authService.ts:**
- `login` method

**UNDERSTAND:**
- Credential validation
- Password verification with argon2
- Token generation
- Cookie setting

### Step 4.2: Write Login Tests

**TEST CASES:**

```
describe('POST /api/auth/login', () => {
  describe('Success cases', () => {
    it('should login with valid email and password')
    it('should login with valid username and password')
    it('should return user object')
    it('should set authentication cookies')
    it('should set CSRF cookie')
  })

  describe('Invalid credentials', () => {
    it('should reject wrong password')
    it('should reject non-existent email')
    it('should reject non-existent username')
    it('should return 401 for invalid credentials')
    it('should not reveal whether email exists')
  })

  describe('Validation', () => {
    it('should reject missing identifier')
    it('should reject missing password')
  })
})
```

---

## Phase 5: Logout Tests

### Step 5.1: Explore Logout Flow

**READ in authController.ts:**
- `logout` handler

**UNDERSTAND:**
- Token version increment
- Cookie clearing
- Response format

### Step 5.2: Write Logout Tests

**TEST CASES:**

```
describe('POST /api/auth/logout', () => {
  describe('Success cases', () => {
    it('should logout authenticated user')
    it('should clear authentication cookies')
    it('should invalidate token version')
  })

  describe('Auth required', () => {
    it('should reject unauthenticated request')
  })

  describe('Token invalidation', () => {
    it('should reject old token after logout')
  })
})
```

---

## Phase 6: Get Current User Tests

### Step 6.1: Explore Me Endpoint

**READ in authController.ts:**
- `me` / `getCurrentUser` handler

### Step 6.2: Write Me Tests

**TEST CASES:**

```
describe('GET /api/auth/me', () => {
  describe('Success cases', () => {
    it('should return current user for authenticated request')
    it('should not include sensitive fields')
    it('should include encryption public keys')
  })

  describe('Auth required', () => {
    it('should return 401 for unauthenticated request')
    it('should return 401 for invalid token')
    it('should return 401 for expired token')
  })
})
```

---

## Phase 7: CSRF Token Tests

### Step 7.1: Explore CSRF Flow

**READ these files:**

```
backend/src/controllers/authController.ts    # csrf-token endpoint
backend/src/middleware/customCsrf.ts         # CSRF middleware
```

**UNDERSTAND:**
- How is CSRF token generated?
- How is it validated on protected requests?
- What's the double-submit cookie pattern?

### Step 7.2: Write CSRF Tests

**TEST CASES:**

```
describe('GET /api/auth/csrf-token', () => {
  it('should return CSRF token')
  it('should set CSRF cookie')
})

describe('CSRF Protection', () => {
  it('should reject protected POST without CSRF token')
  it('should reject protected POST with invalid CSRF token')
  it('should accept protected POST with valid CSRF token')
  it('should accept protected PUT with valid CSRF token')
  it('should accept protected DELETE with valid CSRF token')
})
```

---

## Phase 8: WebAuthn Tests (Basic)

### Step 8.1: Explore WebAuthn Flow

**READ in authController.ts:**
- WebAuthn registration handlers
- WebAuthn login handlers

**READ in authService.ts:**
- WebAuthn challenge generation
- Credential verification

**NOTE:** Full WebAuthn testing requires device simulation. For now, test the API contract only.

### Step 8.2: Write WebAuthn Tests

**TEST CASES:**

```
describe('WebAuthn Registration', () => {
  describe('POST /api/auth/webauthn/register-options', () => {
    it('should return registration options for authenticated user')
    it('should reject unauthenticated request')
  })

  describe('POST /api/auth/webauthn/register-verify', () => {
    it('should reject without prior options request')
    it('should reject invalid attestation')
  })
})

describe('WebAuthn Login', () => {
  describe('POST /api/auth/webauthn/login-options', () => {
    it('should return login options')
    it('should include challenge')
  })

  describe('POST /api/auth/webauthn/login-verify', () => {
    it('should reject invalid assertion')
    it('should reject unknown credential')
  })
})
```

---

## Phase 9: Integration Scenarios

### Step 9.1: Write Flow Tests

**TEST CASES:**

```
describe('Auth Integration Flows', () => {
  describe('Full registration to usage flow', () => {
    it('should register, get CSRF, logout, login, access protected route')
  })

  describe('Session management', () => {
    it('should maintain session across requests with cookies')
    it('should reject after logout even with same token')
  })

  describe('Concurrent sessions', () => {
    it('should allow login from multiple clients')
    it('should invalidate all sessions on password change') // if applicable
  })
})
```

---

## Completion Checklist

Before marking this workflow complete:

- [ ] All auth endpoints documented with request/response shapes
- [ ] Auth test helpers created and working
- [ ] User fixtures created
- [ ] Registration tests (8+ cases) passing
- [ ] Login tests (8+ cases) passing
- [ ] Logout tests (4+ cases) passing
- [ ] Me endpoint tests (4+ cases) passing
- [ ] CSRF tests (5+ cases) passing
- [ ] WebAuthn basic tests (6+ cases) written
- [ ] Integration flow tests (3+ cases) passing
- [ ] All tests run against Express backend (port 5000)
- [ ] Tests committed to git

## Files Created (Expected)

```
backend-nest/test/
├── helpers/
│   ├── auth.helper.ts
│   ├── request.helper.ts
│   └── cookie.helper.ts
├── fixtures/
│   └── users.fixture.ts
└── auth/
    └── auth.e2e-spec.ts        # All auth tests
```

## Test Count Target

| Category | Minimum Tests |
|----------|---------------|
| Registration | 8 |
| Login | 8 |
| Logout | 4 |
| Me | 4 |
| CSRF | 5 |
| WebAuthn | 6 |
| Integration | 3 |
| **Total** | **38+** |

## Next Workflow
After completing this workflow, proceed to [04-auth-migration.md](./04-auth-migration.md) to implement the NestJS auth module.
