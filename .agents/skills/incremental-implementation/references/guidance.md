# Guidance for Incremental Implementation

## Preferred Slice Shapes

- vertical user-flow slice
- contract-first slice followed by caller integration
- risk-first spike that proves the hardest dependency early

## Rules of Thumb

- keep the repo buildable between slices
- run the smallest useful verification after each slice
- avoid touching adjacent files "while you are there"
- note out-of-scope cleanup instead of mixing it into the current slice

## Red Flags

- more than about 100 lines without verification
- multiple unrelated concerns in one slice
- feature and refactor mixed together
- broad abstractions before the third real use case
