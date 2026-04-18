import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { cacheProviderHealth } from './provider-health.ts';
import {
  isCopilotUnavailableError,
  probeCopilotCliHealth,
  runCopilotReview,
} from './providers/copilot.ts';
import {
  isCodexUnavailableError,
  probeCodexCliHealth,
  runCodexReview,
} from './providers/codex.ts';
import {
  isGeminiUnavailableError,
  probeGeminiCliHealth,
  runGeminiReview,
} from './providers/gemini.ts';

export type ReviewCheckpoint =
  | 'plan'
  | 'implementation'
  | 'test'
  | 'pre-merge';
export type ReviewProvider = 'auto' | 'copilot' | 'gemini' | 'codex';
export type ConcreteReviewProvider = Exclude<ReviewProvider, 'auto'>;

export interface ParsedCliArgs {
  checkpoint?: ReviewCheckpoint;
  contextFile?: string;
  focus: string;
  model?: string;
  provider: ReviewProvider;
}

export interface ReviewExecution {
  checkpoint: ReviewCheckpoint;
  focus: string;
  model?: string;
  provider: ConcreteReviewProvider;
}

export interface ReviewFlowDependencies {
  cacheUnavailable: (
    execution: ReviewExecution,
    error: unknown
  ) => void;
  log: (message: string) => void;
  probe: (
    execution: ReviewExecution
  ) => Promise<{ available: boolean; reason?: string }>;
  run: (execution: ReviewExecution, context: string) => Promise<string>;
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const parsed: ParsedCliArgs = {
    provider: 'auto',
    focus: 'general',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--checkpoint') {
      parsed.checkpoint = readCheckpointFlag(argv[index + 1]);
      index += 1;
      continue;
    }

    if (current === '--focus') {
      parsed.focus = readRequiredValue(argv, index, current);
      index += 1;
      continue;
    }

    if (current === '--provider') {
      parsed.provider = readProviderFlag(argv[index + 1]);
      index += 1;
      continue;
    }

    if (current === '--model') {
      parsed.model = readRequiredValue(argv, index, current);
      index += 1;
      continue;
    }

    if (current === '--context-file') {
      parsed.contextFile = readRequiredValue(argv, index, current);
      index += 1;
      continue;
    }

    throw new Error(`Unknown review flag: ${current}`);
  }

  return parsed;
}

export function createReviewExecution(input: {
  checkpoint: ReviewCheckpoint;
  provider: ConcreteReviewProvider;
  focus: string;
  model?: string;
}): ReviewExecution {
  return {
    checkpoint: input.checkpoint,
    provider: input.provider,
    focus: input.focus,
    model:
      input.model ??
      (input.provider === 'gemini'
        ? getDefaultGeminiModel(input.checkpoint)
        : undefined),
  };
}

export function getReviewProviderOrder(input: {
  checkpoint: ReviewCheckpoint;
  provider: ReviewProvider;
}): ConcreteReviewProvider[] {
  if (input.provider !== 'auto') {
    return [input.provider];
  }

  if (input.checkpoint === 'implementation') {
    return ['gemini', 'copilot', 'codex'];
  }

  if (input.checkpoint === 'test') {
    return ['copilot', 'codex'];
  }

  return ['copilot', 'gemini', 'codex'];
}

export function buildReviewPrompt(
  execution: ReviewExecution,
  context: string
): string {
  const reviewRules = [
    'You are the second-opinion reviewer for this repository.',
    `Checkpoint: ${execution.checkpoint}`,
    `Primary focus: ${execution.focus}`,
    execution.model ? `Requested model: ${execution.model}` : null,
    '',
    'Review rules:',
    '- Findings first, ordered by severity',
    '- Call out correctness, security risk, workflow violations, contract drift, and missing tests',
    execution.checkpoint === 'test'
      ? '- Focus on missing scenarios, weak assertions, and regression gaps'
      : null,
    execution.checkpoint === 'implementation'
      ? '- If blocking issues remain, call out whether this should be escalated to Copilot for a follow-up review'
      : null,
    '',
    'Context to review:',
    context.trim(),
  ].filter(Boolean);

  return reviewRules.join('\n');
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const parsed = parseCliArgs(argv);

  if (!parsed.checkpoint) {
    throw new Error(
      'Missing --checkpoint. Expected one of: plan, implementation, test, pre-merge.'
    );
  }

  const context = await readReviewContext(parsed.contextFile);
  if (!context.trim()) {
    throw new Error(
      'Review context is required. Pass --context-file <path> or pipe the review context via stdin.'
    );
  }
  const output = await executeReviewFlow(
    {
      checkpoint: parsed.checkpoint,
      context,
      focus: parsed.focus,
      model: parsed.model,
      provider: parsed.provider,
    },
    getDefaultReviewFlowDependencies()
  );

  process.stdout.write(`${output.trimEnd()}\n`);
}

async function runReviewExecution(
  execution: ReviewExecution,
  context: string
): Promise<string> {
  const prompt = buildReviewPrompt(execution, context);

  if (execution.provider === 'copilot') {
    return runCopilotReview({
      model: execution.model,
      prompt,
      repoRoot: process.cwd(),
    });
  }

  if (execution.provider === 'gemini') {
    return runGeminiReview({
      model: execution.model ?? getDefaultGeminiModel(execution.checkpoint),
      prompt,
      repoRoot: process.cwd(),
    });
  }

  return runCodexReview({
    checkpoint: execution.checkpoint,
    focus: execution.focus,
    model: execution.model,
    prompt,
    repoRoot: process.cwd(),
  });
}

