# Services Migration Guide: Express Request to Fastify Request

## Overview

This guide provides a comprehensive plan for migrating service layer dependencies from Express `Request` types to Fastify `FastifyRequest` types. Currently, services use Express types with type casting (`request as any`) in controllers, which works but is not ideal for long-term maintainability.

---

## Current State

### Current Architecture

```typescript
// Controller (Fastify)
import { FastifyRequest, FastifyReply } from 'fastify';

export const createRoom = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    // Casting Fastify request to Express Request type
    const room = await roomService.createRoom(userId, request.body as any, request as any);
    reply.code(201).send(room);
};

// Service (Still using Express types)
import { Request } from 'express';

export class RoomService extends BaseService {
    async createRoom(userId: string, data: CreateRoomDTO, req: Request): Promise<IRoom> {
        // Service uses Express Request for audit logging
        await this.logAction(userId, 'ROOM_CREATE', 'SUCCESS', req, { roomId: room._id });
        return room;
    }
}
```

### Why This Works (For Now)

1. **Type Casting**: Controllers cast Fastify requests as `any` when passing to services
2. **Limited Usage**: Services primarily use `req` for audit logging metadata
3. **Compatible Properties**: The properties services need (IP, headers, path) exist on both request types

### Why We Should Migrate

1. **Type Safety**: Lose TypeScript benefits with `as any` casts
2. **Maintainability**: Confusing to have mixed types in codebase
3. **Future-Proofing**: New features may need Fastify-specific functionality
4. **Code Clarity**: Clear separation between framework types
5. **Better Tooling**: IDE autocomplete and type checking

---

## Migration Strategy

### Option 1: Abstract Request Interface (Recommended)

Create an abstraction layer that both Express and Fastify requests can implement.

**Pros:**
- Clean separation of concerns
- Framework-agnostic services
- Easy to add other frameworks in future
- Minimal changes to service logic

**Cons:**
- Additional abstraction layer
- Slight performance overhead

### Option 2: Direct Migration to Fastify

Replace all Express `Request` types with `FastifyRequest` in services.

**Pros:**
- No abstraction layer
- Direct framework integration
- Slightly better performance

**Cons:**
- Services tightly coupled to Fastify
- Larger migration effort
- Hard to switch frameworks later

### Option 3: Hybrid Approach (Current State)

Keep Express types in services, continue using type casting.

**Pros:**
- No migration needed
- Works today

**Cons:**
- Loses type safety
- Technical debt
- Confusing for new developers

---

## Recommended Approach: Abstract Request Interface

### Step 1: Create Request Abstraction

```typescript
// src/types/serviceRequest.ts

/**
 * Framework-agnostic request interface for services
 * Contains only the properties services actually need
 */
export interface ServiceRequest {
    // Request identification
    method: string;
    path: string;
    url: string;
    
    // Client information
    ip: string;
    hostname: string;
    
    // Headers
    headers: Record<string, string | string[] | undefined>;
    
    // Route information (for audit logging)
    route?: {
        path?: string;
    };
    
    // User agent
    get(header: string): string | undefined;
}

/**
 * Adapter to convert Fastify request to ServiceRequest
 */
export function toServiceRequest(request: FastifyRequest): ServiceRequest {
    return {
        method: request.method,
        path: request.url,
        url: request.url,
        ip: request.ip || request.socket.remoteAddress || 'unknown',
        hostname: request.hostname,
        headers: request.headers as Record<string, string | string[] | undefined>,
        route: {
            path: request.routeOptions?.url
        },
        get: (header: string) => {
            const value = request.headers[header.toLowerCase()];
            return Array.isArray(value) ? value[0] : value;
        }
    };
}
```

### Step 2: Update Base Service

