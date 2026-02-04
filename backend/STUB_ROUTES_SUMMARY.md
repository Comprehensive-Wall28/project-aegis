# Stub Routes Summary

All stub routes have been created for the Fastify 9 migration. Each module now has detailed endpoint definitions that return `501 Not Implemented`.

## Overview

- **Total Modules:** 9
- **Total Endpoints:** 83
- **Status:** All stubs registered in `app.ts` ✅
- **Build Status:** Compiles successfully ✅

## Module Breakdown

### Critical Priority (Production Blockers)

#### 1. Vault Module
- **File:** `vaultRoutes.fastify.ts`
- **Controller:** `vaultController.ts`
- **Endpoints:** 7
- **Features:** File uploads with chunked support
- **Auth:** JWT + CSRF
- **Special:** Uses `@fastify/multipart`

**Endpoints:**
```
POST   /api/vault/upload-init
PUT    /api/vault/upload-chunk
GET    /api/vault/files
GET    /api/vault/files/:id
GET    /api/vault/download/:id
DELETE /api/vault/files/:id
GET    /api/vault/storage-stats
```

#### 2. Notes Module
- **File:** `noteRoutes.fastify.ts`
- **Controller:** `noteController.ts`
- **Endpoints:** 18
- **Features:** Streaming (SSE), media uploads, folder management
- **Auth:** JWT + CSRF
- **Special:** `/content/stream` requires SSE support

**Endpoints:**
```
# Folders
GET    /api/notes/folders
POST   /api/notes/folders
PUT    /api/notes/folders/:id
DELETE /api/notes/folders/:id

# Notes
GET    /api/notes/
GET    /api/notes/tags
GET    /api/notes/backlinks/:entityId
GET    /api/notes/:id
GET    /api/notes/:id/content
GET    /api/notes/:id/content/stream  (SSE)
POST   /api/notes/
PUT    /api/notes/:id/metadata
PUT    /api/notes/:id/content
DELETE /api/notes/:id

# Media
POST   /api/notes/media/upload-init
PUT    /api/notes/media/upload-chunk
GET    /api/notes/media/download/:id
GET    /api/notes/media/metadata/:id
```

### High Priority (Core Features)

#### 3. Calendar Module
- **File:** `calendarRoutes.fastify.ts`
- **Controller:** `calendarController.ts`
- **Endpoints:** 4
- **Features:** Simple CRUD for events
- **Auth:** JWT + CSRF

**Endpoints:**
```
GET    /api/calendar/
POST   /api/calendar/
PUT    /api/calendar/:id
DELETE /api/calendar/:id
```

#### 4. GPA Module
- **File:** `gpaRoutes.fastify.ts`
- **Controller:** `gpaController.ts`
- **Endpoints:** 7
- **Features:** Course management with encrypted data
- **Auth:** JWT + CSRF

**Endpoints:**
```
GET    /api/gpa/courses/unmigrated
PUT    /api/gpa/courses/:id/migrate
GET    /api/gpa/courses
POST   /api/gpa/courses
DELETE /api/gpa/courses/:id
GET    /api/gpa/preferences
PUT    /api/gpa/preferences
```

#### 5. Folders Module
- **File:** `folderRoutes.fastify.ts`
- **Controller:** `folderController.ts`
- **Endpoints:** 6
- **Features:** Folder management and file operations
- **Auth:** JWT + CSRF

**Endpoints:**
```
PUT    /api/folders/move-files
GET    /api/folders/
GET    /api/folders/:id
POST   /api/folders/
PUT    /api/folders/:id
DELETE /api/folders/:id
```

### Medium Priority (Enhanced Features)

#### 6. Social Module
- **File:** `socialRoutes.fastify.ts`
- **Controllers:** `socialController.ts`, `linkPreviewController.ts`
- **Endpoints:** 28 (2 public + 26 protected)
- **Features:** Rooms, links, collections, comments, annotations
- **Auth:** Mixed (2 public, rest JWT + CSRF)
- **Special:** Public endpoints for invites and image proxy

**Endpoints:**
```
# Public (no auth)
GET    /api/social/invite/:inviteCode
GET    /api/social/proxy-image

# Rooms (protected)
GET    /api/social/rooms
POST   /api/social/rooms
POST   /api/social/rooms/:roomId/invite
POST   /api/social/rooms/join
POST   /api/social/rooms/:roomId/leave
DELETE /api/social/rooms/:roomId
GET    /api/social/rooms/:roomId
GET    /api/social/rooms/:roomId/search

# Links (protected)
POST   /api/social/rooms/:roomId/links
DELETE /api/social/links/:linkId
PATCH  /api/social/links/:linkId
POST   /api/social/links/:linkId/view
DELETE /api/social/links/:linkId/view

# Collections (protected)
POST   /api/social/rooms/:roomId/collections
GET    /api/social/rooms/:roomId/collections/:collectionId/links
DELETE /api/social/collections/:collectionId
PATCH  /api/social/collections/:collectionId
PATCH  /api/social/rooms/:roomId/collections/order

# Comments (protected)
GET    /api/social/links/:linkId/comments
POST   /api/social/links/:linkId/comments
DELETE /api/social/comments/:commentId

# Reader mode (protected)
GET    /api/social/links/:linkId/reader
GET    /api/social/links/:linkId/annotations
POST   /api/social/links/:linkId/annotations
DELETE /api/social/annotations/:annotationId
```

#### 7. Share Module
- **File:** `shareRoutes.fastify.ts`
- **Controller:** `shareController.ts`
- **Endpoints:** 5
- **Features:** File sharing functionality
- **Auth:** JWT only (no CSRF)
- **Special:** No CSRF protection on these routes

**Endpoints:**
```
POST   /api/share/invite-file
POST   /api/share/link
GET    /api/share/my-links
DELETE /api/share/link/:id
GET    /api/share/shared-file/:fileId
```

#### 8. Public Module
- **File:** `publicRoutes.fastify.ts`
- **Controller:** `publicShareController.ts`
- **Endpoints:** 2
- **Features:** Public file sharing access
- **Auth:** None (public endpoints)

**Endpoints:**
```
GET    /api/public/share/:token
GET    /api/public/share/:token/download
```

#### 9. Analytics Module
- **File:** `analyticsRoutes.fastify.ts`
- **Controller:** Inline handlers in `analyticsRoutes.ts`
- **Endpoints:** 6
- **Features:** Metrics and log viewing
- **Auth:** Custom password verification
- **Special:** Uses env var password instead of JWT

**Endpoints:**
```
POST   /api/analytics/verify-access
GET    /api/analytics/metrics
GET    /api/analytics/metrics/summary
GET    /api/analytics/metrics/timeseries
GET    /api/analytics/logs
GET    /api/analytics/audit-logs
```

## Migration Strategy

For each module:

1. **Read the controller file** to understand the business logic
2. **Convert Express handlers to Fastify** using `MIGRATION_TEMPLATE.md`
   - Change `req` → `request`
   - Change `res.json()` → `reply.send()`
   - Change `res.status(X).json(Y)` → `reply.code(X).send(Y)`
   - Update user access pattern
3. **Replace stub file** in `app.ts` with fully migrated route
4. **Test endpoints** to ensure they work correctly

## Response Format

All stub endpoints currently return:
```json
{
  "error": "Not Implemented",
  "message": "[Module] module is being migrated to Fastify",
  "path": "/api/...",
  "method": "GET|POST|PUT|PATCH|DELETE"
}
```

## Next Action

Start with **Critical Priority** modules (Vault and Notes) as they are production blockers.

---

**Last Updated:** 2026-02-04
**Status:** ✅ All stubs created and registered
