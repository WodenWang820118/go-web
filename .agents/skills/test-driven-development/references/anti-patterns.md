# TDD Anti-Patterns and Red Flags

This document lists common ways that the Test-Driven Development process can be misunderstood or misapplied. Watch out for these patterns and rationalizations.

## The Liar

-   **Symptom:** A test that passes regardless of the code's state. It provides a false sense of security.
-   **Example:** A test that checks if a list `is not None` when it should be checking if the list `is empty`.
-   **How to Avoid:** Always watch your test fail first (the **RED** step). If you can't make it fail, it's not a real test.

## The Giant

-   **Symptom:** A single test case that tries to assert ten different things. When it fails, it's hard to know which assertion was the cause.
-   **Example:** A test named `test_user_creation` that checks the user's name, email, creation date, permissions, and profile picture all in one go.
-   **How to Avoid:** One assertion per test. Follow the "single responsibility principle" for your tests, not just your code. A test should have one, and only one, reason to fail.

## The Sloth

-   **Symptom:** A test suite that takes minutes or hours to run. Developers stop running it, defeating the purpose of TDD.
-   **Example:** Relying entirely on slow E2E tests and not writing fast unit tests. Hitting a real database or network endpoint in a unit test.
-   **How to Avoid:** Follow the testing pyramid. Use mocks and stubs to isolate your code for unit tests. Save slow, integrated tests for higher levels of the pyramid and run them less frequently.

## The Mimic

-   **Symptom:** A test that is so tightly coupled to the implementation details of the code that it's impossible to refactor the code without breaking the test. The test just re-implements the logic of the method it's testing.
-   **Example:** A test that uses mocks to check that a service method calls three specific private helper methods in a particular order.
-   **How to Avoid:** Test the public behavior, not the private implementation. The test should answer the question, "Given this input, do I get the correct output?" It should not care *how* the output was produced.

## The Rationalizer (Excuses for not doing TDD)

-   **"I don't have time to write tests."**
    -   The reality is you don't have time *not* to. Time spent on TDD is paid back quickly in reduced debugging time and fewer regressions.
-   **"This code is too simple to need a test."**
    -   If it's simple, the test will be simple to write. And code rarely stays simple forever.
-   **"I'm not sure what the design should be yet."**
    -   This is the perfect time for TDD! The process of writing tests *is* a design activity. It forces you to think about the public API of your code before you write it.
-   **"I'll write the tests later."**
    -   "Later" almost always means "never." A test written after the fact is just documentation, not a design tool. It's also much harder to write a good test for existing code.
