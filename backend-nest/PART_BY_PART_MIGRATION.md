# Part-by-Part Migration Progress

This file tracks the migration of Social, Folder, and Vault modules from the old backend to the NestJS backend with strict parity requirements.

## Phase 1: Social Module
- [ ] **Routes: /api/social/**
    - [x] `getUserRooms` (GET /social/rooms)
    - [x] `createRoom` (POST /social/rooms)
    - [x] `createInvite` (POST /social/rooms/:roomId/invite)
    - [x] `joinRoom` (POST /social/rooms/join)
    - [x] `leaveRoom` (POST /social/rooms/:roomId/leave)
    - [x] `deleteRoom` (DELETE /social/rooms/:roomId)
    - [x] `postLink` (POST /social/rooms/:roomId/links) ✨ NEW
    - [ ] `createCollection` (POST /social/rooms/:roomId/collections)
    - [ ] `getRoomContent` (GET /social/rooms/:roomId)
    - [x] `getCollectionLinks` (GET /social/rooms/:roomId/collections/:collectionId/links) ✨ NEW
    - [x] `searchRoomLinks` (GET /social/rooms/:roomId/search) ✨ NEW
    - [x] `deleteLink` (DELETE /social/links/:linkId) ✨ NEW
    - [ ] `deleteCollection` (DELETE /social/collections/:collectionId)
    - [ ] `updateCollection` (PATCH /social/collections/:collectionId)
    - [ ] `reorderCollections` (PATCH /social/rooms/:roomId/collections/reorder)
    - [ ] `moveLink` (PATCH /social/links/:linkId/move)
    - [x] `markLinkViewed` (POST /social/links/:linkId/view) ✨ NEW
    - [x] `unmarkLinkViewed` (DELETE /social/links/:linkId/view) ✨ NEW
    - [ ] `getComments` (GET /social/links/:linkId/comments)
    - [ ] `postComment` (POST /social/links/:linkId/comments)
    - [ ] `deleteComment` (DELETE /social/comments/:commentId)
- [x] **Routes: /api/social/invite/**
    - [x] `getInviteInfo` (GET /social/invite/:inviteCode)
- [x] **Routes: /api/social/proxy-image** ✨ NEW
    - [x] `proxyImage` (GET /social/proxy-image) ✨ NEW
- [ ] **Reader Mode**
    - [ ] `getReaderContent` (GET /social/links/:linkId/reader)
    - [ ] `getAnnotations` (GET /social/links/:linkId/annotations)
    - [ ] `createAnnotation` (POST /social/links/:linkId/annotations)
    - [ ] `deleteAnnotation` (DELETE /social/annotations/:annotationId)


## Phase 2: Folder Module
- [x] **Routes: /api/folders/**
    - [x] `getFolders` (GET /folders)
    - [x] `getFolder` (GET /folders/:id)
    - [x] `createFolder` (POST /folders)
    - [x] `renameFolder` (PUT /folders/:id)
    - [x] `deleteFolder` (DELETE /folders/:id)
    - [x] `moveFiles` (PUT /folders/move-files)

## Phase 3: Vault Module
- [x] **Routes: /api/vault/**
    - [x] `uploadInit` (POST /vault/upload-init)
    - [x] `uploadChunk` (PUT /vault/upload-chunk)
    - [x] `getUserFiles` (GET /vault/files)
    - [x] `getFile` (GET /vault/files/:id)
    - [x] `downloadFile` (GET /vault/download/:id)
    - [x] `deleteUserFile` (DELETE /vault/files/:id)
    - [x] `getStorageStats` (GET /vault/storage-stats)
