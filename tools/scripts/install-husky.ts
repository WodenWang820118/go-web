import { spawnSync } from 'node:child_process';

export interface InstallHuskyDependencies {
  cwd: string;
  env: NodeJS.ProcessEnv;
  resolveGitDir: (cwd: string) => string | null;
  runCommand: (command: string, args: string[], cwd: string) => number;
}

export function isProductionOnlyInstall(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const omit = (env.npm_config_omit ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return env.npm_config_production === 'true' || omit.includes('dev');
}

export function shouldSkipHuskyInstall(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.CI || env.HUSKY === '0' || isProductionOnlyInstall(env));
}

export function resolveGitDir(
  cwd: string,
  gitRunner: typeof spawnSync = spawnSync,
): string | null {
  const result = gitRunner('git', ['rev-parse', '--git-dir'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error || result.status !== 0) {
    return null;
  }

  const gitDir = result.stdout.trim();
  return gitDir.length > 0 ? gitDir : null;
}

function resolvePackageManagerExecution(env: NodeJS.ProcessEnv): {
  args: string[];
  command: string;
} {
  const execPath = env.npm_execpath;
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

function runCommand(command: string, args: string[], cwd: string): number {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

export function main(
  dependencies: InstallHuskyDependencies = {
    cwd: process.cwd(),
    env: process.env,
    resolveGitDir,
    runCommand,
  },
): void {
  if (shouldSkipHuskyInstall(dependencies.env)) {
    return;
  }

  if (!dependencies.resolveGitDir(dependencies.cwd)) {
    return;
  }

  const packageManager = resolvePackageManagerExecution(dependencies.env);
  const status = dependencies.runCommand(
    packageManager.command,
    [...packageManager.args, 'exec', 'husky', 'install'],
    dependencies.cwd,
  );

  if (status !== 0) {
    throw new Error('husky install failed.');
  }
}
