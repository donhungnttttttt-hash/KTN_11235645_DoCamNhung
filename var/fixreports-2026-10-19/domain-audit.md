# FR-00 / FR-01 domain and data audit

Date: 2026-10-19. Scope: source-only audit for R02/R03/R04 and migration A02/A03/A19. No application source, existing migration, database, runtime, service, or Git state changed by this audit. Runtime schema/content was not inspected. Coverage NOT_MEASURED; tests NOT_RUN (read-only task).

## Resolved domain

- Project owns Features. Feature means a **test round**, with name, free-text test environment/server, description, archive state and version. It does not mean a product capability or a legacy ACTIVE/DRAFT cycle configuration.
- Feature owns documents; each document owns its case identities, current content, assignment and current Status. Same workbook bytes in Features A/B are legal; editing A must not mutate B.
- A document is the imported file and its ordered rows. The original workbook and the current editable content are separate things, both required for migration.
- An assignment names responsibility. An actor records who actually changed content/Status. Prefilling an assignee must not invent execution history.
- Current Status is UNEXECUTED/OK/NG/P/NA. Progress is count(Status != UNEXECUTED)/case count; P/NA count and NA stays in denominator. Existing FIXED document status and NOT_RUN execution semantics are not the new contract.
- Issue is Bug or QA scoped to Feature, optionally document/case. A monkey Bug requires Feature but no case or legacy execution attempt. Report is separately saved text, not a write-back command.

These terms reflect the already resolved clarification C01/C02/C03/C05/C07/C08; no Q01–Q19 question needs reopening.

## Existing identities and persistence

| Existing object | Exact current shape / source | Consequence |
| --- | --- | --- |
| Project | `projects.id`; project scope is carried in composite FKs | Keep project scope on every new lookup and constraint |
| Cycle | V6 `test_cycles(id,project_id,code,name,milestone_id,status_code,lock_version,...)`; unique `(project_id,code)` and `(project_id,id)`; V9 adds CLOSED semantics | Useful **migration source**, poor new write interface because of activation/configuration rules |
| Configuration | V6 `cycle_configurations(cycle_id,environment_id,device_id,default_build_id)` all required | New Feature environment must not require a catalog row, build or device |
| Document | `TestDocumentService.SUMMARY`, lines 25–39: document = `import_batches.id` where status COMMITTED; list excludes BLOB | Reuse document projection/workbook logic rather than rebuild Excel handling |
| Import batch | V4 `import_batches`; V12 adds `sheet_name`, `source_workbook MEDIUMBLOB NULL`, checksum index | Source BLOB may be missing for pre-V12 data. A checksum is not document ownership |
| Document row | V4 `import_rows(id,project_id,batch_id,source_row_number,source_case_key,suite_code,raw_data_json,target_case_id,...)` | Stable row ID differs from case ID, source ID and displayed row ordinal; don't conflate them |
| Case | V4 `test_cases(id,project_id,case_no,suite_id,current_revision_id,archived_at,...)`; UNIQUE `(project_id,case_no)` | Clones need fresh case IDs and collision-safe internal case numbers or a scoped unique-key change |
| Revision | V4 `test_case_revisions` VI/JP title/preconditions/steps/expected/source_reference, revision_no, author and approval; circular current pointer through `(project_id,id,current_revision_id)` | Copy current revision content, not merely an old run's pinned revision |
| Suite | V4 `test_suites` UNIQUE `(project_id,code)`, `archived_at` | Sharing a suite lets archival still couple unrelated documents; clone document-owned suites or remove suite gate from new document path |
| Current result | V13 columns on `import_rows`: `result_status`, `result_version`, time, identity actor, request key; enum currently also permits FIXED | Good locality for new current Status; adjust enum/input and assignment guards deliberately |
| Cell overlay | V27 `test_document_cell_edits(project_id,row_id,column_index,cell_value,lock_version)` PK on scope/column | Mutable content not present in workbook/raw JSON; copy per new row |
| Cell history | V27 `test_document_cell_changes`, references row and identity actor | Old history not required to migrate, but retaining old rows avoids destructive FK cleanup |
| Second test | V27 `test_document_retests(row_id,test_case_id,run_item_id,note,lock_version)` | This is a run link, not the requested latest-assignee column |
| File work | V17 `file_work_groups(document_id,cycle_id,configuration_id,...)`, `file_work_group_items(import_row_id,run_item_id,test_case_id,revision_id,...)`; V29 permits multiple disjoint groups for same source | Explicit document/cycle migration source. Do not carry group/session workflow into new assignments |
| Legacy execution | V6 `run_items(cycle_id,configuration_id,test_case_id,revision_id,assignee_membership_id,latest_attempt_id,...)`; `execution_attempts` append-only result/build/executor/context/idempotency | One case may appear across cycles/configurations; distinct cycle membership counts, not count of runs/configurations |
| Work item | V7 shared `work_items`; V18 adds QA to five current item types. `bug_details` holds case/revision plus **required** build/env/device; QA details holds optional document/group/run/case/revision | Add explicit new Feature/document/row context; existing bug schema and guards otherwise block monkey/case creation |

