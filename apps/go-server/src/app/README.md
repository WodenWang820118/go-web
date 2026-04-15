# Go Server App

This NestJS app exposes the hosted room REST and Socket.IO contracts for the Go frontend.

## What it does

- Serves the public health endpoint at `GET /api/health`
- Serves hosted room REST endpoints under `GET/POST /api/rooms`
- Handles hosted room realtime events over Socket.IO at `/socket.io`

## Run locally

From the workspace root:

```bash
pnpm nx serve go-server
```

Build the app:

```bash
pnpm nx build go-server
```

Run tests:

```bash
pnpm nx test go-server
```

## Folder map

- `controllers/`: REST and websocket boundaries only
- `core/`: reusable infrastructure and shared Nest services
- `features/`: room lifecycle, match, chat, and moderation orchestration
- `contracts/`: app-local shared record and mutation types
- `testing/`: reusable fixtures plus HTTP/realtime contract coverage
