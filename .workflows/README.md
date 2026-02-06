# NestJS Migration Workflows

This directory contains workflow files for migrating the Aegis backend from Express to NestJS with Fastify.

## Overview

The migration follows a systematic approach:
1. Initial infrastructure setup
2. Route-by-route migration with testing
3. Continuous validation and compatibility checks

## Workflow Files

### [00-initial-setup.md](./00-initial-setup.md)
**Purpose:** Bootstrap the new NestJS backend with all infrastructure

**When to use:** Execute once at the start of migration

**Key deliverables:**
- NestJS project with Fastify adapter
- Database module with runtime URI switching
- Common guards, interceptors, filters
- Health and monitoring endpoints

**Success criteria:** Application starts, connects to databases, health checks pass

---

### [01-migrate-route.md](./01-migrate-route.md)
**Purpose:** Migrate a single route from Express to NestJS

**When to use:** For each individual route in the backend

**Input required:**
- Route path (e.g., `POST /api/auth/register`)
- Module name (`auth`, `vault`, or `social`)

**Key deliverables:**
- Schema (if new)
- Repository (if new)
- DTOs for request/response
- Service method
- Controller endpoint
- E2E test
- Updated checklist

**Success criteria:** E2E test passes, response matches old backend exactly

---

### [02-testing-guide.md](./02-testing-guide.md)
**Purpose:** Guidelines for writing comprehensive E2E tests

**When to use:** Reference while writing tests for each route

**Covers:**
- Test structure and organization
- What to test (happy path, errors, auth, validation)
- Fastify-specific testing patterns
- Compatibility verification strategies
- Test data management

---

### [migration-checklist.md](./migration-checklist.md)
**Purpose:** Track progress across all 46 routes

**When to use:** Update after completing each route

**Contents:**
- All routes organized by module
- Progress statistics
- Notes on issues and deviations
- Deployment readiness checklist

---

## Migration Process

### Phase 1: Initial Setup (One-time)

1. Follow [00-initial-setup.md](./00-initial-setup.md)
2. Verify all setup checklist items pass
3. Commit initial infrastructure

### Phase 2: Route Migration (Iterative)

For each route:

1. Choose next route from [migration-checklist.md](./migration-checklist.md)
2. Follow [01-migrate-route.md](./01-migrate-route.md)
3. Reference [02-testing-guide.md](./02-testing-guide.md) for testing
4. Run E2E test until it passes
5. Update checklist
6. Commit

**Recommended order:**
- Auth module first (authentication required for other modules)
- Vault module second (file handling needed for some social features)
- Social module last (most complex, depends on auth)

### Phase 3: Validation

After all routes migrated:

1. Run full E2E test suite
2. Test with actual frontend
3. Performance benchmarks
4. Load testing
5. Database fallback testing
6. Security audit

---

## Agent Usage

These workflows are designed for both human developers and AI agents.

### For Agents:

**Initial Setup:**
```
Execute workflow: .workflows/00-initial-setup.md
```

**Migrating Routes:**
```
Execute workflow: .workflows/01-migrate-route.md
Input: POST /api/auth/register, module: auth
```

**Context:**
- Read the old implementation files first
- Understand dependencies and middleware
- Match response structure exactly
- Reference testing guide for test patterns

### For Humans:

- Use workflows as checklists
- Adapt steps as needed for specific routes
- Document deviations in checklist notes
- Ask for help when patterns don't match

---

## Key Principles

### 1. Compatibility First
Every route must maintain:
- Exact same API contract (paths, methods)
- Identical request/response structure
- Same error codes and messages
- Compatible authentication tokens
- Same database schemas

### 2. Test Everything
- Write E2E test before marking route complete
- Test must verify response structure matches
- Test must verify database state
- Test authentication and authorization
- Test error cases

### 3. Incremental Progress
- One route at a time
- Commit after each passing test
- Update checklist immediately
- Don't batch multiple routes

### 4. Dynamic Adaptation
- Workflows provide guidance, not rigid steps
- Adapt to route-specific needs
- Use judgment for complex cases
- Document unusual patterns

---

## Route Complexity Levels

### Simple Routes
- Single database query
- No external dependencies
- Standard CRUD operation
- **Example:** GET /api/vault/files

**Approach:** Follow workflow step-by-step

### Medium Routes
- Multiple database queries
- Some business logic
- File handling or validation
- **Example:** POST /api/social/rooms

**Approach:** Follow workflow, add extra validation tests

### Complex Routes
- Multiple service interactions
- External API calls
- Complex authorization logic
- WebAuthn or crypto operations
- **Example:** POST /api/auth/webauthn/register-verify

**Approach:** Break into smaller testable units, extensive testing

---

## Troubleshooting

### Route behavior differs from old backend
1. Check middleware applied (guards, interceptors)
2. Verify DTOs match exactly
3. Compare database queries
4. Check error handling logic

### Test fails intermittently
1. Check for race conditions
2. Verify database cleanup
3. Check for shared state
4. Use proper async/await

### Authentication not working
1. Verify JWT secret matches
2. Check cookie options
3. Verify guard applied correctly
4. Check token extraction logic

### CSRF protection issues
1. Verify CSRF guard applied
2. Check token generation
3. Verify token in headers
4. Check cookie configuration

---

## Best Practices

1. **Read first, code second** - Understand the old implementation fully
2. **Test-driven** - Write test before implementation when possible
3. **Commit often** - One route per commit
4. **Document deviations** - Note any changes from original
5. **Ask when unsure** - Better to clarify than assume
6. **Verify compatibility** - Test with actual frontend periodically

---

## Progress Tracking

Check [migration-checklist.md](./migration-checklist.md) for:
- Current progress (X/46 routes)
- Which routes are complete
- Which routes are in progress
- Any blocking issues

---

## Questions?

If you encounter scenarios not covered by these workflows:
1. Document the scenario
2. Propose a solution
3. Add notes to checklist
4. Update workflow if pattern is reusable

---

## Success Metrics

Migration is complete when:
- [ ] All 46 routes migrated
- [ ] All E2E tests passing
- [ ] Frontend works with new backend
- [ ] Performance meets requirements
- [ ] Database fallback works
- [ ] Security audit passed
- [ ] Documentation complete
