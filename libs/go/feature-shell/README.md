# go-feature-shell

Angular feature library for the Go application routes and page-level orchestration.

## Responsibilities

- Exports the lazy route tree through `goFeatureShellRoutes`
- Hosts the top-level page containers for `/`, `/online`, `/online/room/:roomId`, `/setup/:mode`, and `/play/:mode`
- Keeps hosted-room coordination in frontend services such as `OnlineLobbyService` and `OnlineRoomService`
- Uses internal presenter components for the room hero, participants panel, and chat panel so the route container stays thin

## Public API

Import from `@org/go/feature-shell`.

Public entrypoints currently include:

- `goFeatureShellRoutes`
- `LandingPageComponent`
- `OnlineCreatePageComponent`
- `OnlineLobbyPageComponent`
- `OnlineRoomPageComponent`
- `SetupPageComponent`
- `PlayPageComponent`

Presenter components and room helper modules under `src/lib/pages` and `src/lib/online` are internal implementation details.

## Validation

```bash
npm exec nx -- run go-feature-shell:lint
npm exec nx -- run go-feature-shell:test
```
