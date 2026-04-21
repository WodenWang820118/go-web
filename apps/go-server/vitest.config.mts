import { defineConfig } from 'vitest/config';
import { createNodeTestProjectConfig } from '../../tools/testing/vitest/project-config.mts';

export default defineConfig(() =>
  createNodeTestProjectConfig({
    root: __dirname,
    cacheDir: '../../node_modules/.vite/go-server',
    coverageDirectory: '../../coverage/go-server',
    include: ['src/**/*.spec.ts'],
    name: 'go-server',
    setupFiles: ['src/test-setup.ts'],
    assets: ['src/assets/**/*'],
  }),
);
