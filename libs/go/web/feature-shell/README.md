# go-feature-shell

Angular feature library for the Go application routes and page-level orchestration.

Physical root: `libs/go/web/feature-shell`

## Responsibilities

- Exports the lazy route tree through `goFeatureShellRoutes`
- Hosts the top-level page containers for the lobby-first `/` home route, `/online/room/:roomId`, `/setup/:mode`, and `/play/:mode`
- Preserves legacy hosted-lobby redirects from `/online` and `/online/new` back to `/`
- Keeps hosted-room coordination in frontend services such as `OnlineLobbyService` and `OnlineRoomService`
- Uses internal presenter components for the room hero, participants panel, and chat panel so the route container stays thin
- Keeps route-level verification under `src/lib/testing`

## Public API

Import from `@gx/go/feature-shell`.

Public entrypoints currently include:

- `goFeatureShellRoutes`

Route-local page components, presenter components, and hosted-room helper modules under `src/lib/pages` and `src/lib/online` are internal implementation details.

## Validation

```bash
pnpm nx run go-feature-shell:lint
pnpm nx run go-feature-shell:test
```
