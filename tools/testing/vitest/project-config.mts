import { resolve } from 'node:path';

import angular from '@analogjs/vite-plugin-angular';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

const DEFAULT_INCLUDE = [
  '{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
];
const DEFAULT_ASSETS = ['*.md'];

interface SharedProjectOptions {
  cacheDir: string;
  coverageDirectory: string;
  include?: string[];
  name: string;
  root: string;
  setupFiles?: string[];
}

interface AngularProjectOptions extends SharedProjectOptions {
  assets?: string[];
  tsconfig?: string;
}

interface NodeProjectOptions extends SharedProjectOptions {
  assets?: string[];
  environment?: 'node' | 'jsdom';
}

function createSharedTestOptions(
  options: SharedProjectOptions & { environment: 'node' | 'jsdom' },
) {
  return {
    name: options.name,
    watch: false,
    globals: true,
    environment: options.environment,
    include: options.include ?? DEFAULT_INCLUDE,
    reporters: ['default'],
    ...(options.setupFiles ? { setupFiles: options.setupFiles } : {}),
    coverage: {
      reportsDirectory: options.coverageDirectory,
      provider: 'v8' as const,
    },
  };
}

export function createAngularTestProjectConfig(options: AngularProjectOptions) {
  const angularPlugin = options.tsconfig
    ? angular({
        tsconfig: resolve(options.root, options.tsconfig),
      })
    : angular();

  return {
    root: options.root,
    cacheDir: options.cacheDir,
    plugins: [
      angularPlugin,
      nxViteTsPaths(),
      nxCopyAssetsPlugin(options.assets ?? DEFAULT_ASSETS),
    ],
    test: createSharedTestOptions({
      ...options,
      environment: 'jsdom',
    }),
  };
}

export function createNodeTestProjectConfig(options: NodeProjectOptions) {
  return {
    root: options.root,
    cacheDir: options.cacheDir,
    plugins: [
      nxViteTsPaths(),
      nxCopyAssetsPlugin(options.assets ?? DEFAULT_ASSETS),
    ],
    test: createSharedTestOptions({
      ...options,
      environment: options.environment ?? 'node',
    }),
  };
}
