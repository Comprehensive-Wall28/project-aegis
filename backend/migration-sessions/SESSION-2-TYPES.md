# SESSION 2: Type Definitions & Utilities

**Duration:** 2-3 hours  
**Prerequisites:** Session 1 completed  
**Agent Role:** TypeScript infrastructure and utilities

---

## Objectives
- [x] Create Fastify type definitions
- [x] Migrate error handling utilities
- [x] Update controller wrapper functions
- [x] Prepare authentication types

---

## Step 1: Create Core Type Definitions

### 1.1 Create `src/types/fastify.ts`
```typescript
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Authenticated user structure
 */
export interface AuthUser {
  id: string;
  username: string;
}

/**
 * Extended FastifyRequest with user authentication
 */
export interface AuthRequest extends FastifyRequest {
  user?: AuthUser;
  csrfToken?: string;
  startTime?: number; // For performance monitoring
}

/**
 * Standard Fastify handler type
 */
export type FastifyHandler = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<any> | any;

/**
 * Authenticated handler type
 */
export type AuthHandler = (
  request: AuthRequest,
  reply: FastifyReply
) => Promise<any> | any;

/**
 * Route hook handler type
 */
export type HookHandler = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<void> | void;

/**
 * Augment Fastify types to include our custom properties
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    csrfToken?: string;
    startTime?: number;
  }
}
```

**File Location:** `backend/src/types/fastify.ts`

---

## Step 2: Create Error Handler

### 2.1 Create `src/middleware/fastifyErrorHandler.ts`
```typescript
import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/env';
import logger from '../utils/logger';

/**
 * Global error handler for Fastify
 * Replaces Express errorHandler middleware
 */
export function fastifyErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Determine status code
  let statusCode = error.statusCode || 500;

  // Handle specific error codes
  if (error.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
  }

  // Log error with context
  logger.error('Request error:', {
    method: request.method,
    url: request.url,
    statusCode,
    errorCode: error.code,
    message: error.message,
    stack: config.nodeEnv === 'production' ? undefined : error.stack,
    userId: (request as any).user?.id,
  });

  // Send error response
  reply.status(statusCode).send({
    message: error.message,
    code: error.code,
    stack: config.nodeEnv === 'production' ? undefined : error.stack,
  });
}

/**
 * Register error handler with Fastify app
 */
export function registerErrorHandler(app: any) {
  app.setErrorHandler(fastifyErrorHandler);
}
```

**File Location:** `backend/src/middleware/fastifyErrorHandler.ts`

### 2.2 Update `src/fastify-app.ts` to use error handler
Add after plugin registration:
```typescript
import { registerErrorHandler } from './middleware/fastifyErrorHandler';

// ... existing code ...

// Register error handler
registerErrorHandler(app);

logger.info('Fastify app configured successfully');
return app;
```

---

## Step 3: Create Controller Wrappers

### 3.1 Create `src/middleware/fastifyControllerWrapper.ts`
```typescript
import { FastifyReply } from 'fastify';
import { AuthRequest, FastifyHandler, AuthHandler } from '../types/fastify';
import logger from '../utils/logger';

/**
 * Wraps async controller with try-catch error handling
 * Replaces Express catchAsync wrapper
 */
export const catchAsync = (fn: FastifyHandler): FastifyHandler => {
  return async (request: any, reply: FastifyReply) => {
    try {
      await fn(request, reply);
    } catch (error: any) {
      logger.error('Controller error:', {
        method: request.method,
        url: request.url,
        error: error.message,
        stack: error.stack,
      });

      const statusCode = error.statusCode || error.status || 500;
      reply.status(statusCode).send({
        message: error.message || 'Server error',
        code: error.code,
      });
    }
  };
};

/**
 * Wraps authenticated controller with auth check and error handling
 * Replaces Express withAuth wrapper
 */
export const withAuth = (fn: AuthHandler): AuthHandler => {
  return async (request: AuthRequest, reply: FastifyReply) => {
    // Verify user is authenticated
    if (!request.user) {
      return reply.status(401).send({
        message: 'Not authenticated',
        code: 'UNAUTHORIZED',
      });
    }

    try {
      await fn(request, reply);
    } catch (error: any) {
      logger.error('Auth controller error:', {
        method: request.method,
        url: request.url,
        userId: request.user?.id,
        error: error.message,
        stack: error.stack,
      });

      const statusCode = error.statusCode || error.status || 500;
      reply.status(statusCode).send({
        message: error.message || 'Server error',
        code: error.code,
      });
    }
  };
};

/**
 * Optional: Wrapper for controllers that need validation
 * Can be extended with schema validation in the future
 */
export const withValidation = (fn: FastifyHandler): FastifyHandler => {
  return async (request: any, reply: FastifyReply) => {
    // Future: Add schema validation here
    // For now, just pass through
    await fn(request, reply);
  };
};
```

