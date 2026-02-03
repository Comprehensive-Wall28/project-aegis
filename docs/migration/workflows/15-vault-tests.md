# Workflow 15: Vault/Files E2E Tests

## Objective
Write E2E tests for the file vault system including chunked uploads and Google Drive integration.

## Prerequisites
- Auth module working
- Understanding of chunked upload protocols

---

## Phase 1: Explore Vault Domain

### Step 1.1: Map Endpoints

**READ:**
```
backend/src/routes/vaultRoutes.ts
backend/src/controllers/vaultController.ts
backend/src/services/vaultService.ts
backend/src/services/googleDriveService.ts
backend/src/models/FileMetadata.ts
backend/src/models/Folder.ts
```

**Expected endpoints:**
- `POST /api/vault/upload-init` - Initialize chunked upload
- `PUT /api/vault/upload-chunk` - Upload file chunk
- `POST /api/vault/upload-complete` - Finalize upload
- `GET /api/vault/files` - List files
- `GET /api/vault/files/:id` - Get file metadata
- `GET /api/vault/download/:id` - Download file (streaming)
- `DELETE /api/vault/files/:id` - Delete file

---

## Phase 2: Chunked Upload Tests

### Step 2.1: Explore Chunked Upload Flow

**UNDERSTAND the state machine:**
1. `upload-init` → returns uploadId, sets status to 'pending'
2. `upload-chunk` × N → each chunk stored, position tracked
3. `upload-complete` → chunks assembled, uploaded to Google Drive

### Step 2.2: Upload Flow Tests

```
describe('Chunked upload flow', () => {
  describe('POST /api/vault/upload-init', () => {
    it('should initialize upload session')
    it('should return upload ID')
    it('should validate file metadata')
    it('should enforce size limits')
  })

  describe('PUT /api/vault/upload-chunk', () => {
    it('should accept chunk with valid upload ID')
    it('should reject chunk without prior init')
    it('should track chunk position')
    it('should handle out-of-order chunks')
    it('should validate chunk size')
  })

  describe('POST /api/vault/upload-complete', () => {
    it('should finalize complete upload')
    it('should reject incomplete upload')
    it('should create file metadata')
    it('should return file info')
  })
})
```

---

## Phase 3: File Operations Tests

### Step 3.1: List/Get Tests

```
describe('GET /api/vault/files', () => {
  it('should list user files')
  it('should filter by folder')
  it('should sort by various fields')
  it('should paginate results')
})

describe('GET /api/vault/files/:id', () => {
  it('should return file metadata')
  it('should not return other user files')
})
```

### Step 3.2: Download Tests

```
describe('GET /api/vault/download/:id', () => {
  it('should stream file content')
  it('should set correct content-type')
  it('should set content-disposition')
  it('should handle large files')
  it('should reject unauthorized access')
})
```

### Step 3.3: Delete Tests

```
describe('DELETE /api/vault/files/:id', () => {
  it('should delete file metadata')
  it('should delete from Google Drive')
  it('should handle already deleted')
})
```

---

## Phase 4: Google Drive Mock

### Step 4.1: Create Mock

For testing, mock Google Drive responses:

```typescript
// test/mocks/google-drive.mock.ts
export const mockGoogleDrive = {
  uploadFile: jest.fn().mockResolvedValue({ id: 'mock-drive-id' }),
  downloadFile: jest.fn().mockImplementation(() => {
    return Readable.from(Buffer.from('mock file content'));
  }),
  deleteFile: jest.fn().mockResolvedValue(undefined),
};
```

---

## Completion Checklist
- [ ] Chunked upload tests (12+ cases)
- [ ] File CRUD tests (10+ cases)
- [ ] Download streaming tests (5+ cases)
- [ ] Google Drive mocked appropriately
- [ ] 30+ tests passing against Express

## Next Workflow
Proceed to [16-vault-migration.md](./16-vault-migration.md)
