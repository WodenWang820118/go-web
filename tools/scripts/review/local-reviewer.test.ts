import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getUsageText,
  parseCliArgs,
  type ParsedLocalReviewerCliArgs,
} from './local-reviewer.ts';

test('parseCliArgs keeps estimate-only defaults for evaluate', () => {
  const parsed = parseCliArgs(['evaluate']);

  assert.deepEqual(parsed, {
    abSamples: 0,
    command: 'evaluate',
    repos: [],
    rounds: 32,
    seed: 20260419,
    smallDiffThresholdChars: 1024,
  } satisfies ParsedLocalReviewerCliArgs);
});

test('parseCliArgs reads repeated repo flags and numeric overrides', () => {
  const parsed = parseCliArgs([
    'evaluate',
    '--rounds',
    '40',
    '--seed',
    '7',
    '--small-diff-threshold-chars',
    '2048',
    '--ab-samples',
    '4',
    '--repo',
    'gx.go',
    '--repo',
    '../local-reviewer-cli',
  ]);

  assert.deepEqual(parsed, {
    abSamples: 4,
    command: 'evaluate',
    repos: ['gx.go', '../local-reviewer-cli'],
    rounds: 40,
    seed: 7,
    smallDiffThresholdChars: 2048,
  } satisfies ParsedLocalReviewerCliArgs);
});

test('getUsageText stays path-agnostic', () => {
  const usage = getUsageText();

  assert.doesNotMatch(usage, /scripts[\\/]/i);
  assert.match(usage, /local-reviewer\.ts/);
});
