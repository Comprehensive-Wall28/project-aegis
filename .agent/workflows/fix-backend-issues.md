---
description: Phased remediation workflow to address backend issues identified in BACKEND_INVESTIGATION.md
---

# Backend Remediation Workflow

This workflow addresses the issues prioritized in `BACKEND_INVESTIGATION.md`. It is designed to be run in **small, manageable sessions** to ensure high quality and stability.

---

## Pre-Requisites
1. **Always** start a new chat for each phase.
2. **Always** check `BACKEND_INVESTIGATION.md` for the latest status before starting.
3. **Always** run relevant tests before and after changes.

---

## Phase 1: Critical Reliability & Security
**Goal**: Make services stateless and prevent DoS vectors.

### Step 1.1: Stateless Upload Services (AI-1)
- **Problem**: `VaultService`, `googleDriveService`, `gridfsService` use in-memory maps for uploads.
- **Action**:
  - Implement Redis or MongoDB-based session store for uploads.
  - Refactor `gridfsService` to track streams without in-memory maps if possible, or use a job queue for cleanup.
- **Target Files**: `VaultService.ts`, `googleDriveService.ts`, `gridfsService.ts`.

### Step 1.2: Fix DoS Vectors & Unbounded Queries (AI-6)
- **Problem**: `GridfsService.downloadToBuffer` loads full files; Repositories have unbounded finds.
- **Action**:
  - Enforce max size for `downloadToBuffer`.
  - Add default pagination/limits to `SharedLinkRepository`, `SharedFolderRepository`.
- **Target Files**: `gridfsService.ts`, `SharedLinkRepository.ts`.

---

## Phase 2: High-Priority Performance (N+1 Fixes)
**Goal**: Eliminate recursive application-level loops and N+1 queries.

### Step 2.1: Graph Lookup Implementation (AI-2)
- **Problem**: Recursive loops for folder operations.
- **Action**:
  - Replace recursive `getDescendantIds` in `NoteFolderRepository` with `$graphLookup`.
  - Optimize `VaultService.getUserFiles` permission checks.
  - Optimize `NoteService.deleteFolder` note moving.
- **Target Files**: `NoteFolderRepository.ts`, `VaultService.ts`, `NoteService.ts`.

### Step 2.2: Repository Optimization (AI-2)
- **Problem**: Fetching all docs to filter in memory.
- **Action**:
  - Optimize `NoteRepository.getUniqueTags` using aggregation.
  - Fix `ShareService.getMyLinks` N+1 loop.
- **Target Files**: `NoteRepository.ts`, `ShareService.ts`.

---

## Phase 3: Architectural Refactoring
**Goal**: Reduce complexity and improve maintainability of Controllers.

### Step 3.1: Social Controller Split (AI-4)
- **Problem**: `socialController.ts` is a God Object.
- **Action**:
  - Split into `RoomController`, `LinkPostController`, `CollectionController`, `CommentController`.
  - Update `SocialModule` to register new controllers.
- **Target Files**: `socialController.ts`, `backend/src/controllers/`.

### Step 3.2: Middleware & Validation (AI-3)
- **Problem**: Inconsistent rate limiting and validation.
- **Action**:
  - Apply `rateLimiter` to all write/mutation endpoints in routes.
  - Create a validation pipe/middleware (using Zod or Class-Validator).
- **Target Files**: `routes/*`, `middleware/validationMiddleware.ts`.

---

## Phase 4: Code Deduplication
**Goal**: Consolidate redundant logic and models.

### Step 4.1: Model Consolidation (AI-5)
- **Problem**: `Comment` vs `LinkComment`.
- **Action**:
  - Deprecate `Comment` model.
  - Migrate any usages to `LinkComment`.
- **Target Files**: `Comment.ts`, `LinkComment.ts`.

### Step 4.2: Upload Logic Unification (AI-5)
- **Problem**: `NoteMediaService` duplications `VaultService` upload logic.
- **Action**:
  - Extract shared upload logic into a Strategy pattern or shared helper.
- **Target Files**: `NoteMediaService.ts`, `VaultService.ts`.

---

## Phase 5: Data Integrity & Async Ops
**Goal**: Ensure atomicity and non-blocking operations.

### Step 5.1: Atomic Operations (AI-7)
- **Problem**: Non-atomic deletes & Missing Indexes.
- **Action**:
  - Implement Transaction for `RoomService.deleteRoom`.
  - Use atomic `deleteOne` in repositories.
  - Add missing indexes (TTL for SharedLink, User WebAuthn, Audit Action).
- **Target Files**: `RoomService.ts`, `NoteRepository.ts`, `SharedLink.ts`.

### Step 5.2: Async Crypto (AI-8)
- **Problem**: Synchronous crypto blocking event loop.
- **Action**:
  - Refactor `authMiddleware` to use async verification if possible/needed.
  - Ensure `cryptoUtils` uses async methods for high-throughput paths.
- **Target Files**: `authMiddleware.ts`, `cryptoUtils.ts`.

---

## Phase 6: Maintenance & Cleanup
**Goal**: Low priority fixes and technical debt.

### Step 6.1: Scraper & Misc Cleanup
- **Problem**: Hardcoded User Agents, Sync FS reads.
- **Action**:
  - Externalize User Agents list.
  - Fix sync `fs.readFileSync` in scraper.
  - Standardize route naming (REST vs RPC) where feasible.
- **Target Files**: `scraper.ts`, `routes/*`.

---

## How to Run
1. Start a new chat.
2. Say: "Run Phase X.Y of backend remediation".
3. The agent will execute the specific step and update `BACKEND_INVESTIGATION.md` upon completion.
