import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

export type LocalReviewSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info';

export type PaidReviewContextMode = 'full-diff' | 'prefilter-summary';

export interface LocalReviewFinding {
  severity: LocalReviewSeverity;
  title: string;
  detail: string;
  file_path: string | null;
  line: number | null;
  recommendation: string | null;
  profile: string | null;
  rationale: string | null;
  evidence: string | null;
}

export interface LocalReviewProfile {
  name: string;
  description: string;
}

export interface EvaluationRepoTarget {
  name: string;
  root: string;
}

export interface LocalReviewerEvaluationConfig {
  abSampleCount: number;
  jobs: number;
  repoNames: string[];
  rounds: number;
  seed: number;
  smallDiffThresholdChars: number;
}

export interface LocalReviewDoctorReport {
  repo_root: string;
  global_config_path: string;
  repo_config_path: string;
  default_model: string;
  advisory_only: boolean;
  runtime: string;
  runtime_provider: 'foundry' | 'ollama';
  checks: Array<{ name: string; status: 'ok' | 'warn' | 'error'; detail: string }>;
  profiles: LocalReviewProfile[];
  missing_instruction_profiles: string[];
  summary: string;
}

export interface LocalReviewReport {
  generated_at: string;
  context: {
    repo_root: string;
    base_ref: string | null;
    head_ref: string | null;
    staged: boolean;
    requested_profiles: string[];
    config_source: string | null;
    files: Array<{
      path: string;
      status: string;
      old_path: string | null;
      language: string;
      patch: string;
    }>;
  };
  profiles: LocalReviewProfile[];
  findings: LocalReviewFinding[];
  trace: string[];
  summary: string;
  model_used: string | null;
  runtime_provider: 'foundry' | 'ollama';
  advisory_only: boolean;
}

export interface CommandResult {
  error?: Error;
  status: number | null;
  stderr: string;
  stdout: string;
}

export interface EvaluationSample {
  baseRef: string;
  commit: string;
  committedAtEpoch: number;
  fileCount: number;
  kind:
    | 'small-ts'
    | 'multi-file-refactor'
    | 'workspace-config'
    | 'higher-risk'
    | 'general';
  repoName: string;
  repoRoot: string;
  subject: string;
  totalChangedLines: number;
}

export interface EvaluationLocalResult {
  durationMs: number;
  diffLength: number;
  error?: string;
  findingsCount: number;
  jsonParseable: boolean;
  paidReviewContextLength: number;
  prefilterContextLength: number;
  recommendedEscalation: boolean;
  escalationReasons: string[];
  report?: LocalReviewReport;
  reviewContextLength: number;
  reviewContextMode: PaidReviewContextMode;
  sample: EvaluationSample;
  success: boolean;
  summaryLength: number;
}

export interface EvaluationReviewerResult {
  durationMs: number;
  error?: string;
  output: string;
  providerAvailable: boolean;
  sample: EvaluationSample;
  success: boolean;
}

export interface LocalReviewerDependencies {
  now: () => Date;
  runProcess: (input: {
    args: string[];
    command: string;
    cwd: string;
    env?: NodeJS.ProcessEnv;
    input?: string;
    timeoutMs?: number;
  }) => CommandResult;
}

export interface WindowsProcessBridgePayload {
  args: string[];
  command: string;
  cwd: string;
}

export interface PaidReviewContextSelection {
  contextLength: number;
  contextText: string;
  mode: PaidReviewContextMode;
  originalDiffLength: number;
  smallDiffThresholdChars: number;
}

