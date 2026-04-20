import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCopilotCommandArgs } from './copilot.ts';

test('buildCopilotCommandArgs uses non-interactive prompt mode and preserves prompt text', () => {
  const args = buildCopilotCommandArgs({
    experimental: true,
    model: 'gpt-5-mini',
    prompt: 'Review this diff and list three findings.',
  });

  assert.deepEqual(args, [
    '--experimental',
    '-p',
    'Review this diff and list three findings.',
    '--output-format',
    'text',
    '--silent',
    '--mode',
    'plan',
    '--model',
    'gpt-5-mini',
  ]);
  assert.equal(args.includes('--prompt=-'), false);
});

test('buildCopilotCommandArgs can harden health probes with local-only settings', () => {
  const args = buildCopilotCommandArgs({
    disableBuiltinMcps: true,
    disableCustomInstructions: true,
    prompt: 'Reply with exactly OK.',
  });

  assert.deepEqual(args, [
    '-p',
    'Reply with exactly OK.',
    '--output-format',
    'text',
    '--silent',
    '--mode',
    'plan',
    '--no-custom-instructions',
    '--disable-builtin-mcps',
  ]);
});
