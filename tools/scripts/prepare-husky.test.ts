import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { main, shouldRunPrepareHusky } from './prepare-husky.ts';

describe('prepare-husky', () => {
  it('runs only when the install script exists and install is not skipped', () => {
    expect(
      shouldRunPrepareHusky({
        env: {},
        scriptExists: () => true,
      }),
    ).toBe(true);
    expect(
      shouldRunPrepareHusky({
        env: { CI: 'true' },
        scriptExists: () => true,
      }),
    ).toBe(false);
    expect(
      shouldRunPrepareHusky({
        env: {},
        scriptExists: () => false,
      }),
    ).toBe(false);
  });

  it('delegates to the installer only when the wrapper conditions pass', () => {
    const install = vi.fn();

    main({
      env: {},
      install,
      scriptExists: () => true,
    });
    expect(install).toHaveBeenCalledTimes(1);

    main({
      env: { HUSKY: '0' },
      install,
      scriptExists: () => true,
    });
    expect(install).toHaveBeenCalledTimes(1);
  });

  it('matches the inline package.json prepare wrapper behavior', () => {
    const workspaceDir = path.join(
      os.tmpdir(),
      `prepare-husky-${Date.now().toString(36)}`,
    );
    const toolsDir = path.join(workspaceDir, 'tools', 'scripts');
    mkdirSync(toolsDir, { recursive: true });
    writeFileSync(
      path.join(workspaceDir, 'package.json'),
      readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
      'utf8',
    );
    writeFileSync(
      path.join(toolsDir, 'prepare-husky.ts'),
      'import { writeFileSync } from "node:fs"; export function main(){ writeFileSync("prepare-ran.txt", "ok", "utf8"); }',
      'utf8',
    );

    const prepareScript = JSON.parse(
      readFileSync(path.join(workspaceDir, 'package.json'), 'utf8'),
    ).scripts.prepare as string;
    const inlineCode = prepareScript
      .replace(/^node --eval "/, '')
      .replace(/"$/, '');
    const result = spawnSync('node', ['--eval', inlineCode], {
      cwd: workspaceDir,
      encoding: 'utf8',
      env: process.env,
    });

    expect(result.status).toBe(0);
    expect(
      readFileSync(path.join(workspaceDir, 'prepare-ran.txt'), 'utf8'),
    ).toBe('ok');

    rmSync(workspaceDir, { force: true, recursive: true });
  });

  it('keeps the inline prepare wrapper as a no-op when the script is absent', () => {
    const workspaceDir = path.join(
      os.tmpdir(),
      `prepare-husky-missing-${Date.now().toString(36)}`,
    );
    mkdirSync(workspaceDir, { recursive: true });
    writeFileSync(
      path.join(workspaceDir, 'package.json'),
      readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
      'utf8',
    );

    const prepareScript = JSON.parse(
      readFileSync(path.join(workspaceDir, 'package.json'), 'utf8'),
    ).scripts.prepare as string;
    const inlineCode = prepareScript
      .replace(/^node --eval "/, '')
      .replace(/"$/, '');
    const result = spawnSync('node', ['--eval', inlineCode], {
      cwd: workspaceDir,
      encoding: 'utf8',
      env: process.env,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');

    rmSync(workspaceDir, { force: true, recursive: true });
  });
});
