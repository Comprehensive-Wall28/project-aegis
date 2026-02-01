# System Logging to Database

## Overview
Automatic logging of warnings and errors to MongoDB secondary database for monitoring and analysis.

## Features

### ✅ Zero Performance Impact
- **Async Operations**: Non-blocking writes using fire-and-forget pattern
- **Batch Processing**: Groups logs into batches of 10 for efficient writes
- **Background Timer**: Flushes logs every 5 seconds
- **Queue System**: In-memory queue prevents blocking main operations

### ✅ Readable Documents
Stored logs have a clean, structured format:

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "level": "error",
  "message": "Database connection failed",
  "timestamp": "2026-02-01T17:30:00.000Z",
  "service": "aegis-backend",
  "method": "GET",
  "url": "/api/notes",
  "userId": "user123",
  "statusCode": 500,
  "error": "Connection timeout",
  "stack": "Error: Connection timeout\n    at ...",
  "metadata": {
    "custom": "fields",
    "any": "additional data"
  }
}
```

### ✅ Automatic Cleanup
- Logs automatically expire after 30 days (TTL index)
- No manual cleanup required

### ✅ Efficient Indexing
- Indexed on `level`, `timestamp`, `service`
- Fast queries for recent errors, specific services, etc.

## Database Storage

- **Collection**: `system_logs`
- **Database**: Secondary (falls back to primary if secondary unavailable)
- **Logged Levels**: `warn` and `error` only
- **Retention**: 30 days

## Architecture

### Components

1. **SystemLog Model** (`src/models/SystemLog.ts`)
   - MongoDB schema definition
   - Uses secondary database connection
   - TTL index for auto-cleanup

2. **MongoDBTransport** (`src/utils/MongoDBTransport.ts`)
   - Winston custom transport
   - Non-blocking batch processing
   - Background flush timer
   - Error resilient (silent failures)

3. **Logger Integration** (`src/utils/logger.ts`)
   - Enabled in production only
   - Added as Winston transport
   - Processes warn/error levels

## Usage

Logging is automatic. Use logger as normal:

```typescript
import logger from './utils/logger';

// This will be stored in DB (production only)
logger.warn('Slow database query', { 
  duration: 1500,
  query: 'find users' 
});

// This will be stored in DB (production only)
logger.error('Failed to process payment', {
  userId: 'user123',
  error: err.message,
  stack: err.stack
});

// This will NOT be stored in DB (info level)
logger.info('User logged in');
```

## Performance Characteristics

- **Latency**: 0ms (immediate return, async processing)
- **Memory**: ~1KB per 10 logs (batch size)
- **Database Load**: Minimal (batched writes, 5-second intervals)
- **CPU Impact**: Negligible (background processing)

## Querying Logs

Example MongoDB queries:

```javascript
// Recent errors in last hour
db.system_logs.find({
  level: 'error',
  timestamp: { $gte: new Date(Date.now() - 3600000) }
}).sort({ timestamp: -1 });

// Errors for specific user
db.system_logs.find({
  userId: 'user123',
  level: 'error'
}).sort({ timestamp: -1 });

// Errors by URL
db.system_logs.find({
  url: { $regex: '/api/notes' },
  level: 'error'
}).sort({ timestamp: -1 });
```

## Configuration

Environment variables:
- `NODE_ENV=production` - Enables database logging
- `LOG_LEVEL` - Override log level (default: warn in production)

## Failover Behavior

- If secondary database unavailable → Uses primary database
- If database write fails → Logs to console, continues operation
- Zero impact on application availability

## Monitoring

Check logging health:

```javascript
// Count logs by level
db.system_logs.aggregate([
  { $group: { _id: '$level', count: { $sum: 1 } } }
]);

// Errors per hour (last 24h)
db.system_logs.aggregate([
  { $match: { 
      level: 'error',
      timestamp: { $gte: new Date(Date.now() - 86400000) }
  }},
  { $group: { 
      _id: { $dateToString: { format: '%Y-%m-%d %H', date: '$timestamp' } },
      count: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
]);
```
