# FR09 backend and FR11 core checkpoint

Superseded by [final handoff](fr09-final-checkpoint.md), including actual98-test native/unit execution, V33 fresh/upgrade and bounded export follow-up8/8.

Owner: domain/core agent. Parent owns report generation adapter, Issue/report controllers and final ledger. No main DB/runtime mutation or provider request is authorized by this work.

## Review findings pending behavior verification

1. `FeatureFacts.snapshot` restricts case/Issue retrieval to current assignment. This is narrower than ordinary project member read permission and prevents TESTER/DEV from asking about an otherwise readable case owned by another member. Replace with bounded authorized-project/Feature case and Issue lookup; keep personal samples separate from project management totals.
2. `FeatureFacts.experience` groups current `result_updated_by`, which loses previous actual actors after another person changes/reset Status. Use `project_audit` TEST_DOCUMENT_ROW RESULT transitions; label changes as recorded Status changes, not physical test executions or competence scores. Preserve current Status metrics separately.
3. Selected Feature removes other Feature facts in the selected project. Keep selected Feature facts primary and bounded same-project background separately; retain already-authorized other projects and scope fingerprint rechecks.
4. Restricted snapshots omit execution totals, but sourceFiles currently returns aggregate totals and no explicit request capability handler exists. Keep file metadata for ordinary readers; reject explicit management-report/bulk-export intents before model call while allowing personal progress questions. Data projection remains the security boundary; natural language keyword handling cannot classify every possible request.
5. Typed role AI still reads old cycle/run/device/file-session graph. New assignment target will be DOCUMENT (`document:id`) and current Feature facts. Existing `file:id` chats/drafts retain read compatibility and cannot be silently reinterpreted as new document IDs; writes to old scope return410. Parent approved this transition.
6. Chat schema validation does not check source references in generated text. Add final reference check against server-provided sources before completion; arbitrary natural-language hallucination cannot be established solely through a reference matcher and must not be claimed as solved by one.
7. Keep existing session identity/version, private owner, pinned provider/model/connection, permission fingerprint, TTL and source rechecks. PM global AI read scope must not expand ordinary business CRUD rights.

## Prepared public behavior tests (not yet run)

- `AiPortfolioContextTest`: restricted explicit management/bulk intents denied, personal progress accepted.
- `AiChatServiceTest`: provider output citing project:999 without server source cannot complete.
- `FeatureAiIntegrationTest`: authorized other-owner case/Issue detail, actual audit actors after reset, selected Feature3/5=60% and same-project background, PM global AI read/no ordinary CRUD, new document assignment target with no device/run setup. Inherits six existing core HTTP tests.
- `FeatureLegacyRetirementIntegrationTest`: project-only import/cycle and run/filework/retest/approval writes410, no legacy data created. Inherits six existing core HTTP tests.
- `CustomerWorkbookTest`: Status/first tester/latest tester aliases survive a current Feature export parser pass.

Maven slot is owned by parent/report agent. No AI source fix is counted GREEN before intended RED is observed. Runner `run-core-native.cjs ai` is prepared for the exact existing V32 integration schema `tms_docstest_2060e04c986c` on native3307 only, with providers and scheduled cleanup disabled. It has not run at this checkpoint.

## Independent UI follow-up

`TestingDocumentPage` now accepts `caseId`, resolves rowId before canonical caseId, opens its page and focuses/highlights the linked row. Public test first failed because CASE-25 was absent from page1, then passed2/2 after implementation. Command: `rtk powershell -NoProfile -Command "Set-Location Frontend; npx vitest run src/app/features/testing/TestingDocumentPage.test.jsx"` at01:32:52. UI/router agent notified; Issue callback unchanged.

## Skill use and evidence

Previously read skills continue to apply: codebase-design/domain-modeling for current-vs-historical facts; deprecation-and-migration for separate old source identities/read compatibility; api-design for DOCUMENT target/capabilities; security-review for pre-retrieval scope, owner/session checks and output references; implement/tdd/test-driven-development for public behavior RED→GREEN; coding-standards for parameterized SQL and bounded projection; code-review/verification-loop for evidence and honest limitations. Source/test commands and actual results will be recorded after exclusive slot execution. Coverage is NOT_MEASURED here, no live model/browser/runtime proof claimed.
