/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { createAngularTestProjectConfig } from '../../tools/testing/vitest/project-config.mts';

export default defineConfig(() =>
  createAngularTestProjectConfig({
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/go-web',
    coverageDirectory: '../../coverage/apps/go-web',
    name: 'go-web',
    setupFiles: ['src/test-setup.ts'],
  }),
);
