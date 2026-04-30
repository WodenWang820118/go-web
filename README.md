# gx.go

`gx.go` is a playable Go and Gomoku app built in an Nx workspace. It has an
Angular frontend, a Nest backend for hosted rooms, and shared TypeScript domain
rules that both sides use.

The app is already useful for real play: you can run local matches in the
browser, create shareable hosted rooms, spectate live games, chat in rooms,
resolve Go color assignment with digital `nigiri`, finish Go games through
dead-stone review and scoring agreement, and start rematches after a result.

## Start Here

Install dependencies from the repo root:

```bash
pnpm install
```

Run the full local stack:

```bash
pnpm nx serve go-web
```

That starts the Angular app and, through the `go-web:serve` dependency, the
Nest room server. The frontend uses `apps/go-web/proxy.conf.json` to route
`/api/*` and `/socket.io/*` to the backend during development.

If you only need one side:

```bash
pnpm go-web:dev
pnpm go-server:dev
```

`pnpm go-web:dev` skips task dependencies, so it is best for frontend-only work
or when the backend is already running.

## What Works Today

### Play

- Local Go on 9x9, 13x13, or 19x19 boards
- Local Gomoku on a fixed 15x15 board
- Browser-session local match state
- Digital `nigiri` before Go matches
- Pass, resign, captures, selectable ko rules, komi, dead-stone review, and
  selectable Go scoring
- Exact-five Gomoku wins, draw detection, and overline handling

### Hosted Rooms

- Create and share rooms from the lobby
- Seat two players and allow extra participants to watch as spectators
- Auto-start once both seats are ready
- Use REST for room creation/join/list/close and Socket.IO for live presence,
  game commands, room settings, chat, moderation, rematches, and notices
- Chat in the room, with host mute/unmute and kick actions for eligible
  non-host participants
- Close a hosted room as the host
- Resolve hosted Go colors with digital `nigiri`
- Run hosted matches with server-authoritative byo-yomi clocks
- Accept or decline rematches after a finished game

### Product Surface

- Routes for lobby, setup, local play, hosted rooms, and privacy preferences
- UI localization catalogs for `zh-TW`, `zh-CN`, `ja-JP`, and `en`
- Route-aware SEO metadata, canonical links, alternate locale links, Open Graph,
  and Twitter card tags
- Analytics consent controls and privacy page without tracking before consent
- Shared contracts for REST responses and Socket.IO payloads

## Workspace Map

| Project                | Path                        | What to look for                                            |
| ---------------------- | --------------------------- | ----------------------------------------------------------- |
| `go-web`               | `apps/go-web`               | Angular composition root, app config, SEO, public assets    |
| `go-server`            | `apps/go-server`            | Nest REST API, Socket.IO gateway, hosted-room orchestration |
| `go-web-e2e`           | `apps/go-web-e2e`           | Playwright journeys for local play and hosted rooms         |
| `@gx/go/feature-shell` | `libs/go/web/feature-shell` | Route pages, lobby, online room UI, local play screens      |
| `@gx/go/state`         | `libs/go/web/state`         | Client state, guards, adapters, i18n, analytics, config     |
| `@gx/go/ui`            | `libs/go/web/ui`            | Standalone Angular presentation components                  |
| `@gx/go/domain`        | `libs/go/shared/domain`     | Framework-free Go/Gomoku rules, board utilities, types      |
| `@gx/go/contracts`     | `libs/go/shared/contracts`  | Shared REST DTOs and realtime event contracts               |
| `workspace-tooling`    | `tools`                     | Review gates, E2E helpers, Docker export, format tooling    |

## Common Commands

```bash
pnpm nx run go-web:lint
pnpm nx run go-web:test
pnpm nx run go-web:typecheck
pnpm nx run go-server:lint
pnpm nx run go-server:test
pnpm nx run go-server:typecheck
pnpm nx run go-web-e2e:e2e
pnpm nx run-many -t test
pnpm nx run go-web:build:production
pnpm nx run go-server:build
pnpm format:check
pnpm nx graph
```

Prefer `pnpm nx ...` for workspace tasks so Nx uses the repo-local toolchain.

## Routes And Backend Boundaries

Frontend routes:

- `/` hosted multiplayer lobby and default app entry
- `/setup/:mode` local match setup for `go` or `gomoku`
- `/play/:mode` local active match view
- `/online` legacy redirect to `/`
- `/online/new` legacy redirect to `/`
- `/online/room/:roomId` hosted room view
- `/privacy` analytics consent and storage information
- `**` wildcard redirect to `/`

Backend HTTP routes use the `/api` prefix:

- `GET /api/health`
- `GET /api/rooms`
- `POST /api/rooms`
- `GET /api/rooms/:roomId`
- `POST /api/rooms/:roomId/join`
- `POST /api/rooms/:roomId/close`

