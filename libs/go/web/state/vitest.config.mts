import { defineConfig } from 'vitest/config';
import { createNodeTestProjectConfig } from '../../../../tools/testing/vitest/project-config.mts';

export default defineConfig(() =>
  createNodeTestProjectConfig({
    root: __dirname,
    cacheDir: '../../../../node_modules/.vite/libs/go/web/state',
    coverageDirectory: '../../../../coverage/libs/go/web/state',
    name: 'go-state',
  }),
);
