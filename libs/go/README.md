# libs/go

Shared and web-facing workspace libraries for the Go product area.

This layout follows Nx's folder-structure guidance by grouping libraries around the parts of the system that evolve together: `shared/` for cross-app boundaries and `web/` for the frontend-specific slice.

## Tracking views

- `go-web`: consume `web/feature-shell`, `web/state`, `web/ui`, plus the shared `domain` and `contracts` libraries
- `go-server`: consume the shared `domain` and `contracts` libraries; keep Nest-only orchestration in `apps/go-server`

## Folder map

- `shared/domain`: framework-free game rules, board utilities, and match types
- `shared/contracts`: shared REST and Socket.IO boundary contracts
- `web/state`: Angular state, guards, environment resolution, and local session adapters
- `web/ui`: Angular presentational components
- `web/feature-shell`: Angular route containers and hosted-room orchestration

Visual diagram: [go-structure.treeview.mmd](./go-structure.treeview.mmd)
