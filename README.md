# gx.go

Nx workspace for the Go multiplayer stack, built from Angular, Nest, and shared TypeScript libraries.

## Workspace overview

### Go stack

| Project | Path | Purpose |
| --- | --- | --- |
| `go-web` | `apps/go-web` | Angular frontend and composition root |
| `go-server` | `apps/go-server` | Nest backend for hosted rooms and realtime events |
| `go-web-e2e` | `apps/go-web-e2e` | Playwright end-to-end tests for the Go app |
| `@gx/go/feature-shell` | `libs/go/feature-shell` | Lazy route shell and page-level feature orchestration |
| `@gx/go/state` | `libs/go/state` | Client state, guards, adapters, and frontend config tokens |
| `@gx/go/ui` | `libs/go/ui` | Standalone presentational Angular components |
| `@gx/go/domain` | `libs/go/domain` | Pure rules engine, board utilities, and domain types |
| `@gx/go/contracts` | `libs/go/contracts` | Shared room DTOs and socket payloads for frontend/backend |

## Local development

Install dependencies from the repo root:

```bash
pnpm install
```

Start the Go frontend for day-to-day work:

```bash
pnpm nx serve go-web
```

`go-web:serve` depends on `go-server:serve`, so the hosted-room backend starts with it.

Run the backend by itself when you only need the API/socket server:

```bash
pnpm nx serve go-server
```

Useful workspace commands:

```bash
pnpm nx run go-web:lint
pnpm nx run go-web:test
pnpm nx run go-server:lint
pnpm nx run go-server:test
pnpm nx run go-web:build:production
pnpm nx run go-server:build
pnpm nx graph
```

## Go frontend architecture

- `apps/go-web` provides `GO_SERVER_ORIGIN` at the composition root and lazy-loads `@gx/go/feature-shell`
- `@gx/go/feature-shell` owns route containers and multiplayer orchestration
- `@gx/go/state` holds client state, route guards, session persistence, and frontend configuration helpers
- `@gx/go/ui` stays presentational and reusable
- `@gx/go/domain` stays framework-free so frontend, backend, and contracts can share the same game model
- `@gx/go/contracts` is the shared boundary for REST responses and Socket.IO payloads

Current Go routes:

- `/` hosted multiplayer lobby and default app entry
- `/online` legacy redirect to `/`
- `/online/room/:roomId`
- `/setup/:mode`
- `/play/:mode`

## Windows hosting

Windows laptop deployment notes live in [deploy/windows/README.md](deploy/windows/README.md). From the repo root, the main commands are:

```bash
pnpm deploy:windows:install
pnpm deploy:windows:restart
pnpm deploy:windows:uninstall
pnpm deploy:windows:tunnel
pnpm deploy:windows:localhost-run
pnpm deploy:windows:install-and-tunnel
pnpm deploy:windows:install-and-localhost-run
```

That document covers the WinSW services, Caddy, and the public tunnel options.
