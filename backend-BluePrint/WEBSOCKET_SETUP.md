# WebSocket Setup Instructions

## 1. Install Dependencies

Run in the `backend-BluePrint` directory:

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

## 2. Files Created

- `src/infrastructure/websocket/websocket.gateway.ts` — WebSocket Gateway
- `src/infrastructure/websocket/websocket.module.ts` — Module configuration
- `src/app.module.ts` — Updated to import WebSocketModule

## 3. How It Works

### Connection
Clients connect to: `ws://localhost:3030/ws?token=<JWT_ACCESS_TOKEN>`

The gateway:
1. Extracts JWT from query params
2. Verifies token using JwtService
3. Attaches `userId`, `tenantId`, `warehouseId` to socket
4. Keeps socket in `connectedClients` map

### Event Broadcasting
- Gateway listens to **all domain events** via `@OnEvent('**')`
- Events are filtered by `tenantId` (multi-tenancy isolation)
- Broadcasts to all authenticated clients in the same tenant

### Event Format
```json
{
  "type": "task.assigned",
  "payload": {
    "taskId": "uuid",
    "assignedTo": "uuid",
    "type": "PICK"
  },
  "tenantId": "uuid",
  "warehouseId": "uuid",
  "timestamp": "2026-03-18T10:00:00.000Z"
}
```

## 4. Frontend Integration

Frontend already configured in:
- `src/shared/hooks/use-websocket.ts`
- `src/widgets/layout/app-layout.tsx`

Connection is automatic when user is authenticated.

## 5. Testing

### Manual Test (Browser Console)
```javascript
const ws = new WebSocket('ws://localhost:3030/ws?token=YOUR_JWT_TOKEN');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Event:', JSON.parse(e.data));
```

### Trigger Events
Create/assign/complete tasks via API → events broadcast to all connected clients.

## 6. Production Considerations

- Update CORS origin in `websocket.gateway.ts` (currently `*`)
- Consider Redis adapter for multi-instance deployments
- Add reconnection logic on client (already implemented)
- Monitor connection count via metrics

## 7. Events Currently Emitted

From `tasks.service.ts`:
- `task.assigned`
- `task.started`
- `task.completed`
- `task.failed`
- `task.cancelled`

From `orders.service.ts`:
- `order.status_changed`
- `order.item_added`

Add more events as needed by calling `eventBus.publish()` in services.
