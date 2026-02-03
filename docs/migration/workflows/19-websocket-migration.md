# Workflow 19: WebSocket Migration

## Objective
Migrate Socket.IO real-time features to NestJS Gateway.

## Prerequisites
- Workflow 18 completed (social module working)
- Understanding of Socket.IO rooms and events

---

## Phase 1: Explore Current WebSocket Implementation

### Step 1.1: Socket Manager

**READ:**
```
backend/src/utils/SocketManager.ts
backend/src/server.ts  # Socket.IO initialization
```

**UNDERSTAND:**
- How Socket.IO is attached to server
- Singleton pattern for broadcast access
- Room joining/leaving logic
- Event emission patterns

### Step 1.2: Event Usage

**SEARCH for socket broadcasts:**
```bash
grep -r "socketManager" backend/src/services/
grep -r "socket" backend/src/services/
```

**DOCUMENT all events:**
- `link-posted` - new link in collection
- `link-updated` - link metadata changed
- `link-deleted` - link removed
- `comment-added` - new comment on link
- `member-joined` - user joined room
- `member-left` - user left room

---

## Phase 2: NestJS WebSocket Gateway

### Step 2.1: Create Gateway

**TASKS:**
1. Install `@nestjs/websockets` and `@nestjs/platform-socket.io`
2. Create `social.gateway.ts`:

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class SocialGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // Authenticate via cookie/token
    // Join user to their room channels
  }

  handleDisconnect(client: Socket) {
    // Cleanup
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, roomId: string) {
    // Validate membership, then join
    client.join(`room:${roomId}`);
  }

  // Broadcast methods called by services
  broadcastLinkPosted(roomId: string, link: LinkPost) {
    this.server.to(`room:${roomId}`).emit('link-posted', link);
  }
}
```

### Step 2.2: Authentication

**Socket authentication with JWT from cookie:**

```typescript
async handleConnection(client: Socket) {
  try {
    const token = client.handshake.headers.cookie
      ?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];
    
    if (!token) {
      client.disconnect();
      return;
    }

    const payload = await this.authService.verifyToken(token);
    client.data.user = payload;
  } catch {
    client.disconnect();
  }
}
```

---

## Phase 3: Service Integration

### Step 3.1: Inject Gateway into Services

```typescript
@Injectable()
export class LinkService {
  constructor(
    private readonly socialGateway: SocialGateway,
    // ...
  ) {}

  async createLink(userId: string, collectionId: string, data: CreateLinkDto) {
    const link = await this.linkRepository.create({ ... });
    
    // Broadcast to room members
    const collection = await this.collectionRepository.findById(collectionId);
    this.socialGateway.broadcastLinkPosted(collection.roomId, link);
    
    return link;
  }
}
```

---

## Phase 4: Testing

### Step 4.1: WebSocket E2E Tests

```typescript
describe('WebSocket Gateway', () => {
  let clientSocket: Socket;

  beforeEach(async () => {
    clientSocket = io('http://localhost:3001', {
      extraHeaders: {
        Cookie: `token=${validToken}`,
      },
    });
    await new Promise(resolve => clientSocket.on('connect', resolve));
  });

  afterEach(() => {
    clientSocket.disconnect();
  });

  it('should connect with valid token', () => {
    expect(clientSocket.connected).toBe(true);
  });

  it('should join room', (done) => {
    clientSocket.emit('join-room', roomId);
    clientSocket.on('joined', (id) => {
      expect(id).toBe(roomId);
      done();
    });
  });

  it('should receive link-posted event', (done) => {
    clientSocket.emit('join-room', roomId);
    clientSocket.on('link-posted', (link) => {
      expect(link.url).toBeDefined();
      done();
    });
    // Trigger link creation via HTTP
    createLinkViaHttp(collectionId, { url: 'https://example.com' });
  });
});
```

---

## Completion Checklist

- [ ] Gateway created with all events
- [ ] Authentication via token
- [ ] Room join/leave working
- [ ] Services broadcast events
- [ ] WebSocket E2E tests passing
- [ ] Code committed

## Files Created

```
backend-nest/src/modules/social/
├── social.gateway.ts
└── websocket/
    └── socket-auth.guard.ts

backend-nest/test/
└── websocket/
    └── social.ws.e2e-spec.ts
```

## Next Workflow
Proceed to [20-supporting-domains.md](./20-supporting-domains.md)