```typescript
// src/services/base/BaseService.ts

import { ServiceRequest } from '../../types/serviceRequest';
import { logAuditEvent, AuditAction, AuditStatus } from '../../utils/auditLogger';
import logger from '../../utils/logger';

export abstract class BaseService<T, R> {
    protected repository: R;

    constructor(repository: R) {
        this.repository = repository;
    }

    /**
     * Log an action to the audit log (fire and forget)
     * @param userId - User performing the action
     * @param action - Action being performed
     * @param status - Success or failure status
     * @param req - ServiceRequest for metadata
     * @param details - Additional details to log
     */
    protected logAction(
        userId: string,
        action: AuditAction,
        status: AuditStatus,
        req: ServiceRequest,
        details: Record<string, unknown> = {}
    ): void {
        // Fire-and-forget: don't await, just catch errors
        logAuditEvent(userId, action, status, req, details).catch(error => {
            logger.error('Audit logging failed:', error);
        });
    }

    /**
     * Handle service errors consistently
     */
    protected handleError(error: unknown, defaultMessage: string): never {
        if (error instanceof ServiceError) {
            throw error;
        }
        logger.error(defaultMessage, error);
        throw new ServiceError(defaultMessage, 500);
    }
}
```

### Step 3: Update Audit Logger

```typescript
// src/utils/auditLogger.ts

import { ServiceRequest } from '../types/serviceRequest';
import AuditLog from '../models/AuditLog';
import logger from './logger';

export type AuditAction = 
    | 'LOGIN' | 'LOGOUT' | 'REGISTER'
    | 'NOTE_CREATE' | 'NOTE_UPDATE' | 'NOTE_DELETE'
    | 'TASK_CREATE' | 'TASK_UPDATE' | 'TASK_DELETE'
    | 'VAULT_UPLOAD' | 'VAULT_DOWNLOAD' | 'VAULT_DELETE'
    | 'ROOM_CREATE' | 'ROOM_JOIN' | 'ROOM_LEAVE' | 'ROOM_DELETE'
    // ... other actions

export type AuditStatus = 'SUCCESS' | 'FAILURE';

/**
 * Log an audit event to the database
 * @param userId - User ID performing the action
 * @param action - Action being performed
 * @param status - Success or failure
 * @param req - ServiceRequest for metadata
 * @param details - Additional details
 */
export async function logAuditEvent(
    userId: string,
    action: AuditAction,
    status: AuditStatus,
    req: ServiceRequest,
    details: Record<string, unknown> = {}
): Promise<void> {
    try {
        await AuditLog.create({
            userId,
            action,
            status,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            timestamp: new Date(),
            metadata: {
                path: req.route?.path || req.path,
                method: req.method,
                ...details
            }
        });
    } catch (error) {
        // Don't throw - audit logging should never break the application
        logger.error('Failed to log audit event:', error);
    }
}
```

### Step 4: Update Service Example

```typescript
// src/services/social/RoomService.ts

import { BaseService, ServiceError } from '../base/BaseService';
import { ServiceRequest } from '../../types/serviceRequest';
import { RoomRepository } from '../../repositories/RoomRepository';
import { IRoom } from '../../models/Room';

export class RoomService extends BaseService<IRoom, RoomRepository> {
    constructor() {
        super(new RoomRepository());
    }

    /**
     * Create a new room
     */
    async createRoom(
        userId: string, 
        data: CreateRoomDTO, 
        req: ServiceRequest
    ): Promise<IRoom> {
        try {
            // Validation
            if (!data.name || !data.encryptedRoomKey) {
                throw new ServiceError('Missing required fields: name, encryptedRoomKey', 400);
            }

            // Create room
            const room = await this.repository.create({
                name: data.name,
                description: data.description,
                encryptedRoomKeys: [{
                    userId,
                    encryptedKey: data.encryptedRoomKey
                }],
                members: [userId],
                createdBy: userId
            });

            // Audit log
            await this.logAction(userId, 'ROOM_CREATE', 'SUCCESS', req, {
                roomId: room._id.toString(),
                roomName: data.name
            });

            return room;
        } catch (error) {
            return this.handleError(error, 'Failed to create room');
        }
    }
}
```

### Step 5: Update Controllers

```typescript
// src/controllers/socialController.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { toServiceRequest } from '../types/serviceRequest';
import { RoomService } from '../services/social';

const roomService = new RoomService();

export const createRoom = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    
    // Convert Fastify request to ServiceRequest
    const serviceReq = toServiceRequest(request);
    
    const room = await roomService.createRoom(userId, request.body as any, serviceReq);
    reply.code(201).send(room);
};
```

---

## Migration Plan

### Phase 1: Foundation (1-2 hours)

