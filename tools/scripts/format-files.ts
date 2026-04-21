import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import * as prettier from 'prettier';

type FormatMode = 'check' | 'write';
type FileSource = 'args' | 'staged' | 'tracked';

interface ParsedArgs {
  files: string[];
  mode: FormatMode;
  restage: boolean;
  source: FileSource;
}

interface FormatExecutionDependencies {
  resolveFiles: (parsed: ParsedArgs) => Promise<string[]>;
  restageFiles: (files: string[]) => void;
  runPrettier: (mode: FormatMode, files: string[]) => void;
}

const DEFAULT_BATCH_SIZE = 50;

type CommandRunner = (
  command: string,
  args: string[],
) => { error?: Error; status?: number | null };

function resolvePackageManagerExecution(): {
  args: string[];
  command: string;
} {
  const execPath = process.env.npm_execpath;
  if (execPath) {
    return {
      command: process.execPath,
      args: [execPath],
    };
  }

  return {
    command: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    args: [],
  };
}

function defaultCommandRunner(
  command: string,
  args: string[],
): { error?: Error; status?: number | null } {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'inherit',
  });

  return {
    error: result.error ?? undefined,
    status: result.status,
  };
}

export function chunkItems<T>(items: T[], size = DEFAULT_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export function parseCliArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    mode: 'write',
    source: 'tracked',
    restage: false,
    files: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--mode') {
      const value = argv[index + 1];
      if (value !== 'check' && value !== 'write') {
        throw new Error('Expected --mode to be "check" or "write".');
      }
      parsed.mode = value;
      index += 1;
      continue;
    }

    if (current === '--source') {
      const value = argv[index + 1];
      if (value !== 'args' && value !== 'staged' && value !== 'tracked') {
        throw new Error(
          'Expected --source to be "args", "staged", or "tracked".',
        );
      }
      parsed.source = value;
      index += 1;
      continue;
    }

    if (current === '--restage') {
      parsed.restage = true;
      continue;
    }

    if (current === '--') {
      parsed.files = argv.slice(index + 1);
      break;
    }

    parsed.files.push(current);
  }

  return parsed;
}

function normalizeFiles(files: string[]): string[] {
  const unique = new Set<string>();

  for (const file of files) {
    if (!file) {
      continue;
    }

    const normalized = path.normalize(file).replace(/\\/g, '/');
    if (!unique.has(normalized)) {
      unique.add(normalized);
    }
  }

  return Array.from(unique);
}

function readGitFileList(args: string[]): string[] {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      result.stderr?.trim() ||
        result.error?.message ||
        `git ${args.join(' ')} failed.`,
    );
  }

  return normalizeFiles(
    (result.stdout ?? '').split('\0').filter((value) => value.length > 0),
  );
}

async function filterPrettierFiles(files: string[]): Promise<string[]> {
  const supported: string[] = [];

  for (const file of files) {
    if (!existsSync(file)) {
      continue;
    }

    const info = await prettier.getFileInfo(file, {
      ignorePath: '.prettierignore',
      withNodeModules: false,
    });

    if (!info.ignored && info.inferredParser) {
      supported.push(file);
    }
  }

  return supported;
}

export function runPrettier(
  mode: FormatMode,
  files: string[],
  runner: CommandRunner = defaultCommandRunner,
  batchSize = DEFAULT_BATCH_SIZE,
): void {
  const packageManager = resolvePackageManagerExecution();

  for (const batch of chunkItems(files, batchSize)) {
    const result = runner(packageManager.command, [
      ...packageManager.args,
      'exec',
      'prettier',
      `--${mode}`,
      '--ignore-unknown',
      ...batch,
    ]);

    if (result.error || result.status !== 0) {
      throw new Error(result.error?.message ?? `prettier ${mode} failed.`);
    }
  }
}

function restageFiles(files: string[]): void {
  for (const batch of chunkItems(files)) {
    const result = spawnSync('git', ['add', '--', ...batch], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'inherit',
    });

    if (result.error || result.status !== 0) {
      throw new Error(result.error?.message ?? 'git add failed.');
    }
  }
}

async function resolveFiles(parsed: ParsedArgs): Promise<string[]> {
  if (parsed.source === 'tracked') {
    return filterPrettierFiles(readGitFileList(['ls-files', '-z']));
  }

  if (parsed.source === 'staged') {
    return filterPrettierFiles(
      readGitFileList([
        'diff',
        '--cached',
        '--name-only',
        '-z',
        '--diff-filter=ACMR',
      ]),
    );
  }

  return filterPrettierFiles(normalizeFiles(parsed.files));
}

export async function runFormatFlow(
  parsed: ParsedArgs,
  dependencies: FormatExecutionDependencies = {
    resolveFiles,
    restageFiles,
    runPrettier: (mode, files) => runPrettier(mode, files),
  },
): Promise<void> {
  const files = await dependencies.resolveFiles(parsed);

  if (files.length === 0) {
    return;
  }

  dependencies.runPrettier(parsed.mode, files);

  if (parsed.restage && parsed.mode === 'write') {
    dependencies.restageFiles(files);
  }
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const parsed = parseCliArgs(argv);
  await runFormatFlow(parsed);
}

function isCliEntryPoint(): boolean {
  const entry = process.argv[1];

  if (!entry) {
    return false;
  }

  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (isCliEntryPoint()) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
