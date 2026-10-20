# Feature creation-date filter and sorting — backend

Scope: Feature list API only. Product files: `FeatureController.java`, `FeatureService.java`. Test file: `FeatureIntegrationTest.java`. No schema, dependency, configuration or business write behavior changes. Existing modifications outside these files were preserved.

## Contract

`GET /api/v1/projects/{projectId}/features` keeps existing `page`, `size`, `keyword`, `archived` parameters and adds:

- `createdFrom`, `createdTo`: optional ISO `YYYY-MM-DD`, years 1000–9999. Blank means no bound. Calendar days are in `Asia/Ho_Chi_Minh`; both selected dates are inclusive using UTC `[start, next day start)` SQL predicates.
- `sort`: optional `created-desc` (default), `created-asc`, `name-asc`. Date sorting uses `created_at` then `id` in the same direction; names use database collation then `id ASC`.
- Malformed/impossible/out-of-range dates, reversed range and non-allowlisted sort return HTTP422 `INVALID_FILTER` with Vietnamese guidance.
- Authorization remains before query construction; all keyword/date values are bound parameters. Sort SQL is selected only from fixed strings. Filter predicates are shared by count and page query.
- `createdAt` remains the preexisting ISO local datetime serialized from UTC database time, without offset, e.g. `2026-10-17T17:00:00`. Frontend must interpret as UTC before converting to Vietnam display date.

## Skills → purpose → evidence

- `api-design/SKILL.md` → preserve collection contract, add optional query parameters, stable ordering and matching total → real HTTP/JDBC integration tests across size-one pages and date boundaries.
- `test-driven-development/SKILL.md` → observe missing behavior before production edits → four tests failed for expected absence: ignored dates, incorrect count, id-based sorting and invalid query accepted. `backend-red.log` / `red-TEST-*.xml`.
- `test-driven-development/writing-good-tests.md` (reference, not a separate skill directory) → literal UTC fixtures and real controller/security/service/MySQL behavior → no mocks of SQL or count results; hand-derived boundary/date/tie expectations.
- `security-review/SKILL.md` → preserve project access, bind inputs, allowlist sorting, reject malicious query text → outsider404, another project excluded, invalid date/sort422, unchanged write paths.

## Verification notes

Native runner follows the existing repository harness, verifies exact loopback3307/schema `tms_docstest_2060e04c986c`, healthy FlywayV33 and disables bootstrap/providers/background cleanup. It neither provisions nor resets a schema. Fixtures write only to this isolated test target; no main `tms` access.

Commands:

```
rtk proxy node var/feature-filter-2026-10-19/run-backend.cjs red
rtk proxy node var/feature-filter-2026-10-19/run-backend.cjs green
rtk proxy node var/feature-filter-2026-10-19/run-backend.cjs final
rtk proxy node var/feature-filter-2026-10-19/run-offline.cjs
```

Initial green attempt had 39 test executions, 0 assertion failures and 2 errors from a new test incorrectly parsing the existing no-offset `createdAt` as OffsetDateTime (the test is inherited). Corrected the assertion to the observed contract, with LocalDateTime interpreted as UTC. No production serialization change.

Final native: **39/39 PASS** (FeatureIntegration15, FeatureLegacyRetirement18 including inherited tests, NativeFeatureIssue6); `verify/package` PASS at 20:24:16 Vietnam time. Final offline: **655/655 PASS across75 suites**, `verify/package` PASS at 20:25:31. All runs have0 failures/errors/skips. `offline-selection.json` lists75 included suites and52 excluded native/live/Testcontainers suites; this is not a claim that every backend physical suite ran. Corresponding JSON receipts/logs and `backend-final-receipt.json` preserve test counts and SHA256 of the3 changed source/test files. MySQL9.7/Flyway tested-version and Mockito dynamic-agent warnings are preexisting; no migration was necessary. Coverage percentage has not been claimed from test counts.

Runtime restart/browser checks and planning ledger updates are owned by the root task. This subtask does not restart services or commit/push.
