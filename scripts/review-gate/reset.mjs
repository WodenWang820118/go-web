import { getRepoContext, resetState } from './shared.mjs';

const repoContext = getRepoContext();
resetState(repoContext.root);
console.log('Review gate state cleared.');
