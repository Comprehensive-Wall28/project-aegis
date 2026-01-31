---
description: Phased investigation of backend for TODOs, maintainability, code duplication, and performance issues
---

# Backend Investigation Workflow

This workflow investigates the backend codebase in **separate phases**, each designed to be completed in a single chat session. Progress is tracked in `BACKEND_INVESTIGATION.md` at project root.

---

## Pre-Investigation: Update Tracking File

Before starting any phase:
1. Open `/home/comprehensive-wall28/codium/aegis/BACKEND_INVESTIGATION.md`
2. Mark the phase as `🔄 In Progress` and note the start date

---

## Phase 1: TODOs & Incomplete Code Scan

**Goal**: Find all TODO comments, FIXME, XXX, incomplete implementations.

**Scope**: All files in `backend/src/`

### Steps:
1. Run grep scan for TODOs:
```bash
grep -rn "TODO\|FIXME\|XXX\|HACK\|BUG\|INCOMPLETE" backend/src/ --include="*.ts"
```

2. Run grep scan for incomplete patterns:
```bash
grep -rn "throw new Error.*not implemented\|// incomplete\|// later\|// temp" backend/src/ --include="*.ts"
```

3. For each result, document in `BACKEND_INVESTIGATION.md`:
   - File path and line number
   - Description of the issue
   - Priority (P0-Critical, P1-High, P2-Medium, P3-Low)
   - Suggested fix

4. Mark Phase 1 as `✅ Complete` with count of findings

---

## Phase 2: Services Layer Investigation

**Goal**: Deep-dive into all service files for quality issues.

**Scope**: `backend/src/services/` (16 files + social/)

### Files to review:
- [ ] AuthService.ts (24KB - largest, highest priority)
- [ ] NoteService.ts (19KB)
- [ ] VaultService.ts (15KB)
- [ ] FolderService.ts (12KB)
- [ ] ShareService.ts (11KB)
- [ ] googleDriveService.ts (11KB)
- [ ] LinkPreviewService.ts (10KB)
- [ ] TaskService.ts (10KB)
- [ ] gridfsService.ts (9KB)
- [ ] NoteMediaService.ts (6KB)
- [ ] GPAService.ts (6KB)
- [ ] CalendarService.ts (5.5KB)
- [ ] PublicShareService.ts (5KB)
- [ ] AuditService.ts (2KB)
- [ ] MentionService.ts (1KB)
- [ ] social/ subdirectory (7 files)

### Per-file checklist:
- [ ] Error handling consistency
- [ ] Code duplication with other services
- [ ] Missing input validation
- [ ] Missing audit logging
- [ ] N+1 query patterns
- [ ] Unbounded queries (missing limits)
- [ ] Large functions (>50 lines) that should be split
- [ ] Hardcoded values that should be config

4. Document all findings with severity

---

## Phase 3: Repository Layer Investigation

**Goal**: Audit data access patterns and query efficiency.

**Scope**: `backend/src/repositories/` (21 files)

### Files to review:
- [ ] NoteRepository.ts
- [ ] FileMetadataRepository.ts
- [ ] LinkPostRepository.ts
- [ ] TaskRepository.ts
- [ ] LinkViewRepository.ts
- [ ] ReaderAnnotationRepository.ts
- [ ] LinkCommentRepository.ts
- [ ] NoteFolderRepository.ts
- [ ] UserRepository.ts
- [ ] FolderRepository.ts
- [ ] LinkMetadataRepository.ts
- [ ] CalendarEventRepository.ts
- [ ] ReaderContentCacheRepository.ts
- [ ] CourseRepository.ts
- [ ] RoomRepository.ts
- [ ] CollectionRepository.ts
- [ ] AuditLogRepository.ts
- [ ] SharedLinkRepository.ts
- [ ] SharedFolderRepository.ts
- [ ] SharedFileRepository.ts
- [ ] base/ (3 files)

### Per-file checklist:
- [ ] Missing indexes (common query patterns not indexed)
- [ ] Inefficient aggregations
- [ ] Missing projections (selecting all fields when only need a few)
- [ ] Inconsistent ObjectId handling
- [ ] Missing error handling for DB ops
- [ ] Transaction usage where needed

---

## Phase 4: Controllers & Routes Investigation

**Goal**: Audit API layer for consistency and security.

**Scope**: `backend/src/controllers/` (14 files) + `backend/src/routes/` (13 files)

### Checklist:
- [ ] Response format consistency
- [ ] HTTP status code usage
- [ ] Missing input validation
- [ ] Inconsistent error responses
- [ ] Missing rate limiting on sensitive endpoints
- [ ] Missing audit logging on destructive actions
- [ ] Route naming convention consistency
- [ ] Authorization checks consistency

---

## Phase 5: Models & Schema Investigation

**Goal**: Audit database schema design.

**Scope**: `backend/src/models/` (23 files)

### Checklist:
- [ ] Missing indexes on query-heavy fields
- [ ] Missing virtuals for computed fields
- [ ] Schema validation completeness
- [ ] Timestamp handling consistency (createdAt/updatedAt)
- [ ] Soft delete vs hard delete consistency
- [ ] Reference consistency (populated vs ID)
- [ ] Schema options (timestamps, versionKey)

---

## Phase 6: Utilities & Middleware Investigation

**Goal**: Audit shared code for quality and reusability.

**Scope**: 
- `backend/src/utils/` (8 files)
- `backend/src/middleware/` (5 files)

### Utilities to review:
- [ ] scraper.ts (40KB - massive, needs review)
- [ ] stealth.ts (6KB)
- [ ] auditLogger.ts (4KB)
- [ ] cryptoUtils.ts (2KB)
- [ ] SocketManager.ts (1.5KB)
- [ ] logger.ts
- [ ] errors.ts
- [ ] regexUtils.ts

### Middleware to review:
- [ ] csrfMiddleware.ts
- [ ] authMiddleware.ts
- [ ] controllerWrapper.ts
- [ ] errorHandler.ts
- [ ] rateLimiter.ts

---

## Phase 7: Code Duplication Analysis

**Goal**: Identify similar code patterns across files.

### Steps:
1. Compare service methods for similar patterns
2. Check for utility functions that should be extracted
3. Look for repeated:
   - Error handling blocks
   - Authentication checks
   - Query building logic
   - Response formatting
   - Validation logic

```bash
# Use jscpd for duplication detection
npx jscpd backend/src --min-lines 5 --format "typescript" --reporters console
```

---

## Phase 8: Performance Analysis

**Goal**: Identify performance bottlenecks.

### Checklist:
- [ ] Unbounded queries without pagination
- [ ] Missing database indexes
- [ ] Large file reads without streaming
- [ ] Synchronous operations that could be async
- [ ] Missing caching opportunities
- [ ] N+1 query patterns
- [ ] Memory leaks (event listener accumulation)
- [ ] Heavy regex operations

---

## Post-Investigation: Summary & Prioritization

After all phases complete:
1. Create prioritized issue list in `BACKEND_INVESTIGATION.md`
2. Group by category (Critical, High, Medium, Low)
3. Estimate effort for each fix
4. Create action items with assignable tasks

---

## How to Run Each Phase

Each phase should be run in a **separate chat session**:

1. Start a new chat
2. Reference this workflow: `/investigate-backend`
3. Specify which phase: "Run Phase X of backend investigation"
4. The agent will:
   - Update tracking file status
   - Execute phase-specific checks
   - Document findings
   - Update tracking file with results
