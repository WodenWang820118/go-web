import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getUsageText,
  parseCliArgs,
  type ParsedLocalReviewerCliArgs,
} from './local-reviewer.ts';

test('parseCliArgs keeps estimate-only defaults for evaluate', () => {
  const parsed = parseCliArgs(['evaluate']);

  assert.equal(parsed.abSamples, 0);
  assert.equal(parsed.command, 'evaluate');
  assert.equal(parsed.jobs > 0, true);
  assert.deepEqual(parsed.repos, []);
  assert.equal(parsed.rounds, 32);
  assert.equal(parsed.seed, 20260419);
  assert.equal(parsed.smallDiffThresholdChars, 1024);
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
    '--jobs',
    '3',
    '--repo',
    'gx.go',
    '--repo',
    '../local-reviewer-cli',
  ]);

  assert.deepEqual(parsed, {
    abSamples: 4,
    command: 'evaluate',
    jobs: 3,
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
