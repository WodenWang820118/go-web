# Guidance for Debugging and Error Recovery

## Stop-The-Line Discipline

- Do not stack new feature work on top of a failing baseline.
- Capture logs, error text, repro steps, and environment details before changing the system again.

## Diagnostic Order

1. reproduce
2. localize
3. reduce
4. inspect the contract or expectation that is broken
5. fix the smallest root cause

## Useful Questions

- Is the failure in the code, the test, or the environment?
- Did the breakage start after a known change?
- Is there shared state, timing, or configuration involved?
- Can the problem be reduced to a minimal failing case?

## Recovery Guardrails

- Add a regression test when the behavior can be captured deterministically.
- State clearly if the final verification is partial or environment-limited.
- If the issue is non-reproducible, document the observed conditions and the next monitoring step.