**File Location:** `backend/src/middleware/fastifyControllerWrapper.ts`

---

## Step 4: Update Error Utility

### 4.1 Review `src/utils/errors.ts`
Current Express version:
```typescript
export const handleError = (error: any, res: Response) => {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  logger.error('Unexpected error:', error);
  res.status(500).json({ message: 'Server error' });
};
```

### 4.2 Create Fastify-compatible version
Create `src/utils/fastifyErrors.ts`:
```typescript
import { FastifyReply } from 'fastify';
import logger from './logger';

export class ServiceError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ServiceError';
  }
}

/**
 * Handle errors in Fastify controllers
 * Compatible with ServiceError class
 */
export const handleFastifyError = (error: any, reply: FastifyReply) => {
  if (error instanceof ServiceError) {
    return reply.status(error.statusCode).send({
      message: error.message,
      code: error.code,
    });
  }

  logger.error('Unexpected error:', {
    error: error.message,
    stack: error.stack,
  });

  return reply.status(500).send({
    message: 'Server error',
    code: 'INTERNAL_ERROR',
  });
};

// Keep original for backward compatibility during migration
export { handleError } from './errors';
```

**File Location:** `backend/src/utils/fastifyErrors.ts`

---

## Step 5: Create Response Helpers

### 5.1 Create `src/utils/fastifyResponse.ts`
```typescript
import { FastifyReply } from 'fastify';

/**
 * Helper functions for consistent API responses
 */

export const sendSuccess = (
  reply: FastifyReply,
  data: any,
  statusCode: number = 200
) => {
  return reply.status(statusCode).send(data);
};

export const sendCreated = (reply: FastifyReply, data: any) => {
  return reply.status(201).send(data);
};

export const sendNoContent = (reply: FastifyReply) => {
  return reply.status(204).send();
};

export const sendError = (
  reply: FastifyReply,
  message: string,
  statusCode: number = 500,
  code?: string
) => {
  return reply.status(statusCode).send({
    message,
    code,
  });
};

export const sendBadRequest = (reply: FastifyReply, message: string) => {
  return sendError(reply, message, 400, 'BAD_REQUEST');
};

export const sendUnauthorized = (reply: FastifyReply, message: string = 'Unauthorized') => {
  return sendError(reply, message, 401, 'UNAUTHORIZED');
};

export const sendForbidden = (reply: FastifyReply, message: string = 'Forbidden') => {
  return sendError(reply, message, 403, 'FORBIDDEN');
};

export const sendNotFound = (reply: FastifyReply, message: string = 'Not found') => {
  return sendError(reply, message, 404, 'NOT_FOUND');
};

/**
 * Send paginated response
 */
export const sendPaginated = (
  reply: FastifyReply,
  data: any[],
  pagination: {
    total?: number;
    page?: number;
    limit?: number;
    cursor?: string;
    hasMore?: boolean;
  }
) => {
  return reply.status(200).send({
    data,
    pagination,
  });
};
```

**File Location:** `backend/src/utils/fastifyResponse.ts`

---

## Step 6: Create Request Validation Helpers

### 6.1 Create `src/utils/fastifyValidation.ts`
```typescript
import { FastifyRequest } from 'fastify';

/**
 * Extract and validate query parameters
 */
export const getQueryParam = (
  request: FastifyRequest,
  key: string,
  defaultValue?: string
): string | undefined => {
  const value = (request.query as any)[key];
  return value !== undefined ? String(value) : defaultValue;
};

export const getQueryNumber = (
  request: FastifyRequest,
  key: string,
  defaultValue?: number
): number | undefined => {
  const value = (request.query as any)[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const getQueryBoolean = (
  request: FastifyRequest,
  key: string,
  defaultValue: boolean = false
): boolean => {
  const value = (request.query as any)[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1' || value === true;
};

export const getQueryArray = (
  request: FastifyRequest,
  key: string,
  separator: string = ','
): string[] | undefined => {
  const value = (request.query as any)[key];
  if (!value) return undefined;
  return String(value).split(separator).filter(Boolean);
};

/**
 * Extract route parameters
 */
export const getParam = (request: FastifyRequest, key: string): string => {
  return (request.params as any)[key];
};

/**
 * Validate required fields in body
 */
export const validateRequired = (
  body: any,
  fields: string[]
): { valid: boolean; missing: string[] } => {
  const missing = fields.filter(field => !body[field]);
  return {
    valid: missing.length === 0,
    missing,
  };
};
```

**File Location:** `backend/src/utils/fastifyValidation.ts`

---

## Step 7: Performance Monitoring Hook

