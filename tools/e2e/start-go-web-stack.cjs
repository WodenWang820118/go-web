const { spawn } = require('child_process');
const { setTimeout: delay } = require('timers/promises');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..', '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const startupTimeoutMs = 300_000;
const children = [];
let shuttingDown = false;
let keepAliveTimer = null;
const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
const goServerOrigin = process.env.GO_SERVER_ORIGIN || 'http://127.0.0.1:3000';
const webPort = new URL(baseUrl).port || '4200';
const goServerPort = new URL(goServerOrigin).port || '3000';
const goServerHealthUrl = new URL('/api/health', goServerOrigin).toString();

async function isUrlReady(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForUrl(url, label) {
  const deadline = Date.now() + startupTimeoutMs;

  while (Date.now() < deadline) {
    if (await isUrlReady(url)) {
      return;
    }

    await delay(1_000);
  }

  throw new Error(`Timed out waiting for ${label} at ${url}`);
}

function terminateChild(child) {
  if (!child?.pid) {
    return Promise.resolve();
  }

  if (process.platform === 'win32') {
    return new Promise(resolve => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
      });

      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
    });
  }

  return new Promise(resolve => {
    try {
      process.kill(child.pid, 'SIGTERM');
    } catch {
      resolve();
      return;
    }

    child.once('exit', () => resolve());
    setTimeout(resolve, 5_000).unref();
  });
}

async function shutdown(exitCode) {
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

function startNxTarget(label, args, env = {}) {
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

  child.on('exit', code => {
    if (shuttingDown) {
      return;
    }

    console.error(`${label} exited before Playwright finished.`);
    void shutdown(code ?? 1);
  });

  child.on('error', error => {
    if (shuttingDown) {
      return;
    }

    console.error(`Failed to start ${label}:`, error);
    void shutdown(1);
  });

  return child;
}

async function ensureServer(label, url, nxTarget, env = {}) {
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

async function main() {
  await ensureServer('go-server', goServerHealthUrl, 'go-server:serve', {
    PORT: goServerPort,
  });
  await ensureServer('go-web', baseUrl, `go-web:serve-static --port=${webPort}`);

  console.log('Go web e2e stack is ready.');
  keepAliveTimer = setInterval(() => {}, 60_000);
  await new Promise(() => {});
}

void main().catch(error => {
  console.error(error);
  void shutdown(1);
});
