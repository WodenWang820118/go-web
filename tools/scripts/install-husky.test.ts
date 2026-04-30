import { describe, expect, it, vi } from 'vitest';

import {
  isProductionOnlyInstall,
  main,
  resolveGitDir,
  shouldSkipHuskyInstall,
} from './install-husky.ts';

describe('install-husky', () => {
  it('treats pnpm production installs as skip conditions', () => {
    expect(
      isProductionOnlyInstall({
        npm_config_production: 'true',
      }),
    ).toBe(true);
    expect(
      isProductionOnlyInstall({
        npm_config_omit: 'dev,optional',
      }),
    ).toBe(true);
  });

  it('skips in CI or when husky is explicitly disabled', () => {
    expect(shouldSkipHuskyInstall({ CI: 'true' })).toBe(true);
    expect(shouldSkipHuskyInstall({ HUSKY: '0' })).toBe(true);
  });

  it('does not touch git or husky when skip guards are active', () => {
    const resolveGitDirSpy = vi.fn();
    const runCommand = vi.fn();

    main({
      cwd: '/repo',
      env: {
        CI: 'true',
      },
      resolveGitDir: resolveGitDirSpy,
      runCommand,
    });

    expect(resolveGitDirSpy).not.toHaveBeenCalled();
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('installs husky in a writable git checkout', () => {
    const runCommand = vi.fn().mockReturnValue(0);

    main({
      cwd: '/repo',
      env: {
        npm_execpath: '/pnpm.cjs',
      },
      resolveGitDir: () => '.git',
      runCommand,
    });

    expect(runCommand).toHaveBeenCalledWith(
      process.execPath,
      ['/pnpm.cjs', 'exec', 'husky'],
      '/repo',
    );
  });

  it('falls back to pnpm when npm_execpath is unavailable', () => {
    const runCommand = vi.fn().mockReturnValue(0);

    main({
      cwd: '/repo',
      env: {},
      resolveGitDir: () => '.git',
      runCommand,
    });

    expect(runCommand).toHaveBeenCalledWith(
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      ['exec', 'husky'],
      '/repo',
    );
  });

  it('does nothing when git metadata is unavailable', () => {
    const runCommand = vi.fn();

    main({
      cwd: '/repo',
      env: {},
      resolveGitDir: () => null,
      runCommand,
    });

    expect(runCommand).not.toHaveBeenCalled();
  });

  it('accepts git worktree metadata paths', () => {
    expect(
      resolveGitDir(
        '/repo',
        () =>
          ({
            error: undefined,
            status: 0,
            stdout: '.git/worktrees/demo',
          }) as never,
      ),
    ).toBe('.git/worktrees/demo');
  });

  it('throws when husky install fails', () => {
    expect(() =>
      main({
        cwd: '/repo',
        env: {
          npm_execpath: '/pnpm.cjs',
        },
        resolveGitDir: () => '.git',
        runCommand: () => 1,
      }),
    ).toThrow('husky install failed.');
  });
});
