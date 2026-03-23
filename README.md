# gx.go

Nx workspace for two verticals:

- The Go multiplayer stack, built from Angular, Nest, and shared TypeScript libraries
- The existing shop/api sample apps that still live in the same monorepo

## Workspace overview

### Go stack

| Project | Path | Purpose |
| --- | --- | --- |
| `go-web` | `apps/go-web` | Angular frontend and composition root |
| `go-server` | `apps/go-server` | Nest backend for hosted rooms and realtime events |
| `go-web-e2e` | `apps/go-web-e2e` | Playwright end-to-end tests for the Go app |
| `@org/go/feature-shell` | `libs/go/feature-shell` | Lazy route shell and page-level feature orchestration |
| `@org/go/state` | `libs/go/state` | Client state, guards, adapters, and frontend config tokens |
| `@org/go/ui` | `libs/go/ui` | Standalone presentational Angular components |
| `@org/go/domain` | `libs/go/domain` | Pure rules engine, board utilities, and domain types |
| `@org/go/contracts` | `go/contracts` | Shared room DTOs and socket payloads for frontend/backend |

### Other workspace projects

The workspace also contains the original `shop`, `api`, and related libraries. Those remain available, but the Go stack above is the actively refactored path.

## Local development

Install dependencies from the repo root:

```bash
npm install
```

Start the Go frontend for day-to-day work:

```bash
npm exec nx -- serve go-web
```

`go-web:serve` depends on `go-server:serve`, so the hosted-room backend starts with it.

Run the backend by itself when you only need the API/socket server:

```bash
npm exec nx -- serve go-server
```

Useful workspace commands:

```bash
npm exec nx -- run-many -t lint,test,typecheck -p go-web,go-feature-shell,go-ui,go-state,go-domain,go-server
npm exec nx -- run go-web:build:production
npm exec nx -- run go-server:build
npm exec nx -- graph
```

## Go frontend architecture

- `apps/go-web` provides `GO_SERVER_ORIGIN` at the composition root and lazy-loads `@org/go/feature-shell`
- `@org/go/feature-shell` owns route containers and multiplayer orchestration
- `@org/go/state` holds client state, route guards, session persistence, and frontend configuration helpers
- `@org/go/ui` stays presentational and reusable
- `@org/go/domain` stays framework-free so frontend, backend, and contracts can share the same game model
- `@org/go/contracts` is the shared boundary for REST responses and Socket.IO payloads

Current Go routes:

- `/`
- `/online`
- `/online/room/:roomId`
- `/setup/:mode`
- `/play/:mode`

## Windows hosting

Windows laptop deployment notes live in [deploy/windows/README.md](deploy/windows/README.md). That document covers the WinSW services, Cloudflare Tunnel, Caddy, and the expected production build outputs.