Current source migrations end at `V30__ai_my_projects_scope.sql`. No evidence that runtime is at V30 was collected here. Root must recheck next available version immediately before creating migration(s); never edit applied migrations.

## Critical content reconstruction

`TestDocumentService.detail`, approximately lines 180–224, is the existing read/export truth:

1. Read headers from original `source_workbook` / mapping format.
2. Start with `raw_data_json.sourceCells` for CUSTOMER_V1, or `internalCells(input)` for INTERNAL_V1.
3. Overlay **current** `test_cases.current_revision_id` canonical content. Customer uses `CustomerWorkbook.currentCells` and detected source columns; internal uses positions 0–10.
4. Overlay `import_rows.result_status` into mapped result column.
5. Overlay `test_document_cell_edits` by row ID and column index (last override wins).

`TestDocumentEditingService.edit`, lines 43–79, splits writes: canonical fields create a fresh case revision via `TestCaseService.addRevision`; other columns upsert cell overlays. Therefore copying the workbook alone, copying only `raw_data_json`, copying only current revision fields, or taking only the latest history entry all lose legitimate current content.

Recommended migration: preserve source BLOB bytes/checksum unchanged; copy each required current revision's complete canonical fields; copy cell overlays to fresh row IDs. Preserve source row keys, raw JSON, mapping_version, sheet_name, order and all mapped/unmapped cells. New results, assignees and history may start empty under the approved migration scope. If workbook result/tester columns contain old source content, preserve source bytes; the **new UI** must render new current Status/assignment explicitly and not misrepresent old source cells as new actors/results. Verify content cells separately from intentionally reset result/actor columns.

The strongest manifest compares per-row effective content through the same reconstruction logic **before** and **after** copying, plus byte hash of original workbook. A raw row count is insufficient. Missing/corrupt workbook, invalid JSON/shape, broken revision pointer, ambiguous association and missing source cases belong in an exception manifest; do not invent binary data to make a count pass.

## Minimal implementation choice for root

Use one new Feature module at a small interface (CRUD/archive/restore/list with expectedVersion), then reuse the existing testcase document/workbook module underneath. Prefer additive `features` plus Feature ownership on `import_batches` and fresh cloned `test_cases`/current revisions/import rows for each migrated document. Existing document read/export/cell edit code already has the necessary behavior. Retain old graph as history until all consumers are migrated; new active lists only read Feature-owned records.

Avoid exposing legacy `cycle_configurations`, run IDs, approvals, build/device/allocation, or sessions as required fields at the new interface. Reusing the old cycle/file-work write methods would import their invalid ordering/configuration requirements. Do not add a parallel Excel parser or a parallel current-content store unless root has a specific reason it cannot extend the current one.

Suggested additive ownership constraints:

- Feature UNIQUE `(project_id,id)`; source-cycle provenance unique per project/cycle for replay safety; archive flag/time, version and actual identity actor.
- Document has `feature_id`, archive flag/time and optimistic version; enforce `(project_id,feature_id)` FK and document lookup across the full Feature/project context.
- Enforce independent case ownership for new documents, preferably document/case association with uniqueness on the new case ID. A mere `import_batches.feature_id` does not prevent two Features from sharing `target_case_id`.
- Keep source display keys (which may repeat) separate from internal collision-safe `case_no` identities. CUSTOMER imports already generate `XLSX-{batch}-{source_row}` and document-local suites; INTERNAL imports currently require a project-unique `caseNo` and existing suite and need explicit treatment too.
- Assignment authority and overlap validation should be one document transaction, lock document then rows ordered by ID, compare expected version, validate every selected row before writing. Unique one-current-owner/row prevents overlaps; history stores actual actor plus previous/new responsible identities. Row result version/idempotency can retain existing pattern.
- Status writer should call a single owner/role/project/Feature/archive guard. Result change does not create run. Assignment change does not reset result or impersonate result actor.

The exact table/DTO names are recommendations, not an additional approved business constraint. Root owns shared migration and contract decisions.

## Cycle/document mapping algorithm

Build a distinct `(project_id,old_cycle_id,old_document_id)` manifest from all evidence:

1. `file_work_groups.project_id,cycle_id,document_id` (including groups without sessions/attempts).
2. `test_document_retests -> import_rows.batch_id` joined to `run_items.cycle_id`.
3. Direct `run_items.test_case_id -> import_rows.target_case_id -> import_batches` in same project, for legacy execution scopes created without file work.

