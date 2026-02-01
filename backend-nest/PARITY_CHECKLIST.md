# Express to NestJS Parity Checklist

> **Purpose:** Track systematic comparison of every component between Express and NestJS backends to ensure absolute API parity before optimization.
>
> **Last Updated:** 2026-02-01
>
> **How to Use:** Each agent session should pick ONE unchecked section, compare in detail, mark sub-items, and update this file.

## Legend

- ✅ = Fully matched, no issues
- ⚠️ = Matched with minor differences (documented)
- ❌ = Missing or critical mismatch
- 🔄 = In progress
- ⬜ = Not started

---

## Quick Stats

| Category | Express | NestJS | Parity |
|----------|---------|--------|--------|
| Controllers | 14 | 12 | ⬜ |
| Services | 20 | ~20 | ⬜ |
| Repositories | 19 | ~18 | ⬜ |
| Schemas/Models | 22 | 18 | ⬜ |
| Middleware | 4 | 3 | ⬜ |
| Utils | 9 | 7 | ⬜ |

---

## 1. Controllers / Routes

### 1.1 Auth Module
- ⬜ **authController.ts** → **auth.controller.ts**
  - ⬜ `POST /login` - login()
  - ⬜ `POST /register` - register()
  - ⬜ `POST /logout` - logout()
  - ⬜ `GET /profile` - getProfile()
  - ⬜ `PUT /profile` - updateProfile()
  - ⬜ `GET /csrf-token` - getCsrfToken()
  - ⬜ Auth guards match
  - ⬜ CSRF protection match
  - ⬜ Response format match

### 1.2 Tasks Module
- ⬜ **taskController.ts** → **tasks.controller.ts**
  - ⬜ `GET /` - getTasks() / findAll()
  - ⬜ `GET /upcoming` - getUpcomingTasks() / findUpcoming()
  - ⬜ `POST /` - createTask() / create()
  - ⬜ `PUT /reorder` - reorderTasks() / reorder() ⚠️ HTTP method check
  - ⬜ `PUT /:id` - updateTask() / update()
  - ⬜ `DELETE /:id` - deleteTask() / remove()
  - ⬜ Query parameters match (status, priority, etc.)
  - ⬜ Pagination support match

### 1.3 Notes Module
- ⬜ **noteController.ts** → **notes.controller.ts**
  - ⬜ `GET /` - getNotes() / findAll()
  - ⬜ `GET /:id` - getNote() / findOne()
  - ⬜ `POST /` - createNote() / create()
  - ⬜ `PUT /:id` - updateNote() / update()
  - ⬜ `DELETE /:id` - deleteNote() / remove()
  - ⬜ `POST /:id/move` - moveNote() / move()
  - ⬜ Folder association handling
  - ⬜ Media handling endpoints

### 1.4 Folders Module
- ⬜ **folderController.ts** → **folders.controller.ts**
  - ⬜ `GET /` - getFolders() / findAll()
  - ⬜ `GET /:id` - getFolder() / findOne()
  - ⬜ `POST /` - createFolder() / create()
  - ⬜ `PUT /:id` - updateFolder() / update()
  - ⬜ `DELETE /:id` - deleteFolder() / remove()
  - ⬜ `PUT /reorder` - reorderFolders() / reorder()
  - ⬜ Nested folder support

### 1.5 Calendar Module
- ⬜ **calendarController.ts** → **calendar.controller.ts**
  - ⬜ `GET /` - getEvents() / findAll()
  - ⬜ `GET /:id` - getEvent() / findOne()
  - ⬜ `POST /` - createEvent() / create()
  - ⬜ `PUT /:id` - updateEvent() / update()
  - ⬜ `DELETE /:id` - deleteEvent() / remove()
  - ⬜ Date range filtering
  - ⬜ Recurring events

