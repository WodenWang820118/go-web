import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  buildPrefilterContext,
  buildPrefilterFailureContext,
  collectChangedFiles,
  collectDiffText,
  collectEvaluationSamples,
  createLocalReviewerDependencies,
  createLocalReviewerEnv,
  DEFAULT_EVALUATION_AB_SAMPLE_COUNT,
  DEFAULT_EVALUATION_ROUNDS,
  DEFAULT_SAMPLE_SEED,
  DEFAULT_SMALL_DIFF_THRESHOLD_CHARS,
  ensureLocalReviewerBuild,
  evaluateSampleWithCheckpointReview,
  evaluateSampleWithLocalReviewer,
  getEscalationReasons,
  resolveEvaluationRepoTargets,
  resolveLocalReviewerRepoRoot,
  runLocalReviewerDoctor,
  runLocalReviewerReview,
  selectAbSamples,
  selectPaidReviewContext,
  summarizeEvaluation,
  writePrefilterArtifacts,
} from './local-reviewer-support.ts';

type LocalReviewerCommand = 'doctor' | 'evaluate' | 'prefilter' | 'staged';

export interface ParsedLocalReviewerCliArgs {
  abSamples: number;
  command: LocalReviewerCommand;
  repos: string[];
  rounds: number;
  seed: number;
  smallDiffThresholdChars: number;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const parsed = parseCliArgs(argv);
  const repoRoot = process.cwd();
  const dependencies = createLocalReviewerDependencies();
  const toolRepoRoot = resolveLocalReviewerRepoRoot(repoRoot);
  const env = createLocalReviewerEnv();

  ensureLocalReviewerBuild(toolRepoRoot, dependencies, env);