Realtime room traffic uses Socket.IO at `/socket.io`.

## Rules In This Build

Hosted rooms currently use a single-process in-memory room store. If the server
process restarts, active rooms are lost and players need to create or join a new
room. Multi-node hosted-room coordination is not supported yet; color
assignment, match clocks, chat, moderation, rematch state, and scoring agreement
all remain scoped to that same single-process boundary until durable room
persistence is added.

### Go

- Board sizes: 9x9, 13x13, and 19x19. The default setup size is 19x19.
- Black plays first after color assignment.
- Groups with no liberties are captured immediately.
- Suicide is illegal.
- Ko can use either basic ko, which blocks immediate recapture of the previous
  position, or positional superko, which blocks recreating any previous board
  position from the current game.
- White receives 6.5 komi.
- Pass and resign are both supported.
- Two consecutive passes open a dead-stone review instead of ending the game
  immediately.
- Scoring can use area scoring or manual Japanese territory scoring. Area
  scoring counts live stones on the board plus surrounded territory, with komi
  added for White. Japanese territory scoring counts surrounded territory plus
  prisoner points and White komi; prisoner points include captures and opponent
  stones manually marked dead during scoring review.
- During scoring review, players can mark dead groups. Changing dead stones
  clears confirmations, both players must confirm to finish, and either player
  can dispute to resume play from the post-pass board.
- This build does not provide automatic life-and-death assistance, seki
  detection, or neutral-point marking.
- Go color assignment uses digital `nigiri`: one side guesses odd or even, and
  the winner is assigned Black before the match starts.
- Hosted rooms use server-authoritative byo-yomi clocks by default: 10 minutes
  main time plus 5 periods of 30 seconds per player. Local play remains untimed
  in this build.
- Traditional note: Go clocks vary by event and can use byo-yomi, Canadian
  overtime, or Fischer-style increment; this build intentionally uses a single
  hosted byo-yomi preset for now.

### Gomoku

- The board is fixed at 15x15.
- The ruleset is standard exact-five Gomoku with a free opening; Black moves
  first and there is no opening swap flow.
- Players alternate placing stones on empty intersections.
- Pass is not available.
- Resignation is supported.
- A horizontal, vertical, or diagonal line of exactly five stones wins
  immediately.
- Overlines of six or more stones do not win by themselves.
- If the board fills without a winning line, the game ends in a draw.
- Tournament note: Renju forbidden patterns for Black and opening-balance rules
  such as Swap2 are not enforced in this build.

## Docker And Deployment

### Local Compose Workflow

Use these when you want to run the stack locally with Docker Compose:

```bash
pnpm docker:up
pnpm docker:down
```

- `pnpm docker:up` runs `docker compose up -d --build`, so it rebuilds the
  images before starting the stack.
- `pnpm docker:down` stops the Compose stack.
- The web container is published on port `8080`.

### Synology Export Workflow

Use this path when you want tarball exports for Synology:

```bash
pnpm docker:export
```

- `pnpm docker:export` already runs `pnpm docker:build` before exporting.
- The exported tarballs are written to `dist/docker/gx-go-web.tar` and
  `dist/docker/gx-go-server.tar`.
- If you only want to refresh the local images without exporting tarballs, run
  `pnpm docker:build`.

The supported Synology deployment guide lives in
[deploy/synology/README.md](deploy/synology/README.md).

## Architecture Notes

- `apps/go-web` provides app-wide configuration, analytics consent wiring, SEO
  metadata, and lazy-loads `@gx/go/feature-shell`.
- `@gx/go/feature-shell` owns route containers, the lobby, hosted-room pages,
  local setup/play pages, and room interaction flows.
- `@gx/go/state` holds client state, route guards, session persistence, i18n,
  analytics helpers, socket adapters, and frontend config tokens.
- `@gx/go/ui` stays presentational and reusable.
- `@gx/go/domain` stays framework-free so frontend, backend, and contracts share
  the same game model and rules engine.
- `@gx/go/contracts` is the shared boundary for REST responses and Socket.IO
  payloads.
- `apps/go-server` keeps hosted-room lifecycle, match state, clocks, chat,
  moderation, and realtime broadcasting server-authoritative.

## What Likely Comes Next

The clearest next-phase work is still around making hosted rooms more durable
and configurable:

- Add durable hosted-room persistence and decide how timers should survive
  server restart or multi-node deployment.
- Add configurable hosted time-control presets beyond the current default.
- Consider automatic Go life-and-death assistance, seki detection, or
  neutral-point marking after the current manual scoring review proves stable.
- Decide whether Gomoku needs an opening-balance flow such as Swap2 or
  Renju-style forbidden-move rules.
