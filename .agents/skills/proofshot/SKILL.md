---
name: proofshot
description: Capture browser-based proof artifacts for go-web. Use when the user asks for proofshot, visual proof, screenshots, video proof, browser proof, or when a UI change would benefit from human-reviewable artifacts.
---

# ProofShot Bridge

## Overview

This repository uses ProofShot as an optional visual verification layer for
browser-verifiable frontend work. It complements Playwright e2e and Copilot
Claude review by producing human-reviewable proof artifacts such as
screenshots, session video, and a Markdown summary.

Use this skill only for `go-web` UI or browser flows. Do not use it for backend-only, server-only, or non-browser library tasks.

## When to Use

- The user explicitly says `proofshot`
- The user asks for visual proof, screenshots, video proof, or browser proof
- A frontend or UX task needs human-reviewable evidence before sign-off

## Preconditions

1. ProofShot must be installed globally on the machine:
   `npm install -g proofshot`
2. ProofShot machine-level setup must be completed once:
   `proofshot install`
3. Confirm availability in this repo:
   `pnpm proofshot:check`

If ProofShot is not installed, stop and tell the user exactly how to install it. Do not add it as a repo dependency.

## Repo Workflow

1. Start the verification session for `go-web`:

   ```bash
   pnpm proofshot:start:web -- --description "Describe the UI flow being verified"
   ```

   Defaults:

   - starts `pnpm nx run go-web:serve --port 4200`
   - uses port `4200`
   - records artifacts into `./proofshot-artifacts/`

2. Drive the browser through the target flow:

   - use `proofshot exec ...`, or
   - use `agent-browser ...` commands if available

3. Capture explicit proof moments with screenshots during the flow.

4. Stop the session and bundle artifacts:

   ```bash
   pnpm proofshot:stop
   ```

5. Review the generated artifacts in `proofshot-artifacts/`, especially:

   - `SUMMARY.md`
   - `step-*.png`
   - `session.webm`

6. Bring the artifact summary back to GitHub Copilot Claude and run a findings-first UX or correctness review.

## Output Expectations

After a successful ProofShot run, expect local artifacts only. v1 does not upload to PRs automatically.

- `proofshot-artifacts/SUMMARY.md`
- `proofshot-artifacts/step-*.png`
- `proofshot-artifacts/session.webm`

## Guardrails

- Do not treat ProofShot as a replacement for tests or review checkpoints.
- Do not run ProofShot for non-browser tasks.
- Do not commit `proofshot-artifacts/`.
- If the UI flow needs automated assertions, keep using Playwright e2e in addition to ProofShot.
