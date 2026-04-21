# Test Refactor Review Context

- **Date:** 2026-04-21
- **Scope:** Cross-repo test maintainability refactor
- **Stage:** Post-implementation, pre-test-review

## Goal

Reduce test setup duplication and improve readability without changing production behavior or weakening assertions.

## Implemented Slices

1. Shared Vitest/Vite config helpers
   - Added `tools/testing/vitest/project-config.mts`
   - Migrated project configs in `apps/go-web`, `apps/go-server`, `libs/go/web/feature-shell`, `libs/go/web/ui`, `libs/go/web/state`, `libs/go/shared/domain`, and `libs/go/shared/contracts`
2. Shared room/lobby fixtures
   - Added `@gx/go/contracts/testing` via `libs/go/shared/contracts/src/testing.ts`
   - Added reusable builders in `libs/go/shared/contracts/src/lib/testing/room-fixtures.ts`
   - Added lint guard plus path alias so the testing entrypoint is only legal from specs and test-support files
3. Feature-shell golden-path migration
   - Extracted `online-lobby-page.test-support.ts`
   - Migrated `online-lobby-page.component.spec.ts`
   - Migrated `online-lobby.service.spec.ts`
   - Expanded `online-room-page.test-support.ts` with scenario builders
   - Refactored `online-room-page.stage-and-layout.spec.ts` to use those builders
4. E2E fixture migration
   - Added `apps/go-web-e2e/src/test-support/lobby-fixtures.ts`
   - Migrated `apps/go-web-e2e/src/example.spec.ts` to use shared lobby mocks and the existing `useEnglish` helper
5. Backend contract harness
   - Added `apps/go-server/src/app/testing/rooms-contract-harness.ts`
   - Migrated `http-contract.spec.ts` and `realtime-contract.spec.ts`

## Reviewer Focus

- Do the new helpers preserve behavior-first assertions instead of hiding too much setup detail?
- Are the shared builders small and override-friendly enough for future tests?
- Did the backend harness remove duplication without changing event ordering assumptions?
- Is the testing-only import boundary enforced in a practical, low-friction way?
- Are there any missing regression checks caused by refactoring setup into helpers?

## Verification Plan

- Run `pnpm review:test -- --context-file reference/specs/repo-test-refactor-2026-04-21.md --focus tests`
- Run targeted Nx tests for `go-feature-shell`, `go-server`, and `go-contracts`
- Run targeted Playwright coverage for the migrated example spec or an equivalent focused `go-web-e2e` slice if the full matrix is too expensive
- Run `pnpm review:implementation -- --context-file reference/specs/repo-test-refactor-2026-04-21.md --focus tests`
