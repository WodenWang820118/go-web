# go-ui

Shared presentational Angular components for the Go frontend.

## Responsibilities

- Renders the game board and supporting status UI
- Stays focused on display and interaction surfaces rather than room/network orchestration
- Provides reusable standalone components consumed by `@org/go/feature-shell`

## Public API

Import from `@org/go/ui`.

Current exports include:

- `GameBoardComponent`
- `MatchSidebarComponent`
- `GameStatusChipComponent`
- `StoneBadgeComponent`
- `BoardCoordinatesComponent`

## Validation

```bash
npm exec nx -- run go-ui:lint
npm exec nx -- run go-ui:test
```
