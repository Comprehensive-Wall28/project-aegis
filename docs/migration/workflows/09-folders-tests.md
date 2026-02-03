# Workflow 09: Folders E2E Tests

## Objective
Write E2E tests for folder endpoints (used for organizing files and notes).

## Prerequisites
- Auth module working

---

## Phase 1: Explore Folders Domain

### Step 1.1: Map Endpoints

**READ:**
```
backend/src/routes/folderRoutes.ts
backend/src/controllers/folderController.ts
backend/src/services/folderService.ts
backend/src/models/Folder.ts
```

**Expected endpoints:**
- `GET /api/folders` - List folders (flat or tree)
- `POST /api/folders` - Create folder
- `GET /api/folders/:id` - Get folder
- `PUT /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder
- `PUT /api/folders/:id/move` - Move folder (change parent)
- `PUT /api/folders/move-files` - Move files between folders

---

## Phase 2: Hierarchical Tests

### Tree Structure Tests
```
describe('Folder hierarchy', () => {
  it('should create nested folders')
  it('should return folder tree')
  it('should move folder to different parent')
  it('should prevent circular references')
  it('should cascade delete children')
})
```

### File Organization Tests
```
describe('File organization', () => {
  it('should list files in folder')
  it('should move files to folder')
  it('should move files to root')
})
```

---

## Completion Checklist
- [ ] Hierarchy tests (5+ cases)
- [ ] CRUD tests (similar to Tasks)
- [ ] File organization tests
- [ ] 25+ tests passing against Express

## Next Workflow
Proceed to [10-folders-migration.md](./10-folders-migration.md)
