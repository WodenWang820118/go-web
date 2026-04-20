# Reviewer Routing and Lifecycle

This document holds the checkpoint routing details that should not be duplicated in entry skills.

## Mandatory Checkpoints

For any non-trivial task, get a second opinion before moving forward. The primary agent must not self-approve its own plan, code, or tests.

1. **Plan Review:** After producing a spec or implementation plan.
   Default provider order: Copilot Claude -> `gemini-2.5-pro` -> Codex fallback.
2. **Test Review:** After writing tests and before running the broad sign-off suite or using those tests as approval evidence.
   Default provider order: Copilot Claude -> local reviewer persona or Codex fallback.
3. **Implementation Review:** After the first working implementation, self-check, and reviewable verification story are ready.
   Default provider order: `gemini-3-flash-preview` -> Copilot Claude -> Codex fallback.

## Reviewer Routing

Use reviewer personas from `.agents/reviewers` as the baseline source.

- Planning, schemas, APIs, state machines, migrations, or cross-file design: `architecture-reviewer`
- Tests, bug fixes, regressions, assertions, and coverage: `test-reviewer`
- Auth, secrets, filesystem, shell, network, untrusted input, or data exposure: `security-reviewer`
- UI flows, accessibility, copy, empty/loading/error states, or responsive behavior: `ux-reviewer`

If a task crosses categories, combine the relevant reviewers.
