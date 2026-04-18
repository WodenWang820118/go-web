# Code Review Process & Etiquette

## Change Sizing

Small, focused changes are easier to review. Target **~100 lines changed**. Anything over ~300 lines should probably be split. **Separate refactoring from feature work.**

## Change Descriptions

A good change description justifies the change and provides context.

- **First line:** A short, imperative summary (e.g., "Add user profile endpoint").
- **Body:** Explain the "what" and "why". Link to specs or bug reports.

## Review Process

1.  **Understand Context:** Read the change description and related spec/task first.
2.  **Review Tests:** Read the tests before the implementation to understand the intended behavior and edge cases.
3.  **Review Implementation:** Read the code, evaluating it against the five axes (Correctness, Readability, Architecture, Security, Performance).
4.  **Categorize Findings:** Prefix every comment with its severity so the author knows what is required.
    - `(no prefix)`: **Required** change. Must be addressed.
    - `Critical:`: **Blocks merge**. A major issue like a security vulnerability or data loss risk.
    - `Nit:`: **Minor/Optional**. A suggestion that the author can choose to ignore (e.g., formatting, style preferences).
    - `Optional:` / `Consider:`: A suggestion that is not required but worth considering.
    - `FYI:`: **Informational**. No action needed.

## Dead Code Hygiene

After any refactoring, check for orphaned code. List any unused functions or variables you find and ask the author for confirmation before deleting them.

## Dependency Discipline

Before adding any new dependency, ask:

1.  Can this be solved with our existing code?
2.  Is the dependency actively maintained and secure?
3.  How large is it? What is its license?

Every dependency is a long-term liability.

## Handling Disagreements

- Technical facts and data override opinions.
- The project's style guide is the final authority on style.
- Codebase consistency is important, but not if it degrades overall code health.
- Do not accept "I'll clean it up later." Fix it now or file a ticket.
