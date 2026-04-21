import {
  cacheProviderHealth,
  getCachedProviderHealth,
  type ReviewProviderHealthResult,
} from '../provider-health.ts';
import { runLocalCliCommand } from './local-cli.ts';

interface CopilotReviewInput {
  model?: string;
  prompt: string;
  repoRoot?: string;
}

const COPILOT_HEALTH_PROMPT = 'Reply with exactly OK.';
const COPILOT_HEALTH_TIMEOUT_MS = 30_000;
const COPILOT_REVIEW_TIMEOUT_MS = 3 * 60 * 1000;

export function isCopilotUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /\b(quota|premium requests|billing|not authenticated|authenticate|login|sign in|required|subscription|entitlement|rate limit|unavailable)\b/i.test(
    error.message,
  );
}

export function probeCopilotCliHealth(
  input: {
    model?: string;
    repoRoot?: string;
  } = {},
): ReviewProviderHealthResult {
  const repoRoot = input.repoRoot ?? process.cwd();
  const cached = getCachedProviderHealth('copilot', input.model, repoRoot);
  if (cached) {
    return cached;
  }

  const checkedAtMs = Date.now();
  const versionResult = runLocalCliCommand({
    command: 'copilot',
    windowsScriptName: 'copilot.ps1',
    args: ['--version'],
    cwd: repoRoot,
    timeoutMs: COPILOT_HEALTH_TIMEOUT_MS,
  });

  if (versionResult.error || versionResult.status !== 0) {
    return cacheProviderHealth(
      'copilot',
      input.model,
      {
        available: false,
        checkedAtMs,
        reason: 'Copilot CLI is not installed or cannot be started locally.',
      },
      repoRoot,
    );
  }

  const probeResult = runLocalCliCommand({
    command: 'copilot',
    windowsScriptName: 'copilot.ps1',
    args: buildCopilotCommandArgs({
      disableBuiltinMcps: true,
      disableCustomInstructions: true,
      model: input.model,
      prompt: COPILOT_HEALTH_PROMPT,
    }),
    cwd: repoRoot,
    timeoutMs: COPILOT_HEALTH_TIMEOUT_MS,
  });

  const output = stripCopilotFooter(
    joinOutput(probeResult.stdout, probeResult.stderr),
  );
  if (!probeResult.error && probeResult.status === 0) {
    if (/^OK\b/i.test(output.trim())) {
      return cacheProviderHealth(
        'copilot',
        input.model,
        {
          available: true,
          checkedAtMs,
        },
        repoRoot,
      );
    }

    return cacheProviderHealth(
      'copilot',
      input.model,
      {
        available: false,
        checkedAtMs,
        reason: 'Copilot CLI probe returned an unexpected response.',
      },
      repoRoot,
    );
  }

  return cacheProviderHealth(
    'copilot',
    input.model,
    {
      available: false,
      checkedAtMs,
      reason: classifyCopilotProbeFailure(output, probeResult.error?.message),
    },
    repoRoot,
  );
}

export function runCopilotReview(input: CopilotReviewInput): string {
  const result = runLocalCliCommand({
    command: 'copilot',
    windowsScriptName: 'copilot.ps1',
    args: buildCopilotCommandArgs({
      experimental: true,
      model: input.model,
      prompt: input.prompt,
    }),
    cwd: input.repoRoot ?? process.cwd(),
    timeoutMs: COPILOT_REVIEW_TIMEOUT_MS,
  });

  const output = stripCopilotFooter(joinOutput(result.stdout, result.stderr));

  if (result.error || result.status !== 0) {
    throw new Error(
      output || result.error?.message || 'Copilot review command failed.',
    );
  }

  if (!output.trim()) {
    throw new Error('Copilot review returned no output.');
  }

  return output.trim();
}

export function buildCopilotCommandArgs(input: {
  disableBuiltinMcps?: boolean;
  disableCustomInstructions?: boolean;
  experimental?: boolean;
  model?: string;
  prompt: string;
}): string[] {
  const args = [
    '-p',
    input.prompt,
    '--output-format',
    'text',
    '--silent',
    '--mode',
    'plan',
  ];

  if (input.experimental) {
    args.unshift('--experimental');
  }

  if (input.disableCustomInstructions) {
    args.push('--no-custom-instructions');
  }

  if (input.disableBuiltinMcps) {
    args.push('--disable-builtin-mcps');
  }

  if (input.model) {
    args.push('--model', input.model);
  }

  return args;
}

function classifyCopilotProbeFailure(
  output: string,
  errorMessage?: string,
): string {
  const message = [output, errorMessage].filter(Boolean).join('\n').trim();

  if (!message) {
    return 'Copilot CLI probe failed without returning output.';
  }

  if (
    /\b(not authenticated|authenticate|login|sign in|credential|token|required)\b/i.test(
      message,
    )
  ) {
    return 'Copilot CLI is installed locally but is not logged in.';
  }

  if (
    /\b(quota|premium requests|billing|subscription|rate limit|429|entitlement)\b/i.test(
      message,
    )
  ) {
    return 'Copilot CLI is installed locally but does not currently have available request capacity.';
  }

  if (/\b(timeout|timed out)\b/i.test(message)) {
    return 'Copilot CLI probe timed out before it could confirm local availability.';
  }

  return message;
}

function joinOutput(stdout?: string | null, stderr?: string | null): string {
  return [stdout, stderr].filter(Boolean).join('\n').trim();
}

function stripCopilotFooter(output: string): string {
  const lines = output.split(/\r?\n/);

  while (
    lines.length > 0 &&
    /^\s*(Changes|Requests|Tokens)\b/.test(lines.at(-1) ?? '')
  ) {
    lines.pop();
  }

  while (lines.length > 0 && (lines.at(-1) ?? '').trim() === '') {
    lines.pop();
  }

  return lines.join('\n').trim();
}