async function readReviewContext(contextFile?: string): Promise<string> {
  if (contextFile) {
    const resolvedPath = resolve(contextFile);
    if (!existsSync(resolvedPath)) {
      throw new Error(`Context file not found: ${resolvedPath}`);
    }

    return readFileSync(resolvedPath, 'utf8');
  }

  return readStdin();
}

function getDefaultGeminiModel(checkpoint: ReviewCheckpoint): string {
  return checkpoint === 'implementation'
    ? 'gemini-3-flash-preview'
    : 'gemini-2.5-pro';
}

export async function executeReviewFlow(
  input: {
    checkpoint: ReviewCheckpoint;
    context: string;
    focus: string;
    model?: string;
    provider: ReviewProvider;
  },
  dependencies: ReviewFlowDependencies
): Promise<string> {
  const attempted: string[] = [];
  const fallbackAllowed = input.provider === 'auto';

  for (const provider of getReviewProviderOrder({
    checkpoint: input.checkpoint,
    provider: input.provider,
  })) {
    const execution = createReviewExecution({
      checkpoint: input.checkpoint,
      provider,
      focus: input.focus,
      model: input.model,
    });

    const health = await dependencies.probe(execution);
    if (!health.available) {
      attempted.push(`${provider}: ${health.reason ?? 'unavailable'}`);
      if (!fallbackAllowed) {
        throw new Error(
          `${getProviderDisplayName(provider)} review is unavailable: ${health.reason ?? 'health check failed.'}`
        );
      }

      dependencies.log(
        `${getProviderDisplayName(provider)} review is unavailable: ${health.reason ?? 'health check failed.'}`
      );
      continue;
    }

    try {
      return await dependencies.run(execution, input.context);
    } catch (error) {
      if (fallbackAllowed && isRetryableProviderFailure(execution.provider, error)) {
        dependencies.cacheUnavailable(execution, error);
        attempted.push(
          `${provider}: ${error instanceof Error ? error.message : String(error)}`
        );
        dependencies.log(
          `${getProviderDisplayName(provider)} review became unavailable during execution. Trying the next fallback.`
        );
        continue;
      }

      throw error;
    }
  }

  throw new Error(buildNoAvailableProvidersError(attempted));
}

function readRequiredValue(
  argv: string[],
  index: number,
  flag: string
): string {
  const value = argv[index + 1];
  if (!value) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value;
}

function readCheckpointFlag(rawValue?: string): ReviewCheckpoint {
  if (
    rawValue === 'plan' ||
    rawValue === 'implementation' ||
    rawValue === 'test' ||
    rawValue === 'pre-merge'
  ) {
    return rawValue;
  }

  throw new Error(
    `Unsupported checkpoint "${rawValue ?? ''}". Expected one of: plan, implementation, test, pre-merge.`
  );
}

function readProviderFlag(rawValue?: string): ReviewProvider {
  if (
    rawValue === 'auto' ||
    rawValue === 'copilot' ||
    rawValue === 'gemini' ||
    rawValue === 'codex'
  ) {
    return rawValue;
  }

  throw new Error(
    `Unsupported provider "${rawValue ?? ''}". Expected one of: auto, copilot, gemini, codex.`
  );
}

async function probeReviewProviderHealth(
  execution: ReviewExecution
) {
  if (execution.provider === 'copilot') {
    return probeCopilotCliHealth({
      model: getProviderHealthModel(execution),
      repoRoot: process.cwd(),
    });
  }

  if (execution.provider === 'gemini') {
    return probeGeminiCliHealth({
      model: execution.model ?? getDefaultGeminiModel(execution.checkpoint),
      repoRoot: process.cwd(),
    });
  }

  return probeCodexCliHealth({
    model: getProviderHealthModel(execution),
    repoRoot: process.cwd(),
  });
}

function getDefaultReviewFlowDependencies(): ReviewFlowDependencies {
  return {
    cacheUnavailable(execution, error) {
      cacheProviderHealth(
        execution.provider,
        getProviderHealthModel(execution),
        {
          available: false,
          checkedAtMs: Date.now(),
          reason: error instanceof Error ? error.message : String(error),
        },
        process.cwd()
      );
    },
    log(message) {
      console.error(message);
    },
    probe: probeReviewProviderHealth,
    run: runReviewExecution,
  };
}

function isRetryableProviderFailure(
  provider: ConcreteReviewProvider,
  error: unknown
): boolean {
  if (provider === 'copilot') {
    return isCopilotUnavailableError(error);
  }

  if (provider === 'gemini') {
    return isGeminiUnavailableError(error);
  }

  return isCodexUnavailableError(error);
}

function getProviderDisplayName(provider: ConcreteReviewProvider): string {
  if (provider === 'copilot') {
    return 'Copilot CLI';
  }

  if (provider === 'gemini') {
    return 'Gemini CLI';
  }

  return 'Codex reviewer';
}

function getProviderHealthModel(execution: ReviewExecution): string | undefined {
  if (execution.provider === 'codex') {
    return undefined;
  }

  return execution.model;
}

function buildNoAvailableProvidersError(attempted: string[]): string {
  if (attempted.length === 0) {
    return 'No review provider was available for this checkpoint.';
  }

  return [
    'No review provider was available for this checkpoint.',
    'Attempted providers:',
    ...attempted.map((entry) => `- ${entry}`),
  ].join('\n');
}

function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    return Promise.resolve('');
  }

  return new Promise((resolveInput, reject) => {
    let buffer = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      buffer += chunk;
    });
    process.stdin.on('end', () => resolveInput(buffer));
    process.stdin.on('error', reject);
  });
}

const isEntryPoint =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
