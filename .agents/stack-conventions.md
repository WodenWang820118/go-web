# Stack Conventions

Use this file for stack-specific coding conventions after reading `AGENTS.md`.
It is the canonical conventions source for Angular, NestJS, and shared TypeScript work in this repository.
When in doubt, prefer the patterns already used in the workspace over generic framework advice.

## Angular

- Prioritize Angular dependency injection as a first-class framework feature. Prefer injected services, tokens, and providers over ad hoc module-level singletons or manually wired globals.
- Prefer standalone components, feature route files, and app-wide providers in `app.config.ts`.
- Prefer `inject()` over constructor injection in Angular classes.
- Prefer signals, `computed()`, `effect()`, and `toSignal()` for view state and route-derived state.
- Keep page-level orchestration in `libs/go/web/feature-shell`, reusable state and adapters in `@gx/go/state`, and presentational UI in `@gx/go/ui`.
- Keep HTTP, socket, storage, and browser integration in services rather than components.
- Prefer contract and DTO reuse from shared libraries over repeating inline object shapes across the app.
- Test with Angular `TestBed`, `provideRouter()`, and focused component or service specs.

## NestJS

- Prioritize NestJS dependency injection as a first-class framework feature. Prefer providers and injected collaborators over manual object construction inside gateways, controllers, or services.
- Preserve the existing `controllers/`, `core/`, `features/`, and `testing/` split under `apps/go-server/src/app`.
- Keep controllers and gateways thin: parse transport input, delegate to services, and reuse broadcast helpers instead of mixing orchestration into transport boundaries.
- Use constructor injection for Nest providers, with `@Inject(...)` where the repository already uses it for explicit wiring.
- Keep realtime broadcasting, store updates, rules evaluation, and moderation logic in dedicated services.
- Prefer shared contracts from `@gx/go/contracts` and shared domain helpers from `@gx/go/domain` for backend/frontend boundaries.
- Test backend behavior with focused service specs and targeted HTTP or realtime contract tests where the boundary matters.

## Shared TypeScript Domain And Contracts

- Keep `libs/go/shared/domain` framework-free and mostly functional.
- Prefer small pure helpers, immutable updates, and explicit domain types for board state, rules engines, and metadata.
- Use `type` imports when importing types only, and keep contracts separate from domain logic.
- Keep transport-facing payloads in shared contracts libraries and game/rules logic in shared domain libraries.
- Favor focused Vitest specs for rules, board helpers, registry behavior, and contract mapping logic.