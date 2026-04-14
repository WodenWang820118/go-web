import { evaluateApproval, getRepoContext, loadState } from './shared.mjs';

const repoContext = getRepoContext();
const state = loadState(repoContext.root);
const evaluation = evaluateApproval(state, repoContext);

console.log(`Review gate root: ${repoContext.root}`);
console.log(`Branch: ${repoContext.branch ?? 'unknown'}`);
console.log(`HEAD: ${repoContext.head ?? 'unknown'}`);
console.log(`Worktree: ${repoContext.dirty ? 'dirty' : 'clean'}`);

if (repoContext.dirty) {
  console.log(`Gate: IN PROGRESS`);
  console.log(
    'Reason: The worktree is already dirty, so the pre-implementation gate is no longer the active blocker for this task.'
  );

  if (evaluation.valid) {
    console.log(`Reviewer: ${evaluation.approval.reviewer}`);
    console.log(`Focus: ${evaluation.approval.focus}`);
    console.log(`Approved at: ${evaluation.approval.approvedAt}`);
    console.log(`Expires at: ${evaluation.approval.expiresAt}`);
  }

  process.exit(0);
}

if (!evaluation.valid) {
  console.log(`Gate: BLOCKED`);
  console.log(`Reason: ${evaluation.reason}`);
  process.exit(0);
}

console.log(`Gate: READY`);
console.log(`Reviewer: ${evaluation.approval.reviewer}`);
console.log(`Focus: ${evaluation.approval.focus}`);
console.log(`Approved at: ${evaluation.approval.approvedAt}`);
console.log(`Expires at: ${evaluation.approval.expiresAt}`);
