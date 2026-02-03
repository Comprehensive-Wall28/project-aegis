# Error Codes Reference

## Standard Error Response Format

All errors follow this JSON structure:

```json
{
  "message": "Human-readable error description",
  "stack": "Error stack trace (non-production only)"
}
```

---

## Repository Error Codes

Defined in `RepositoryErrorCode` enum:

| Code | Description | When Thrown |
|------|-------------|-------------|
| `NOT_FOUND` | Document not found | `findById` returns null when required |
| `VALIDATION_ERROR` | Mongoose validation failed | Schema validation errors |
| `DUPLICATE_KEY` | Unique constraint violation | Creating/updating with duplicate unique field |
| `INVALID_ID` | Invalid ObjectID format | `validateId` fails |
| `QUERY_ERROR` | Query execution failed | General query errors |
| `CONNECTION_ERROR` | Database connection failed | Connection pool exhausted, timeout |

---

## Service Error Mapping

Services map repository errors to HTTP status codes:

| Repository Error | Service Code | HTTP Status |
|-----------------|--------------|-------------|
| `NOT_FOUND` | `NOT_FOUND` | 404 |
| `VALIDATION_ERROR` | `VALIDATION_ERROR` | 400 |
| `DUPLICATE_KEY` | `DUPLICATE` | 409 |
| `INVALID_ID` | `INVALID_ID` | 400 |
| `QUERY_ERROR` | `INTERNAL_ERROR` | 500 |
| `CONNECTION_ERROR` | `INTERNAL_ERROR` | 500 |

---

## ServiceError Usage

```typescript
// Creating service errors
throw new ServiceError('Task not found', 404, 'NOT_FOUND');
throw new ServiceError('Invalid task status', 400, 'VALIDATION_ERROR');
throw new ServiceError('Email already exists', 409, 'DUPLICATE');
throw new ServiceError('Invalid task ID format', 400, 'INVALID_ID');

// In BaseService.handleRepositoryError()
protected handleRepositoryError(error: unknown): never {
  if (error instanceof RepositoryError) {
    switch (error.code) {
      case RepositoryErrorCode.NOT_FOUND:
        throw new ServiceError(error.message, 404, 'NOT_FOUND');
      case RepositoryErrorCode.VALIDATION_ERROR:
        throw new ServiceError(error.message, 400, 'VALIDATION_ERROR');
      case RepositoryErrorCode.DUPLICATE_KEY:
        throw new ServiceError(error.message, 409, 'DUPLICATE');
      case RepositoryErrorCode.INVALID_ID:
        throw new ServiceError(error.message, 400, 'INVALID_ID');
      default:
        throw new ServiceError('Internal server error', 500, 'INTERNAL_ERROR');
    }
  }
  throw new ServiceError('Internal server error', 500, 'INTERNAL_ERROR');
}
```

---

## HTTP Exception Filter Behavior

The global exception filter handles errors as follows:

```typescript
// Pseudo-code for exception filter logic
catch(exception) {
  if (exception instanceof ServiceError) {
    return {
      statusCode: exception.statusCode,
      message: exception.message,
      stack: isDev ? exception.stack : undefined
    };
  }
  
  if (exception instanceof HttpException) {
    // NestJS built-in exceptions
    return {
      statusCode: exception.getStatus(),
      message: exception.message,
      stack: isDev ? exception.stack : undefined
    };
  }
  
  // Unknown errors
  logger.error('Unhandled exception', exception);
  return {
    statusCode: 500,
    message: 'Internal server error',
    stack: isDev ? exception.stack : undefined
  };
}
```

---

## Common Error Scenarios

### Authentication Errors

| Scenario | Status | Message |
|----------|--------|---------|
| No token | 401 | `Authentication required` |
| Invalid token | 401 | `Invalid token` |
| Expired token | 401 | `Token expired` |
| Token version mismatch | 401 | `Session invalidated` |

### Authorization Errors

| Scenario | Status | Message |
|----------|--------|---------|
| Not room member | 403 | `Access denied` |
| Not admin | 403 | `Admin access required` |
| Not resource owner | 403 | `Permission denied` |

### Validation Errors

| Scenario | Status | Message |
|----------|--------|---------|
| Missing required field | 400 | `{field} is required` |
| Invalid email format | 400 | `Invalid email format` |
| Invalid enum value | 400 | `Invalid {field}: must be one of [...]` |
| Invalid ID format | 400 | `Invalid {field} format` |

### CSRF Errors

| Scenario | Status | Message |
|----------|--------|---------|
| Missing CSRF token | 403 | `CSRF token missing` |
| Invalid CSRF token | 403 | `Invalid CSRF token` |

---

## Error Response Examples

### 400 Bad Request
```json
{
  "message": "Invalid task status: must be one of [todo, in-progress, done]"
}
```

### 401 Unauthorized
```json
{
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "message": "Task not found"
}
```

### 409 Conflict
```json
{
  "message": "Email already exists"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error",
  "stack": "Error: ...\n    at ..." 
}
```
(stack only in development)

---

## Testing Error Responses

### Assertion Helpers

```typescript
// Test helper functions
function expectValidationError(response: Response) {
  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('message');
}

function expectNotFound(response: Response) {
  expect(response.status).toBe(404);
  expect(response.body.message).toContain('not found');
}

function expectUnauthorized(response: Response) {
  expect(response.status).toBe(401);
}

function expectForbidden(response: Response) {
  expect(response.status).toBe(403);
}
```

### Test Cases for Each Error Type

```typescript
describe('Error handling', () => {
  it('returns 400 for invalid input', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ /* invalid data */ });
    expectValidationError(res);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .get('/api/tasks');
    expectUnauthorized(res);
  });

  it('returns 404 for non-existent resource', async () => {
    const res = await authenticatedRequest(app)
      .get('/api/tasks/507f1f77bcf86cd799439011');
    expectNotFound(res);
  });
});
```

---

## NestJS Implementation Notes

### Using Built-in Exceptions

```typescript
// Can use NestJS exceptions that map to ServiceError behavior
import { 
  BadRequestException, 
  UnauthorizedException, 
  ForbiddenException, 
  NotFoundException,
  ConflictException,
  InternalServerErrorException 
} from '@nestjs/common';

// These work with the exception filter
throw new NotFoundException('Task not found');
throw new BadRequestException('Invalid email format');
```

### Custom Exception Filter

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    
    let status = 500;
    let message = 'Internal server error';
    
    if (exception instanceof ServiceError) {
      status = exception.statusCode;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }
    
    response.status(status).send({
      message,
      ...(process.env.NODE_ENV !== 'production' && { 
        stack: exception instanceof Error ? exception.stack : undefined 
      }),
    });
  }
}
```
