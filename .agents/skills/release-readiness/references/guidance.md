# Guidance for Release Readiness

This skill is intentionally narrower than gstack-style shipping workflows. It improves the final handoff without owning git push or deployment.

## Readiness Questions

- What changed for users, operators, or reviewers?
- What evidence proves the change is working?
- Which docs or workflow notes became stale?
- What risks remain, and are they acceptable?

## Expected Output

- change summary
- verification summary
- docs updated or docs still needed
- residual risk
- next recommended action, such as merge, manual QA, or another checkpoint

## What This Skill Does Not Do

- push branches
- create PRs
- deploy services
- auto-approve unresolved review findings
