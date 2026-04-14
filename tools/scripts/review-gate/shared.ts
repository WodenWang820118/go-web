import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REVIEW_TTL_MS = 2 * 60 * 60 * 1000;

export type RepoContext = {
  root: string;
  branch: string | null;
  head: string | null;
  dirty: boolean | null;
  gitCommand: string | null;
};

type ApprovalRecord = {
  type: 'pre-implementation-review';
  reviewer: string;
  focus: string;
  summary: string;
  approvedAt: string;
  expiresAt: string;
  branch: string | null;
  head: string | null;
  root: string;
};

export type ApprovalState = {
  version: number;
  approval: ApprovalRecord;
};

type ParsedArgs = {
  reviewer: string;
  focus: string;
  summary: string;
  force: boolean;
};

type ToolArgs = string | { command?: string } | null | undefined;

export type HookInput = {
  toolName?: string;
  toolArgs?: ToolArgs;
  cwd?: string;
};

export function trySpawn(
  command: string,
  args: string[],
  cwd: string
): string | null {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  if (result.error || result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
}

export function resolveGitCommand(): string | null {
  const candidates =
    process.platform === 'win32'
      ? [
          'git',
          'C:\\Program Files\\Git\\cmd\\git.exe',
          'C:\\Program Files\\Git\\bin\\git.exe',
        ]
      : ['git', '/usr/bin/git', '/usr/local/bin/git'];

  for (const candidate of candidates) {
    const output = trySpawn(candidate, ['--version'], process.cwd());
    if (output) {
      return candidate;
    }
  }

  return null;
}

export function getRepoContext(cwd = process.cwd()): RepoContext {
  const gitCommand = resolveGitCommand();

  if (!gitCommand) {
    return {
      root: cwd,
      branch: null,
      head: null,
      dirty: null,
      gitCommand: null,
    };
  }

  const root =
    trySpawn(gitCommand, ['rev-parse', '--show-toplevel'], cwd) ?? cwd;
  const branch = trySpawn(gitCommand, ['rev-parse', '--abbrev-ref', 'HEAD'], root);
  const head = trySpawn(gitCommand, ['rev-parse', 'HEAD'], root);
  const dirtyOutput = trySpawn(
    gitCommand,
    ['status', '--porcelain', '--untracked-files=all'],
    root
  );

  return {
    root,
    branch,
    head,
    dirty: dirtyOutput ? dirtyOutput.length > 0 : false,
    gitCommand,
  };
}

export function getStatePath(repoRoot = process.cwd()): string {
  return path.join(repoRoot, '.cache', 'review-gate', 'state.json');
}

export function loadState(repoRoot = process.cwd()): ApprovalState | null {
  const statePath = getStatePath(repoRoot);

  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8')) as ApprovalState;
  } catch {
    return null;
  }
}

export function saveState(
  state: ApprovalState,
  repoRoot = process.cwd()
): void {
  const statePath = getStatePath(repoRoot);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

export function resetState(repoRoot = process.cwd()): void {
  const statePath = getStatePath(repoRoot);
  if (fs.existsSync(statePath)) {
    fs.rmSync(statePath, { force: true });
  }
}

export function createApproval({
  reviewer,
  focus,
  summary,
  repoContext,
}: {
  reviewer: string;
  focus: string;
  summary: string;
  repoContext: RepoContext;
}): ApprovalState {
  const approvedAt = new Date().toISOString();
  return {
    version: 1,
    approval: {
      type: 'pre-implementation-review',
      reviewer,
      focus,
      summary,
      approvedAt,
      expiresAt: new Date(Date.now() + REVIEW_TTL_MS).toISOString(),
      branch: repoContext.branch,
      head: repoContext.head,
      root: repoContext.root,
    },
  };
}

export function evaluateApproval(
  state: ApprovalState | null,
  repoContext: RepoContext
):
  | { valid: true; approval: ApprovalRecord }
  | { valid: false; reason: string } {
  const approval = state?.approval;

  if (!approval) {
    return {
      valid: false,
      reason: 'No pre-implementation review approval found.',
    };
  }

  if (approval.type !== 'pre-implementation-review') {
    return {
      valid: false,
      reason: 'Stored review approval is not a pre-implementation approval.',
    };
  }

  if (approval.expiresAt && Date.now() > Date.parse(approval.expiresAt)) {
    return {
      valid: false,
      reason: 'Pre-implementation review approval has expired.',
    };
  }

  if (
    approval.branch &&
    repoContext.branch &&
    approval.branch !== repoContext.branch
  ) {
    return {
      valid: false,
      reason:
        'Pre-implementation review approval was granted on a different branch.',
    };
  }

  if (approval.head && repoContext.head && approval.head !== repoContext.head) {
    return {
      valid: false,
      reason:
        'Pre-implementation review approval was granted for a different HEAD commit.',
    };
  }

  return { valid: true, approval };
}

export function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    reviewer: 'copilot-claude',
    focus: 'general',
    summary: 'Approved after pre-implementation review.',
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--reviewer') {
      parsed.reviewer = argv[index + 1] ?? parsed.reviewer;
      index += 1;
      continue;
    }

    if (current === '--focus') {
      parsed.focus = argv[index + 1] ?? parsed.focus;
      index += 1;
      continue;
    }

    if (current === '--summary') {
      parsed.summary = argv[index + 1] ?? parsed.summary;
      index += 1;
      continue;
    }

    if (current === '--force') {
      parsed.force = true;
    }
  }

  return parsed;
}

export function isMutatingToolUse({ toolName, toolArgs }: HookInput): boolean {
  const normalizedToolName = String(toolName ?? '').toLowerCase();

  if (
    ['edit', 'create', 'delete', 'move', 'rename'].includes(normalizedToolName)
  ) {
    return true;
  }

  if (normalizedToolName !== 'bash') {
    return false;
  }

  const command =
    typeof toolArgs === 'object' &&
    toolArgs !== null &&
    typeof toolArgs.command === 'string'
      ? toolArgs.command
      : typeof toolArgs === 'string'
        ? toolArgs
        : '';

  if (isReviewGateCommand(command)) {
    return false;
  }

  const patterns = [
    /\bapply_patch\b/i,
    /\bsed\s+-i\b/i,
    /\bperl\s+-pi\b/i,
    /\b(prettier|eslint)\b.*--write\b/i,
    /\b(rm|mv|cp|mkdir|touch)\b/i,
    /\btee\b/i,
    />{1,2}\s*\S/,
  ];

  return patterns.some((pattern) => pattern.test(command));
}

export function isReviewGateCommand(command: string): boolean {
  return (
    /review-gate[\\/](approve-pre-implementation|status|reset)\.ts/i.test(
      command
    ) || /\breview:(approve-pre-implementation|status|reset)\b/i.test(command)
  );
}

export function parseHookInput(rawInput: string): HookInput {
  const input = JSON.parse(rawInput || '{}') as HookInput & {
    toolArgs?: unknown;
  };
  let toolArgs: ToolArgs = input.toolArgs as ToolArgs;

  if (typeof toolArgs === 'string') {
    try {
      toolArgs = JSON.parse(toolArgs) as ToolArgs;
    } catch {
      toolArgs = { command: toolArgs as string };
    }
  }

  return {
    ...input,
    toolArgs: toolArgs as ToolArgs,
  };
}

export function buildDenyPayload(reason: string): string {
  return JSON.stringify({
    permissionDecision: 'deny',
    permissionDecisionReason: `${reason} Use GitHub Copilot Claude to review the plan, then run: pnpm review:approve-pre-implementation -- --reviewer copilot-claude --focus general --summary "Approved after plan review".`,
  });
}