Map **every** old cycle to one new Feature, including empty cycles. For each distinct cycle/document pair copy the whole file and all its rows/cases independently, even if that cycle only selected a subset/configuration of the document. Multiple configurations/groups must not produce duplicate copies within the same Feature. For committed documents with no mapped cycle create exactly one per-project `Dữ liệu cũ chưa phân đợt` Feature and copy there. Leave expired/private PREVIEW staging outside active document migration; preserve it as source/history according to manifest.

Direct case membership is only evidence if identities match; title/source ID/checksum coincidence is not evidence. Schema does not make `import_rows.target_case_id` unique, so report any case attached to multiple documents or inconsistent explicit associations rather than silently choosing one. Standalone library cases with no import row/file need a separately recorded exception/scope disposition; do not fabricate a source workbook. Keep provenance tables keyed by old cycle/document/row/case plus target Feature so replay is deterministic and cannot create extra clones.

Cycle environment is not a scalar today: there can be multiple configurations/environments. Preserve their available labels in the new free-text field deterministically (distinct labels, plus provenance), without arbitrarily selecting one environment or requiring a catalog FK. Empty configuration yields empty/free-text environment unless a retained source description exists.

## Existing interfaces and guards to adapt

- `ImportController`: `/api/v1/projects/{projectId}/import-previews`: template, POST multipart, GET preview, POST `/{id}/commit`. Currently no Feature ID. `TestCaseService.createImportPreview` lines 318–325 deduplicates by project checksum/customer-format or project/checksum/importer; commit lines 381–382 deduplicates again. **Both paths** must scope dedup to Feature/document command semantics. A frontend-only Feature field does not fix either check.
- `TestDocumentController`: `/api/v1/projects/{projectId}/test-documents`; list `{items,totalItems,page,pageSize,totalPages}`, detail, PUT row/result with `{status,expectedVersion,requestKey}`, result-history, GET export with `original`. Existing optimistic conflict code `DOCUMENT_RESULT_CONFLICT` and 404 scoped queries are reusable.
- `TestDocumentEditingController`: cell PUT uses `{value,expectedVersion,expectedRevisionId}`; approvals and second-test endpoints are legacy UI consumers. Preserve cell revision/version safety; replace second-test assignment behavior with new assignment semantics.
- `ProjectService.requireReadAccess`, `.requireMembership`, `.requireProjectPm` already recognize global ADMIN without membership. `lockTestCaseImport` is the existing ADMIN/PM import seam. Reuse actual identity attribution; V26 permits revision `created_by_user_id` with nullable legacy membership (`ck_tcr_author`), so do not create fake ADMIN membership.
- `TestDocumentService.updateResult` currently only checks non-DEV membership and project/case archive, with no assignment owner guard. New Tester row responsibility rules need server enforcement; FE disabled buttons do not suffice.
- `FileWorkService.scopeContext/inspect/create`: requires cycle/configuration, DRAFT scope, approved revision, eligible Tester; creates run scope; `assign` refuses CLOSED cycles/open sessions. These must cease to gate new document assignments.
- `FileWorkGuard.usable`: requires ACTIVE cycle, approved nonarchived case/suite, active environment/device/build, assigned physical device/allocation and compatibility. `doing` requires DOING session. New result writer must bypass this graph while retaining access, input and concurrency checks.
- `WorkItemService.create` lines 159–168 requires NG attempt context or PM standalone reason; `context` lines 338–342 requires build/env/device. `InternalRulePolicy.REQUIRED` and schema `bug_details` enforce the same old assumptions. Case Issue/monkey cannot reuse these unchanged. QA optional context is a closer structural seam but still links legacy group/run and typed status guards.
- `WorkItemService.metadata` exposes BUG/REQUEST/TASK/IMPROVEMENT/QA and ordinary-work lifecycle; update create/filter/export/AI consumers deliberately to BUG/QA, without reclassifying historical rows as BUG.

## FK and downstream dependency inventory

Do not delete legacy rows as part of the first copy. Existing migrations use restrictive FKs (no general cascade escape):

