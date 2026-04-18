import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReviewPrompt,
  createReviewExecution,
  executeReviewFlow,
  getReviewProviderOrder,
  parseCliArgs,
  type ReviewExecution,
} from './run-checkpoint-review.ts';

test('parseCliArgs reads the supported checkpoint review flags', () => {
  const parsed = parseCliArgs([
    '--checkpoint',
    'plan',
    '--provider',
    'codex',
    '--model',
    'gpt-5.4',
    '--focus',
    'architecture',
    '--context-file',
    'review.md',
  ]);

  assert.equal(parsed.checkpoint, 'plan');
  assert.equal(parsed.provider, 'codex');
  assert.equal(parsed.model, 'gpt-5.4');
  assert.equal(parsed.focus, 'architecture');
  assert.equal(parsed.contextFile, 'review.md');
});

test('getReviewProviderOrder follows the repo checkpoint fallback rules', () => {
  assert.deepEqual(
    getReviewProviderOrder({
      checkpoint: 'plan',
      provider: 'auto',
    }),
    ['copilot', 'gemini', 'codex']
  );

  assert.deepEqual(
    getReviewProviderOrder({
      checkpoint: 'implementation',
      provider: 'auto',
    }),
    ['gemini', 'copilot', 'codex']
  );

  assert.deepEqual(
    getReviewProviderOrder({
      checkpoint: 'test',
      provider: 'auto',
    }),
    ['copilot', 'codex']
  );

  assert.deepEqual(
    getReviewProviderOrder({
      checkpoint: 'pre-merge',
      provider: 'copilot',
    }),
    ['copilot']
  );
});

test('createReviewExecution applies provider-specific model defaults', () => {
  assert.deepEqual(
    createReviewExecution({
      checkpoint: 'implementation',
      provider: 'gemini',
      focus: 'general',
    }),
    {
      checkpoint: 'implementation',
      provider: 'gemini',
      focus: 'general',
      model: 'gemini-3-flash-preview',
    }
  );

  assert.deepEqual(
    createReviewExecution({
      checkpoint: 'plan',
      provider: 'codex',
      focus: 'architecture',
    }),
    {
      checkpoint: 'plan',
      provider: 'codex',
      focus: 'architecture',
      model: undefined,
    }
  );
});

test('buildReviewPrompt includes the checkpoint, focus, and supplied context', () => {
  const prompt = buildReviewPrompt(
    {
      checkpoint: 'implementation',
      provider: 'gemini',
      focus: 'security',
      model: 'gemini-3-flash-preview',
    },
    'Changed files: scripts/review-gate/shared.ts'
  );

  assert.match(prompt, /Checkpoint: implementation/);
  assert.match(prompt, /Primary focus: security/);
  assert.match(prompt, /Changed files: scripts\/review-gate\/shared\.ts/);
});

test('executeReviewFlow fails fast for an explicit unavailable provider', async () => {
  await assert.rejects(
    executeReviewFlow(
      {
        checkpoint: 'plan',
        context: 'smoke',
        focus: 'general',
        provider: 'copilot',
      },
      {
        cacheUnavailable() {
          return undefined;
        },
        log() {
          return undefined;
        },
        async probe() {
          return {
            available: false,
            reason: 'quota exhausted',
          };
        },
        async run() {
          return 'should not run';
        },
      }
    ),
    /Copilot CLI review is unavailable: quota exhausted/
  );
});

test('executeReviewFlow skips Gemini for test checkpoints and falls back to Codex', async () => {
  const probed: string[] = [];

  const output = await executeReviewFlow(
    {
      checkpoint: 'test',
      context: 'smoke',
      focus: 'tests',
      provider: 'auto',
      },
      {
        cacheUnavailable() {
          return undefined;
        },
        log() {
          return undefined;
        },
        async probe(execution) {
          probed.push(execution.provider);
          if (execution.provider === 'copilot') {
          return { available: false, reason: 'quota exhausted' };
        }

        return { available: true };
      },
      async run(execution) {
        return execution.provider;
      },
    }
  );

  assert.deepEqual(probed, ['copilot', 'codex']);
  assert.equal(output, 'codex');
});

test('executeReviewFlow retries the next provider after a retryable runtime failure', async () => {
  const cached: Array<{ provider: string; reason: string }> = [];
  const ran: string[] = [];

  const output = await executeReviewFlow(
    {
      checkpoint: 'implementation',
      context: 'smoke',
      focus: 'general',
      provider: 'auto',
      },
      {
        cacheUnavailable(execution, error) {
        cached.push({
          provider: execution.provider,
          reason: error instanceof Error ? error.message : String(error),
        });
        },
        log() {
          return undefined;
        },
        async probe() {
          return { available: true };
        },
      async run(execution) {
        ran.push(execution.provider);
        if (execution.provider === 'gemini') {
          throw new Error('MODEL_CAPACITY_EXHAUSTED');
        }

        return execution.provider;
      },
    }
  );

  assert.equal(output, 'copilot');
  assert.deepEqual(ran, ['gemini', 'copilot']);
  assert.deepEqual(cached, [
    {
      provider: 'gemini',
      reason: 'MODEL_CAPACITY_EXHAUSTED',
    },
  ]);
});

test('executeReviewFlow reports all unavailable providers when auto routing is exhausted', async () => {
  await assert.rejects(
    executeReviewFlow(
      {
        checkpoint: 'plan',
        context: 'smoke',
        focus: 'general',
        provider: 'auto',
      },
      {
        cacheUnavailable() {
          return undefined;
        },
        log() {
          return undefined;
        },
        async probe(execution: ReviewExecution) {
          return {
            available: false,
            reason: `${execution.provider} down`,
          };
        },
        async run() {
          return 'should not run';
        },
      }
    ),
    /Attempted providers:[\s\S]*copilot: copilot down[\s\S]*gemini: gemini down[\s\S]*codex: codex down/
  );
});
