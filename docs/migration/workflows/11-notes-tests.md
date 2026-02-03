# Workflow 11: Notes E2E Tests

## Objective
Write comprehensive E2E tests for notes endpoints including streaming operations.

## Prerequisites
- Auth module working
- Understanding of GridFS streaming

## Scope Boundaries

### IN SCOPE
- Notes CRUD tests
- Folder assignment tests
- Tag operations tests
- Backlink/mention tests
- Media streaming tests

### OUT OF SCOPE
- Notes module implementation
- Real-time collaboration

---

## Phase 1: Explore Notes Domain

### Step 1.1: Map All Note Endpoints

**READ this file:**

```
backend/src/routes/noteRoutes.ts
```

**DOCUMENT all endpoints:**
1. `GET /api/notes` - List notes
2. `POST /api/notes` - Create note
3. `GET /api/notes/:id` - Get note
4. `PUT /api/notes/:id` - Update note
5. `DELETE /api/notes/:id` - Delete note
6. `PUT /api/notes/:id/folder` - Move to folder
7. `GET /api/notes/:id/content` - Get note content (streaming?)
8. `PUT /api/notes/:id/content` - Update content
9. Tag-related endpoints
10. Media endpoints

### Step 1.2: Explore Note Model

**READ these files:**

```
backend/src/models/Note.ts
backend/src/models/NoteFolder.ts
backend/src/models/NoteMedia.ts
```

**DOCUMENT:**
- Note fields (encrypted content reference)
- Folder hierarchy structure
- Media attachment structure
- Backlinks/mentions structure

### Step 1.3: Explore Note Services

**READ these files:**

```
backend/src/services/noteService.ts
backend/src/services/gridfsService.ts
```

**UNDERSTAND:**
- How is note content stored (GridFS)?
- How are media files handled?
- Backlink extraction and storage

---

## Phase 2: Basic CRUD Tests

### Step 2.1: List Notes Tests

```
describe('GET /api/notes', () => {
  describe('Success cases', () => {
    it('should return user notes')
    it('should not return other user notes')
  })

  describe('Filtering', () => {
    it('should filter by folder')
    it('should filter by tag')
    it('should search by title')
    it('should filter pinned notes')
  })

  describe('Sorting', () => {
    it('should sort by updated date')
    it('should sort by created date')
    it('should sort by title')
  })

  describe('Pagination', () => {
    it('should paginate results')
    it('should return correct cursor')
  })
})
```

### Step 2.2: Create Note Tests

```
describe('POST /api/notes', () => {
  describe('Success cases', () => {
    it('should create note with title only')
    it('should create note with full content')
    it('should create note in folder')
    it('should create note with tags')
  })

  describe('Validation', () => {
    it('should reject missing title')
    it('should reject invalid folder id')
  })
})
```

### Step 2.3: Get/Update/Delete Tests

Similar pattern to Tasks workflow.

---

## Phase 3: Folder Operations Tests

### Step 3.1: Folder Assignment Tests

```
describe('PUT /api/notes/:id/folder', () => {
  it('should move note to folder')
  it('should move note to root (null folder)')
  it('should reject invalid folder id')
  it('should reject folder from different user')
})
```

### Step 3.2: Note Folder Tests (if separate routes)

**READ:**
```
backend/src/routes/noteRoutes.ts  # or folderRoutes.ts
```

Test folder CRUD if handled here.

---

## Phase 4: Content Streaming Tests

### Step 4.1: Explore GridFS Pattern

**READ:**
```
backend/src/services/gridfsService.ts
backend/src/controllers/noteController.ts  # content handlers
```

**UNDERSTAND:**
- How is content streamed?
- What headers are set?
- How large content is handled?

### Step 4.2: Content Streaming Tests

```
describe('GET /api/notes/:id/content', () => {
  it('should return note content')
  it('should return correct content-type')
  it('should stream large content')
  it('should return 404 for missing content')
})

describe('PUT /api/notes/:id/content', () => {
  it('should update note content')
  it('should handle large content')
  it('should update content hash')
})
```

---

## Phase 5: Media Operations Tests

### Step 5.1: Explore Media Handling

**READ:**
```
backend/src/models/NoteMedia.ts
backend/src/controllers/noteController.ts  # media handlers
```

### Step 5.2: Media Tests

```
describe('POST /api/notes/:id/media', () => {
  it('should upload media attachment')
  it('should return media metadata')
  it('should reject oversized files')
  it('should reject invalid file types')
})

describe('GET /api/notes/:id/media/:mediaId', () => {
  it('should stream media file')
  it('should return correct content-type')
  it('should return 404 for missing media')
})

describe('DELETE /api/notes/:id/media/:mediaId', () => {
  it('should delete media')
  it('should clean up storage')
})
```

---

## Phase 6: Tags and Backlinks Tests

### Step 6.1: Tag Tests

```
describe('Tags', () => {
  it('should add tags to note')
  it('should remove tags from note')
  it('should list all user tags')
  it('should filter notes by tag')
})
```

### Step 6.2: Backlink Tests

```
describe('Backlinks/Mentions', () => {
  it('should detect mentions in content')
  it('should return backlinks for note')
  it('should update backlinks on content change')
})
```

---

## Completion Checklist

- [ ] All note endpoints documented
- [ ] Basic CRUD tests (20+ cases)
- [ ] Folder operation tests (5+ cases)
- [ ] Content streaming tests (6+ cases)
- [ ] Media tests (6+ cases)
- [ ] Tag tests (4+ cases)
- [ ] Backlink tests (3+ cases)
- [ ] All tests passing against Express

## Test Count Target: 45+

## Files Created

```
backend-nest/test/
├── fixtures/
│   ├── notes.fixture.ts
│   └── note-folders.fixture.ts
└── notes/
    └── notes.e2e-spec.ts
```

## Next Workflow
Proceed to [12-notes-migration.md](./12-notes-migration.md)
