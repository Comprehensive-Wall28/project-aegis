# Workflow 16: Vault Module Migration

## Objective
Implement NestJS vault module with chunked uploads and Google Drive integration.

## Prerequisites
- Workflow 15 completed
- Google Drive API credentials available (or mock for testing)

---

## Phase 1: File Metadata Schema

**READ:**
```
backend/src/models/FileMetadata.ts
```

**Key fields:**
- Upload state tracking (pending, uploading, complete, failed)
- Chunk tracking
- Google Drive file ID reference
- Encryption metadata

---

## Phase 2: Google Drive Service

### Step 2.1: Explore Current Implementation

**READ:**
```
backend/src/services/googleDriveService.ts
```

**UNDERSTAND:**
- OAuth token refresh
- Resumable upload API
- Download streaming
- Error handling

### Step 2.2: Create GoogleDriveService

**TASKS:**
1. Create `google-drive.service.ts`
2. Use `googleapis` package
3. Implement:
   - `initResumableUpload(filename, mimeType)`
   - `uploadChunk(uploadUri, chunk, range)`
   - `downloadFile(fileId): ReadableStream`
   - `deleteFile(fileId)`
4. Handle token refresh

---

## Phase 3: Vault Service

### Step 3.1: Explore Current Implementation

**READ:**
```
backend/src/services/vaultService.ts
```

**UNDERSTAND:**
- Upload session management
- Chunk state machine
- Assembly and finalization

### Step 3.2: Create VaultService

**CRITICAL: State machine for uploads**

```
STATES:
- pending: upload-init called
- uploading: first chunk received
- complete: all chunks received, assembled
- failed: error occurred

TRANSITIONS:
- init → pending
- pending + chunk → uploading
- uploading + chunk → uploading
- uploading + complete → complete
- any + error → failed
```

---

## Phase 4: Streaming Controller

### Step 4.1: Fastify Multipart

**For chunk uploads:**
```typescript
@Put('upload-chunk')
async uploadChunk(
  @Req() request: FastifyRequest,
  @Headers('x-upload-id') uploadId: string,
  @Headers('x-chunk-index') chunkIndex: string,
) {
  const data = await request.file();
  return this.vaultService.processChunk(uploadId, parseInt(chunkIndex), data);
}
```

### Step 4.2: Download Streaming

```typescript
@Get('download/:id')
async downloadFile(
  @Param('id') id: string,
  @CurrentUser() user: User,
  @Res({ passthrough: true }) reply: FastifyReply,
) {
  const { stream, metadata } = await this.vaultService.getFileStream(user.id, id);
  
  reply.header('Content-Type', metadata.mimeType);
  reply.header('Content-Disposition', `attachment; filename="${metadata.filename}"`);
  
  return stream;
}
```

---

## Completion Checklist

- [ ] FileMetadata schema
- [ ] GoogleDriveService with all methods
- [ ] VaultService with chunked upload logic
- [ ] VaultController with streaming
- [ ] All Workflow 15 tests passing
- [ ] Code committed

## Files Created

```
backend-nest/src/modules/vault/
├── vault.module.ts
├── vault.controller.ts
├── vault.service.ts
├── file-metadata.schema.ts
├── file-metadata.repository.ts
├── google-drive.service.ts
└── dto/
    ├── init-upload.dto.ts
    └── upload-chunk.dto.ts
```

## Next Workflow
Proceed to [17-social-tests.md](./17-social-tests.md)
