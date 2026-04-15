# go-ui

Shared presentational Angular components for the Go frontend.

Physical root: `libs/go/web/ui`

## Responsibilities

- Renders the game board and supporting status UI
- Stays focused on display and interaction surfaces rather than room/network orchestration
- Provides reusable standalone components consumed by `@gx/go/feature-shell`

## Public API

Import from `@gx/go/ui`.

Current exports include:

- `GameBoardComponent`
- `MatchSidebarComponent`
- `GameStatusChipComponent`
- `StoneBadgeComponent`
- `BoardCoordinatesComponent`

## Validation

```bash
pnpm nx run go-ui:lint
pnpm nx run go-ui:test
```
