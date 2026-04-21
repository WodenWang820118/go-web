import { defineConfig } from 'vitest/config';
import { createNodeTestProjectConfig } from '../../../../tools/testing/vitest/project-config.mts';

export default defineConfig(() =>
  createNodeTestProjectConfig({
    root: __dirname,
    cacheDir: '../../../../node_modules/.vite/libs/go/shared/domain',
    coverageDirectory: '../../../../coverage/libs/go/shared/domain',
    name: 'go-domain',
  }),
);
