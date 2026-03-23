# go-domain

Framework-free Go and Gomoku domain model for the workspace.

## Responsibilities

- Defines shared game types such as board size, player color, move commands, and match state
- Provides board utilities and the rules engine implementations
- Stays reusable from Angular, Nest, and shared contracts without bringing in framework dependencies

## Public API

Import from `@org/go/domain`.

Key exports include:

- domain `types`
- `board-utils`
- `game-mode-meta`
- `go-rules-engine`
- `gomoku-rules-engine`
- `rules-engine-registry`

## Validation

```bash
npm exec nx -- run go-domain:test
npm exec nx -- run go-domain:typecheck
```
