import { spawnSync } from 'node:child_process';

if (!process.env['CI']) {
  process.exit(0);
}

const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const browsers =
  process.env['PLAYWRIGHT_FULL_BROWSER_MATRIX'] === '1' ||
  process.env['NX_PLAYWRIGHT_FULL_BROWSER_MATRIX'] === '1'
    ? ['chromium', 'firefox', 'webkit']
    : ['chromium'];

const result = spawnSync(
  packageManager,
  ['exec', 'playwright', 'install', '--with-deps', ...browsers],
  {
    shell: process.platform === 'win32',
    stdio: 'inherit',
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
