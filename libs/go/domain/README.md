# go-domain

Framework-free Go and Gomoku domain model for the workspace.

## Responsibilities

- Defines shared game types such as board size, player color, move commands, and match state
- Provides board utilities and the rules engine implementations
- Stays reusable from Angular, Nest, and shared contracts without bringing in framework dependencies

## Public API

Import from `@gx/go/domain`.

Key exports include:

- domain `types`
- `board-utils`
- `game-mode-meta`
- `go-rules-engine`
- `gomoku-rules-engine`
- `rules-engine-registry`

## Validation

```bash
pnpm nx run go-domain:test
pnpm nx run go-domain:typecheck
```
