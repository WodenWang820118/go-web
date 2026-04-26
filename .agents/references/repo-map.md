# Repo Map

Use this topology when routing work, choosing reviewers, and discovering Nx targets.

- `apps/go-web`: Angular frontend and composition root
- `apps/go-server`: Nest backend for hosted rooms and realtime events
- `apps/go-web-e2e`: Playwright end-to-end tests for the Go app
- `libs/go/web/feature-shell`: page-level feature orchestration and route containers
- `libs/go/web/state`: client state, guards, adapters, and frontend config tokens
- `libs/go/web/ui`: standalone presentational Angular components
- `libs/go/shared/domain`: framework-free Go rules engine, board utilities, and domain types
- `libs/go/shared/contracts`: shared room DTOs and Socket.IO payloads for frontend/backend boundaries

Use repo-specific reviewers and skills with that topology in mind.
