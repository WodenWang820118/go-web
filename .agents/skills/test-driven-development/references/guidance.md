# Guidance for Test-Driven Development

This document provides detailed guidance on the principles and practices of TDD.

## The TDD Mindset

TDD is not about "writing tests." It is a discipline of software development where tests lead the design. The tests are the specification. If it's not tested, it's not done.

## The Red-Green-Refactor Cycle Explained

-   ### **RED: Start with a Failing Test**
    This is the most important step. Writing the test first forces you to think about the desired behavior from a user's perspective. What should this function do? What should it return? What happens in the error case? The test *is* the question. The test failing proves that the behavior doesn't exist yet and that your test works. A test that passes on the first run is a red flag—it either means the behavior already existed, or your test is not actually testing anything.

-   ### **GREEN: Make It Pass, Simply**
    Your goal here is not to write beautiful, elegant code. Your goal is to make the test bar turn green as quickly and simply as possible. You can hardcode return values. You can write ugly, procedural code. You are "faking it" to satisfy the contract you just defined with your test. This is a temporary state.

-   ### **REFACTOR: Clean It Up**
    Now that you have a passing test—a safety net—you have permission to refactor the code you just wrote. Remove duplication. Improve naming. Extract methods. Make the code clean, readable, and maintainable. Because the tests are still passing, you can be confident that you haven't broken anything during this cleanup. This step is where good design happens.

## The Testing Pyramid

Think about your tests in layers. A healthy test suite looks like a pyramid:

-   **Unit Tests (The Base):** Lots of them. They are fast, isolated, and test a single unit of code (a function, a method, a component) in isolation. This is where most of your TDD cycle will happen.
-   **Integration Tests (The Middle):** Fewer than unit tests. They test how multiple units work together. Does your service correctly call the database? Does your component render correctly when given data from your store? They are slower and more complex than unit tests.
-   **End-to-End (E2E) Tests (The Top):** Very few. They test the entire application from the user's perspective, often by driving a real browser. They are slow, brittle, and expensive to maintain. Reserve them for critical user flows only (e.g., "Can a user log in and see their dashboard?").

Focus your efforts at the bottom of the pyramid.

## Principles of Good Tests

-   **Fast:** Slow tests will be skipped.
-   **Independent:** Tests should not depend on each other or on the order they are run. Each test should set up its own state.
-   **Repeatable:** A test should produce the same result every time, regardless of the environment. Avoid dependencies on network, time of day, or random data.
-   **Self-Validating:** A test should either pass or fail. It should not require a human to read a log file to determine the outcome.
-   **Timely:** Write the test just before you write the code that makes it pass.
