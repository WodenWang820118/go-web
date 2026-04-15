# go-state

Client-side state and integration layer for the Go frontend.

Physical root: `libs/go/web/state`

## Responsibilities

- Exposes `GameSessionStore` and the session port abstractions used by local play
- Exposes route guards such as `activeMatchGuard` and `validModeGuard`
- Provides storage and configuration helpers for the hosted-room experience
- Defines the `GO_SERVER_ORIGIN` injection token plus a service-backed backend origin resolver for app composition
- Keeps canonical source folders under `session/`, `guards/`, `i18n/`, `server-origin/`, and `testing/`

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
- `GoServerOriginResolverService`

Keep pure rules and board logic in `@gx/go/domain`; keep Angular-independent room contracts in `@gx/go/contracts`.

## Validation

```bash
pnpm nx run go-state:test
pnpm nx run go-state:typecheck
```
