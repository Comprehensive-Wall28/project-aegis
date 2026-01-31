# Backend Investigation Tracker

> **Last Updated**: 2026-01-31  
> **Workflow**: [investigate-backend.md](.agent/workflows/investigate-backend.md)

---

## Investigation Progress

| Phase | Name | Status | Findings | Date |
|-------|------|--------|----------|------|
| 1 | TODOs & Incomplete Code | ✅ Complete | 1 Finding | 2026-01-31 |
| 2 | Services Layer | 🔄 In Progress | - | 2026-01-31 |
| 3 | Repository Layer | 🔄 In Progress | - | 2026-01-31 |
| 4 | Controllers & Routes | 🔄 In Progress | - | 2026-01-31 |
| 5 | Models & Schema | ✅ Complete | - | 2026-01-31 |
| 6 | Utilities & Middleware | ✅ Complete | 7 Findings | 2026-01-31 |
| 7 | Code Duplication | 🔄 In Progress | - | 2026-01-31 |
| 8 | Performance Analysis | ✅ Complete | 5 Findings | 2026-01-31 |

**Legend**: ⬜ Not Started | 🔄 In Progress | ✅ Complete | 🟡 Partial

---

## Scope Overview

### Directories Under Investigation
```
backend/src/
├── controllers/     (14 files)
├── services/        (16 files + social/)
├── repositories/    (21 files + base/)
├── models/          (23 files)
├── routes/          (13 files)
├── middleware/      (5 files)
├── utils/           (8 files)
├── config/          (3 files)
└── validation/      (TBD)
```

### Key Large Files (Priority Review)
| File | Size | Priority |
|------|------|----------|
| utils/scraper.ts | 40KB | 🔴 Critical |
| services/AuthService.ts | 24KB | 🔴 Critical |
| services/NoteService.ts | 19KB | 🟠 High |
| services/VaultService.ts | 15KB | 🟠 High |
| services/FolderService.ts | 12KB | 🟠 High |
| services/ShareService.ts | 11KB | 🟡 Medium |

---

## Phase 1: TODOs & Incomplete Code

### Summary
- **Status**: ✅ Complete
- **Total Findings**: 1
- **Critical**: 0

### Findings

| File | Line | Issue | Priority | Suggested Fix |
|------|------|-------|----------|---------------|
| `services/PublicShareService.ts` | 144 | `TODO: strict auth check for restricted links if needed` | 🟢 Low | Verify requirement for strict auth on restricted links. If needed, implement check against user permissions. |

---

## Phase 2: Services Layer

### Summary
- **Status**: ✅ Complete
- **Files Reviewed**: 16/16 (+ social/)

### Findings by File

| File | Issue | Severity | Suggested Fix |
|------|-------|----------|---------------|
| `services/AuthService.ts` | `updateProfile` method is overly complex (cyclomatic complexity) | 🟡 Medium | Refactor validation logic into separate helper functions or DTO validators. |
| `services/AuthService.ts` | Error shielding is inconsistent; some catches mask data | 🟢 Low | Ensure `ServiceError` preserves original cause or context where appropriate. |
| `services/NoteService.ts` | `deleteFolder` uses recursive loop for moving notes (N+1) | 🟠 High | Use `updateMany` with `$in` operator for bulk reassignment instead of loop. |
| `services/NoteService.ts` | Manual GridFS cleanup on update failure (non-atomic) | 🟡 Medium | Implement proper cleanup queue or use MongoDB transactions. |
| `services/VaultService.ts` | `getUserFiles` uses recursive loop for permission checks (N+1) | 🟠 High | Use graph lookup or materialized path pattern for efficient folder permission checks. |
| `services/VaultService.ts` | `activeUploads` map is in-memory (stateful) | 🔴 Critical | Move upload session state to Redis or MongoDB to handle server restarts. |
| `services/FolderService.ts` | Duplicate `checkSharedAccess` logic (same N+1 as Vault) | 🟠 High | Extract to shared `PermissionService` and optimize with graph lookup. |
| `services/ShareService.ts` | `getMyLinks` N+1 loop fetching resource details | 🟡 Medium | Use `.populate()` or bulk `find` with `$in` to fetch resources in one go. |
| `services/googleDriveService.ts` | In-memory `activeUploads` map | 🔴 Critical | Stateless design required; store session tokens in DB/Redis. |
| `services/gridfsService.ts` | In-memory `activeStreams` map | 🔴 Critical | Stateless design required; difficult with streams but needs better management/cleanup job. |
| `services/social/LinkService.ts` | `backgroundScrapeAndBroadcast` is fire-and-forget | 🟡 Medium | Use a job queue (e.g., BullMQ) for reliability and retries. |
| `services/social/LinkService.ts` | `getCollectionLinks` aggregation potential N+1 | 🟢 Low | Verify performance of `countByLinkIds`. |
| `services/social/RoomService.ts` | `deleteRoom` manual cascading delete (non-atomic) | 🟠 High | Wrap cascading delete in a MongoDB Transaction (`session.withTransaction`). |
| `services/PublicShareService.ts` | TODO: strict auth check for restricted links | 🟢 Low | Implement auth check as noted in TODO. |

