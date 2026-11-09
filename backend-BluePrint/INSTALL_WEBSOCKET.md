# WebSocket Installation Instructions

## ⚠️ Action Required

The automated npm install failed due to sandbox cache restrictions.
You need to **manually install** the WebSocket packages.

## Solution: Manual Installation (5 minutes)

### Step 1: Stop the backend server
Press `Ctrl+C` in the terminal running `npm run start:dev`

### Step 2: Install packages manually
Open a **new PowerShell/CMD terminal** (outside Cursor) and run:

```bash
cd d:\BluePrint\backend-BluePrint
npm install @nestjs/websockets@^10.0.0 @nestjs/platform-socket.io@^10.0.0 socket.io@^4.7.0
```

**⚠️ Important:** Use NestJS v10 compatible versions (you have `@nestjs/common@10.4.22`)

Or if you prefer yarn:
```bash
cd d:\BluePrint\backend-BluePrint
yarn add @nestjs/websockets@^10.0.0 @nestjs/platform-socket.io@^10.0.0 socket.io@^4.7.0
```

### Step 3: Delete temporary type file
After successful installation, delete:
```
src/infrastructure/websocket/types.d.ts
```

### Step 4: Restart the backend
```bash
npm run start:dev
```

## Expected Output
After installation, you should see these packages in `package.json`:
```json
{
  "dependencies": {
    "@nestjs/websockets": "^10.x.x",
    "@nestjs/platform-socket.io": "^10.x.x",
    "socket.io": "^4.x.x"
  }
}
```

## Verification
1. Backend should start without TypeScript errors
2. Check logs for: `WebSocket Gateway initialized`
3. Frontend should connect automatically when you log in
4. Browser console should show: `Connected to WMS WebSocket`

## Troubleshooting

### If installation still fails:
1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install` again

### If types are still missing:
```bash
npm install --save-dev @types/socket.io
```

## Alternative: Use pnpm
```bash
npm install -g pnpm
cd d:\BluePrint\backend-BluePrint
pnpm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```
