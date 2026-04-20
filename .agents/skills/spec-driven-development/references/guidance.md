# Guidance for Spec-Driven Development

This document provides detailed guidance on writing effective specifications.

## The Philosophy

The goal of a spec is not just to document a plan, but to force clarity and expose hidden assumptions *before* you invest time in writing code. A good spec is a tool for thinking.

## Workflow Explained

### 1. Surfacing Assumptions

This is the most critical step. Before you write a single line of the spec, list everything you are assuming about the user's request.

-   **Bad Assumption:** "User wants a button."
-   **Good Assumption:** "I assume the user wants a new primary-action button on the main user dashboard. This button's text should be 'Create New Project', and clicking it should open the `CreateProject` modal. This action will not require any new API endpoints."

List these assumptions and ask the user for confirmation. This single step can prevent significant rework.

### 2. Drafting the Specification

Use the provided template. The goal is to be concise but complete.

-   **Objective:** Explain the "what" and the "why." What is being built? Why is it valuable?
-   **Tech Stack:** Be specific. Don't just say "React," say "React 18 with TypeScript, using functional components and Hooks."
-   **Project Structure:** Don't list every file. Show the key directories and where the new files will go.
-   **Code Style:** A small, representative snippet is more valuable than a long explanation. Show, don't just tell.
-   **Testing Strategy:** What is your philosophy for this feature? (e.g., "We will aim for 80% unit test coverage on new services, with one end-to-end test for the primary user flow.")
-   **Boundaries and Non-Goals:** What is explicitly *out* of scope for this change? Be clear about what you will *not* be doing.
-   **Success Criteria:** This should be a list of testable outcomes. (e.g., "1. When the user clicks the 'Create' button, a POST request is sent to `/api/projects`. 2. If the request is successful, the user is redirected to the new project's page.")
-   **Open Questions:** It is a sign of strength, not weakness, to have open questions. It shows you are thinking deeply about the problem.

### 3. The Review Checkpoint

The `Plan Review` is not a rubber stamp. It is a critical part of the process. A reviewer should be able to understand the entire proposed change just from reading the spec. They should be able to identify architectural flaws, missed edge cases, or security risks at this stage, where the cost of fixing them is lowest.

## Common Pitfalls

-   **Writing the spec *after* the code:** This is just documentation, not planning. It provides no upfront value.
-   **Being too vague:** A spec that says "The code will be high quality" is useless. A spec that provides a linting command and a code snippet is useful.
-   **Skipping the review:** A spec that hasn't been reviewed is just a collection of your own assumptions.
