# App Structure

This NestJS app mirrors the layered structure used by `law-prep-linear-visualizer`.
HTTP and websocket entrypoints live under `controllers/`, reusable shared services live under `core/`, room orchestration lives under `features/`, shared local types live under `contracts/`, and test support stays under `testing/`.

Visual diagram: [app-structure.treeview.mmd](./app-structure.treeview.mmd)

```text
src/app
+-- AGENTS.md
+-- README.md
+-- app-structure.treeview.mmd
+-- app.bootstrap.ts
+-- app.module.ts
+-- contracts/
|   +-- rooms.types.ts
+-- controllers/
|   +-- app.controller.ts
|   +-- rooms.controller.ts
|   +-- rooms.dtos.ts
|   +-- rooms.gateway.ts
+-- core/
|   +-- rooms-config/
|   +-- rooms-errors/
|   |   +-- rooms-errors.service.ts
|   +-- rooms-rules-engine/
|   +-- rooms-snapshot/
|   |   +-- rooms-snapshot-mapper.service.ts
|   +-- rooms-store/
|   |   +-- rooms-store.service.ts
+-- features/
|   +-- rooms-chat/
|   +-- rooms-lifecycle/
|   +-- rooms-match/
|   +-- rooms-moderation/
+-- testing/
    +-- http-contract.spec.ts
    +-- realtime-contract.spec.ts
    +-- rooms-services.spec.ts
    +-- test-fixtures.ts
```