- Case/current revision: `test_case_revisions -> test_cases`; circular `test_cases.current_revision_id`; `import_rows -> test_cases`; `run_items -> revision`; `bug_details -> revision`; `qa_details -> revision`.
- Documents/rows: `file_work_groups -> import_batches`; `file_work_group_items -> import_rows` with document/case scope; `qa_details -> import_batches` and group+document; cell edits/changes/retests -> import_rows.
- Cycles/runs: configurations -> cycle; run_items -> configurations; run assignments/attempts/scope decisions -> run; cycle decisions -> cycle; file group pins -> run; document retest -> run; work item execution links -> attempts; bug coverage/retest tables -> run/attempt; attempts -> sessions.
- Work-item graph: shared history/comments/external references/attachments/clarifications, QA answers/confirmations/commands, Redmine binding/outbox and retest coverage. Removing testing links does not grant deletion of unrelated work items/projects/users/assets/config/private AI chat.
- `ReportingService` reads `run_items/test_cycles/attempts` for test totals and linked issues, excludes DRAFT, and uses `ReportMetrics` legacy scope/denominator. New Feature totals must read Feature-owned current document Status once per row, independent of number of configurations/assignees.
- `AiContextService` lines 46,126,144,154,182 reads file-work groups/cycles/runs/sessions; `AiPortfolioContext` lines 106–107,122,147 reads cycles/imports/assigned runs; `AiChatStore` line56 validates old FILE_WORK target with cycle CLOSED. Migrate retrieval/context/target guards; never present retained old execution history as new post-migration experience.
- Frontend `services/api/testCases.js` has all project-only paths. `TestDocumentPage` imports legacy execution helpers, second-test displays cycle/run links and result controls, deep links use `caseId`. `TestDocumentsPage` links file-work. New deep-link mapping must preserve project/Feature/document/row context; ambiguous old links need explicit notice.

## Test seams and evidence needed

Existing seams: `TestDocumentIntegrationTest`, `DocumentResultServiceTest`, `DocumentWorkbookTest`, `CustomerWorkbookTest`, `TestCaseIntegrationTest`, `NativeDocumentMigrationTest`, `NativeAdminImportMigrationTest`; file-work native migration/concurrency suites supply isolation patterns. `NativeDocumentMigrationTest` requires `TMS_TEST_FRESH_MIGRATION=true`, a URL matching dedicated random `tms_docstest_<12hex>` schema and empty-schema precondition. `foundation/MigrationTest` starts Testcontainers; do not run it when server/container creation is prohibited. Existing source tests are not proof of new behavior.

Required red/green seams for root's implementation:

1. Same Excel at Features A/B creates separate document/row/case/revision/edit/status/assignment identities. Modify A canonical and unmapped cell, Status and owner; API/export/AI of B unchanged. Include INTERNAL_V1, not only CUSTOMER_V1.
2. Migration fixture at V30: document in two cycles, multiple configurations same cycle, direct run without group, retest-only link, empty cycle, orphan project, canonical revision edit plus noncanonical cell overlay, source workbook bytes. Compare deterministic mapping/counts and exact effective content; replay zero new copies; fresh/upgrade both succeed.
3. Missing/corrupt workbook and ambiguous mapping produce reviewable exception, not fabricated success. Original download remains original bytes; current export remains edited content apart from explicitly reset old result/actor fields.
4. Archive/restore Feature retains document/case/new issue associations. File removal hides active listing, preserves workbook/current content/issue links; no hard delete.
5. New assignments and Status operate with no cycle configuration, approved-revision/run/session, build/device or member allocation. Wrong project/Feature/document/row IDs rejected; ADMIN without membership allowed; TESTER cannot mutate another user's assignment/rows.
6. A1–40/B41–60 succeeds; overlapping/concurrent stale writes fail transactionally. Reassign after OK preserves OK, maintains two assignee columns/history, no run or fake result actor. Progress example exactly 3/5 for 2 UNEXECUTED+OK+P+NA and empty file has defined zero denominator behavior.

Audit verification was source-only `rtk rg`/UTF-8 reads. No test, migration, DB write, service start/restart, commit, push, or runtime claim. Root should fold this into the **existing** FR plan/ledger, not treat this artifact as a second roadmap.

## Skills → use → evidence

| Skill read | Applied use | Evidence |
| --- | --- | --- |
| `C:/Users/admin/.codex/skills/codebase-design/SKILL.md` | Locate current document/workbook interface and isolate legacy workflow ordering/configuration from new Feature interface | Identity table, reconstruction seam, reusable interfaces and precise gate inventory above |
| `C:/Users/admin/.codex/skills/domain-modeling/SKILL.md` | Distinguish test-round Feature, file, row/case identity, assignment versus actor, current content versus workbook, issue and text report | Resolved domain and ownership/clone examples above; no unresolved business question invented |
| `C:/Users/admin/.codex/skills/deprecation-and-migration/SKILL.md` | Additive copy-first migration, consumer inventory, deterministic provenance and verified restore; destructive cleanup later | FK inventory, mapping algorithm, exception manifest, fresh/upgrade/replay/content tests above |

User scope limits writing to this findings artifact, so no glossary/ADR/product edits were made. Existing repository policy (append-only Flyway and restore from verified backup) governs over generic skill advice to write a down migration.