const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_KEEP_ALIVE = '10m';
const DEFAULT_OLLAMA_MODEL = 'qwen3:8b';
const DEFAULT_OLLAMA_TIMEOUT_MS = '120000';
const DEFAULT_EVALUATION_AB_SAMPLE_COUNT = 0;
const DEFAULT_EVALUATION_ROUNDS = 32;
const DEFAULT_SAMPLE_SEED = 20260419;
const DEFAULT_SMALL_DIFF_THRESHOLD_CHARS = 1024;
const LOCAL_REVIEWER_BUILD_TIMEOUT_MS = 5 * 60 * 1000;
const LOCAL_REVIEWER_COMMAND_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_EVALUATION_REPO_NAMES = [
  'gx.law-prep',
  'gx.go',
  'local-reviewer-cli',
] as const;
const EVALUATION_KIND_ORDER: EvaluationSample['kind'][] = [
  'higher-risk',
  'small-ts',
  'general',
  'multi-file-refactor',
  'workspace-config',
];
const EVALUATION_KIND_WEIGHTS: Readonly<Record<EvaluationSample['kind'], number>> = {
  'higher-risk': 1,
  'small-ts': 7,
  general: 8,
  'multi-file-refactor': 8,
  'workspace-config': 8,
};
const WINDOWS_PROCESS_BRIDGE_ENV = 'LOCAL_REVIEWER_WINDOWS_PROCESS_JSON_PATH';
const WINDOWS_PROCESS_BRIDGE_SCRIPT = [
  "$ProgressPreference = 'SilentlyContinue'",
  `$payload = Get-Content -LiteralPath $env:${WINDOWS_PROCESS_BRIDGE_ENV} -Raw | ConvertFrom-Json`,
  '$command = [string]$payload.command',
  '$stdin = [Console]::In.ReadToEnd()',
  '$resolved = if ([System.IO.Path]::IsPathRooted($command)) {',
  '  $command',
  '} else {',
  '  (Get-Command $command -CommandType Application | Select-Object -First 1).Source',
  '}',
  'if ([string]::IsNullOrEmpty($stdin) -eq $false) {',
  '  $stdin | & $resolved @($payload.args)',
  '} else {',
  '  & $resolved @($payload.args)',
  '}',
  'exit $LASTEXITCODE',
].join('\n');
const PREFILTER_ARTIFACT_DIR = ['.cache', 'reviews', 'local-reviewer'];
const PREFILTER_CONTEXT_FILE = 'prefilter-context.md';
const PREFILTER_REPORT_FILE = 'prefilter-report.json';
const REVIEWER_CONTEXT_FILE = 'prefilter-review-context.md';
const EVALUATION_ARTIFACT_DIR = ['.cache', 'reviews', 'local-reviewer-eval'];
const SENSITIVE_REVIEW_AREAS: Array<{
  category:
    | 'auth'
    | 'secrets'
    | 'filesystem'
    | 'shell'
    | 'network'
    | 'public contract'
    | 'persistent state';
  pattern: RegExp;
}> = [
  { category: 'auth', pattern: /\b(auth|oauth|login|session|jwt|permission|role)\b/i },
  {
    category: 'secrets',
    pattern: /\b(secret|token|apikey|api[_-]?key|password|credential)\b/i,
  },
  {
    category: 'filesystem',
    pattern: /\b(filesystem|readfile|writefile|unlink|readdir|mkdir|rename|path\.)\b/i,
  },
  {
    category: 'shell',
    pattern: /\b(shell|child_process|spawnsync|spawn\(|execsync|exec\(|powershell)\b/i,
  },
  {
    category: 'network',
    pattern: /\b(fetch\(|axios|http\.|https\.|request\(|socket|webhook)\b/i,
  },
  {
    category: 'public contract',
    pattern: /\b(controller|dto|schema|openapi|graphql|api contract|public contract)\b/i,
  },
  {
    category: 'persistent state',
    pattern: /\b(migration|database|sql|persist|storage|repository|prisma|typeorm)\b/i,
  },
];

export function createLocalReviewerDependencies(): LocalReviewerDependencies {
  return {
    now: () => new Date(),
    runProcess(input) {
      const sanitizedEnv = sanitizeEnv(input.env);

      if (process.platform === 'win32' && input.command.endsWith('.cmd')) {
        const powershellPath = resolveWindowsPowerShellPath();
        if (!powershellPath) {
          return {
            error: new Error(
              'Windows PowerShell is required to launch .cmd commands safely.',
            ),
            status: null,
            stderr: '',
            stdout: '',
          };
        }

        const bridgePayload = buildWindowsProcessBridgePayload({
          args: input.args,
          command: input.command,
          cwd: input.cwd,
        });
        const payloadDir = mkdtempSync(join(tmpdir(), 'local-reviewer-win-'));
        const payloadPath = resolve(payloadDir, 'process.json');
        writeFileSync(payloadPath, JSON.stringify(bridgePayload), 'utf8');

        const result = (() => {
          try {
            return spawnSync(
              powershellPath,
              [
                '-NoProfile',
                '-NonInteractive',
                '-EncodedCommand',
                encodePowerShellCommand(WINDOWS_PROCESS_BRIDGE_SCRIPT),
              ],
              {
                cwd: input.cwd,
                encoding: 'utf8',
                env: {
                  ...(sanitizedEnv ?? {}),
                  [WINDOWS_PROCESS_BRIDGE_ENV]: payloadPath,
                },
                input: input.input,
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: input.timeoutMs,
              },
            );
          } finally {
            rmSync(payloadDir, { force: true, recursive: true });
          }
        })();

        return {
          error: result.error,
          status: result.status,
          stderr: result.stderr ?? '',
          stdout: result.stdout ?? '',
        };
      }

      const result = spawnSync(input.command, input.args, {
        cwd: input.cwd,
        encoding: 'utf8',
        env: sanitizedEnv,
        input: input.input,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: input.timeoutMs,
      });

      return {
        error: result.error,
        status: result.status,
        stderr: result.stderr ?? '',
        stdout: result.stdout ?? '',
      };
    },
  };
}

export function resolveLocalReviewerRepoRoot(
  repoRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const candidate = resolve(
    env.LOCAL_REVIEWER_CLI_PATH ?? resolve(repoRoot, '..', 'local-reviewer-cli'),
  );
  const packageJsonPath = resolve(candidate, 'package.json');
  const cliEntryPath = resolve(
    candidate,
    'packages',
    'local-reviewer',
    'bin',
    'local-reviewer.js',
  );
  if (!existsSync(packageJsonPath) || !existsSync(cliEntryPath)) {
    throw new Error(
      `Unable to find a usable local-reviewer-cli workspace at ${candidate}.`,
    );
  }

  return candidate;
}

export function createLocalReviewerEnv(
  baseEnv: NodeJS.ProcessEnv = process.env,
  overrides: Partial<NodeJS.ProcessEnv> = {},
): NodeJS.ProcessEnv {
  const model =
    overrides.LOCAL_REVIEWER_OLLAMA_MODEL ??
    overrides.LOCAL_REVIEWER_DEFAULT_MODEL ??
    baseEnv.LOCAL_REVIEWER_OLLAMA_MODEL ??
    baseEnv.LOCAL_REVIEWER_DEFAULT_MODEL ??
    DEFAULT_OLLAMA_MODEL;

  return {
    ...baseEnv,
    ...overrides,
    LOCAL_REVIEWER_RUNTIME:
      overrides.LOCAL_REVIEWER_RUNTIME ??
      baseEnv.LOCAL_REVIEWER_RUNTIME ??
      'ollama',
    LOCAL_REVIEWER_DEFAULT_MODEL:
      overrides.LOCAL_REVIEWER_DEFAULT_MODEL ??
      baseEnv.LOCAL_REVIEWER_DEFAULT_MODEL ??
      model,
    LOCAL_REVIEWER_OLLAMA_HOST:
      overrides.LOCAL_REVIEWER_OLLAMA_HOST ??
      baseEnv.LOCAL_REVIEWER_OLLAMA_HOST ??
      DEFAULT_OLLAMA_HOST,
    LOCAL_REVIEWER_OLLAMA_KEEP_ALIVE:
      overrides.LOCAL_REVIEWER_OLLAMA_KEEP_ALIVE ??
      baseEnv.LOCAL_REVIEWER_OLLAMA_KEEP_ALIVE ??
      DEFAULT_OLLAMA_KEEP_ALIVE,
    LOCAL_REVIEWER_OLLAMA_MODEL: model,
    LOCAL_REVIEWER_OLLAMA_THINK:
      overrides.LOCAL_REVIEWER_OLLAMA_THINK ??
      baseEnv.LOCAL_REVIEWER_OLLAMA_THINK ??
      'false',
    LOCAL_REVIEWER_OLLAMA_TIMEOUT_MS:
      overrides.LOCAL_REVIEWER_OLLAMA_TIMEOUT_MS ??
      baseEnv.LOCAL_REVIEWER_OLLAMA_TIMEOUT_MS ??
      DEFAULT_OLLAMA_TIMEOUT_MS,
  };
}

export function buildWindowsProcessBridgePayload(input: {
  args: string[];
  command: string;
  cwd?: string;
}): WindowsProcessBridgePayload {
  return {
    args: [...input.args],
    command: input.command,
    cwd: input.cwd ?? process.cwd(),
  };
}

export function ensureLocalReviewerBuild(
  toolRepoRoot: string,
  dependencies: LocalReviewerDependencies,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const result = dependencies.runProcess({
    command: getPnpmCommand(),
    args: ['nx', 'build', 'local-reviewer'],
    cwd: toolRepoRoot,
    env,
    timeoutMs: LOCAL_REVIEWER_BUILD_TIMEOUT_MS,
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      result.stderr.trim() ||
        result.stdout.trim() ||
        result.error?.message ||
        'Failed to build local-reviewer-cli.',
    );
  }
}

export function runLocalReviewerDoctor(input: {
  dependencies: LocalReviewerDependencies;
  env?: NodeJS.ProcessEnv;
  targetRepoRoot: string;
  toolRepoRoot: string;
}): LocalReviewDoctorReport {
  const payload = runLocalReviewerJsonCommand<LocalReviewDoctorReport>({
    dependencies: input.dependencies,
    env: input.env,
    targetRepoRoot: input.targetRepoRoot,
    toolRepoRoot: input.toolRepoRoot,
    subcommandArgs: ['doctor', '--json'],
  });

  return payload;
}

export function runLocalReviewerReview(input: {
  baseRef?: string;
  dependencies: LocalReviewerDependencies;
  env?: NodeJS.ProcessEnv;
  headRef?: string;
  staged: boolean;
  targetRepoRoot: string;
  toolRepoRoot: string;
}): LocalReviewReport {
  const subcommandArgs = ['review'];
  if (input.staged) {
    subcommandArgs.push('--staged');
  } else if (input.baseRef && input.headRef) {
    subcommandArgs.push('--base', input.baseRef, '--head', input.headRef);
  } else {
    throw new Error('Review mode requires either staged=true or base/head refs.');
  }
  subcommandArgs.push('--json');

  return runLocalReviewerJsonCommand<LocalReviewReport>({
    dependencies: input.dependencies,
    env: input.env,
    targetRepoRoot: input.targetRepoRoot,
    toolRepoRoot: input.toolRepoRoot,
    subcommandArgs,
  });
}

export function collectDiffText(input: {
  baseRef?: string;
  dependencies: LocalReviewerDependencies;
  headRef?: string;
  repoRoot: string;
  staged: boolean;
}): string {
  const args = input.staged
    ? ['diff', '--cached', '--no-color', '--unified=3', '--no-ext-diff']
    : [
        'diff',
        '--no-color',
        '--unified=3',
        input.baseRef ?? '',
        input.headRef ?? '',
        '--no-ext-diff',
      ];

  const result = runGitCommand(input.repoRoot, args.filter(Boolean), input.dependencies);
  return result.stdout.trim();
}

export function collectChangedFiles(input: {
  baseRef?: string;
  dependencies: LocalReviewerDependencies;
  headRef?: string;
  repoRoot: string;
  staged: boolean;
}): string[] {
  const args = input.staged
    ? ['diff', '--cached', '--name-only']
    : ['diff', '--name-only', input.baseRef ?? '', input.headRef ?? ''];
  const result = runGitCommand(input.repoRoot, args.filter(Boolean), input.dependencies);

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getEscalationReasons(input: {
  diffText: string;
  fileCount: number;
  findings: ReadonlyArray<LocalReviewFinding>;
  changedFiles: ReadonlyArray<string>;
  localReviewError?: string;
}): string[] {
  const reasons: string[] = [];

  if (input.localReviewError) {
    reasons.push(`local runtime failure: ${input.localReviewError}`);
  }

  if (
    input.findings.some(
      (finding) => finding.severity === 'critical' || finding.severity === 'high',
    )
  ) {
    reasons.push('local reviewer reported a critical/high finding');
  }

  if (input.fileCount > 15) {
    reasons.push(`diff touches ${input.fileCount} files`);
  }

  const combinedText = `${input.changedFiles.join('\n')}\n${input.diffText}`;
  const categories = SENSITIVE_REVIEW_AREAS.filter(({ pattern }) =>
    pattern.test(combinedText),
  ).map(({ category }) => category);

  if (categories.length > 0) {
    reasons.push(
      `sensitive area detected: ${Array.from(new Set(categories)).join(', ')}`,
    );
  }

  return reasons;
}

export function buildPrefilterContext(input: {
  diffText: string;
  escalationReasons: string[];
  findings: ReadonlyArray<LocalReviewFinding>;
  report: LocalReviewReport;
}): string {
  const changedFiles = input.report.context.files.map((file) => file.path);
  const condensedFiles = changedFiles.slice(0, 8);
  const condensedFindings =
    input.findings.length > 0
      ? input.findings.slice(0, 5).map((finding) => {
          const location = finding.file_path
            ? finding.line
              ? `${finding.file_path}:${finding.line}`
              : finding.file_path
            : '<repo>';
          return `- [${finding.severity}] ${finding.title} (${location}) :: ${finding.detail}`;
        })
      : ['- none'];

  return [
    '# Prefilter',
    '',
    `runtime=${input.report.runtime_provider}`,
    `model=${input.report.model_used ?? 'unconfigured'}`,
    `summary=${input.report.summary}`,
    `recommended_escalation=${input.escalationReasons.length > 0 ? 'yes' : 'no'}`,
    '',
    'reasons:',
    ...(input.escalationReasons.length > 0
      ? input.escalationReasons.map((reason) => `- ${reason}`)
      : ['- none']),
    '',
    'files:',
    ...condensedFiles.map((file) => `- ${file}`),
    ...(changedFiles.length > condensedFiles.length
      ? [`- ... ${changedFiles.length - condensedFiles.length} more file(s)`]
      : []),
    '',
    'findings:',
    ...condensedFindings,
    '',
    'focus:',
    ...deriveSuggestedReviewFocus(input.findings, input.escalationReasons)
      .slice(0, 4)
      .map((line) => `- ${line}`),
  ].join('\n');
}

export function buildPrefilterFailureContext(input: {
  changedFiles: ReadonlyArray<string>;
  diffText: string;
  escalationReasons: ReadonlyArray<string>;
  localReviewError: string;
}): string {
  const condensedFiles = input.changedFiles.slice(0, 8);

  return [
    '# Prefilter',
    '',
    'runtime=unavailable',
    'model=unconfigured',
    `summary=local reviewer failed before producing a report: ${input.localReviewError}`,
    'recommended_escalation=yes',
    '',
    'reasons:',
    ...input.escalationReasons.map((reason) => `- ${reason}`),
    '',
    'files:',
    ...(condensedFiles.length > 0
      ? condensedFiles.map((file) => `- ${file}`)
      : ['- none']),
    ...(input.changedFiles.length > condensedFiles.length
      ? [`- ... ${input.changedFiles.length - condensedFiles.length} more file(s)`]
      : []),
    '',
    'findings:',
    '- none',
    '',
    'focus:',
    '- Review the full diff because the local reviewer runtime failed',
    '- Investigate the local runtime failure before trusting prefilter results',
  ].join('\n');
}

export function selectPaidReviewContext(input: {
  diffText: string;
  forceFullDiff?: boolean;
  prefilterContext: string;
  smallDiffThresholdChars?: number;
}): PaidReviewContextSelection {
  const diffText = input.diffText.trim();
  const prefilterContext = input.prefilterContext.trim();
  const originalDiffLength = diffText.length;
  const smallDiffThresholdChars =
    input.smallDiffThresholdChars ?? DEFAULT_SMALL_DIFF_THRESHOLD_CHARS;

  if (
    input.forceFullDiff ||
    originalDiffLength <= smallDiffThresholdChars ||
    prefilterContext.length === 0 ||
    prefilterContext.length >= originalDiffLength
  ) {
    return {
      contextLength: originalDiffLength,
      contextText: diffText,
      mode: 'full-diff',
      originalDiffLength,
      smallDiffThresholdChars,
    };
  }

  return {
    contextLength: prefilterContext.length,
    contextText: prefilterContext,
    mode: 'prefilter-summary',
    originalDiffLength,
    smallDiffThresholdChars,
  };
}

export function writePrefilterArtifacts(input: {
  contextMarkdown: string;
  reportPayload: Record<string, unknown>;
  repoRoot: string;
  reviewContextSelection: PaidReviewContextSelection;
}): { contextPath: string; reportPath: string; reviewContextPath: string } {
  const artifactRoot = resolve(input.repoRoot, ...PREFILTER_ARTIFACT_DIR);
  mkdirSync(artifactRoot, { recursive: true });

  const reportPath = resolve(artifactRoot, PREFILTER_REPORT_FILE);
  const contextPath = resolve(artifactRoot, PREFILTER_CONTEXT_FILE);
  const reviewContextPath = resolve(artifactRoot, REVIEWER_CONTEXT_FILE);
  writeFileSync(reportPath, JSON.stringify(input.reportPayload, null, 2), 'utf8');
  writeFileSync(contextPath, `${input.contextMarkdown.trim()}\n`, 'utf8');
  writeFileSync(
    reviewContextPath,
    `${input.reviewContextSelection.contextText.trim()}\n`,
    'utf8',
  );

  return { contextPath, reportPath, reviewContextPath };
}

export function resolveEvaluationRepoTargets(
  currentRepoRoot: string,
  requestedRepos: ReadonlyArray<string> = [],
): EvaluationRepoTarget[] {
  const repoInputs =
    requestedRepos.length > 0 ? requestedRepos : [...DEFAULT_EVALUATION_REPO_NAMES];
  const resolvedTargets: EvaluationRepoTarget[] = [];
  const seenRoots = new Set<string>();

  for (const repoInput of repoInputs) {
    const target = resolveEvaluationRepoTarget(currentRepoRoot, repoInput);
    const normalizedRoot = target.root.toLowerCase();
    if (seenRoots.has(normalizedRoot)) {
      continue;
    }
    if (
      !existsSync(target.root) ||
      (!existsSync(resolve(target.root, '.git')) &&
        !existsSync(resolve(target.root, 'package.json')))
    ) {
      throw new Error(`Unable to find an evaluation repository at ${target.root}.`);
    }

    resolvedTargets.push(target);
    seenRoots.add(normalizedRoot);
  }

  return resolvedTargets;
}

export function buildCheckpointReviewContext(input: {
  diffText: string;
  sample: EvaluationSample;
}): string {
  return [
    `Repository: ${input.sample.repoName}`,
    `Commit: ${input.sample.commit}`,
    `Base ref: ${input.sample.baseRef}`,
    `Head ref: ${input.sample.commit}`,
    `Subject: ${input.sample.subject}`,
    `Kind: ${input.sample.kind}`,
    '',
    'Diff to review:',
    input.diffText.trim(),
  ].join('\n');
}

export function collectEvaluationSamples(input: {
  dependencies: LocalReviewerDependencies;
  repoTargets: ReadonlyArray<EvaluationRepoTarget>;
  rounds?: number;
  seed?: number;
}): EvaluationSample[] {
  const rounds = input.rounds ?? DEFAULT_EVALUATION_ROUNDS;
  const seed = input.seed ?? DEFAULT_SAMPLE_SEED;
  const candidates = input.repoTargets.flatMap((repo, index) =>
    sampleRepoCommits(repo.root, repo.name, input.dependencies, seed + index + 1),
  );

  return selectEvaluationSamples({
    candidates,
    rounds,
    seed,
  });
}

export function collectRepoCommitCandidates(input: {
  dependencies: LocalReviewerDependencies;
  repoName: string;
  repoRoot: string;
  seed: number;
}): EvaluationSample[] {
  return sampleRepoCommits(
    input.repoRoot,
    input.repoName,
    input.dependencies,
    input.seed,
  );
}

export function selectAbSamples(
  samples: ReadonlyArray<EvaluationSample>,
  desiredCount = 4,
): EvaluationSample[] {
  if (desiredCount <= 0) {
    return [];
  }

  const selected: EvaluationSample[] = [];
  const remaining = [...samples];
  const preferredOrder: EvaluationSample['kind'][] = [
    'small-ts',
    'multi-file-refactor',
    'workspace-config',
    'higher-risk',
    'general',
  ];

  for (const kind of preferredOrder) {
    if (selected.length >= desiredCount) {
      break;
    }
    const index = remaining.findIndex((sample) => sample.kind === kind);
    if (index === -1) {
      continue;
    }

    selected.push(remaining[index]!);
    remaining.splice(index, 1);
  }

  while (selected.length < desiredCount && remaining.length > 0) {
    selected.push(remaining.shift()!);
  }

  return selected;
}

export function summarizeEvaluation(input: {
  config: LocalReviewerEvaluationConfig;
  localResults: ReadonlyArray<EvaluationLocalResult>;
  reviewerResults: ReadonlyArray<EvaluationReviewerResult>;
  repoRoot: string;
}): {
  artifacts: {
    abResultsPath: string;
    localResultsPath: string;
    samplesPath: string;
    summaryPath: string;
  };
  summaryMarkdown: string;
} {
  const artifactRoot = resolve(input.repoRoot, ...EVALUATION_ARTIFACT_DIR);
  mkdirSync(artifactRoot, { recursive: true });

  const samplesPath = resolve(artifactRoot, 'samples.json');
  const localResultsPath = resolve(artifactRoot, 'local-results.json');
  const abResultsPath = resolve(artifactRoot, 'ab-results.json');
  const summaryPath = resolve(artifactRoot, 'summary.md');

  const samplePayload = input.localResults.map((result) => result.sample);
  writeFileSync(samplesPath, JSON.stringify(samplePayload, null, 2), 'utf8');
  writeFileSync(localResultsPath, JSON.stringify(input.localResults, null, 2), 'utf8');
  writeFileSync(abResultsPath, JSON.stringify(input.reviewerResults, null, 2), 'utf8');

  const summaryMarkdown = renderEvaluationSummary(
    input.localResults,
    input.reviewerResults,
    input.config,
  );
  writeFileSync(summaryPath, `${summaryMarkdown.trim()}\n`, 'utf8');

  return {
    artifacts: {
      abResultsPath,
      localResultsPath,
      samplesPath,
      summaryPath,
    },
    summaryMarkdown,
  };
}

export function evaluateSampleWithLocalReviewer(input: {
  dependencies: LocalReviewerDependencies;
  env?: NodeJS.ProcessEnv;
  sample: EvaluationSample;
  smallDiffThresholdChars?: number;
  toolRepoRoot: string;
}): EvaluationLocalResult {
  const startedAt = Date.now();
  const diffText = collectDiffText({
    baseRef: input.sample.baseRef,
    dependencies: input.dependencies,
    headRef: input.sample.commit,
    repoRoot: input.sample.repoRoot,
    staged: false,
  });
  const diffLength = diffText.length;

  try {
    const report = runLocalReviewerReview({
      baseRef: input.sample.baseRef,
      dependencies: input.dependencies,
      env: input.env,
      headRef: input.sample.commit,
      staged: false,
      targetRepoRoot: input.sample.repoRoot,
      toolRepoRoot: input.toolRepoRoot,
    });
    const contextMarkdown = buildPrefilterContext({
      diffText,
      escalationReasons: getEscalationReasons({
        diffText,
        fileCount: input.sample.fileCount,
        findings: report.findings,
        changedFiles: report.context.files.map((file) => file.path),
      }),
      findings: report.findings,
      report,
    });
    const escalationReasons = getEscalationReasons({
      diffText,
      fileCount: input.sample.fileCount,
      findings: report.findings,
      changedFiles: report.context.files.map((file) => file.path),
    });
    const reviewContextSelection = selectPaidReviewContext({
      diffText,
      prefilterContext: contextMarkdown,
      smallDiffThresholdChars: input.smallDiffThresholdChars,
    });

    return {
      durationMs: Date.now() - startedAt,
      diffLength,
      findingsCount: report.findings.length,
      jsonParseable: true,
      paidReviewContextLength:
        escalationReasons.length > 0 ? reviewContextSelection.contextLength : 0,
      prefilterContextLength: contextMarkdown.length,
      recommendedEscalation: escalationReasons.length > 0,
      escalationReasons,
      report,
      reviewContextLength: reviewContextSelection.contextLength,
      reviewContextMode: reviewContextSelection.mode,
      sample: input.sample,
      success: true,
      summaryLength: contextMarkdown.length,
    };
  } catch (error) {
    const errorText = error instanceof Error ? error.message : String(error);
    return {
      durationMs: Date.now() - startedAt,
      diffLength,
      error: errorText,
      findingsCount: 0,
      jsonParseable: false,
      paidReviewContextLength: diffLength,
      prefilterContextLength: 0,
      recommendedEscalation: true,
      escalationReasons: getEscalationReasons({
        diffText,
        fileCount: input.sample.fileCount,
        findings: [],
        changedFiles: [],
        localReviewError: errorText,
      }),
      reviewContextLength: diffLength,
      reviewContextMode: 'full-diff',
      sample: input.sample,
      success: false,
      summaryLength: 0,
    };
  }
}

export function evaluateSampleWithCheckpointReview(input: {
  dependencies: LocalReviewerDependencies;
  sample: EvaluationSample;
}): EvaluationReviewerResult {
  const startedAt = Date.now();
  const context = buildCheckpointReviewContext({
    diffText: collectDiffText({
      baseRef: input.sample.baseRef,
      dependencies: input.dependencies,
      headRef: input.sample.commit,
      repoRoot: input.sample.repoRoot,
      staged: false,
    }),
    sample: input.sample,
  });

  const result = input.dependencies.runProcess({
    command: getPnpmCommand(),
    args: ['review:implementation', '--', '--focus', 'general'],
    cwd: input.sample.repoRoot,
    input: context,
    timeoutMs: LOCAL_REVIEWER_COMMAND_TIMEOUT_MS,
  });

  return {
    durationMs: Date.now() - startedAt,
    error:
      result.error?.message ||
      (result.status === 0 ? undefined : result.stderr.trim() || result.stdout.trim()),
    output: result.stdout.trim(),
    providerAvailable: result.status === 0,
    sample: input.sample,
    success: result.status === 0,
  };
}

function renderEvaluationSummary(
  localResults: ReadonlyArray<EvaluationLocalResult>,
  reviewerResults: ReadonlyArray<EvaluationReviewerResult>,
  config: LocalReviewerEvaluationConfig,
): string {
  const total = localResults.length;
  const successful = localResults.filter((result) => result.success).length;
  const parseable = localResults.filter((result) => result.jsonParseable).length;
  const escalated = localResults.filter((result) => result.recommendedEscalation).length;
  const localMedianMs = median(localResults.map((result) => result.durationMs));
  const findingMedian = median(localResults.map((result) => result.findingsCount));
  const baselineDiffChars = localResults.reduce(
    (sum, result) => sum + result.diffLength,
    0,
  );
  const paidReviewContextChars = localResults.reduce(
    (sum, result) => sum + result.paidReviewContextLength,
    0,
  );
  const actualContextRatios = localResults
    .filter((result) => result.recommendedEscalation && result.diffLength > 0)
    .map((result) => result.paidReviewContextLength / result.diffLength);
  const averageCompressionRatio =
    actualContextRatios.length > 0
      ? actualContextRatios.reduce((sum, value) => sum + value, 0) /
        actualContextRatios.length
      : 0;
  const trafficSavingsPct =
    baselineDiffChars > 0
      ? ((baselineDiffChars - paidReviewContextChars) / baselineDiffChars) * 100
      : 0;

  const sampleLines = localResults.map((result) => {
    const reviewer = reviewerResults.find(
      (entry) =>
        entry.sample.repoName === result.sample.repoName &&
        entry.sample.commit === result.sample.commit,
    );
    const paidContext =
      result.recommendedEscalation
        ? `${result.reviewContextMode} (${result.paidReviewContextLength})`
        : 'not-needed';
    return `| ${result.sample.repoName} | ${result.sample.kind} | ${shortHash(result.sample.commit)} | ${result.success ? 'ok' : 'fail'} | ${result.findingsCount} | ${result.recommendedEscalation ? 'yes' : 'no'} | ${paidContext} | ${deriveVerdict(result, reviewer)} |`;
  });

  return [
    '# Local Reviewer Evaluation Summary',
    '',
    `- Benchmark mode: ${config.abSampleCount > 0 ? `estimate + ${reviewerResults.length} A/B review sample(s)` : 'estimate-only'}`,
    `- Local parallel jobs: ${config.jobs}`,
    `- Repo pool: ${config.repoNames.join(', ')}`,
    `- Requested rounds: ${config.rounds}`,
    `- Small diff threshold: ${config.smallDiffThresholdChars} chars`,
    `- Samples: ${successful}/${total} local reviews succeeded`,
    `- JSON parse rate: ${parseable}/${total}`,
    `- Median duration: ${localMedianMs} ms`,
    `- Median findings: ${findingMedian}`,
    `- Estimated paid review requests: ${escalated}/${total}`,
    `- Estimated paid review context chars: ${paidReviewContextChars}/${baselineDiffChars} (${trafficSavingsPct.toFixed(1)}% saved)`,
    `- Average paid/original diff char ratio: ${averageCompressionRatio.toFixed(2)}`,
    '',
    '| Repo | Kind | Commit | Local Result | Findings | Escalate | Paid Context | Verdict |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...sampleLines,
  ].join('\n');
}

function deriveSuggestedReviewFocus(
  findings: ReadonlyArray<LocalReviewFinding>,
  escalationReasons: ReadonlyArray<string>,
): string[] {
  const focus = new Set<string>();

  for (const finding of findings) {
    if (finding.profile) {
      focus.add(`Re-check ${finding.profile} concerns`);
    }
    if (finding.recommendation) {
      focus.add(finding.recommendation);
    }
  }

  for (const reason of escalationReasons) {
    focus.add(reason);
  }

  return focus.size > 0 ? [...focus] : ['General correctness and missing tests'];
}

function runLocalReviewerJsonCommand<T>(input: {
  dependencies: LocalReviewerDependencies;
  env?: NodeJS.ProcessEnv;
  subcommandArgs: string[];
  targetRepoRoot: string;
  toolRepoRoot: string;
}): T {
  const result = input.dependencies.runProcess({
    command: 'node',
    args: [
      resolve(input.toolRepoRoot, 'packages', 'local-reviewer', 'bin', 'local-reviewer.js'),
      '--repo-root',
      input.targetRepoRoot,
      ...input.subcommandArgs,
    ],
    cwd: input.toolRepoRoot,
    env: input.env,
    timeoutMs: LOCAL_REVIEWER_COMMAND_TIMEOUT_MS,
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      result.stderr.trim() ||
        result.stdout.trim() ||
        result.error?.message ||
        'local-reviewer execution failed.',
    );
  }

  try {
    return JSON.parse(result.stdout) as T;
  } catch (error) {
    throw new Error(
      `local-reviewer returned non-JSON output: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function runGitCommand(
  repoRoot: string,
  args: string[],
  dependencies: LocalReviewerDependencies,
): CommandResult {
  const result = dependencies.runProcess({
    command: 'git',
    args,
    cwd: repoRoot,
    timeoutMs: LOCAL_REVIEWER_COMMAND_TIMEOUT_MS,
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      result.stderr.trim() ||
        result.stdout.trim() ||
        result.error?.message ||
        `Git command failed: git ${args.join(' ')}`,
    );
  }

  return result;
}

function sampleRepoCommits(
  repoRoot: string,
  repoName: string,
  dependencies: LocalReviewerDependencies,
  seed: number,
): EvaluationSample[] {
  const sinceDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const logResult = runGitCommand(
    repoRoot,
    ['log', '--since', sinceDate, '--no-merges', '--format=%H%x1f%ct%x1f%s'],
    dependencies,
  );

  const candidates = logResult.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [commit, epochRaw, subject] = line.split('\u001f');
      const baseRef = resolveParentCommit(repoRoot, commit, dependencies);
      if (!baseRef) {
        return null;
      }

      const numstat = runGitCommand(
        repoRoot,
        ['diff', '--numstat', baseRef, commit],
        dependencies,
      ).stdout;
      const parsed = parseNumstat(numstat);
      if (parsed.binary || parsed.fileCount === 0 || parsed.fileCount > 20) {
        return null;
      }

      return {
        baseRef,
        commit,
        committedAtEpoch: Number.parseInt(epochRaw ?? '0', 10),
        fileCount: parsed.fileCount,
        kind: classifySample(parsed.files, parsed.totalChangedLines),
        repoName,
        repoRoot,
        subject: subject ?? '<no subject>',
        totalChangedLines: parsed.totalChangedLines,
      } satisfies EvaluationSample;
    })
    .filter((sample): sample is EvaluationSample => sample !== null);

  return shuffleWithSeed(candidates, seed);
}

function classifySample(
  files: string[],
  totalChangedLines: number,
): EvaluationSample['kind'] {
  if (
    files.some((file) =>
      /(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|nx\.json|tsconfig|project\.json|\.ya?ml|\.json|\.toml|README\.md)$/i.test(
        file,
      ),
    )
  ) {
    return 'workspace-config';
  }

  if (
    files.some((file) =>
      /(auth|secret|token|password|migration|database|schema|controller|dto)/i.test(
        file,
      ),
    )
  ) {
    return 'higher-risk';
  }

  if (files.length >= 4) {
    return 'multi-file-refactor';
  }

  const codeFiles = files.filter((file) => /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/i.test(file));
  if (codeFiles.length === files.length && files.length <= 2 && totalChangedLines <= 120) {
    return 'small-ts';
  }

  return 'general';
}

function resolveEvaluationRepoTarget(
  currentRepoRoot: string,
  repoInput: string,
): EvaluationRepoTarget {
  if (
    (DEFAULT_EVALUATION_REPO_NAMES as readonly string[]).includes(repoInput)
  ) {
    return {
      name: repoInput,
      root: resolve(currentRepoRoot, '..', repoInput),
    };
  }

  const root = resolve(currentRepoRoot, repoInput);
  return {
    name: basename(root),
    root,
  };
}

export function selectEvaluationSamples(input: {
  candidates: ReadonlyArray<EvaluationSample>;
  rounds: number;
  seed: number;
}): EvaluationSample[] {
  if (input.rounds <= 0 || input.candidates.length === 0) {
    return [];
  }

  const selected: EvaluationSample[] = [];
  const chosenKeys = new Set<string>();
  const quotas = buildSoftSampleQuotas(input.rounds);

  for (const [index, kind] of EVALUATION_KIND_ORDER.entries()) {
    const pool = shuffleWithSeed(
      input.candidates.filter((sample) => sample.kind === kind),
      input.seed + index + 11,
    );
    for (const sample of pool.slice(0, quotas[kind])) {
      const key = `${sample.repoName}:${sample.commit}`;
      if (chosenKeys.has(key)) {
        continue;
      }
      selected.push(sample);
      chosenKeys.add(key);
    }
  }

  if (selected.length < input.rounds) {
    const remaining = shuffleWithSeed(
      input.candidates.filter((sample) => !chosenKeys.has(`${sample.repoName}:${sample.commit}`)),
      input.seed + 101,
    );
    selected.push(...remaining.slice(0, input.rounds - selected.length));
  }

  return interleaveEvaluationSamples(selected, input.seed);
}

function buildSoftSampleQuotas(
  rounds: number,
): Record<EvaluationSample['kind'], number> {
  const quotas = Object.fromEntries(
    EVALUATION_KIND_ORDER.map((kind) => [kind, 0]),
  ) as Record<EvaluationSample['kind'], number>;
  const totals = EVALUATION_KIND_ORDER.map((kind) => ({
    exact: (rounds * EVALUATION_KIND_WEIGHTS[kind]) / DEFAULT_EVALUATION_ROUNDS,
    kind,
  }));

  let allocated = 0;
  for (const entry of totals) {
    const floored = Math.floor(entry.exact);
    quotas[entry.kind] = floored;
    allocated += floored;
  }

  const remainder = Math.max(rounds - allocated, 0);
  const byRemainder = [...totals].sort((left, right) => {
    const leftRemainder = left.exact - Math.floor(left.exact);
    const rightRemainder = right.exact - Math.floor(right.exact);
    return rightRemainder - leftRemainder;
  });

  for (const entry of byRemainder.slice(0, remainder)) {
    quotas[entry.kind] += 1;
  }

  return quotas;
}

function interleaveEvaluationSamples(
  samples: ReadonlyArray<EvaluationSample>,
  seed: number,
): EvaluationSample[] {
  const queues = new Map<EvaluationSample['kind'], EvaluationSample[]>();
  for (const [index, kind] of EVALUATION_KIND_ORDER.entries()) {
    queues.set(
      kind,
      shuffleWithSeed(
        samples.filter((sample) => sample.kind === kind),
        seed + index + 151,
      ),
    );
  }

  const output: EvaluationSample[] = [];
  while ([...queues.values()].some((queue) => queue.length > 0)) {
    for (const kind of EVALUATION_KIND_ORDER) {
      const queue = queues.get(kind);
      if (queue && queue.length > 0) {
        output.push(queue.shift()!);
      }
    }
  }

  return output;
}

function parseNumstat(stdout: string): {
  binary: boolean;
  fileCount: number;
  files: string[];
  totalChangedLines: number;
} {
  let binary = false;
  let totalChangedLines = 0;
  const files: string[] = [];

  for (const line of stdout.split(/\r?\n/)) {
    const normalized = line.trim();
    if (!normalized) {
      continue;
    }

    const [addedRaw, deletedRaw, filePath] = normalized.split('\t');
    if (!filePath) {
      continue;
    }
    if (addedRaw === '-' || deletedRaw === '-') {
      binary = true;
      break;
    }

    files.push(filePath);
    totalChangedLines += Number.parseInt(addedRaw ?? '0', 10);
    totalChangedLines += Number.parseInt(deletedRaw ?? '0', 10);
  }

  return {
    binary,
    fileCount: files.length,
    files,
    totalChangedLines,
  };
}

function resolveParentCommit(
  repoRoot: string,
  commit: string,
  dependencies: LocalReviewerDependencies,
): string | null {
  const result = dependencies.runProcess({
    command: 'git',
    args: ['rev-parse', `${commit}^`],
    cwd: repoRoot,
    timeoutMs: LOCAL_REVIEWER_COMMAND_TIMEOUT_MS,
  });

  if (result.error || result.status !== 0) {
    return null;
  }

  return result.stdout.trim() || null;
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  const random = mulberry32(seed);
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }
  return copy;
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shortHash(commit: string): string {
  return commit.slice(0, 7);
}

function deriveVerdict(
  localResult: EvaluationLocalResult,
  reviewerResult?: EvaluationReviewerResult,
): 'usable-prefilter' | 'needs-escalation' | 'misleading' {
  if (!localResult.success || localResult.recommendedEscalation) {
    return 'needs-escalation';
  }

  if (
    reviewerResult?.success &&
    /\b(critical|high|blocking|security risk|public contract)\b/i.test(
      reviewerResult.output,
    )
  ) {
    return 'misleading';
  }

  return 'usable-prefilter';
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1]! + sorted[middle]!) / 2)
    : sorted[middle]!;
}

function getPnpmCommand(): string {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function sanitizeEnv(
  env: NodeJS.ProcessEnv | undefined,
): NodeJS.ProcessEnv | undefined {
  if (!env) {
    return undefined;
  }

  const sanitizedEntries = Object.entries(env).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  return Object.fromEntries(sanitizedEntries);
}

function resolveWindowsPowerShellPath(): string | null {
  if (process.platform !== 'win32') {
    return null;
  }

  const candidates = [
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function encodePowerShellCommand(command: string): string {
  return Buffer.from(command, 'utf16le').toString('base64');
}

export {
  DEFAULT_EVALUATION_AB_SAMPLE_COUNT,
  DEFAULT_EVALUATION_ROUNDS,
  DEFAULT_SAMPLE_SEED,
  DEFAULT_SMALL_DIFF_THRESHOLD_CHARS,
  EVALUATION_ARTIFACT_DIR,
  PREFILTER_ARTIFACT_DIR,
  PREFILTER_CONTEXT_FILE,
  PREFILTER_REPORT_FILE,
  REVIEWER_CONTEXT_FILE,
};
