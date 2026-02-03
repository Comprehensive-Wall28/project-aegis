# Workflow 18: Social Module Migration

## Objective
Implement NestJS social module with all 6 entities, passing all Workflow 17 tests.

## Prerequisites
- Workflow 17 completed (60+ social tests passing against Express)
- Understanding of complex domain relationships

---

## Phase 1: Domain Models

### Step 1.1: Create All Schemas

**READ:**
```
backend/src/models/Room.ts
backend/src/models/Collection.ts
backend/src/models/LinkPost.ts
backend/src/models/LinkComment.ts
backend/src/models/LinkView.ts
backend/src/models/ReaderAnnotation.ts
backend/src/models/ReaderContentCache.ts
```

**Create in order (respecting dependencies):**
1. `room.schema.ts` - with members array and roles
2. `collection.schema.ts` - references room
3. `link-post.schema.ts` - references collection
4. `link-comment.schema.ts` - references link-post
5. `link-view.schema.ts` - references link-post
6. `reader-annotation.schema.ts` - references link-post
7. `reader-content-cache.schema.ts` - cached article content

---

## Phase 2: Repositories

### Step 2.1: Create All Repositories

**READ:**
```
backend/src/repositories/RoomRepository.ts
backend/src/repositories/CollectionRepository.ts
backend/src/repositories/LinkPostRepository.ts
backend/src/repositories/LinkCommentRepository.ts
backend/src/repositories/LinkViewRepository.ts
backend/src/repositories/ReaderAnnotationRepository.ts
backend/src/repositories/ReaderContentCacheRepository.ts
```

**Key custom methods to port:**
- `RoomRepository`: `findByMember()`, `addMember()`, `removeMember()`
- `CollectionRepository`: `findByRoom()`
- `LinkPostRepository`: `findByCollection()`, `incrementViewCount()`
- `LinkCommentRepository`: `findByLink()`

---

## Phase 3: Services

### Step 3.1: Port All Services

**READ:**
```
backend/src/services/socialService.ts
backend/src/services/roomService.ts
backend/src/services/collectionService.ts
backend/src/services/linkService.ts
backend/src/services/readerService.ts
```

**Critical: Permission Checking**

```typescript
// Room membership check pattern
async validateRoomAccess(userId: string, roomId: string): Promise<Room> {
  const room = await this.roomRepository.findById(roomId);
  if (!room) throw new ServiceError('Room not found', 404);
  
  const isMember = room.members.some(m => m.userId.toString() === userId);
  if (!isMember) throw new ServiceError('Access denied', 403);
  
  return room;
}

// Admin check pattern
async validateAdminAccess(userId: string, roomId: string): Promise<Room> {
  const room = await this.validateRoomAccess(userId, roomId);
  const member = room.members.find(m => m.userId.toString() === userId);
  if (member.role !== 'admin') throw new ServiceError('Admin access required', 403);
  return room;
}
```

---

## Phase 4: Controller

### Step 4.1: Create Social Controller

**Option A: Single large controller**
- All social routes in one file
- Simpler module structure

**Option B: Split controllers**
- `RoomController`
- `CollectionController`
- `LinkController`
- `CommentController`
- `ReaderController`

**Recommendation: Split for maintainability**

### Step 4.2: Route Structure

```typescript
// rooms.controller.ts
@Controller('api/social/rooms')
export class RoomsController {
  @Get() listRooms() {}
  @Post() createRoom() {}
  @Get(':id') getRoom() {}
  // ...
}

// collections.controller.ts
@Controller('api/social')
export class CollectionsController {
  @Get('rooms/:roomId/collections') listCollections() {}
  @Post('rooms/:roomId/collections') createCollection() {}
  @Put('collections/:id') updateCollection() {}
  // ...
}
```

---

## Phase 5: Reader Service (Complex)

### Step 5.1: Link Preview Scraping

**READ:**
```
backend/src/services/linkPreviewService.ts
backend/src/utils/scraper.ts
```

**Consider:**
- External URL fetching
- Content extraction (@mozilla/readability)
- Metadata scraping (metascraper)
- Caching strategy
- Error handling for unreachable URLs

### Step 5.2: Port Reader Logic

For now, port with minimal external calls for testing.
Full scraping can be validated manually.

---

## Phase 6: Module Assembly

### Step 6.1: Create Social Module

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: Collection.name, schema: CollectionSchema },
      { name: LinkPost.name, schema: LinkPostSchema },
      { name: LinkComment.name, schema: LinkCommentSchema },
      { name: LinkView.name, schema: LinkViewSchema },
      { name: ReaderAnnotation.name, schema: ReaderAnnotationSchema },
      { name: ReaderContentCache.name, schema: ReaderContentCacheSchema },
    ]),
    AuthModule,  // For guards
  ],
  controllers: [
    RoomsController,
    CollectionsController,
    LinksController,
    CommentsController,
    ReaderController,
  ],
  providers: [
    RoomRepository,
    CollectionRepository,
    LinkPostRepository,
    LinkCommentRepository,
    LinkViewRepository,
    ReaderAnnotationRepository,
    ReaderContentCacheRepository,
    RoomService,
    CollectionService,
    LinkService,
    CommentService,
    ReaderService,
    LinkPreviewService,
  ],
})
export class SocialModule {}
```

---

## Completion Checklist

- [ ] All 7 schemas created
- [ ] All 7 repositories with custom methods
- [ ] All 5+ services with permission logic
- [ ] All controllers with routes matching Express
- [ ] Reader service functional (basic)
- [ ] All 60+ Workflow 17 tests passing
- [ ] Code committed

## Files Created

```
backend-nest/src/modules/social/
├── social.module.ts
├── controllers/
│   ├── rooms.controller.ts
│   ├── collections.controller.ts
│   ├── links.controller.ts
│   ├── comments.controller.ts
│   └── reader.controller.ts
├── services/
│   ├── room.service.ts
│   ├── collection.service.ts
│   ├── link.service.ts
│   ├── comment.service.ts
│   ├── reader.service.ts
│   └── link-preview.service.ts
├── repositories/
│   ├── room.repository.ts
│   ├── collection.repository.ts
│   ├── link-post.repository.ts
│   ├── link-comment.repository.ts
│   ├── link-view.repository.ts
│   ├── reader-annotation.repository.ts
│   └── reader-content-cache.repository.ts
├── schemas/
│   ├── room.schema.ts
│   ├── collection.schema.ts
│   ├── link-post.schema.ts
│   ├── link-comment.schema.ts
│   ├── link-view.schema.ts
│   ├── reader-annotation.schema.ts
│   └── reader-content-cache.schema.ts
└── dto/
    └── (various DTOs)
```

## Next Workflow
Proceed to [19-websocket-migration.md](./19-websocket-migration.md)
