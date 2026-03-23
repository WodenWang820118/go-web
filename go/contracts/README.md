# contracts

Shared multiplayer room contracts for the Go stack.

## Responsibilities

- Defines the REST request/response DTOs used by `go-web` and `go-server`
- Defines the Socket.IO payloads and event shapes used for hosted-room realtime updates
- Provides small helper utilities such as `cloneRoomSnapshot()`

## Public API

Import from `@gx/go/contracts`.

Key exported shapes include:

- lobby and room snapshots
- room creation and join payloads
- seat, game, chat, and moderation payloads
- realtime event payloads such as presence, chat, and game updates

Keep these contracts aligned with both the Angular frontend and the Nest backend. Changes here are cross-boundary API changes.

## Validation

```bash
npm exec nx -- run contracts:test
npm exec nx -- run contracts:typecheck
```
