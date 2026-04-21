import { defineConfig } from 'vitest/config';
import { createNodeTestProjectConfig } from './testing/vitest/project-config.mts';

export default defineConfig(() =>
  createNodeTestProjectConfig({
    root: __dirname,
    cacheDir: '../node_modules/.vite/tools',
    coverageDirectory: '../coverage/tools',
    include: [
      'scripts/format-files.test.ts',
      'scripts/install-husky.test.ts',
      'scripts/prepare-husky.test.ts',
    ],
    name: 'workspace-tooling',
  }),
);
