# Execution to document result — 11/10/2026

User decision: the latest newly recorded execution for a case updates the imported document result, across cycles/configurations. Manual iPad/document result edits stay independent from executions and second-test assignments. No historical backfill.

## Implementation

- `ExecutionService.recordCanonical` calls `updateDocumentResults` only after inserting a new attempt and updating the run pointer, inside the existing project-locked transaction. Request-key replay returns before this call.
- Update every committed import row for the same `(project_id, target_case_id)`. Each row receives the recorded result, incremented result version, current actor/time, and a cleared nullable manual request key. Record the existing `TEST_DOCUMENT_ROW` / `RESULT_<before>_<after>` audit shape.
- Keep `OK`, `NG`, and `P` unchanged: both execution and document schemas store `P`; `PENDING` is not an allowed stored document status.
- No service dependency cycle, migration, new route, or reverse write from `TestDocumentService.updateResult`. Source workbook and raw JSON are unchanged.

## Evidence

| Check | Result |
| --- | --- |
| Initial fixture startup | Corrected fixture to activate cycle via the service instead of violating `ck_cycle_activation`; log `execution-document-red.log` is fixture-only evidence |
| Behavior RED before production edit | 8 tests: 6 failures, 1 error caused by unchanged document version, 1 pass; `execution-document-red-behavior.log` |
| Affected native regressions | 32/32 pass: new native 8, file-work/QA 12, document integration 12; `execution-document-green.log` |
| Relevant unit follow-up | Exposed an old mocked run missing `testCaseId` and a catch-all SQL response; corrected fixture to match real run projection and explicitly return no imported rows in that default unit context |
| Final focused verification | 127/127 pass (119 unit + the same 8 native), `BUILD SUCCESS`; `execution-document-verified.log` |
| Change coverage | New projection method 73/73 instructions, 2/2 branches, 8/8 lines; `execution-document-coverage.json` |
| Diff whitespace | `git diff --check` passes, existing LF/CRLF advisories only |

New tests cover OK/NG/P, updated timestamp and actor, version/audit, original bytes/raw JSON, manual edits leaving runs/attempts unchanged, old execution replay preserving later manual changes, stale manual conflict, rejected execution without projection, project/case/committed scope, all imported documents for a case, unimported cases, and ordering across different cycles/build configurations. Updated existing integration test records second-test OK, manually changes document result to NG, then verifies second-test and execution remain OK. Existing file session and FULL_CASE retest regressions verify their projection behavior; BUG_ONLY does not create a canonical execution.

## Files

- `Backend/src/main/java/vn/syp/tms/execution/ExecutionService.java`
- `Backend/src/test/java/vn/syp/tms/filework/NativeExecutionDocumentResultTest.java` (new)
- `Backend/src/test/java/vn/syp/tms/filework/FileWorkExecutionTest.java` (mock fixture)
- `Backend/src/test/java/vn/syp/tms/filework/NativeFileWorkQaIntegrationTest.java` (new semantics, retains source immutability)
- `Backend/src/test/java/vn/syp/tms/testcase/TestDocumentIntegrationTest.java` (new semantics and manual independence)

Skills applied: `backend-patterns`, `tdd-workflow`, `security-review`, `verification-loop`, adapted to Java/Spring/JDBC/MySQL. No public authorization checks removed; the new SQL is parameterized and project scoped.

All DB-writing checks target the guarded pre-existing `tms_docstest_202610100016` V29 schema. No main `tms` writes, application restarts, commits, or pushes by this agent. Native regression counts overlap and must not be added as distinct tests. Coverage is scoped to the final selected tests; full `ExecutionService` branch coverage from this run is 78/116 and does not establish an 80% class/package gate. Browser/runtime verification and JDT are owned by root.
