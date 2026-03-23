# go-state

Client-side state and integration layer for the Go frontend.

## Responsibilities

- Exposes `GameSessionStore` and the session port abstractions used by local play
- Exposes route guards such as `activeMatchGuard` and `validModeGuard`
- Provides storage and configuration helpers for the hosted-room experience
- Defines the `GO_SERVER_ORIGIN` injection token and `resolveGoServerOrigin()` so backend origin selection happens at the app composition root

## Public API

Import from `@gx/go/state`.

Key exports include:

- `GameSessionStore`
- `GAME_SESSION_PORT`
- `LocalGameSessionAdapter`
- `activeMatchGuard`
- `validModeGuard`
- `GO_SERVER_ORIGIN`
- `resolveGoServerOrigin`

Keep pure rules and board logic in `@gx/go/domain`; keep Angular-independent room contracts in `@gx/go/contracts`.

## Validation

```bash
npm exec nx -- run go-state:test
npm exec nx -- run go-state:typecheck
```
