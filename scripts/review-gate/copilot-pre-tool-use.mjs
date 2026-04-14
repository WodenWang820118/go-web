import {
  buildDenyPayload,
  evaluateApproval,
  getRepoContext,
  isMutatingToolUse,
  loadState,
  parseHookInput,
} from './shared.mjs';

const rawInput = await new Promise((resolve) => {
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
  });
  process.stdin.on('end', () => resolve(buffer));
});

const hookInput = parseHookInput(rawInput);

if (!isMutatingToolUse(hookInput)) {
  process.exit(0);
}

const repoContext = getRepoContext(hookInput.cwd || process.cwd());

if (repoContext.dirty) {
  process.exit(0);
}

const state = loadState(repoContext.root);
const evaluation = evaluateApproval(state, repoContext);

if (!evaluation.valid) {
  process.stdout.write(buildDenyPayload(evaluation.reason));
}