### 1.6 GPA Module
- ⬜ **gpaController.ts** → **gpa.controller.ts**
  - ⬜ `GET /courses` - getCourses() / findAll()
  - ⬜ `POST /courses` - createCourse() / create()
  - ⬜ `PUT /courses/:id` - updateCourse() / update()
  - ⬜ `DELETE /courses/:id` - deleteCourse() / remove()
  - ⬜ `GET /calculate` - calculateGPA() / calculate()
  - ⬜ GPA calculation logic match

### 1.7 Vault Module
- ⬜ **vaultController.ts** → **vault.controller.ts**
  - ⬜ `GET /files` - getFiles() / findAll()
  - ⬜ `GET /files/:id` - getFile() / findOne()
  - ⬜ `POST /upload` - uploadFile() / upload()
  - ⬜ `GET /download/:id` - downloadFile() / download()
  - ⬜ `DELETE /files/:id` - deleteFile() / remove()
  - ⬜ GridFS streaming match
  - ⬜ File encryption match

### 1.8 Social Module
- ⬜ **socialController.ts** → **social.controller.ts**
  - ⬜ Room endpoints
    - ⬜ `GET /rooms` - getRooms()
    - ⬜ `POST /rooms` - createRoom()
    - ⬜ `PUT /rooms/:id` - updateRoom()
    - ⬜ `DELETE /rooms/:id` - deleteRoom()
  - ⬜ Link endpoints
    - ⬜ `GET /links` - getLinks()
    - ⬜ `POST /links` - createLink()
    - ⬜ `DELETE /links/:id` - deleteLink()
  - ⬜ Comment endpoints
    - ⬜ `GET /links/:id/comments` - getComments()
    - ⬜ `POST /links/:id/comments` - addComment()
  - ⬜ Collection endpoints
    - ⬜ `GET /collections` - getCollections()
    - ⬜ `POST /collections` - createCollection()
  - ⬜ Reader endpoints
    - ⬜ `GET /reader/:linkId` - getReaderContent()

### 1.9 Activity Module
- ⬜ **activityController.ts** → **activity.controller.ts**
  - ⬜ `GET /dashboard` - getDashboard() / getDashboard()
  - ⬜ Activity aggregation logic

### 1.10 Audit Module
- ⬜ **auditController.ts** → **activity.controller.ts** (merged)
  - ⬜ `GET /logs` - getAuditLogs()
  - ⬜ `GET /logs/:id` - getAuditLog()
  - ⬜ Filtering and pagination

### 1.11 Share Module ❌ MISSING
- ❌ **shareController.ts** → **[NOT CREATED]**
  - ❌ `POST /file` - shareFile()
  - ❌ `POST /folder` - shareFolder()
  - ❌ `GET /shared-with-me` - getSharedWithMe()
  - ❌ `DELETE /:id` - revokeShare()
  - ❌ Permission levels handling

### 1.12 Public Share Module ❌ MISSING
- ❌ **publicShareController.ts** → **[NOT CREATED]**
  - ❌ `POST /create` - createPublicLink()
  - ❌ `GET /:token` - getPublicContent()
  - ❌ `DELETE /:id` - revokePublicLink()
  - ❌ Expiration handling
  - ❌ Password protection

### 1.13 Mention Module ⚠️ PARTIAL
- ⚠️ **mentionController.ts** → **[NO DEDICATED CONTROLLER]**
  - ⬜ `GET /users/search` - searchUsers()
  - ⬜ Service exists in common/services/mention.service.ts

### 1.14 Link Preview Module
- ⬜ **linkPreviewController.ts** → **scraper.controller.ts**
  - ⬜ `POST /preview` - getPreview() / scrape()
  - ⬜ Metadata extraction match
  - ⬜ Image proxy match

---

## 2. Services

### 2.1 Core Services
- ⬜ **AuthService**
  - ⬜ login() - JWT generation
  - ⬜ register() - password hashing
  - ⬜ validateUser()
  - ⬜ Token refresh logic

- ⬜ **TaskService**
  - ⬜ getTasks() / findAll()
  - ⬜ createTask() / create()
  - ⬜ updateTask() / update()
  - ⬜ deleteTask() / remove()
  - ⬜ reorderTasks() / reorder()
  - ⬜ Audit logging ❌ CHECK

