# CORS Issue Fix Guide

## Problem

The frontend (running on `http://localhost:4173`) is being blocked by CORS policy:

**Error 1** (Initial):
```
Access to XMLHttpRequest at 'http://localhost:5000/api/auth/login' from origin 'http://localhost:4173' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Error 2** (After initial fix):
```
Access to XMLHttpRequest at 'http://localhost:5000/api/auth/login' from origin 'http://localhost:4173' 
has been blocked by CORS policy: Request header field x-xsrf-token is not allowed by 
Access-Control-Allow-Headers in preflight response.
```

## Root Cause

Two issues:
1. The `@fastify/cors` plugin was not configured with explicit allowed origins
2. The frontend sends `x-xsrf-token` header (lowercase with XSRF) but CORS config only allowed `X-CSRF-Token`

**Important**: HTTP headers are case-insensitive, but CORS `Access-Control-Allow-Headers` requires exact matches including case variations that the frontend might send.

## Current Configuration

File: `backend/src/plugins/cors.ts`

```typescript
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import { config } from '../config/env';
import logger from '../utils/logger';

async function cors(fastify: FastifyInstance) {
    const allowedOrigins = [
        config.clientOrigin,
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:4173'
    ].filter((origin): origin is string => !!origin);

    logger.info(`CORS: Allowed origins - ${allowedOrigins.join(', ')}`);

    // Register @fastify/cors plugin with simplest config first
    await fastify.register(fastifyCors);
}

export const corsPlugin = fp(cors, {
    name: 'cors-plugin'
});
```

## Solution

Replace the entire `backend/src/plugins/cors.ts` file with this working configuration:

```typescript
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import { config } from '../config/env';
import logger from '../utils/logger';

async function cors(fastify: FastifyInstance) {
    const allowedOrigins = [
        config.clientOrigin,
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:4173'
    ].filter((origin): origin is string => !!origin);

    logger.info(`CORS: Allowed origins - ${allowedOrigins.join(', ')}`);

    // Register @fastify/cors with proper configuration
    await fastify.register(fastifyCors, {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type', 
            'Authorization', 
            'X-CSRF-Token',
            'x-csrf-token',
            'X-XSRF-Token',
            'x-xsrf-token',
            'Cookie'
        ],
        exposedHeaders: ['X-CSRF-Token', 'x-csrf-token', 'Set-Cookie']
    });
}

export const corsPlugin = fp(cors, {
    name: 'cors-plugin',
    fastify: '5.x'
});
```

## Steps to Apply Fix

1. **Stop the backend server** (if running)
   ```bash
   pkill -f "node.*dist/server"
   ```

2. **Update the CORS plugin file**
   - Open `backend/src/plugins/cors.ts`
   - Replace the entire content with the solution code above

3. **Rebuild the backend**
   ```bash
   cd backend
   npm run build
   ```

4. **Restart the backend**
   ```bash
   npm start
   # OR for development:
   npm run dev
   ```

5. **Test CORS**
   ```bash
   curl -I http://localhost:5000/api/auth/me -H "Origin: http://localhost:4173"
   ```

   You should see headers like:
   ```
   access-control-allow-origin: http://localhost:4173
   access-control-allow-credentials: true
   ```

## Verification

Test from the browser console:
```javascript
fetch('http://localhost:5000/api/auth/me', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## Alternative: Temporary Development Fix

If you need a quick fix for development only, you can allow all origins:

```typescript
await fastify.register(fastifyCors, {
    origin: true,  // WARNING: Only for development!
    credentials: true
});
```

**⚠️ WARNING**: Never deploy `origin: true` to production! Always specify allowed origins explicitly.

## Troubleshooting

### If CORS headers still don't appear:

1. **Check the .env file has CLIENT_ORIGIN set**:
   ```bash
   grep CLIENT_ORIGIN backend/.env
   ```
   Should output: `CLIENT_ORIGIN=http://localhost:4173`

2. **Verify Fastify CORS package version**:
   ```bash
   grep "@fastify/cors" backend/package.json
   ```
   Should be: `"@fastify/cors": "^11.2.0"`

3. **Check server logs** for CORS plugin initialization:
   ```
   {"level":"info","message":"CORS: Allowed origins - http://localhost:4173, ..."}
   ```

4. **Test OPTIONS preflight**:
   ```bash
   curl -X OPTIONS http://localhost:5000/api/auth/login \
     -H "Origin: http://localhost:4173" \
     -H "Access-Control-Request-Method: POST" \
     -v
   ```

### Common Issues:

1. **Port mismatch**: Frontend runs on 4173, but .env has 5173
   - Update `.env` to match frontend port

2. **Server not restarted**: Changes don't apply until rebuild + restart
   - Always run `npm run build` after changing TypeScript files

3. **Browser cache**: Old CORS errors cached
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Clear site data in DevTools

4. **Multiple node processes**: Old server still running
   - Kill all: `pkill -9 -f node`
   - Verify: `ps aux | grep node`

## Expected Behavior After Fix

✅ OPTIONS preflight requests return CORS headers  
✅ Actual GET/POST requests return CORS headers  
✅ Credentials (cookies) are sent and received  
✅ No CORS errors in browser console  

## Related Files

- `backend/src/plugins/cors.ts` - CORS configuration
- `backend/src/app.ts` - Plugin registration
- `backend/.env` - CLIENT_ORIGIN environment variable
- `backend/src/config/env.ts` - Config loading

## Additional Notes

- The CORS plugin must be registered FIRST, before other plugins
- The `fastify-plugin` wrapper ensures CORS applies globally
- Credentials support requires explicit origin (can't use `*`)
- The `exposedHeaders` allows frontend to read custom headers

## Status

**Current Status**: CORS plugin configured but needs rebuild/restart  
**Expected Result**: All CORS errors should be resolved  
**Priority**: High - Blocks frontend development