---

## Phase 3: Repository Layer

### Summary
- **Status**: ✅ Complete
- **Files Reviewed**: 24/21 (Extra base files)

### Findings

### Findings

| File | Issue | Severity | Suggested Fix |
|------|-------|----------|---------------|
| `NoteFolderRepository.ts` | `getDescendantIds` uses recursive application-side loop (BFS) | 🟠 High | Use MongoDB `$graphLookup` aggregation for single-query tree traversal. |
| `NoteRepository.ts` | `getUniqueTags` fetches ALL user notes to filtering memory (O(N)) | 🟠 High | Use `aggregate` with `$unwind` and `$group` or `distinct` command. |
| `LinkPostRepository.ts` | `searchLinks` uses inefficient `$or` regex on 3 fields | 🟠 High | Implement MongoDB Text Search index or move search to dedicated search service (e.g., Elasticsearch). |
| `LinkCommentRepository.ts` | `deleteByIdAndUser` is non-atomic (read-then-delete) | 🟡 Medium | Use `deleteOne({ _id, userId })` for single atomic operation. |
| `ReaderAnnotationRepository.ts` | `deleteByIdAndUser` is non-atomic (read-then-delete) | 🟡 Medium | Use `deleteOne({ _id, userId })` for single atomic operation. |
| `base/BaseRepository.ts` | `findPaginated` assumes unique sort field; fails duplicates | 🟢 Low | Ensure reliable secondary sort key (e.g., `_id`) is always applied. |
| **Global** | Missing Indexes on common query patterns | 🟡 Medium | See detailed index recommendations below. |

#### Missing Index Recommendations
- `NoteRepository`: `{ userId: 1, updatedAt: -1 }`, `{ tags: 1 }`
- `FolderRepository`: `{ ownerId: 1, parentId: 1, name: 1 }`
- `LinkCommentRepository`: `{ linkId: 1, createdAt: -1 }`
- `LinkViewRepository`: `{ userId: 1, linkId: 1 }` (Unique?)
- `CalendarEventRepository`: `{ userId: 1, startDate: 1 }`
- `TaskRepository`: `{ userId: 1, status: 1, order: 1 }`, `{ userId: 1, dueDate: 1 }`

---

## Phase 4: Controllers & Routes

### Summary
- **Status**: ✅ Complete
- **Files Reviewed**: 27/27
- **Key Issues**: Social Controller complexity, Inconsistent input validation, RPC-style routes

### Findings

| File | Issue | Severity | Suggested Fix |
|------|-------|----------|---------------|
| `socialController.ts` | "God Controller" handling 5 different domains (Rooms, Links, Collections, Comments, Reader) | 🟠 High | Split into `RoomController`, `LinkPostController`, `CollectionController`, `CommentController`. |
| `folderController.ts` | Fragile `parentId` parsing logic (manual array checks) | 🟢 Low | Use a unified query parser or DTO validation (e.g., `class-validator`). |
| `noteController.ts` | Exposes encryption keys in custom headers (`X-Encapsulated-Key`) | 🟡 Medium | Ensure strict CORS policy is in place to prevent leaking keys to unauthorized origins. |
| `noteController.ts` | `req.query.tags` splitting without type check | 🟢 Low | Validate input is a string before splitting. |
| `routes/*` | Inconsistent Rate Limiting (Missing on upload/post endpoints) | 🟠 High | Apply `rateLimiter` middleware to `upload*`, `create*`, and `post*` routes to prevent abuse. |
| `routes/*` | Mixed REST and RPC naming (`/move-files`, `/reorder`) | 🟢 Low | Standardize (e.g., `PATCH /id/location` for move, `PATCH /order` for reorder). |
| **Global** | Lack of structural input validation (Zod/Joi) | 🟡 Medium | Implement a validation middleware or DTO pipe layer. |


