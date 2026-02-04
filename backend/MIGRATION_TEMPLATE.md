# Fastify Migration Template

## Status
✅ **Core Infrastructure Complete**
- All plugins migrated with mitigations
- Auth, Task, Audit, Mention, Activity routes complete
- Server and app.ts configured

🔄 **Remaining Routes** (11 modules)
Use this template for each:

## Route Migration Template

```typescript
// FROM EXPRESS
import { Router } from 'express';
import { handler1, handler2 } from '../controllers/XController';
import { protect } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/customCsrf';

const router = Router();
router.get('/', protect, csrfProtection, handler1);
router.post('/', protect, csrfProtection, handler2);
export default router;

// TO FASTIFY
import { FastifyInstance } from 'fastify';
import { handler1, handler2 } from '../controllers/XController';

export default async function xRoutes(fastify: FastifyInstance) {
    const preHandler = [fastify.authenticate, fastify.csrfProtection];
    
    fastify.get('/', { preHandler }, handler1);
    fastify.post('/', { preHandler }, handler2);
}
```

## Controller Migration Template

```typescript
// FROM EXPRESS
import { Request, Response } from 'express';
import { withAuth } from '../middleware/controllerWrapper';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

export const handler = withAuth(async (req: AuthRequest, res: Response) => {
    const data = await service.method(req.user!.id, req.body);
    res.status(200).json(data);
});

// TO FASTIFY
import { FastifyRequest, FastifyReply } from 'fastify';

export const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const data = await service.method(userId, request.body as any);
    reply.code(200).send(data);
};
```

## Quick Reference

### Common Replacements
- `req` → `request`
- `res` → `reply`
- `res.status(X).json(Y)` → `reply.code(X).send(Y)`
- `res.json(Y)` → `reply.send(Y)`
- `req.body` → `request.body as any`
- `req.query` → `request.query as Record<string, string>`
- `req.params` → `request.params as any`
- `req.user!.id` → `const user = request.user as any; const userId = user?.id || user?._id;`

### Middleware Conversion
- `protect` → `fastify.authenticate`
- `csrfProtection` → `fastify.csrfProtection`
- `csrfTokenCookie` → `fastify.csrfTokenCookie`
- Remove `withAuth()` and `catchAsync()` wrappers

### Cookie Operations (e.g., in authController)
- `res.cookie(name, value, options)` → `reply.setCookie(name, value, options)`

## Remaining Modules

1. **calendarRoutes** + calendarController
2. **noteRoutes** + noteController (complex - has streaming)
3. **vaultRoutes** + vaultController (complex - chunked uploads)
4. **gpaRoutes** + gpaController
5. **folderRoutes** + folderController
6. **socialRoutes** + socialController (large - 20+ endpoints)
7. **shareRoutes** + shareController
8. **publicRoutes** + publicShareController
9. **analyticsRoutes** (no controller, custom middleware)
10. **linkPreviewController** (if used)

## Special Cases

### Streaming (noteController)
```typescript
// Express streaming
res.setHeader('Content-Type', 'text/event-stream');
res.write(`data: ${JSON.stringify(chunk)}\n\n`);
res.end();

// Fastify streaming
reply.raw.setHeader('Content-Type', 'text/event-stream');
reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
reply.raw.end();
```

### File Uploads (vaultController)
```typescript
// Already using @fastify/multipart - configured in app.ts
// Request body parsing handled by Fastify
```

### Analytics Routes (special password auth)
```typescript
// Custom middleware needs adapter:
const verifyPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    // ... existing logic adapted
};
fastify.get('/metrics', { preHandler: [verifyPassword] }, handler);
```

## Testing Checklist

After migrating each module:
- [ ] TypeScript compiles without errors
- [ ] Route registered in app.ts
- [ ] Test endpoint with curl/Postman
- [ ] Verify authentication works
- [ ] Verify CSRF protection works
- [ ] Check response format matches frontend expectations
