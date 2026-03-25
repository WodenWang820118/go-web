const { NxAppRspackPlugin } = require('@nx/rspack/app-plugin');
const { join } = require('path');

module.exports = {
  entry: {
    main: './src/main.ts',
  },
  output: {
    path: join(__dirname, '../../dist/apps/go-server'),
    clean: false,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppRspackPlugin({
      target: 'node',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      outputFileName: 'main.js',
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
      typeCheckOptions: {
        async: false,
      },
    }),
  ],
};
