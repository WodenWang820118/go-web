/// <reference types="node" />

import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const workspaceRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const artifactsDir = resolve(workspaceRoot, 'proofshot-artifacts');
const subcommand = process.argv[2];
const rawExtraArgs = process.argv.slice(3);
const extraArgs =
  rawExtraArgs[0] === '--' ? rawExtraArgs.slice(1) : rawExtraArgs;

if (!subcommand) {
  throw new Error(
    'Usage: node --experimental-strip-types scripts/proofshot.ts <check|start-web|stop|clean> [proofshot args]'
  );
}

switch (subcommand) {
  case 'check':
    checkProofshot();
    break;
  case 'start-web':
    startWeb();
    break;
  case 'stop':
    stopSession();
    break;
  case 'clean':
    cleanArtifacts();
    break;
  default:
    throw new Error(`Unknown proofshot command: ${subcommand}`);
}

function startWeb(): void {
  ensureProofshotInstalled();

  const args = ['start'];
  const requestedPort = getFlagValue('--port') ?? '4200';

  if (!hasFlag('--run')) {
    args.push('--run', `pnpm nx run go-web:serve --port ${requestedPort}`);
  }

  if (!hasFlag('--port')) {
    args.push('--port', requestedPort);
  }

  if (!hasFlag('--description')) {
    args.push('--description', 'Go web verification');
  }

  args.push(...extraArgs);

  console.log(
    `Starting ProofShot for go-web on port ${requestedPort}. Drive the browser with "proofshot exec ..." or agent-browser commands, then run "pnpm proofshot:stop".`
  );
  runProofshot(args);
}

function stopSession(): void {
  ensureProofshotInstalled();
  runProofshot(['stop', ...extraArgs]);
}

function cleanArtifacts(): void {
  const proofshot = resolveProofshotCommand();
  if (proofshot.found) {
    runProofshot(['clean', ...extraArgs]);
    return;
  }

  rmSync(artifactsDir, { recursive: true, force: true });
  console.log(`Removed ${artifactsDir}`);
}

function checkProofshot(): void {
  const proofshot = resolveProofshotCommand();
  if (!proofshot.found) {
    printInstallGuidance();
    process.exit(1);
  }

  const result = spawnProofshot(['--version'], true, proofshot.command);
  if (result.error || result.status !== 0) {
    printInstallGuidance();
    process.exit(result.status ?? 1);
  }

  const version = (result.stdout ?? '').trim();
  console.log(`ProofShot is available: ${version || proofshot.command}`);
  console.log(
    'Machine-level setup reminder: run "npm install -g proofshot" and then "proofshot install" once on this machine.'
  );
}

function ensureProofshotInstalled(): void {
  const proofshot = resolveProofshotCommand();
  if (proofshot.found) {
    return;
  }

  printInstallGuidance();
  process.exit(1);
}

function printInstallGuidance(): void {
  console.error(
    'ProofShot CLI not found. Install it globally with "npm install -g proofshot" and then run "proofshot install".'
  );
}

function hasFlag(flag: string): boolean {
  return extraArgs.includes(flag);
}

function getFlagValue(flag: string): string | undefined {
  const index = extraArgs.indexOf(flag);
  if (index === -1 || index === extraArgs.length - 1) {
    return undefined;
  }

  return extraArgs[index + 1];
}

function resolveProofshotCommand(): { command: string; found: boolean } {
  const configured = process.env.PROOFSHOT_BIN?.trim();
  if (configured) {
    return {
      command: configured,
      found: isCommandAvailable(configured),
    };
  }

  const candidates =
    process.platform === 'win32'
      ? ['proofshot.cmd', 'proofshot']
      : ['proofshot'];

  for (const candidate of candidates) {
    if (isCommandAvailable(candidate)) {
      return { command: candidate, found: true };
    }
  }

  return {
    command: process.platform === 'win32' ? 'proofshot.cmd' : 'proofshot',
    found: false,
  };
}

function isCommandAvailable(command: string): boolean {
  const result = spawnProofshot(['--version'], true, command);
  return !result.error && result.status === 0;
}

function runProofshot(args: string[]): void {
  const proofshot = resolveProofshotCommand();
  const result = spawnProofshot(args, false, proofshot.command);
  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

function spawnProofshot(
  args: string[],
  captureOutput: boolean,
  overrideCommand?: string
) {
  const command =
    overrideCommand ??
    (process.platform === 'win32' ? 'proofshot.cmd' : 'proofshot');

  if (process.platform === 'win32') {
    const commandLine = [quoteWindowsArg(command), ...args.map(quoteWindowsArg)]
      .join(' ')
      .trim();

    return spawnSync(commandLine, {
      cwd: workspaceRoot,
      stdio: captureOutput ? 'pipe' : 'inherit',
      encoding: 'utf8',
      shell: true,
    });
  }

  return spawnSync(command, args, {
    cwd: workspaceRoot,
    stdio: captureOutput ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: false,
  });
}

function quoteWindowsArg(value: string): string {
  if (value.length === 0) {
    return '""';
  }

  if (!/[ \t"&()^<>|]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

if (!existsSync(workspaceRoot)) {
  throw new Error(`Workspace root not found: ${workspaceRoot}`);
}
