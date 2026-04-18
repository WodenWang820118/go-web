# Detailed Guidance for Code Review

This document provides a deep dive into the principles and process of conducting high-quality code reviews.

## The Five-Axis Review Explained

### 1. Correctness
- **Match Spec:** Does the code do what the task requires?
- **Edge Cases:** Are nulls, empty strings, empty lists, zero, and negative numbers handled correctly?
- **Error Paths:** What happens when a network call fails, a file doesn't exist, or the database is down? The code should be resilient.
- **Race Conditions:** In concurrent code, could two operations interfere with each other?

### 2. Readability & Simplicity
- **Naming:** Variable names should be descriptive. A variable `d` is bad. `elapsedTimeInDays` is good.
- **Simplicity:** Avoid "clever" code. Prefer straightforward, readable logic over complex one-liners. Future you will thank you.
- **Abstractions:** Don't create an abstraction until you have at least two or three use cases for it (Rule of Three). Premature generalization is a common architectural error.
- **Comments:** Good code is self-documenting. Only add comments to explain the *why*, not the *what*.

### 3. Architecture
- **Existing Patterns:** Does the code follow the established patterns of the codebase (e.g., using dependency injection, following a service/repository pattern)?
- **Code Duplication:** Is the same block of code repeated in multiple places? This is a sign that an abstraction is needed.
- **Dependencies:** Does the change introduce new third-party dependencies? If so, have they been vetted for size, maintenance, and security? (See "Dependency Discipline").

## Change Sizing and Splitting

Small changes are better. They are easier to review, less risky, and get merged faster.

-   **~100 lines changed:** Ideal.
-   **~300 lines changed:** Acceptable for a single logical change.
-   **~1000 lines changed:** Too large. Must be split.

If a change is too large, use one of these strategies:
-   **Horizontal Split:** Submit foundational changes first (e.g., a new shared service), then submit the changes that use it.
-   **Vertical Split:** Break a large feature into smaller, self-contained, end-to-end slices.

**Crucially: Separate refactoring from features.** A change that both refactors old code and adds new behavior should be two separate changes. Submit the refactoring first.

## Change Descriptions

The commit message or Pull Request description is a historical artifact. It must explain the *what* and the *why* to someone a year from now.

-   **Bad:** "Fix bug"
-   **Good:** "Fix: Prevent null pointer in UserProfile by adding validation to `renderAvatar`. This addresses an error where users without a profile image would cause the page to crash."

## The Review Process in Detail

1.  **Categorize Findings:** Label every comment so the author knows what's mandatory.
    -   `(no prefix)` or `Critical`: Must be fixed. Blocks merge. (e.g., a bug, a security flaw).
    -   `Important`: Should be fixed, but can be discussed. (e.g., an architectural issue).
    -   `Nitpick` or `Optional`: A suggestion the author can ignore (e.g., renaming a local variable).
2.  **Verify the Verification:** Don't just trust "it works." Ask *how* it was verified. Were tests run? Was it manually tested? Are there screenshots?
3.  **Dead Code Hygiene:** After a refactor, point out now-unused code and ask for permission to remove it. Don't leave it to rot, but don't delete it silently.

## Handling Disagreements

In a review, follow this order of precedence:
1.  Technical facts and data beat opinions.
2.  The project's style guide beats personal style preferences.
3.  Consistency with the existing codebase is important, but not if it perpetuates a bad pattern.

**Never accept "I'll clean it up later."** Later never comes. The review is the quality gate.

## Dependency Discipline

Every new third-party dependency is a liability. Before adding one, ask:
1.  Can we do this with our existing code?
2.  Is the dependency well-maintained?
3.  How large is it? (Check for bundle size impact).
4.  Does it have known security vulnerabilities (`npm audit`, `snyk`)?
5.  Is its license compatible with our project?
