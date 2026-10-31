# Maintenance verification - 2026-10-31

Owner-reported operational history: one year in Bruxas Burger stores.

## Confirmed cloud state

- App Hosting studio is connected to sandrocabelleira1/custo-certo, main.
- Rollout rollout-2026-10-30-000 succeeded, commit e53bc54.
- Public login returned HTTP 200.
- Firestore rules were already released on October 30; 24 anonymous-denial and 12 role/store API tests passed.
- Storage rules deployed; 16 API tests passed. Cross-service Firestore lookup IAM role configured for the Firebase Storage service agent.
- Six missing indexes added; all 18 indexes READY. Existing indexes retained and added to source control.

## Dependency audit

Initial full audit: 77 findings, including 6 critical.
After updates, production dependencies: 70 findings (0 critical, 10 high, 60 moderate).
Direct remaining high advisory sources: @grpc/grpc-js, @opentelemetry/propagator-jaeger, postcss, zod. Most other findings are transitive propagation.
Some proposed fixes require a Next.js major upgrade or breaking dependency overrides. This branch must not be described as having a clean vulnerability audit.

## Code changes

Fixed CMV component imports and revenue Timestamp formatting, removed unused outdated mock fixtures, migrated PDF tables to the current API, updated Genkit Google plugin, enabled build type/lint checks and added CI.
PDF generation smoke passed. TypeScript passed before the final dependency refresh; final checks are pending.

## Scope and limitations

Rules API tests use synthetic request contexts and mocked user profiles. They do not constitute browser tests with real store accounts. Real store records were not edited during these checks.
