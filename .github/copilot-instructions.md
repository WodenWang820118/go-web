# Copilot Bridge Instructions

- `AGENTS.md` is the canonical repository instruction file. Follow it first.
- For this repository, GitHub Copilot on a Claude-family model is the preferred reviewer for plans, implementations, and tests created in any tool.
- Project skills live in `.agents/skills`. Do not recreate `.github/skills` copies.
- Reviewer personas live in `.agents/reviewers`. Custom Copilot agents live in `.github/agents`.
- A hard pre-implementation guardrail is configured in `.github/hooks/review-gate.json`.
- For any non-trivial task, follow the mandatory lifecycle in `AGENTS.md`: `plan -> review -> implement -> review -> tests -> review`.
- Keep the review session on a Claude-family model when possible.
- When using Copilot CLI, prefer a Claude-family orchestrator and run `/experimental` so Rubber Duck can provide a second opinion.
- Force a Rubber Duck or second-opinion review after a drafted plan, after a complex implementation, and after tests are written but before they are executed.
- If Rubber Duck is not available for the current model/account, use the matching reviewer in `.github/agents`.
- If the user asks for `critique`, `review`, `second opinion`, or `rubber duck`, always trigger a second-opinion pass.
- If a plan review passes and implementation should begin, open the gate with `pnpm review:approve-pre-implementation -- --reviewer copilot-claude --focus <area> --summary "<approval summary>"`.
- If the gate should be closed again, run `pnpm review:reset`.
- For browser-verifiable UI proof requests, use `pnpm proofshot:check`, `pnpm proofshot:start:web`, and `pnpm proofshot:stop`, then review the resulting `proofshot-artifacts/` with the dedicated proofshot review prompt.
- Run workspace tasks through `pnpm nx ...` and inspect project configuration before guessing targets or flags.
- Keep repo topology in mind: Angular frontend, Nest backend, Playwright e2e coverage, and shared Go libraries.