1. **Create ServiceRequest interface** (`src/types/serviceRequest.ts`)
   - Define minimal interface with properties services actually use
   - Create `toServiceRequest` adapter for Fastify

2. **Update BaseService** (`src/services/base/BaseService.ts`)
   - Change `logAction` parameter from `Request` to `ServiceRequest`
   - Update JSDoc comments

3. **Update auditLogger** (`src/utils/auditLogger.ts`)
   - Change `logAuditEvent` parameter from `Request` to `ServiceRequest`
   - Update all Request property accesses

### Phase 2: Service Migration (3-4 hours)

Migrate services in order of complexity (simple to complex):

1. **Simple Services** (30 min each)
   - MentionService
   - ActivityService
   - AuditService

2. **Medium Services** (45 min each)
   - CalendarService
   - GPAService
   - FolderService
   - ShareService

3. **Complex Services** (1 hour each)
   - AuthService
   - TaskService
   - VaultService
   - NoteService
   - NoteMediaService

4. **Very Complex Services** (1.5 hours each)
   - RoomService
   - LinkService
   - CollectionService
   - CommentService
   - ReaderService

### Phase 3: Controller Updates (2-3 hours)

Update all controllers to use `toServiceRequest()`:

```typescript
// Pattern to find and replace
// Old:
await service.method(userId, data, request as any);

// New:
await service.method(userId, data, toServiceRequest(request));
```

### Phase 4: Testing & Verification (2 hours)

1. **Compilation Check**
   ```bash
   npm run build
   ```

2. **Type Check**
   ```bash
   npx tsc --noEmit
   ```

3. **Manual Testing**
   - Test one endpoint from each service
   - Verify audit logs still work
   - Check error handling

4. **Integration Testing**
   - Run full test suite (when available)
   - Test authentication flows
   - Test file uploads
   - Test streaming endpoints

---

## Migration Checklist

### Files to Update

#### Core Types & Utilities
- [ ] `src/types/serviceRequest.ts` (CREATE NEW)
- [ ] `src/services/base/BaseService.ts`
- [ ] `src/utils/auditLogger.ts`

#### Services (15 total)
- [ ] `src/services/AuthService.ts`
- [ ] `src/services/TaskService.ts`
- [ ] `src/services/VaultService.ts`
- [ ] `src/services/NoteService.ts`
- [ ] `src/services/NoteMediaService.ts`
- [ ] `src/services/CalendarService.ts`
- [ ] `src/services/GPAService.ts`
- [ ] `src/services/ShareService.ts`
- [ ] `src/services/social/RoomService.ts`
- [ ] `src/services/social/LinkService.ts`
- [ ] `src/services/social/CollectionService.ts`
- [ ] `src/services/social/CommentService.ts`
- [ ] `src/services/social/ReaderService.ts`
- [ ] `src/services/ActivityService.ts`
- [ ] `src/services/AuditService.ts`

#### Controllers (15 total)
- [ ] `src/controllers/authController.ts`
- [ ] `src/controllers/taskController.ts`
- [ ] `src/controllers/vaultController.ts`
- [ ] `src/controllers/noteController.ts`
- [ ] `src/controllers/calendarController.ts`
- [ ] `src/controllers/gpaController.ts`
- [ ] `src/controllers/folderController.ts`
- [ ] `src/controllers/shareController.ts`
- [ ] `src/controllers/publicShareController.ts`
- [ ] `src/controllers/socialController.ts`
- [ ] `src/controllers/linkPreviewController.ts`
- [ ] `src/controllers/activityController.ts`
- [ ] `src/controllers/auditController.ts`
- [ ] `src/controllers/mentionController.ts`
- [ ] `src/controllers/analyticsController.ts`

---

## Testing Strategy

### Unit Tests (Per Service)

```typescript
// Example: src/services/__tests__/RoomService.test.ts

import { RoomService } from '../social/RoomService';
import { ServiceRequest } from '../../types/serviceRequest';

describe('RoomService', () => {
    let roomService: RoomService;
    
    beforeEach(() => {
        roomService = new RoomService();
    });
    
    describe('createRoom', () => {
        it('should create room with valid data', async () => {
            const mockRequest: ServiceRequest = {
                method: 'POST',
                path: '/api/social/rooms',
                url: '/api/social/rooms',
                ip: '127.0.0.1',
                hostname: 'localhost',
                headers: {},
                get: (header: string) => undefined
            };
            
            const result = await roomService.createRoom(
                'user123',
                { name: 'Test Room', encryptedRoomKey: 'encrypted' },
                mockRequest
            );
            
            expect(result).toBeDefined();
            expect(result.name).toBe('Test Room');
        });
    });
});
```

