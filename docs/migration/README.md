# Express to NestJS Migration Guide

## Overview

This directory contains phased workflow specifications for migrating the Aegis backend from Express to NestJS with Fastify. Each workflow is designed for AI agent execution with minimal context requirements.

## Architecture Decisions

- **Parallel Operation**: NestJS runs on port 3001 alongside Express on port 5000 during migration
- **Test-Driven**: E2E tests written against Express first, then used to validate NestJS implementation
- **Fastify Adapter**: NestJS configured with Fastify for high performance
- **Database**: MongoDB Memory Server for testing, same Mongoose ODM patterns

## Workflow Execution Order

### Phase 1: Foundation (Required First)
| Workflow | File | Description | Estimated Effort |
|----------|------|-------------|------------------|
| 01 | [01-foundation-setup.md](./workflows/01-foundation-setup.md) | NestJS project + infrastructure | 2-3 sessions |
| 02 | [02-base-patterns.md](./workflows/02-base-patterns.md) | Repository/Service base classes | 1-2 sessions |

### Phase 2: Auth (Required Second)
| Workflow | File | Description | Estimated Effort |
|----------|------|-------------|------------------|
| 03 | [03-auth-e2e-tests.md](./workflows/03-auth-e2e-tests.md) | Auth endpoint E2E tests | 1-2 sessions |
| 04 | [04-auth-migration.md](./workflows/04-auth-migration.md) | Auth module implementation | 2-3 sessions |

### Phase 3: Simple CRUD Domains (Parallel OK)
| Workflow | File | Description | Estimated Effort |
|----------|------|-------------|------------------|
| 05 | [05-tasks-tests.md](./workflows/05-tasks-tests.md) | Tasks E2E tests | 1 session |
| 06 | [06-tasks-migration.md](./workflows/06-tasks-migration.md) | Tasks module | 1 session |
| 07 | [07-calendar-tests.md](./workflows/07-calendar-tests.md) | Calendar E2E tests | 1 session |
| 08 | [08-calendar-migration.md](./workflows/08-calendar-migration.md) | Calendar module | 1 session |
| 09 | [09-folders-tests.md](./workflows/09-folders-tests.md) | Folders E2E tests | 1 session |
| 10 | [10-folders-migration.md](./workflows/10-folders-migration.md) | Folders module | 1 session |

### Phase 4: Medium Complexity Domains
| Workflow | File | Description | Estimated Effort |
|----------|------|-------------|------------------|
| 11 | [11-notes-tests.md](./workflows/11-notes-tests.md) | Notes E2E tests (with streaming) | 1-2 sessions |
| 12 | [12-notes-migration.md](./workflows/12-notes-migration.md) | Notes module + GridFS | 2 sessions |
| 13 | [13-sharing-tests.md](./workflows/13-sharing-tests.md) | Sharing E2E tests | 1 session |
| 14 | [14-sharing-migration.md](./workflows/14-sharing-migration.md) | Sharing module | 1 session |

### Phase 5: High Complexity Domains
| Workflow | File | Description | Estimated Effort |
|----------|------|-------------|------------------|
| 15 | [15-vault-tests.md](./workflows/15-vault-tests.md) | Vault/Files E2E tests | 2 sessions |
| 16 | [16-vault-migration.md](./workflows/16-vault-migration.md) | Vault module + Google Drive | 3 sessions |
| 17 | [17-social-tests.md](./workflows/17-social-tests.md) | Social E2E tests | 2 sessions |
| 18 | [18-social-migration.md](./workflows/18-social-migration.md) | Social module (6 entities) | 3 sessions |

### Phase 6: Supporting & Integration
| Workflow | File | Description | Estimated Effort |
|----------|------|-------------|------------------|
| 19 | [19-websocket-migration.md](./workflows/19-websocket-migration.md) | Socket.IO gateway | 1-2 sessions |
| 20 | [20-supporting-domains.md](./workflows/20-supporting-domains.md) | GPA, Audit, Activity | 1-2 sessions |
| 21 | [21-integration-cutover.md](./workflows/21-integration-cutover.md) | Final integration | 2 sessions |

## AI Agent Instructions

### Before Starting Any Workflow

1. Read this README completely
2. Read the specific workflow file
3. **DO NOT** copy code from workflow files - they contain patterns only
4. **DO** explore the referenced source files to understand current implementation
5. **DO** run existing tests (if any) before making changes
6. **DO** commit after each completed checklist item

### Common Pitfalls to Avoid

1. **ObjectID Handling**: Always use string IDs in service layer, let Mongoose cast to ObjectId
2. **SafeFilter Pattern**: Never bypass QuerySanitizer - it prevents NoSQL injection
3. **Error Codes**: Match exact error response format `{ message, stack? }`
4. **Multi-Database**: AuditLog uses secondary connection, all others use primary
5. **Encryption Fields**: Don't modify encrypted data structure - client handles E2E encryption

### Session Boundaries

Each workflow is designed to fit within a single AI session's context window. If a workflow spans multiple sessions:
- Commit work at each checkpoint
- Next session starts by reading the workflow file and checking git status
- Tests provide continuity between sessions

## Directory Structure

```
docs/migration/
├── README.md                 # This file
├── workflows/
│   ├── 01-foundation-setup.md
│   ├── 02-base-patterns.md
│   ├── ...
│   └── 21-integration-cutover.md
├── references/
│   ├── error-codes.md        # Standard error code reference
│   ├── objectid-patterns.md  # ObjectID handling guide
│   └── test-utilities.md     # Shared test helper docs
└── checklists/
    └── pre-migration.md      # Pre-flight checklist
```

## Current Migration Status

- [ ] Workflow 01: Foundation Setup
- [ ] Workflow 02: Base Patterns
- [ ] Workflow 03: Auth E2E Tests
- [ ] ... (update as completed)

---

**Last Updated**: 2026-02-03
**Migration Lead**: TBD
