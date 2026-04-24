# gx.go

`gx.go` is a playable Go + Gomoku app inside an Nx workspace. The current build supports quick local matches, hosted multiplayer rooms, spectators, room chat, and rematch flows, with Angular on the frontend, Nest on the backend, and shared TypeScript domain rules across both.

## What You Can Do Today

- Start local Go on 9x9, 13x13, or 19x19 boards
- Start local Gomoku on a fixed 15x15 board
- Create hosted rooms with two player seats plus spectators
- Watch live games, chat in-room, and use rematch prompts after a result
- Use the same shared rules engine for frontend and backend match state

## Workspace Overview

### Go stack

| Project                | Path                        | Purpose                                                    |
| ---------------------- | --------------------------- | ---------------------------------------------------------- |
| `go-web`               | `apps/go-web`               | Angular frontend and composition root                      |
| `go-server`            | `apps/go-server`            | Nest backend for hosted rooms and realtime events          |
| `go-web-e2e`           | `apps/go-web-e2e`           | Playwright end-to-end tests for the Go app                 |
| `@gx/go/feature-shell` | `libs/go/web/feature-shell` | Lazy route shell and page-level feature orchestration      |
| `@gx/go/state`         | `libs/go/web/state`         | Client state, guards, adapters, and frontend config tokens |
| `@gx/go/ui`            | `libs/go/web/ui`            | Standalone presentational Angular components               |
| `@gx/go/domain`        | `libs/go/shared/domain`     | Pure rules engine, board utilities, and domain types       |
| `@gx/go/contracts`     | `libs/go/shared/contracts`  | Shared room DTOs and socket payloads for frontend/backend  |

## Local Development

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
pnpm nx run go-web-e2e:e2e
pnpm nx run-many -t test
pnpm nx run go-web:build:production
pnpm nx run go-server:build
pnpm nx graph
```

## Current Routes

- `/` hosted multiplayer lobby and default app entry
- `/online` legacy redirect to `/`
- `/online/new` legacy redirect to `/`
- `/online/room/:roomId`
- `/setup/:mode`
- `/play/:mode`

## Rules In This Build

Hosted rooms currently use a single-process in-memory room store. If the server
process restarts, active rooms are lost and players need to create or join a new
room. Multi-node hosted-room coordination is not supported yet; future fair
opening and server-clock work is scoped to that same single-process boundary
until durable room persistence is added.

### Go

- Board sizes: 9x9, 13x13, and 19x19. The default setup size is 19x19.
- Black always plays first in the product today.
- Groups with no liberties are captured immediately.
- Suicide is illegal.
- Only basic ko is enforced: immediate recapture of the previous position is blocked, but positional superko is not implemented.
- White receives 6.5 komi.
- Pass and resign are both supported.
- Two consecutive passes currently end the game immediately.
- Scoring currently uses area scoring: stones on the board plus surrounded territory, with komi added for White.
- The current double-pass flow does not run a dead-group dispute phase or automatic life-and-death detection. In practice, all stones left on the board are counted as alive when the result is finalized.
- Traditional note: even games are often color-assigned with `nigiri` (one player hides a handful of stones and the other guesses odd or even). The current product does not implement nigiri; players choose seats and Black starts.
- Traditional note: Go clocks often use byo-yomi, Canadian overtime, or Fischer-style increment depending on the setting. The hosted-room clock in this build is still decorative and does not enforce time.

### Gomoku

- The board is fixed at 15x15.
- The ruleset is standard exact-five Gomoku with a free opening; Black moves first and there is no opening swap flow.
- Players alternate placing stones on empty intersections.
- Pass is not available.
- Resignation is supported.
- A horizontal, vertical, or diagonal line of exactly five stones wins immediately.
- Overlines of six or more stones do not win by themselves.
- If the board fills without a winning line, the game ends in a draw.
- Tournament note: Renju forbidden patterns for Black and opening-balance rules such as Swap2 are not enforced in this build.

## Docker And Deployment

### Local Compose Workflow

Use these when you want to run the stack locally with Docker Compose:

```bash
pnpm docker:up
pnpm docker:down
```

- `pnpm docker:up` runs `docker compose up -d --build`, so it rebuilds the images before starting the stack.
- `pnpm docker:down` stops the Compose stack.
- The web container is published on port `8080`.

### Synology Export Workflow

Use this path when you want tarball exports for Synology:

```bash
pnpm docker:export
```

- `pnpm docker:export` already runs `pnpm docker:build` before exporting.
- The exported tarballs are written to `dist/docker/gx-go-web.tar` and `dist/docker/gx-go-server.tar`.
- If you only want to refresh the local images without exporting tarballs, run `pnpm docker:build`.

The supported Synology deployment guide lives in [deploy/synology/README.md](deploy/synology/README.md).

## Go Frontend Architecture

- `apps/go-web` provides `GO_SERVER_ORIGIN` at the composition root and lazy-loads `@gx/go/feature-shell`
- `@gx/go/feature-shell` owns route containers and multiplayer orchestration
- `@gx/go/state` holds client state, route guards, session persistence, and frontend configuration helpers
- `@gx/go/ui` stays presentational and reusable
- `@gx/go/domain` stays framework-free so frontend, backend, and contracts can share the same game model
- `@gx/go/contracts` is the shared boundary for REST responses and Socket.IO payloads

## What Likely Comes Next

These are the clearest next-phase issues based on the current implementation and the surrounding rule references:

- Choose and implement a real Go scoring and dispute flow instead of immediate double-pass finalization with every remaining stone treated as alive
- Decide whether color/opening assignment should stay manual or add a fair selection flow such as nigiri
- Replace the decorative hosted-room clock with server-authoritative time controls
