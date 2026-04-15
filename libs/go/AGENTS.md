# libs/go Structure

This directory is organized for two reader journeys:

- `go-web`: start in `web/`, then follow imports into `shared/`
- `go-server`: start in `apps/go-server`, then follow imports only into `shared/`

This also follows the Nx guidance to group workspace folders by usage scope and change cadence instead of by technical layer alone.

Guidelines:

- Keep `shared/domain` framework-free
- Keep `shared/contracts` as the cross-boundary API layer
- Keep Angular DI, browser environment logic, guards, and route orchestration under `web/`
- Prefer injectable services for web/server orchestration logic; keep pure selectors, presenters, and domain helpers as functions

Visual diagram: [go-structure.treeview.mmd](./go-structure.treeview.mmd)
