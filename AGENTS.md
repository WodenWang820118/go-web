# Agent Workflow

This repository uses `AGENTS.md` as the single source of truth for agent behavior.
Project skills live in `.agents/skills`, reviewer personas live in `.agents/reviewers`, and tool-specific bridge files such as `.github/copilot-instructions.md` must defer to this file instead of redefining the workflow.

## Canonical Context

- Follow `AGENTS.md` first, then load the smallest relevant set of skills.
- The preferred reviewer across all tools is GitHub Copilot running a Claude-family model.
- Skill precedence is fixed:
  1. `AGENTS.md`
  2. local Nx and repo skills in `.agents/skills`
  3. reviewer personas in `.agents/reviewers`
  4. vendored general-purpose skills in `.agents/skills`
- Treat `.agents/skills` as the canonical skill directory for this repo.
- Do not recreate `.github/skills` or `.gemini/skills` copies unless a tool proves it cannot read `.agents/skills`.
- Use `using-agent-skills` to choose the smallest helpful workflow. For non-trivial work, the default path is `spec-driven-development` -> `planning-and-task-breakdown` -> `incremental-implementation` -> `test-driven-development` -> `code-review-and-quality`.
- A repo-level pre-implementation gate is enforced through `.github/hooks/review-gate.json`. On a clean worktree, Copilot will deny mutating tool calls until a plan review approval is recorded.
- `proofshot` is an optional repo-local verification skill for browser-verifiable UI work. It does not replace tests, and it does not participate in the pre-implementation gate.

## Mandatory Review Lifecycle

For any non-trivial task, the primary agent must use a second opinion before moving forward. "Non-trivial" means anything beyond a typo, formatting-only tweak, or a clearly mechanical one-line change.

The ideal review path is:

1. plan or implementation is produced in the active tool
2. GitHub Copilot is opened on a Claude-family model
3. Copilot performs the checkpoint review using the matching reviewer agent or prompt
4. the primary tool continues only after the Copilot review is addressed

If Copilot Claude is unavailable in the current environment, fall back to the matching local reviewer persona or subagent.

### Required checkpoints

1. `Plan review`: produce a spec or implementation plan, then send it to a second reviewer.
2. `Implementation review`: after the first working implementation and self-check, send the change to a second reviewer.
3. `Test review`: after writing tests but before executing them, send the test strategy and assertions to a second reviewer.

For browser-verifiable `go-web` tasks, `proofshot` can be used after implementation and before final sign-off to generate screenshots, session video, and a local proof summary for human review.

### Guardrails

- The primary agent must not self-approve its own plan, code, or tests.
- If a reviewer reports a high-risk issue, stop, fix it, and re-run the relevant checkpoint before continuing.
- Implementation review is mandatory when a task touches 3 or more files, changes data flow, updates permissions or auth, changes persistent state, modifies process lifecycle, or alters an external contract.
- Pre-merge review must include the appropriate specialist reviewer for public APIs, auth, secrets, filesystem access, shell execution, or network behavior.
- Before the first implementation change on a clean worktree, open the gate by running `pnpm review:approve-pre-implementation -- --reviewer copilot-claude --focus <area> --summary "<approval summary>"` after the Copilot Claude plan review passes.
- Use `pnpm review:status` to inspect the gate and `pnpm review:reset` to clear it manually when needed.

## Reviewer Routing

Use the reviewer personas in `.agents/reviewers` as the default second-opinion specialists.

- Planning, schemas, APIs, state machines, migrations, or cross-file design: `architecture-reviewer.md`
- Tests, bug fixes, regressions, assertions, and coverage: `test-reviewer.md`
- Auth, secrets, filesystem, shell, process execution, network, untrusted input, or data exposure: `security-reviewer.md`
- UI, UX flows, accessibility, copy, empty/loading/error states, and responsive behavior: `ux-reviewer.md`

Use more than one reviewer if the task crosses categories.

## Visual Verification

Use `proofshot` only when the task is browser-verifiable and one of these is true:

- the user explicitly asks for `proofshot`
- the user asks for screenshots, video proof, browser proof, or visual proof
- the agent believes human-reviewable proof artifacts would materially reduce UI risk

Expected repo workflow:

1. `pnpm proofshot:check`
2. `pnpm proofshot:start:web -- --description "<flow>"`
3. drive the browser with `proofshot exec ...` or compatible browser commands
4. `pnpm proofshot:stop`
5. review local `proofshot-artifacts/` with GitHub Copilot Claude using the dedicated proofshot review prompt

`proofshot` is for `go-web` UI flows only. Do not route backend-only, server-only, or non-browser library tasks through it.

## Tool-Specific Expectations

### GitHub Copilot

- `.github/copilot-instructions.md` is a bridge file. It must not override this workflow.
- Prefer project skills from `.agents/skills`.
- GitHub Copilot on a Claude-family model is the preferred review authority for this repository.
- Copilot hooks in `.github/hooks/review-gate.json` are the hard guardrail for pre-implementation review on a clean worktree.
- When using Copilot CLI and Rubber Duck is available, prefer a Claude-family orchestrator and enable `/experimental`.
- Trigger Rubber Duck critique after a plan is drafted, after a complex multi-file implementation, and after tests are written but before they are executed.
- If Rubber Duck is unavailable, use the matching reviewer agent in `.github/agents` as the required second opinion.
- If the user explicitly asks for a critique, review, second opinion, or Rubber Duck, force a second opinion even if the task is otherwise small.
- For browser-verifiable UI proof requests, use the repo-local `proofshot` workflow and review local artifacts with the dedicated Copilot proofshot prompt.

### Gemini CLI

- Keep using `.gemini/settings.json` with `contextFileName: "AGENTS.md"`.
- For non-trivial work, pause at each checkpoint and route the second opinion through GitHub Copilot Claude when available.
- Use `.agents/reviewers` as the source of second-opinion personas at each checkpoint.

### Codex CLI

- Keep using `.codex/config.toml` as the repo-local Codex config.
- For non-trivial work, pause at each checkpoint and route the second opinion through GitHub Copilot Claude when available.
- Use the configured reviewer subagents for plan, implementation, test, and UX/security review checkpoints.

## Repo Map

- `apps/go-web`: Angular frontend and composition root
- `apps/go-server`: Nest backend for hosted rooms and realtime events
- `apps/go-web-e2e`: Playwright end-to-end tests for the Go app
- `libs/go/feature-shell`: page-level feature orchestration and route containers
- `libs/go/state`: client state, guards, adapters, and frontend config tokens
- `libs/go/ui`: standalone presentational Angular components
- `libs/go/domain`: framework-free Go rules engine, board utilities, and domain types
- `libs/go/contracts`: shared room DTOs and Socket.IO payloads for frontend/backend boundaries

Use repo-specific reviewers and skills with that topology in mind.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