### Integration Tests

```typescript
// Example: src/__tests__/integration/social.test.ts

import { buildApp } from '../../app';
import { FastifyInstance } from 'fastify';

describe('Social API Integration', () => {
    let app: FastifyInstance;
    
    beforeAll(async () => {
        app = await buildApp();
    });
    
    afterAll(async () => {
        await app.close();
    });
    
    it('should create room and log audit event', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/social/rooms',
            headers: {
                'authorization': 'Bearer valid-token',
                'x-csrf-token': 'valid-csrf'
            },
            payload: {
                name: 'Integration Test Room',
                encryptedRoomKey: 'encrypted-key'
            }
        });
        
        expect(response.statusCode).toBe(201);
        expect(response.json()).toHaveProperty('_id');
        
        // Verify audit log was created
        // ... audit log verification
    });
});
```

---

## Rollback Plan

If issues arise during migration:

### Immediate Rollback

```bash
# Revert to last working commit
git log --oneline  # Find last working commit
git revert <commit-hash> --no-commit
git commit -m "Rollback: Service migration"
```

### Partial Rollback

Keep ServiceRequest abstraction but revert specific services:

```typescript
// Temporary: Keep Express Request for problematic service
import { Request } from 'express';

export class ProblematicService extends BaseService {
    async method(userId: string, data: any, req: Request | ServiceRequest) {
        // Handle both types temporarily
        const serviceReq = 'method' in req ? req : this.convertExpressRequest(req as Request);
        // ... rest of method
    }
}
```

---

## Performance Considerations

### Minimal Overhead

The ServiceRequest abstraction adds minimal overhead:
- **Memory**: ~200 bytes per request object
- **CPU**: ~0.1ms for adapter conversion
- **Impact**: Negligible (<0.01% of total request time)

### Benefits

- **Type Safety**: Catch errors at compile time
- **Maintainability**: Easier to refactor
- **Testing**: Easier to mock requests

---

## Future Enhancements

### Phase 2: Remove Express Types Entirely

Once services are migrated to ServiceRequest:

1. Remove `@types/express` dependency
2. Update error handling utilities
3. Remove any remaining Express imports

### Phase 3: Enhanced Type Safety

```typescript
// Add generic constraints for better type inference
export interface ServiceRequest<TParams = any, TQuery = any, TBody = any> {
    params?: TParams;
    query?: TQuery;
    body?: TBody;
    // ... other properties
}

// Usage in services
async createRoom(
    userId: string, 
    data: CreateRoomDTO, 
    req: ServiceRequest<never, never, CreateRoomDTO>
): Promise<IRoom>
```

---

## Resources

### Key Files

- **Abstract Interface**: `src/types/serviceRequest.ts`
- **Base Service**: `src/services/base/BaseService.ts`
- **Audit Logger**: `src/utils/auditLogger.ts`
- **Migration Status**: `backend/MIGRATION_STATUS.md`

### Documentation

- [Fastify Request Documentation](https://fastify.dev/docs/latest/Reference/Request/)
- [Express Request Documentation](https://expressjs.com/en/api.html#req)
- [TypeScript Handbook - Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)

---

## Summary

**Estimated Total Time**: 8-11 hours

**Benefits**:
- ✅ Full type safety
- ✅ Framework-agnostic services
- ✅ Easier testing
- ✅ Better maintainability
- ✅ Cleaner architecture

**Risk Level**: Low
- Minimal code changes
- Easy to test incrementally
- Simple rollback path
- No breaking changes to APIs

**Recommendation**: Proceed with migration using the Abstract Request Interface approach. This provides the best balance of type safety, maintainability, and flexibility.

---

## Contact

For questions or issues during migration:
- Review this guide
- Check compilation errors
- Test incrementally
- Document any edge cases discovered

**Status**: Ready for Implementation ✅