- ⬜ **NoteService**
  - ⬜ CRUD operations
  - ⬜ Folder associations
  - ⬜ Media handling
  - ⬜ Audit logging

- ⬜ **FolderService**
  - ⬜ CRUD operations
  - ⬜ Nested folder logic
  - ⬜ Permission cascading
  - ⬜ Audit logging

- ⬜ **CalendarService**
  - ⬜ CRUD operations
  - ⬜ Date range queries
  - ⬜ Recurring events

- ⬜ **GPAService**
  - ⬜ Course CRUD
  - ⬜ GPA calculation algorithm

- ⬜ **VaultService**
  - ⬜ File upload/download
  - ⬜ Encryption/decryption
  - ⬜ GridFS integration

### 2.2 Social Services
- ⬜ **RoomService** → **social.service.ts**
- ⬜ **LinkService** → **link.service.ts**
- ⬜ **CommentService** → **comment.service.ts**
- ⬜ **CollectionService** → **collection.repository.ts**
- ⬜ **ReaderService** → **reader.service.ts**
- ⬜ **accessHelpers** → **utils/link-access.helper.ts**

### 2.3 Missing Services ❌
- ❌ **ShareService** - Not migrated
- ❌ **PublicShareService** - Not migrated
- ❌ **NoteMediaService** - Not migrated

---

## 3. Repositories

### 3.1 Migrated Repositories
- ⬜ **TaskRepository** → task.repository.ts
- ⬜ **NoteRepository** → note.repository.ts
- ⬜ **NoteFolderRepository** → note-folder.repository.ts
- ⬜ **FolderRepository** → folders.repository.ts
- ⬜ **CalendarEventRepository** → calendar.repository.ts
- ⬜ **CourseRepository** → gpa.repository.ts
- ⬜ **FileMetadataRepository** → vault.repository.ts
- ⬜ **UserRepository** → users.repository.ts
- ⬜ **AuditLogRepository** → (via schema)
- ⬜ **CollectionRepository** → collection.repository.ts
- ⬜ **LinkPostRepository** → link-post.repository.ts
- ⬜ **LinkCommentRepository** → link-comment.repository.ts
- ⬜ **LinkMetadataRepository** → link-metadata.repository.ts
- ⬜ **LinkViewRepository** → link-view.repository.ts
- ⬜ **RoomRepository** → social.repository.ts
- ⬜ **ReaderAnnotationRepository** → reader-annotation.repository.ts
- ⬜ **ReaderContentCacheRepository** → reader-content-cache.repository.ts

### 3.2 Missing Repositories ❌
- ❌ **SharedFileRepository** - Not migrated
- ❌ **SharedLinkRepository** - Not migrated

### 3.3 Base Repository
- ⬜ **BaseRepository** comparison
  - ⬜ sanitizeQuery() method
  - ⬜ safeFilter patterns
  - ⬜ Transaction support

---

## 4. Schemas / Models

### 4.1 Migrated Schemas
| Express Model | NestJS Schema | Status |
|--------------|---------------|--------|
| AuditLog | audit-log.schema | ⬜ |
| CachedImage | cached-image.schema | ⬜ |
| CalendarEvent | calendar-event.schema | ⬜ |
| Collection | collection.schema | ⬜ |
| Course | course.schema | ⬜ |
| FileMetadata | vault-file.schema | ⬜ |
| Folder | folder.schema | ⬜ |
| LinkComment | link-comment.schema | ⬜ |
| LinkMetadata | link-metadata.schema | ⬜ |
| LinkPost | link-post.schema | ⬜ |
| LinkView | link-view.schema | ⬜ |
| Note | note.schema | ⬜ |
| NoteFolder | note-folder.schema | ⬜ |
| ReaderAnnotation | reader-annotation.schema | ⬜ |
| ReaderContentCache | reader-content-cache.schema | ⬜ |
| Room | room.schema | ⬜ |
| Task | task.schema | ⬜ |
| User | user.schema | ⬜ |

