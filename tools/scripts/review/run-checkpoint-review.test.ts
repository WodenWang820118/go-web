import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReviewPrompt,
  createReviewExecution,
  executeReviewFlow,
  getReviewExecutionPlan,
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

test('getReviewExecutionPlan follows the repo checkpoint fallback rules', () => {
  assert.deepEqual(
    getReviewExecutionPlan({
      checkpoint: 'plan',
      focus: 'general',
      provider: 'auto',
    }),
    [
      execution('plan', 'copilot', 'general', 'claude-sonnet-4.6'),
      execution('plan', 'copilot', 'general', 'gpt-5-mini'),
      execution('plan', 'gemini', 'general', 'gemini-2.5-pro'),
      execution('plan', 'codex', 'general'),
    ]
  );

  assert.deepEqual(
    getReviewExecutionPlan({
      checkpoint: 'implementation',
      focus: 'general',
      provider: 'auto',
    }),
    [
      execution('implementation', 'gemini', 'general', 'gemini-3-flash-preview'),
      execution('implementation', 'copilot', 'general', 'claude-sonnet-4.6'),
      execution('implementation', 'copilot', 'general', 'gpt-5-mini'),
      execution('implementation', 'codex', 'general'),
    ]
  );

  assert.deepEqual(
    getReviewExecutionPlan({
      checkpoint: 'test',
      focus: 'tests',
      provider: 'auto',
    }),
    [
      execution('test', 'copilot', 'tests', 'claude-sonnet-4.6'),
      execution('test', 'copilot', 'tests', 'gpt-5-mini'),
      execution('test', 'codex', 'tests'),
    ]
  );

  assert.deepEqual(
    getReviewExecutionPlan({
      checkpoint: 'pre-merge',
      focus: 'general',
      provider: 'copilot',
    }),
    [
      execution('pre-merge', 'copilot', 'general', 'claude-sonnet-4.6'),
      execution('pre-merge', 'copilot', 'general', 'gpt-5-mini'),
    ]
  );

  assert.deepEqual(
    getReviewExecutionPlan({
      checkpoint: 'test',
      focus: 'tests',
      provider: 'copilot',
      model: 'gpt-5-mini',
    }),
    [execution('test', 'copilot', 'tests', 'gpt-5-mini')]
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
      provider: 'copilot',
      focus: 'architecture',
    }),
    {
      checkpoint: 'plan',
      provider: 'copilot',
      focus: 'architecture',
      model: 'claude-sonnet-4.6',
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

test('executeReviewFlow fails fast for a single explicit unavailable provider', async () => {
  await assert.rejects(
    executeReviewFlow(
      {
        checkpoint: 'plan',
        context: 'smoke',
        focus: 'general',
        provider: 'gemini',
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
    /Gemini CLI review is unavailable: quota exhausted/
  );
});

test('executeReviewFlow falls back to Copilot GPT-5 mini before leaving Copilot', async () => {
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
          probed.push(`${execution.provider}:${execution.model ?? '<none>'}`);
          if (execution.model === 'claude-sonnet-4.6') {
            return { available: false, reason: 'quota exhausted' };
          }

          return { available: true };
        },
        async run(execution) {
          return execution.model ?? execution.provider;
        },
      }
    );

  assert.deepEqual(probed, [
    'copilot:claude-sonnet-4.6',
    'copilot:gpt-5-mini',
  ]);
  assert.equal(output, 'gpt-5-mini');
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
        probed.push(`${execution.provider}:${execution.model ?? '<none>'}`);
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

  assert.deepEqual(probed, [
    'copilot:claude-sonnet-4.6',
    'copilot:gpt-5-mini',
    'codex:<none>',
  ]);
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
    /Attempted providers:[\s\S]*copilot:claude-sonnet-4\.6: copilot down[\s\S]*copilot:gpt-5-mini: copilot down[\s\S]*gemini:gemini-2\.5-pro: gemini down[\s\S]*codex: codex down/
  );
});

function execution(
  checkpoint: ReviewExecution['checkpoint'],
  provider: ReviewExecution['provider'],
  focus: string,
  model?: string,
): ReviewExecution {
  return {
    checkpoint,
    provider,
    focus,
    model,
  };
}
