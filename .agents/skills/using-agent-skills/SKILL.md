---
name: using-agent-skills
description: Discovers and invokes the repo-local skill set. Use when starting work or when you need to choose the right workflow for the current task.
---

# Using Agent Skills

## Overview

This repository uses a curated skill set instead of the full upstream catalog.
Treat this file as the discovery layer for the skills that are actually installed in `.agents/skills` and the reviewer personas that are installed in `.agents/reviewers`.

## Canonical Sources

1. `AGENTS.md` defines the mandatory workflow and review checkpoints.
2. `.agents/skills` contains the installed repo-local skills.
3. `.agents/reviewers` contains second-opinion reviewer personas.

Do not route work to skills that are not installed in this repository.

## Installed General Skills

- `spec-driven-development`
- `planning-and-task-breakdown`
- `incremental-implementation`
- `test-driven-development`
- `code-review-and-quality`
- `debugging-and-error-recovery`
- `frontend-ui-engineering`
- `api-and-interface-design`
- `security-and-hardening`

## Installed Repo Skills

- `nx-generate`
- `nx-workspace`
- `nx-run-tasks`
- `nx-plugins`
- `nx-import`
- `link-workspace-packages`
- `monitor-ci`
- `proofshot`

## Routing Guide

Use the smallest set of skills that matches the task.

- New feature or significant behavior change:
  `spec-driven-development` -> `planning-and-task-breakdown` -> `incremental-implementation` -> `test-driven-development` -> `code-review-and-quality`
- Bug fix or failing behavior:
  `debugging-and-error-recovery` -> `test-driven-development` -> `code-review-and-quality`
- UI-heavy work:
  add `frontend-ui-engineering`
- API, schema, or contract work:
  add `api-and-interface-design`
- Security-sensitive work:
  add `security-and-hardening`
- Nx workspace exploration:
  `nx-workspace`
- Nx task execution:
  `nx-run-tasks`
- Nx scaffolding or setup:
  `nx-generate`
- Nx plugin discovery or installation:
  `nx-plugins`
- Importing code into the monorepo:
  `nx-import`
- Workspace dependency linking:
  `link-workspace-packages`
- Nx Cloud CI monitoring:
  `monitor-ci`
- Browser-verifiable UI proof, screenshots, or video evidence:
  `proofshot`

## Reviewer Routing

The primary agent must use reviewer personas from `.agents/reviewers` at the checkpoints defined in `AGENTS.md`.

- Planning, interfaces, schemas, or multi-file design:
  `architecture-reviewer.md`
- Tests, bug fixes, or regression proof:
  `test-reviewer.md`
- Auth, secrets, filesystem, shell, network, or untrusted input:
  `security-reviewer.md`
- UI, UX, accessibility, responsive layout, or user-facing states:
  `ux-reviewer.md`

## ProofShot Usage

Use `proofshot` only for browser-verifiable frontend work.

- Good fit:
  `go-web` UI flows, screenshots, video proof, visual verification, user-requested browser proof
- Bad fit:
  backend-only tasks, server-only changes, library-only work with no browser flow

## Operating Rules

1. Start with a spec for any non-trivial task.
2. Break the work into small verifiable chunks before implementing.
3. Use a second-opinion reviewer at plan, implementation, and test checkpoints.
4. Prefer repo-local Nx skills before improvising workspace commands.
5. Verify the result with tests or concrete task output before calling the work done.
