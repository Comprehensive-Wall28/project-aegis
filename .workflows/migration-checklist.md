# Migration Progress Checklist

> Update this file as routes are migrated. Mark completed routes with [x].
> Add notes for any deviations or issues encountered.

## Migration Order

**Recommended:** Auth → Vault → Social

This order ensures authentication is working first, then file handling, then complex social features.

Note we use Fastify in the new Nest backend.

---

## Auth Module (12 routes)

Priority: HIGH - Core authentication must work first

- [x] POST /api/auth/register
- [x] POST /api/auth/login
- [x] GET /api/auth/csrf-token
- [x] GET /api/auth/me
- [x] PUT /api/auth/me
- [x] GET /api/auth/discovery/:email
- [x] POST /api/auth/logout

**Notes:**
- 


---

## Vault Module (7 routes)

Priority: MEDIUM - File handling required before social features

- [x] POST /api/vault/upload-init
- [x] PUT /api/vault/upload-chunk
- [ ] GET /api/vault/files
- [ ] GET /api/vault/files/:id
- [ ] GET /api/vault/download/:id
- [ ] DELETE /api/vault/files/:id
- [ ] GET /api/vault/storage-stats

**Notes:**
- 


---

## Social Module (27 routes)

Priority: MEDIUM - Can be done in parallel after auth

### Rooms (6 routes)
- [ ] GET /api/social/rooms
- [ ] POST /api/social/rooms
- [ ] POST /api/social/rooms/:roomId/invite
- [ ] GET /api/social/invite/:inviteCode (public)
- [ ] POST /api/social/rooms/join
- [ ] POST /api/social/rooms/:roomId/leave
- [ ] DELETE /api/social/rooms/:roomId

### Collections (5 routes)
- [ ] POST /api/social/rooms/:roomId/collections
- [ ] DELETE /api/social/collections/:collectionId
- [ ] PATCH /api/social/collections/:collectionId
- [ ] PATCH /api/social/rooms/:roomId/collections/order
- [ ] GET /api/social/rooms/:roomId/collections/:collectionId/links

### Links (8 routes)
- [ ] POST /api/social/rooms/:roomId/links
- [ ] GET /api/social/rooms/:roomId (get room content)
- [ ] GET /api/social/rooms/:roomId/search
- [ ] DELETE /api/social/links/:linkId
- [ ] PATCH /api/social/links/:linkId (move link)
- [ ] POST /api/social/links/:linkId/view
- [ ] DELETE /api/social/links/:linkId/view
- [ ] GET /api/social/proxy-image (public)

### Comments (3 routes)
- [ ] GET /api/social/links/:linkId/comments
- [ ] POST /api/social/links/:linkId/comments
- [ ] DELETE /api/social/comments/:commentId

### Reader Mode (5 routes)
- [ ] GET /api/social/links/:linkId/reader
- [ ] GET /api/social/links/:linkId/annotations
- [ ] POST /api/social/links/:linkId/annotations
- [ ] DELETE /api/social/annotations/:annotationId

**Notes:**
- 


---

## Statistics

**Total Routes:** 46
**Completed:** 0
**In Progress:** 0
**Remaining:** 46

**Progress:** 0%

---

## Issues & Deviations

Document any significant changes from the original implementation:

### [Route Path] - [Date]
- **Issue:** 
- **Resolution:** 
- **Impact:** 

---

## Testing Status

- [ ] All e2e tests passing
- [ ] Manual frontend integration tested
- [ ] Performance benchmarks completed
- [ ] Database fallback tested
- [ ] CSRF protection verified across all routes
- [ ] Authentication verified across all routes

---

## Deployment Readiness

- [ ] All routes migrated
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Environment variables documented
- [ ] Database indexes verified
- [ ] Load testing completed
- [ ] Rollback plan documented
