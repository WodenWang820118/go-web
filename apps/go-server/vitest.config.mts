import { defineConfig } from 'vitest/config';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/go-server',
  plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(['src/assets/**/*'])],
  test: {
    name: 'go-server',
    watch: false,
    globals: true,
    environment: 'node',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/go-server',
      provider: 'v8',
    },
  },
}));
