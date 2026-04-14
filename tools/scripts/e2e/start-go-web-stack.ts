import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, '..', '..', '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const startupTimeoutMs = 300_000;
const children: ReturnType<typeof spawn>[] = [];
let shuttingDown = false;
let keepAliveTimer: NodeJS.Timeout | null = null;
const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
const goServerOrigin = process.env.GO_SERVER_ORIGIN || 'http://127.0.0.1:3000';
const webPort = new URL(baseUrl).port || '4200';
const goServerPort = new URL(goServerOrigin).port || '3000';
const goServerHealthUrl = new URL('/api/health', goServerOrigin).toString();

async function isUrlReady(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForUrl(url: string, label: string): Promise<void> {
  const deadline = Date.now() + startupTimeoutMs;

  while (Date.now() < deadline) {
    if (await isUrlReady(url)) {
      return;
    }

    await delay(1_000);
  }

  throw new Error(`Timed out waiting for ${label} at ${url}`);
}

function terminateChild(child: ReturnType<typeof spawn>): Promise<void> {
  const childPid = child.pid;

  if (!childPid) {
    return Promise.resolve();
  }

  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(childPid), '/t', '/f'], {
        stdio: 'ignore',
      });

      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
    });
  }

  return new Promise((resolve) => {
    try {
      process.kill(childPid, 'SIGTERM');
    } catch {
      resolve();
      return;
    }

    child.once('exit', () => resolve());
    setTimeout(resolve, 5_000).unref();
  });
}

async function shutdown(exitCode: number): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  await Promise.allSettled(children.map(terminateChild));
  process.exit(exitCode);
}

function startNxTarget(label: string, args: string[], env = {}): ReturnType<typeof spawn> {
  const child = spawn(`${npmCommand} exec -- nx run ${args.join(' ')}`, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ...env,
    },
  });

  children.push(child);

  child.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }

    console.error(`${label} exited before Playwright finished.`);
    void shutdown(code ?? 1);
  });

  child.on('error', (error) => {
    if (shuttingDown) {
      return;
    }

    console.error(`Failed to start ${label}:`, error);
    void shutdown(1);
  });

  return child;
}

async function ensureServer(
  label: string,
  url: string,
  nxTarget: string,
  env = {}
): Promise<void> {
  if (await isUrlReady(url)) {
    console.log(`${label} already available at ${url}`);
    return;
  }

  console.log(`Starting ${label}...`);
  startNxTarget(label, [nxTarget], env);
  await waitForUrl(url, label);
  console.log(`${label} ready at ${url}`);
}

process.on('SIGINT', () => {
  void shutdown(0);
});

process.on('SIGTERM', () => {
  void shutdown(0);
});

async function main(): Promise<void> {
  await ensureServer('go-server', goServerHealthUrl, 'go-server:serve', {
    PORT: goServerPort,
  });
  await ensureServer('go-web', baseUrl, `go-web:serve-static --port=${webPort}`);

  console.log('Go web e2e stack is ready.');
  keepAliveTimer = setInterval(() => {
    void process.pid;
  }, 60_000);

  // Keep this helper process alive until external shutdown handlers exit.
  for (;;) {
    await delay(60_000);
  }
}

void main().catch((error) => {
  console.error(error);
  void shutdown(1);
});
