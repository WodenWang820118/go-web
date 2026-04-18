import {
  buildDenyPayload,
  evaluateApproval,
  getRepoContext,
  isMutatingToolUse,
  loadState,
  parseHookInput,
} from './shared.ts';

const rawInput = await new Promise<string>((resolve) => {
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
  });
  process.stdin.on('end', () => resolve(buffer));
});

let hookInput;
try {
  hookInput = parseHookInput(rawInput);
} catch {
  process.stdout.write(
    buildDenyPayload('Review gate received malformed hook input.')
  );
  process.exit(0);
}

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
