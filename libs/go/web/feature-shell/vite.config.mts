/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { createAngularTestProjectConfig } from '../../../../tools/testing/vitest/project-config.mts';

export default defineConfig(() =>
  createAngularTestProjectConfig({
    root: __dirname,
    cacheDir: '../../../../node_modules/.vite/libs/go/web/feature-shell',
    coverageDirectory: '../../../../coverage/libs/go/web/feature-shell',
    name: 'go-feature-shell',
    setupFiles: ['src/test-setup.ts'],
    tsconfig: 'tsconfig.spec.json',
  }),
);