### 4.2 Missing Schemas ❌
| Express Model | NestJS Schema | Status |
|--------------|---------------|--------|
| Comment | ❌ | Missing |
| NoteMedia | ❌ | Missing |
| SharedFile | ❌ | Missing |
| SharedLink | ❌ | Missing |

---

## 5. Utils

| Express Util | NestJS Equivalent | Status |
|-------------|-------------------|--------|
| SocketManager | websocket.gateway | ⬜ |
| auditLogger | audit.service | ⬜ |
| cryptoUtils | common/utils/cryptoUtils | ⬜ |
| errors | all-exceptions.filter | ⬜ |
| logger | nestjs-pino | ⬜ |
| regexUtils | common/utils/regex.utils | ⬜ |
| scraper | scraper.service | ⬜ |
| stealth | social/utils/stealth | ⬜ |
| userAgents | ❌ | Missing |

---

## 6. Middleware / Guards

| Express | NestJS | Status |
|---------|--------|--------|
| authMiddleware | jwt-auth.guard + jwt.strategy | ⬜ |
| customCsrf | csrf.guard + csrf-token.decorator | ⬜ |
| errorHandler | all-exceptions.filter | ⬜ |
| controllerWrapper | Built-in NestJS | ✅ |
| - | rate-limiter.middleware | ✅ New |

---

## 7. Audit Logging Coverage

### Critical Methods Requiring Audit Logging
Check each mutation method has corresponding audit logging in NestJS:

#### Tasks
- ⬜ createTask → TASK_CREATE
- ⬜ updateTask → TASK_UPDATE
- ⬜ deleteTask → TASK_DELETE
- ⬜ reorderTasks → TASK_REORDER

#### Notes
- ⬜ createNote → NOTE_CREATE
- ⬜ updateNote → NOTE_UPDATE
- ⬜ deleteNote → NOTE_DELETE
- ⬜ moveNote → NOTE_MOVE

#### Folders
- ⬜ createFolder → FOLDER_CREATE
- ⬜ updateFolder → FOLDER_UPDATE
- ⬜ deleteFolder → FOLDER_DELETE

#### Calendar
- ⬜ createEvent → CALENDAR_CREATE
- ⬜ updateEvent → CALENDAR_UPDATE
- ⬜ deleteEvent → CALENDAR_DELETE

#### Vault
- ⬜ uploadFile → FILE_UPLOAD
- ⬜ deleteFile → FILE_DELETE
- ⬜ downloadFile → FILE_DOWNLOAD

#### Auth
- ⬜ login → AUTH_LOGIN
- ⬜ register → AUTH_REGISTER
- ⬜ logout → AUTH_LOGOUT

---

## 8. Agent Session Log

Track which sections were verified and by whom:

| Date | Section | Agent/Session | Result | Notes |
|------|---------|---------------|--------|-------|
| 2026-02-01 | Initial Setup | System | ✅ | Created checklist |
| | | | | |

---

## 9. Action Items (Auto-generated)

### Critical (Must Fix Before Production)
1. ❌ Create Share module (controller, service, repository, schemas)
2. ❌ Create PublicShare module
3. ❌ Add Mention controller endpoints
4. ❌ Create SharedFile and SharedLink schemas
5. ❌ Add NoteMedia schema and service
6. ❌ Verify all audit logging in NestJS services

### Warnings (Should Fix)
1. ⚠️ Verify HTTP method for reorder endpoints (PUT vs PATCH)
2. ⚠️ Compare all DTO validation rules
3. ⚠️ Verify error response formats match

### Info (Can Defer)
1. Add userAgents utility to NestJS
2. Document naming convention differences (userId vs req.user.userId)

---

## Running Parity Checker

```bash
# Run full parity check
npm run parity:check

# Check specific module
npm run parity:check -- --module=tasks

# Generate only JSON report
npm run parity:check -- --json

# Generate HTML dashboard
npm run parity:check -- --html
```

Reports are generated in `backend-nest/scripts/parity-reports/`