  if (parsed.command === 'doctor') {
    const report = runLocalReviewerDoctor({
      dependencies,
      env,
      targetRepoRoot: repoRoot,
      toolRepoRoot,
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  if (parsed.command === 'staged') {
    const report = runLocalReviewerReview({
      dependencies,
      env,
      staged: true,
      targetRepoRoot: repoRoot,
      toolRepoRoot,
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  if (parsed.command === 'prefilter') {
    const diffText = collectDiffText({
      dependencies,
      repoRoot,
      staged: true,
    });
    const changedFiles = collectChangedFiles({
      dependencies,
      repoRoot,
      staged: true,
    });

    try {
      const report = runLocalReviewerReview({
        dependencies,
        env,
        staged: true,
        targetRepoRoot: repoRoot,
        toolRepoRoot,
      });
      const escalationReasons = getEscalationReasons({
        diffText,
        fileCount: changedFiles.length,
        findings: report.findings,
        changedFiles,
      });
      const contextMarkdown = buildPrefilterContext({
        diffText,
        escalationReasons,
        findings: report.findings,
        report,
      });
      const reviewContextSelection = selectPaidReviewContext({
        diffText,
        prefilterContext: contextMarkdown,
        smallDiffThresholdChars: parsed.smallDiffThresholdChars,
      });
      const payload = {
        recommended_escalation: escalationReasons.length > 0,
        escalation_reasons: escalationReasons,
        report,
        review_context_mode: reviewContextSelection.mode,
        small_diff_threshold_chars: reviewContextSelection.smallDiffThresholdChars,
      };
      const artifacts = writePrefilterArtifacts({
        repoRoot,
        contextMarkdown,
        reportPayload: payload,
        reviewContextSelection,
      });

      writePrefilterOutput({
        artifacts,
        payload,
        recommendedEscalation: escalationReasons.length > 0,
        reviewContextMode: reviewContextSelection.mode,
        smallDiffThresholdChars: reviewContextSelection.smallDiffThresholdChars,
      });
      return;
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      const escalationReasons = getEscalationReasons({
        diffText,
        fileCount: changedFiles.length,
        findings: [],
        changedFiles,
        localReviewError: errorText,
      });
      const contextMarkdown = buildPrefilterFailureContext({
        changedFiles,
        diffText,
        escalationReasons,
        localReviewError: errorText,
      });
      const reviewContextSelection = selectPaidReviewContext({
        diffText,
        forceFullDiff: true,
        prefilterContext: contextMarkdown,
        smallDiffThresholdChars: parsed.smallDiffThresholdChars,
      });
      const payload = {
        recommended_escalation: true,
        escalation_reasons: escalationReasons,
        local_review_error: errorText,
        report: null,
        review_context_mode: reviewContextSelection.mode,
        small_diff_threshold_chars: reviewContextSelection.smallDiffThresholdChars,
      };
      const artifacts = writePrefilterArtifacts({
        repoRoot,
        contextMarkdown,
        reportPayload: payload,
        reviewContextSelection,
      });

      writePrefilterOutput({
        artifacts,
        payload,
        recommendedEscalation: true,
        reviewContextMode: reviewContextSelection.mode,
        smallDiffThresholdChars: reviewContextSelection.smallDiffThresholdChars,
      });
      return;
    }
  }

  const repoTargets = resolveEvaluationRepoTargets(repoRoot, parsed.repos);
  const samples = collectEvaluationSamples({
    dependencies,
    repoTargets,
    rounds: parsed.rounds,
    seed: parsed.seed,
  });
  const localResults = samples.map((sample) =>
    evaluateSampleWithLocalReviewer({
      dependencies,
      env,
      sample,
      smallDiffThresholdChars: parsed.smallDiffThresholdChars,
      toolRepoRoot,
    }),
  );
  const abSamples = selectAbSamples(samples, parsed.abSamples);
  const reviewerResults =
    parsed.abSamples > 0
      ? abSamples.map((sample) =>
          evaluateSampleWithCheckpointReview({
            dependencies,
            sample,
          }),
        )
      : [];
  const output = summarizeEvaluation({
    config: {
      abSampleCount: parsed.abSamples,
      repoNames: repoTargets.map((repo) => repo.name),
      rounds: parsed.rounds,
      seed: parsed.seed,
      smallDiffThresholdChars: parsed.smallDiffThresholdChars,
    },
    localResults,
    reviewerResults,
    repoRoot,
  });

  process.stdout.write(`${output.summaryMarkdown}\n`);
  process.stdout.write(
    [
      '',
      `samples_path=${output.artifacts.samplesPath}`,
      `local_results_path=${output.artifacts.localResultsPath}`,
      `ab_results_path=${output.artifacts.abResultsPath}`,
      `summary_path=${output.artifacts.summaryPath}`,
    ].join('\n'),
  );
  process.stdout.write('\n');
}

export function parseCliArgs(
  argv: string[] = process.argv.slice(2),
): ParsedLocalReviewerCliArgs {
  const command = parseCommand(argv[0]);
  const parsed: ParsedLocalReviewerCliArgs = {
    abSamples: DEFAULT_EVALUATION_AB_SAMPLE_COUNT,
    command,
    repos: [],
    rounds: DEFAULT_EVALUATION_ROUNDS,
    seed: DEFAULT_SAMPLE_SEED,
    smallDiffThresholdChars: DEFAULT_SMALL_DIFF_THRESHOLD_CHARS,
  };

  for (let index = 1; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--rounds') {
      parsed.rounds = readIntegerFlag(argv, index, current);
      index += 1;
      continue;
    }

    if (current === '--seed') {
      parsed.seed = readIntegerFlag(argv, index, current);
      index += 1;
      continue;
    }

    if (current === '--small-diff-threshold-chars') {
      parsed.smallDiffThresholdChars = readIntegerFlag(argv, index, current);
      index += 1;
      continue;
    }

    if (current === '--ab-samples') {
      parsed.abSamples = readIntegerFlag(argv, index, current);
      index += 1;
      continue;
    }

    if (current === '--repo') {
      parsed.repos.push(readStringFlag(argv, index, current));
      index += 1;
      continue;
    }

    throw new Error(`${getUsageText()}\n\nUnknown flag: ${current}`);
  }

  return parsed;
}

export function getUsageText(scriptName = 'local-reviewer.ts'): string {
  return [
    `Usage: node --experimental-strip-types ${scriptName} <doctor|staged|prefilter|evaluate> [options]`,
    '',
    'Options:',
    `  --small-diff-threshold-chars <n>  Override the small diff cutoff (default: ${DEFAULT_SMALL_DIFF_THRESHOLD_CHARS})`,
    `  --rounds <n>                      Evaluation rounds for \`evaluate\` (default: ${DEFAULT_EVALUATION_ROUNDS})`,
    `  --seed <n>                        Deterministic sample seed for \`evaluate\` (default: ${DEFAULT_SAMPLE_SEED})`,
    `  --ab-samples <n>                  Optional paid-review A/B sample count for \`evaluate\` (default: ${DEFAULT_EVALUATION_AB_SAMPLE_COUNT})`,
    '  --repo <path-or-name>             Additional evaluation repo target; repeatable',
  ].join('\n');
}

function writePrefilterOutput(input: {
  artifacts: {
    contextPath: string;
    reportPath: string;
    reviewContextPath: string;
  };
  payload: Record<string, unknown>;
  recommendedEscalation: boolean;
  reviewContextMode: string;
  smallDiffThresholdChars: number;
}): void {
  process.stdout.write(
    [
      `recommended_escalation=${String(input.recommendedEscalation)}`,
      `report_path=${input.artifacts.reportPath}`,
      `context_path=${input.artifacts.contextPath}`,
      `review_context_path=${input.artifacts.reviewContextPath}`,
      `review_context_mode=${input.reviewContextMode}`,
      `small_diff_threshold_chars=${input.smallDiffThresholdChars}`,
      '',
      JSON.stringify(input.payload, null, 2),
    ].join('\n'),
  );
  process.stdout.write('\n');
}

function parseCommand(rawValue?: string): LocalReviewerCommand {
  if (
    rawValue === 'doctor' ||
    rawValue === 'staged' ||
    rawValue === 'prefilter' ||
    rawValue === 'evaluate'
  ) {
    return rawValue;
  }

  throw new Error(getUsageText(resolveUsageScriptName()));
}

function readIntegerFlag(argv: string[], index: number, flag: string): number {
  const rawValue = argv[index + 1];
  if (!rawValue) {
    throw new Error(`${getUsageText()}\n\nMissing value for ${flag}.`);
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${flag} requires a non-negative integer.`);
  }

  return parsed;
}

function readStringFlag(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) {
    throw new Error(`${getUsageText()}\n\nMissing value for ${flag}.`);
  }

  return value;
}

function resolveUsageScriptName(): string {
  return basename(process.argv[1] ?? 'local-reviewer.ts');
}

const isEntryPoint =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
