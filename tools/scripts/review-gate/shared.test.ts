import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDenyPayload,
  createApproval,
  evaluateApproval,
  isReviewGateCommand,
  parseArgs,
  validateReviewerId,
} from './shared.ts';

test('parseArgs defaults to the Copilot reviewer and accepts Gemini or Codex fallback', () => {
  const defaults = parseArgs([]);
  assert.equal(defaults.reviewer, 'copilot-claude');
  assert.equal(defaults.focus, 'general');
  assert.equal(defaults.summary, 'Approved after pre-implementation review.');
  assert.equal(defaults.force, false);

  const parsed = parseArgs([
    '--reviewer',
    'gemini-2.5-pro',
    '--focus',
    'security',
    '--summary',
    'Approved after Gemini review',
    '--force',
  ]);

  assert.equal(parsed.reviewer, 'gemini-2.5-pro');
  assert.equal(parsed.focus, 'security');
  assert.equal(parsed.summary, 'Approved after Gemini review');
  assert.equal(parsed.force, true);

  const codexParsed = parseArgs([
    '--reviewer',
    'codex-subagent',
  ]);
  assert.equal(codexParsed.reviewer, 'codex-subagent');
});

test('validateReviewerId rejects reviewers outside the allowlist', () => {
  assert.equal(validateReviewerId('copilot-claude'), 'copilot-claude');
  assert.equal(validateReviewerId('gemini-2.5-pro'), 'gemini-2.5-pro');
  assert.equal(validateReviewerId('codex-subagent'), 'codex-subagent');
  assert.throws(
    () => validateReviewerId('claude-opus'),
    /Unsupported reviewer/
  );
});

test('isReviewGateCommand only exempts the TypeScript review-gate entrypoints', () => {
  assert.equal(
    isReviewGateCommand(
      'node --experimental-strip-types scripts/review-gate/status.ts'
    ),
    true
  );
  assert.equal(
    isReviewGateCommand('node scripts/review-gate/status.mjs'),
    false
  );
  assert.equal(isReviewGateCommand('pnpm review:status'), true);
  assert.equal(isReviewGateCommand('pnpm nx test law-prep-web'), false);
});

test('buildDenyPayload points reviewers to Copilot first and includes Codex fallback', () => {
  const payload = JSON.parse(buildDenyPayload('Gate blocked.'));

  assert.equal(payload.permissionDecision, 'deny');
  assert.match(payload.permissionDecisionReason, /Copilot/i);
  assert.match(payload.permissionDecisionReason, /Gemini 2\.5 Pro/i);
  assert.match(payload.permissionDecisionReason, /Codex/i);
  assert.match(
    payload.permissionDecisionReason,
    /approve-pre-implementation\.ts/
  );
});

test('codex-subagent approvals remain valid through gate evaluation', () => {
  const approval = createApproval({
    reviewer: 'codex-subagent',
    focus: 'general',
    summary: 'Approved after Codex fallback review',
    repoContext: {
      root: 'C:/repo',
      branch: 'feature/test',
      head: 'abc123',
      dirty: false,
      gitCommand: 'git',
    },
  });

  const evaluation = evaluateApproval(approval, {
    root: 'C:/repo',
    branch: 'feature/test',
    head: 'abc123',
    dirty: false,
    gitCommand: 'git',
  });

  assert.deepEqual(evaluation, {
    valid: true,
    approval: approval.approval,
  });
});
