# Plan: Default Copilot Reasoning Effort to High in gx.go

## Objective

Make `gx.go` scripted GitHub Copilot review runs default to `reasoning-effort=high`.

## Scope

- Update the local review wrapper in `gx.go` so substantive Copilot review runs include `--reasoning-effort high`.
- Keep the change surgical: no model-routing redesign, no provider fallback changes, no health-probe behavior change, and no new configuration surface.
- Add compatibility handling inside the provider so older Copilot CLI installs degrade safely instead of failing every review call.

## Concrete Entry Points

- `gx.go/tools/scripts/review/providers/copilot.ts`

## Non-Goals

- Do not change the low-cost Copilot availability probe to `high`; keep probe behavior unchanged so the review gate still uses the existing cheap health check path.
- Do not add a new free-form Copilot flag passthrough API just to support hypothetical per-call overrides.

## Planned Steps

1. Confirm the Copilot CLI entry point in this repo.
2. Verify CLI compatibility for the actual review contract by confirming `copilot --help` exposes `--reasoning-effort` and by smoke-checking provider-style invocations for the repo's default Copilot models before changing review infrastructure.
3. Add provider-level feature detection on the review-only execution path so `--reasoning-effort high` is only appended when the installed Copilot CLI supports it.
4. Add the default `high` reasoning effort only on the code path used for substantive Copilot review execution.
5. Leave the low-cost health probe path unchanged.
6. Update or add targeted tests where command arguments are asserted, including call-site coverage that distinguishes probe calls from review calls if the current suite does not already protect that split.
7. Route the new or changed tests through the mandatory test-review checkpoint.
8. Run targeted tests for the touched review-provider code.

## Risks

- Adding `high` in the wrong shared helper could accidentally raise the cost of the health probe instead of only the review call.
- This repo currently has unrelated dirty worktree files; implementation must preserve them while still following the required review checkpoints.

## Verification

- CLI compatibility check passes in this repo root by confirming `copilot --help` exposes `--reasoning-effort`.
- Provider-style smoke checks succeed for `claude-sonnet-4.6` and `gpt-5-mini` when `--reasoning-effort high` is present.
- Targeted tests for `tools/scripts/review/providers/copilot.test.ts`.
- Confirm the low-cost probe call path still omits the new `high` default.
- Confirm unsupported environments fall back to the current review command shape instead of failing on an unknown flag.
- Confirm the compatibility check and any cache stay out of the low-cost health-probe path.
- A quick diff review confirms that only Copilot CLI invocation defaults changed.
- After plan approval, open the pre-implementation gate with `pnpm review:approve-pre-implementation -- --reviewer <reviewer> --focus general --summary "<approved summary>"` before code edits continue.
