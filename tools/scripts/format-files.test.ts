import { describe, expect, it, vi } from 'vitest';

import {
  chunkItems,
  parseCliArgs,
  runFormatFlow,
  runPrettier,
} from './format-files.ts';

describe('format-files', () => {
  it('chunks large file lists for portable prettier execution', () => {
    expect(chunkItems([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('parses staged write requests with restaging', () => {
    expect(
      parseCliArgs(['--mode', 'write', '--source', 'staged', '--restage']),
    ).toEqual({
      mode: 'write',
      source: 'staged',
      restage: true,
      files: [],
    });
  });

  it('batches prettier invocations at the command boundary', () => {
    const calls: string[][] = [];

    runPrettier(
      'write',
      ['a.ts', 'b.ts', 'c.ts'],
      (_command, args) => {
        calls.push(args);
        return { status: 0 };
      },
      2,
    );

    expect(calls).toHaveLength(2);
    expect(calls).toEqual([
      ['exec', 'prettier', '--write', '--ignore-unknown', 'a.ts', 'b.ts'],
      ['exec', 'prettier', '--write', '--ignore-unknown', 'c.ts'],
    ]);
  });

  it('restages files after a staged write flow', async () => {
    const restageFiles = vi.fn();
    const runPrettierSpy = vi.fn();

    await runFormatFlow(
      {
        mode: 'write',
        source: 'staged',
        restage: true,
        files: [],
      },
      {
        resolveFiles: async () => ['alpha.ts'],
        restageFiles,
        runPrettier: runPrettierSpy,
      },
    );

    expect(runPrettierSpy).toHaveBeenCalledWith('write', ['alpha.ts']);
    expect(restageFiles).toHaveBeenCalledWith(['alpha.ts']);
  });
});
