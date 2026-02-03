# Workflow 12: Notes Module Migration

## Objective
Implement NestJS notes module with GridFS support, passing all Workflow 11 tests.

## Prerequisites
- Workflow 11 completed (notes tests passing against Express)
- Understanding of GridFS streaming

---

## Phase 1: Note Models

### Step 1.1: Create Note Schemas

**READ:**
```
backend/src/models/Note.ts
backend/src/models/NoteFolder.ts
backend/src/models/NoteMedia.ts
```

**TASKS:**
1. Create `note.schema.ts`
2. Create `note-folder.schema.ts`
3. Create `note-media.schema.ts`
4. Configure relationships

---

## Phase 2: GridFS Service

### Step 2.1: Explore GridFS Implementation

**READ:**
```
backend/src/services/gridfsService.ts
```

**UNDERSTAND:**
- How GridFS bucket is created
- Upload stream handling
- Download stream handling
- File deletion

### Step 2.2: Create GridFsService

**TASKS:**
1. Create `gridfs.service.ts` in notes module (or shared)
2. Configure GridFS bucket with `@nestjs/mongoose`
3. Implement:
   - `uploadFromStream(filename, stream): Promise<ObjectId>`
   - `downloadToStream(fileId, stream): Promise<void>`
   - `delete(fileId): Promise<void>`

---

## Phase 3: Note Repository & Service

### Step 3.1: Create NoteRepository

**READ:**
```
backend/src/repositories/NoteRepository.ts
backend/src/repositories/NoteFolderRepository.ts
```

### Step 3.2: Create NoteService

**READ:**
```
backend/src/services/noteService.ts
```

**COMPLEX OPERATIONS:**
- Content storage/retrieval via GridFS
- Backlink extraction from content
- Tag management
- Media attachment handling

---

## Phase 4: Streaming Controller

### Step 4.1: Fastify Streaming

**UNDERSTAND:**
- Fastify response streaming differs from Express
- Use `@Res({ passthrough: true })` for stream responses

**EXAMPLE:**
```typescript
@Get(':id/content')
async getContent(
  @Param('id') id: string,
  @CurrentUser() user: User,
  @Res({ passthrough: true }) reply: FastifyReply
) {
  const stream = await this.noteService.getContentStream(user.id, id);
  reply.type('application/octet-stream');
  return stream;  // Fastify handles streaming
}
```

---

## Phase 5: Media Handling

### Step 5.1: Media Upload

**UNDERSTAND multipart handling in Fastify:**
```typescript
import { FastifyRequest } from 'fastify';

@Post(':id/media')
async uploadMedia(
  @Param('id') id: string,
  @Req() request: FastifyRequest,
  @CurrentUser() user: User
) {
  const data = await request.file();
  // Handle file upload via GridFS
}
```

### Step 5.2: Media Streaming

Similar to content streaming.

---

## Completion Checklist

- [ ] Note schemas created (Note, NoteFolder, NoteMedia)
- [ ] GridFsService working
- [ ] NoteRepository with all methods
- [ ] NoteService with content handling
- [ ] Streaming endpoints working
- [ ] Media upload/download working
- [ ] All Workflow 11 tests passing
- [ ] Code committed

## Files Created

```
backend-nest/src/modules/notes/
├── notes.module.ts
├── note.controller.ts
├── note.service.ts
├── note.schema.ts
├── note-folder.schema.ts
├── note-media.schema.ts
├── note.repository.ts
├── note-folder.repository.ts
├── gridfs.service.ts
└── dto/
    ├── create-note.dto.ts
    ├── update-note.dto.ts
    └── upload-media.dto.ts
```

## Next Workflow
Proceed to [13-sharing-tests.md](./13-sharing-tests.md)
