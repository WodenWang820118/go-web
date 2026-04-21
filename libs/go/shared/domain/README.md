# go-domain

Framework-free Go and Gomoku domain model for the workspace.

Physical root: `libs/go/shared/domain`

## Responsibilities

- Defines shared game types such as board size, player color, move commands, and match state
- Provides board utilities and the rules engine implementations
- Stays reusable from Angular, Nest, and shared contracts without bringing in framework dependencies

## Public API

Import from `@gx/go/domain`.

Key exports include:

- domain `types`
- board helpers from `board/` (`board-state`, `group-analysis`, `move-notation`, `player-utils`, `point-utils`, `winning-line`)
- metadata helpers from `metadata/game-mode-meta`
- rules engine contracts from `rules/rules-engine`
- engine implementations from `engines/go-rules-engine` and `engines/gomoku-rules-engine`
- `rules-engine-registry`

## Validation

```bash
pnpm nx run go-domain:test
pnpm nx run go-domain:typecheck
```