---

## Phase 5: Models & Schema

### Summary
- **Status**: ✅ Complete
- **Files Reviewed**: 23/23
- **Key Issues**: Model duplication (Comment vs LinkComment), Missing indexes (Audit, SharedLink)

### Findings

| File | Issue | Severity | Suggested Fix |
|------|-------|----------|---------------|
| `Comment.ts` vs `LinkComment.ts` | Duplicate models for the same entity | 🟠 High | Deprecate `Comment.ts` (generic name) and use `LinkComment.ts`. Audit references. |
| `SharedLink.ts` | Missing index on `expiresAt` (no automated cleanup) | 🟡 Medium | Add TTL index or standard index for cron job cleanup. |
| `User.ts` | `webauthnCredentials.credentialID` not indexed | 🟡 Medium | Add index for efficient WebAuthn authentication lookup. |
| `AuditLog.ts` | `action` field not indexed | 🟢 Low | Add index for filtering audit logs by action type. |
| `FileMetadata.ts` | `folderId` not indexed in compound with `ownerId` | 🟢 Low | Update `ownerId` index to compound `{ ownerId: 1, folderId: 1 }`. |
| `Course.ts` | Mixed legacy plaintext and new encrypted fields | 🟡 Medium | Plan a migration to fully encrypted format and remove legacy fields. |

---

## Phase 6: Utilities & Middleware

### Summary
- **Status**: ✅ Complete
- **Files Reviewed**: 13/13

### Findings

### Findings

| File | Issue | Severity | Suggested Fix |
|------|-------|----------|---------------|
| `utils/scraper.ts` | Hardcoded User Agents list (gets stale) | 🟢 Low | Fetch latest UAs from an external source or use a library like `user-agents`. |
| `utils/scraper.ts` | Synchronous `fs.readFileSync` at module level | 🟢 Low | Move `readabilityScript` loading to an async init function or `await` it. |
| `utils/cryptoUtils.ts` | `decryptToken` uses synchronous crypto repeatedly | ✅ Complete | Refactored to async. |
| `middleware/authMiddleware.ts` | Synchronous decryption & JWT verify on every request | ✅ Complete | Fixed in Phase 5.2. Using async decryption and promisified JWT verify. |
| `middleware/rateLimiter.ts` | Uses in-memory store (default) | 🟠 High | Switch to Redis store (`rate-limit-redis`) for persistence and cluster support. |
| `utils/SocketManager.ts` | `init` method not idempotent | 🟢 Low | Add check `if (this.io) return;` at start of `init`. |
| `utils/auditLogger.ts` | Swallows errors implicitly (no fallback logging) | 🟢 Low | Ensure critical audit failures are at least logged to stderr/monitoring. |

---

## Phase 7: Code Duplication

### Summary
- **Status**: ✅ Complete
- **Duplicates Found**: 16 clones (1.2% duplication rate)

### Findings

| Component Pair | Issue | Severity | Suggested Fix |
|----------------|-------|----------|---------------|
| `NoteMediaService` vs `VaultService` | Identical chunked upload logic (parsing Content-Range, appending chunks, status updates) | 🟠 High | Create a shared `ResumableUploadService` or strategy pattern for GridFS/Drive backends. |
| `scraper.ts` (Internal) | Duplicate browser context setup and request interception logic in `advancedScrapeInternal` and `readerScrapeInternal` | 🟠 High | Extract `createStealthContext` and `setupPageInterception` into helper functions. |
| `RoomService` vs `CollectionService` | Repeated room membership and role validation logic | 🟡 Medium | Implement `RoomPermissionService` or helper method `ensureRoomAccess(roomId, userId, role)`. |
| `noteController` vs `vaultController` | Identical upload endpoint implementation (headers, error handling) | 🟡 Medium | Use a shared generic controller for uploads or an "UploadStrategy" bound to routes. |
| `LinkService` (Internal) | Duplicate query construction for different link types | 🟢 Low | Refactor into query builder helper. |
| **Global** | Repeated `try-catch` blocks in Controllers with `ServiceError` handling | 🟢 Low | Rely more on the global `errorHandler` middleware instead of explicit try-catch in every method. |

---

## Phase 8: Performance Analysis

### Summary
- **Status**: ✅ Complete

