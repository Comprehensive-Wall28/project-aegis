---
description: Migration workflow for Social, Folder and Vault parts from old backend to NestJS
---

# 🔄 Aegis Part-by-Part Migration Workflow

This workflow guides the migration of specific functional parts (Social, Folder, Vault) from the legacy Express backend to the new NestJS backend.

## 📝 Core Requirements

For every migrated part, the agent MUST follow these rules:

1.  **Exact API Routes:** The API routes (paths and methods) must be identical to the old backend (e.g., if it was `GET /api/social/rooms`, it must stay `GET /api/social/rooms`).
2.  **Data Parity:** Maintain the exact same data structure for database insertions and repository return values.
3.  **Full Functionality:** Port ALL logic, edge cases, and helper functions. DO NOT skip any internal functionality.
4.  **NestJS Best Practices:** Respect NestJS conventions (Modules, Services, Controllers, DTOs, Guards, Injectables).
5.  **No Placeholders:** Never leave `// TODO` or partial implementations. Every file must be fully functional.

## 🚀 Execution Phases

### Phase 1: Social Module
**Scope:** Rooms, Invites, Links, Collections, Comments, Reader Mode, Proxy Image.
**Legacy Reference:** 
- Routes: `/backend/src/routes/socialRoutes.ts`, `shareRoutes.ts`, `mentionRoutes.ts`
- Services: `/backend/src/services/social/*`, `ShareService.ts`, `MentionService.ts`
- Controllers: `/backend/src/controllers/socialController.ts`

**Steps:**
1.  Check `PART_BY_PART_MIGRATION.md` for the list of routes.
2.  Migrate Schemas/Models to NestJS decorators.
3.  Implement Services with full business logic parity.
4.  Implement Controllers with exact route matching.
5.  Update `PART_BY_PART_MIGRATION.md` after each step.

### Phase 2: Folder Module
**Scope:** Folder CRUD, and moving files between folders.
**Legacy Reference:**
- Routes: `/backend/src/routes/folderRoutes.ts`
- Services: `/backend/src/services/FolderService.ts`
- Controllers: `/backend/src/controllers/folderController.ts`

**Steps:**
1.  Verify existing implementation in `backend-nest/src/modules/folders`.
2.  Identify missing functionality compared to the legacy backend.
3.  Fix/Implement parity for all routes and service methods.
4.  Update `PART_BY_PART_MIGRATION.md`.

### Phase 3: Vault Module
**Scope:** GridFS streaming uploads, chunking, file management, storage stats.
**Legacy Reference:**
- Routes: `/backend/src/routes/vaultRoutes.ts`
- Services: `/backend/src/services/VaultService.ts`, `gridfsService.ts`
- Controllers: `/backend/src/controllers/vaultController.ts`

**Steps:**
1.  Verify existing implementation in `backend-nest/src/modules/vault`.
2.  Ensure GridFS streaming logic matches the legacy implementation exactly.
3.  Implement any missing routes (stats, chunking parity).
4.  Update `PART_BY_PART_MIGRATION.md`.

## 🧪 Verification Protocol

After migrating each phase:
1.  Run `npm run build` in `backend-nest` to ensure no TypeScript errors.
2.  Write/Update unit tests for the new services and controllers.
3.  Run E2E tests to verify API parity.
4.  Cross-check with the old backend's Postman/Insomnia/tests if available.

---
*Follow this workflow in a NEW chat session for each phase.*
