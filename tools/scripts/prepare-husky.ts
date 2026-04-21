import { existsSync } from 'node:fs';

import {
  main as installHusky,
  shouldSkipHuskyInstall,
} from './install-husky.ts';

const INSTALL_SCRIPT_PATH = 'tools/scripts/install-husky.ts';

export interface PrepareHuskyDependencies {
  env: NodeJS.ProcessEnv;
  install: () => void;
  scriptExists: (path: string) => boolean;
}

export function shouldRunPrepareHusky(
  dependencies: Pick<PrepareHuskyDependencies, 'env' | 'scriptExists'>,
): boolean {
  return (
    dependencies.scriptExists(INSTALL_SCRIPT_PATH) &&
    !shouldSkipHuskyInstall(dependencies.env)
  );
}

export function main(
  dependencies: PrepareHuskyDependencies = {
    env: process.env,
    install: () => installHusky(),
    scriptExists: existsSync,
  },
): void {
  if (!shouldRunPrepareHusky(dependencies)) {
    return;
  }

  dependencies.install();
}