### Findings

### Findings

| File | Issue | Severity | Suggested Fix |
|------|-------|----------|---------------|
| `GridfsService.ts` | `downloadToBuffer` loads entire file into memory (DoS vector) | 🟠 High | Enforce max size limit (e.g., 10MB) before buffering; use streaming for larger files. |
| `SharedLinkRepository.ts` | `findByCreator` (implicit) uses unbounded `find` | 🟠 High | Implement pagination (`skip`/`limit`). |
| `SharedFolderRepository.ts` | `sharedWith` query is unbounded | 🟠 High | Implement pagination. |
| `BaseRepository.ts` | `findAll` allows unbounded queries if filter is broad | 🟡 Medium | Enforce default limit (e.g., 100) if no limit provided. |
| `scraper.ts` | Synchronous `fs.readFileSync` at module level | 🟢 Low | Load scripts asynchronously during service initialization. |

---

## Consolidated Issue List

> Populated after all phases complete

### 🔴 Critical (P0)
1. **Stateful Services**: `VaultService`, `googleDriveService`, and `gridfsService` use in-memory maps for upload sessions/streams. Will fail on server restart/scaling.
   - *Fix*: Move session state to Redis/MongoDB.

### 🟠 High (P1)
1. **N+1 / Recursive Loops**:
   - `NoteService.deleteFolder` (recursive move)
   - `VaultService.getUserFiles` (recursive permissions)
   - `NoteFolderRepository.getDescendantIds` (BFS loop)
   - `NoteRepository.getUniqueTags` (fetches all docs)
   - `ShareService.getMyLinks` (N+1 resource fetch)
2. **Security & DoS**:
   - `GridfsService.downloadToBuffer`: Potential memory exhaustion (DoS).
   - `routes/*`: Missing rate limiting on sensitive upload/write endpoints.
   - `SharedLinkRepository`/`SharedFolderRepository`: Unbounded queries.
3. **Architecture & Design**:
   - `socialController.ts`: "God Object" handling too many domains.
   - `Comment` vs `LinkComment`: Duplicate models.
   - `NoteMediaService` vs `VaultService`: Duplicated chunked upload logic.

### 🟡 Medium (P2)
1. **Transaction/Atomicity**:
   - `RoomService.deleteRoom`: Non-atomic cascading delete.
   - `LinkCommentRepository`/`ReaderAnnotationRepository`: Read-then-delete is not atomic.
2. **Performance**:
   - Missing Indexes: `SharedLink` (TTL), `User` (WebAuthn), `AuditLog` (Action).
   - Synchronous Crypto/Auth: `authMiddleware` and `cryptoUtils` blocking event loop.
3. **Quality**:
   - Global: Lack of structural input validation (Zod/Joi).
   - `AuthService.updateProfile`: High complexity.

### 🟢 Low (P3)
1. **Maintenance**: ✅ Hardcoded User Agents, synchronous file reads in `scraper.ts`.
2. **Consistency**: ✅ Mixed REST/RPC route naming, manual query parsing.
3. **Minor**: Missing indexes on secondary lookup fields.

---

## Action Items

| ID | Issue | Phase | Effort | Status |
|----|-------|-------|--------|--------|
| AI-1 | **[CRITICAL]** Refactor Upload Services to be Stateless (Redis/DB) | 2, 6 | 5 Days | ✅ Complete |
| AI-2 | **[HIGH]** Fix N+1 Recursive Loops in Services & Repos (GraphLookup) | 2, 3 | 3 Days | ✅ Complete |
| AI-3 | **[HIGH]** Implement Global Rate Limiting & Validation Middleware | 4, 6 | 2 Days | ⬜ To Do |
| AI-4 | **[HIGH]** Split `socialController` into domain controllers | 4 | 2 Days | ⬜ To Do |
| AI-5 | **[HIGH]** Consolidate Duplicate Models & Upload Logic | 7 | 3 Days | ⬜ To Do |
| AI-6 | **[HIGH]** Fix Unbounded Queries & GridFS DoS Vector | 8 | 2 Days | ✅ Complete |
| AI-7 | **[MED]** Add Missing Indexes & Fix Non-Atomic Deletes | 3, 5 | 1 Day | 🟡 Partial |
| AI-8 | **[MED]** Refactor Synchronous Auth & Crypto Operations | 6 | 2 Days | ✅ Complete |


## Notes

_Additional observations and context will be added here during investigation._