### 7.1 Create `src/middleware/performanceMonitoring.ts`
```typescript
import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import logger from '../utils/logger';

/**
 * Track request start time
 */
export async function onRequestHook(
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.startTime = Date.now();
}

/**
 * Log request completion with duration
 */
export async function onResponseHook(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const duration = Date.now() - (request.startTime || Date.now());

  // Log slow requests
  if (duration > 1000) {
    logger.warn('Slow request detected:', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration,
      userId: (request as any).user?.id,
    });
  }

  // Log all requests in development
  if (process.env.NODE_ENV !== 'production') {
    logger.debug('Request completed:', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration,
    });
  }
}

/**
 * Register performance monitoring hooks
 */
export function registerPerformanceHooks(app: any) {
  app.addHook('onRequest', onRequestHook);
  app.addHook('onResponse', onResponseHook);
}
```

**File Location:** `backend/src/middleware/performanceMonitoring.ts`

### 7.2 Update `src/fastify-app.ts`
```typescript
import { registerPerformanceHooks } from './middleware/performanceMonitoring';

// ... after error handler registration ...

// Register performance monitoring
if (config.nodeEnv !== 'production') {
  registerPerformanceHooks(app);
}
```

---

## Step 8: Create Index Exports

### 8.1 Create `src/types/index.ts`
```typescript
export * from './fastify';
```

### 8.2 Update `src/middleware/index.ts` (create if doesn't exist)
```typescript
export * from './fastifyAuthMiddleware';
export * from './fastifyCsrf';
export * from './fastifyControllerWrapper';
export * from './fastifyErrorHandler';
export * from './performanceMonitoring';
```

---

## Step 9: Validation & Testing

### 9.1 Build Test
```bash
npm run build
```

**Expected:**
- All new TypeScript files compile
- No type errors
- dist/ contains new compiled files

### 9.2 Type Check
```bash
npx tsc --noEmit
```

**Expected:** No errors

### 9.3 Create Test Controller (Optional)
Create `src/controllers/__test__/testFastifyTypes.ts`:
```typescript
import { FastifyReply } from 'fastify';
import { AuthRequest } from '../../types/fastify';
import { catchAsync, withAuth } from '../../middleware/fastifyControllerWrapper';
import { sendSuccess, sendPaginated } from '../../utils/fastifyResponse';
import { getQueryNumber, validateRequired } from '../../utils/fastifyValidation';

// Test basic handler
export const testBasic = catchAsync(async (request, reply) => {
  return sendSuccess(reply, { message: 'Test successful' });
});

// Test authenticated handler
export const testAuth = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
  return sendSuccess(reply, {
    message: 'Authenticated',
    user: request.user,
  });
});

// Test with query params
export const testQuery = catchAsync(async (request, reply) => {
  const page = getQueryNumber(request, 'page', 1);
  const limit = getQueryNumber(request, 'limit', 10);

  return sendPaginated(reply, [], {
    page,
    limit,
    total: 0,
    hasMore: false,
  });
});

// Test validation
export const testValidation = catchAsync(async (request, reply) => {
  const { valid, missing } = validateRequired(request.body, ['name', 'email']);

  if (!valid) {
    return reply.status(400).send({
      message: `Missing required fields: ${missing.join(', ')}`,
    });
  }

  return sendSuccess(reply, { message: 'Valid' });
});
```

---

## Troubleshooting

### Issue: Type errors in existing code
**Solution:** This is expected. Types will be updated as we migrate each route.

### Issue: FastifyRequest augmentation not recognized
**Solution:**
```bash
# Ensure tsconfig.json includes:
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./src/types"]
  }
}
```

### Issue: Logger not compatible with Fastify
**Solution:** Winston logger works with Fastify. Ensure it's imported correctly.

---

## Completion Checklist

- [ ] `types/fastify.ts` created with core types
- [ ] `fastifyErrorHandler.ts` created and registered
- [ ] `fastifyControllerWrapper.ts` created with catchAsync and withAuth
- [ ] `fastifyErrors.ts` created for error handling
- [ ] `fastifyResponse.ts` created with helper functions
- [ ] `fastifyValidation.ts` created with validation helpers
- [ ] `performanceMonitoring.ts` created and registered
- [ ] All files build successfully
- [ ] Type checking passes
- [ ] Exports organized in index files

---

## Next Session

**SESSION 3:** Authentication Middleware
- Migrate JWT authentication logic
- Implement CSRF protection for Fastify
- Create authentication hooks

---

## Notes for Agent

- All utilities are backward-compatible during migration
- Express files remain untouched
- New Fastify utilities use clear naming convention
- Test types compile before proceeding to Session 3

**Session Status:** Ready for execution
