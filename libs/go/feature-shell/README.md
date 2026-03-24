# go-feature-shell

Angular feature library for the Go application routes and page-level orchestration.

## Responsibilities

- Exports the lazy route tree through `goFeatureShellRoutes`
- Hosts the top-level page containers for the lobby-first `/` home route, `/online/room/:roomId`, `/setup/:mode`, and `/play/:mode`
- Preserves legacy hosted-lobby redirects from `/online` and `/online/new` back to `/`
- Keeps hosted-room coordination in frontend services such as `OnlineLobbyService` and `OnlineRoomService`
- Uses internal presenter components for the room hero, participants panel, and chat panel so the route container stays thin

## Public API

Import from `@gx/go/feature-shell`.

Public entrypoints currently include:

- `goFeatureShellRoutes`
- `LandingPageComponent`
- `OnlineCreatePageComponent`
- `OnlineLobbyPageComponent`
- `OnlineRoomPageComponent`
- `SetupPageComponent`
- `PlayPageComponent`

`LandingPageComponent` and `OnlineCreatePageComponent` remain exported, but they are no longer part of the active hosted-room route flow.

Presenter components and room helper modules under `src/lib/pages` and `src/lib/online` are internal implementation details.

## Validation

```bash
npm exec nx -- run go-feature-shell:lint
npm exec nx -- run go-feature-shell:test
```
