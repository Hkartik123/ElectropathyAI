## 11. Mandatory 4-Loop Implementation, Testing, and Refinement Protocol

You MUST execute exactly 4 complete improvement loops for the User History and Admin Dashboard features. Do not consider the task complete after the first implementation. Each loop must involve actual code inspection, implementation or correction, and verification.

### LOOP 1 — Implementation and Integration

Objective: Build the complete feature.

- Inspect the existing frontend, backend, Prisma schema, authentication system, and API routes.
- Implement first-time and returning-user authentication behavior.
- Implement persistent conversations and message history using PostgreSQL and Prisma.
- Integrate the History interface into the existing frontend.
- Implement secure administrator provisioning, login, middleware, APIs, and dashboard.
- Implement user management, conversation management, and authorized patient-case access.
- Add or update database migrations where necessary.
- Run the application and relevant tests.

**Exit criteria:** All required components are implemented and connected to the actual backend and database. No mock data or frontend-only persistence may substitute for required functionality.

### LOOP 2 — Functional Testing and Bug Fixing

Objective: Verify that all user and administrator workflows work end to end.

Test the following scenarios:

- First-time phone-number login creates exactly one user.
- Returning login restores the same account and saved history.
- Conversations and messages survive logout, browser refresh, and subsequent login.
- Users can create, reopen, and soft-delete their own conversations.
- New messages persist and appear in the correct conversation.
- An administrator can log in and view authorized user and application data.
- Search, filters, pagination, and dashboard statistics work correctly.
- Loading, empty, error, and session-expiration states behave correctly.

Reproduce and fix every failure found. Do not mark a test as passed without executing it or verifying the relevant behavior.

**Exit criteria:** All executable functional tests pass. Any blocked tests are documented with their exact reason and a practical verification plan.

### LOOP 3 — Security, Data Integrity, and Edge Cases

Objective: Identify and eliminate security vulnerabilities and data-isolation bugs.

Test and review:

- Unauthenticated access to protected endpoints.
- Regular-user attempts to access administrator APIs.
- Attempts to escalate a user role through registration, profile updates, or manipulated API requests.
- Attempts to retrieve, update, or delete another user's conversations by changing resource IDs.
- Attempts to access patient cases without the required permissions.
- Invalid, expired, reused, and brute-forced OTPs.
- Expired, revoked, or invalid refresh tokens.
- Duplicate requests and concurrent conversation or message writes.
- Database failures, missing records, malformed inputs, and pagination boundary conditions.
- Sensitive data exposure in API responses, logs, browser storage, and frontend error messages.
- Migration safety and preservation of existing database records.

Fix all discovered issues and rerun the affected tests. Add regression tests for every significant bug corrected.

**Exit criteria:** No known critical or high-severity authorization, authentication, or cross-user data-isolation issue remains. Any unresolved security concern must be explicitly reported.

### LOOP 4 — Final Regression, Optimization, and Acceptance

Objective: Validate the complete feature as a production-ready integration.

- Run the complete test suite, including all tests from Loops 1–3.
- Verify the actual frontend-to-backend-to-PostgreSQL workflow.
- Confirm that existing application features have not regressed.
- Check responsive layouts, navigation, accessibility, loading states, and error handling.
- Review database indexes, query efficiency, pagination, and unnecessary API requests.
- Check Prisma schema consistency and migration status.
- Verify that administrator provisioning is documented and no credentials are hardcoded.
- Confirm that production secrets remain server-side.
- Remove temporary mock data, debug output, and obsolete implementation code.
- Run available linting, formatting, build, and type-checking commands.
- Fix every reproducible regression and rerun the relevant checks.

**Exit criteria:** The implementation passes the available final verification checks, or every remaining blocker is documented honestly. Do not claim successful execution of tests, builds, or deployments that were not actually performed.

### Mandatory Loop Execution Rules

1. Execute the loops sequentially: Loop 1 → Loop 2 → Loop 3 → Loop 4.
2. At the end of each loop, produce a concise report of files changed, checks executed, failures found, and fixes applied.
3. Carry forward unresolved issues into the next loop. Never hide or silently discard a failure.
4. Re-run tests after modifying code. A previous passing test does not prove a subsequent change is correct.
5. Do not reset or delete the existing database to make tests pass.
6. Use an isolated test database or safe test fixtures for automated tests.
7. Do not introduce unrelated refactors or break existing functionality.
8. If credentials, external services, or environment configuration are unavailable, continue with all feasible checks and document what could not be verified.
9. Do not stop to ask for approval between loops unless a destructive or otherwise consequential action requires explicit authorization.
10. After Loop 4, provide a final summary containing:
   - Features implemented.
   - Files and database models changed.
   - Migrations and commands required.
   - Tests executed and their actual results.
   - Security issues identified and resolved.
   - Remaining limitations or blockers.
   - Exact steps to run and verify the feature locally.

Begin Loop 1 immediately and continue through Loop 4 before declaring the task complete.