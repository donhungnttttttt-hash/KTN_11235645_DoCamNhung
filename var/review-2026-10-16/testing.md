# Testing / execution / file work audit — 2026-10-16

Audit started 16/10 and continued across midnight 17/10, branch `system-design`, baseline `c42e3f0`. This is fresh evidence; the 11/10 counters are history. No commit/push/merge/deploy/PR/issues, server restart/container creation or main-database fixture/write/reset was performed by this audit owner. Existing untracked `var/` scripts were preserved and never executed.

## Scope and agreed acceptance

Owner: frontend `features/test-cases`, `features/test-execution`, `features/file-work`; backend `testcase`, `execution`, `filework`. Shared auth/API/UI and final documentation belong to root. Production inventory: 32 frontend JS/JSX files / 2,609 lines, 29 backend Java files / 3,472 lines at the inventory point after repair. These are inventory counts, not counts of all states exercised or all lines proven correct. Core services/controllers and key interaction paths were read; related test sources were sampled/catalogued. Backend/native execution remains separately owned by root.

The approved repair acceptance was: HTTP409 invalidates the current write baseline; reload current document/row/revision/cell version/assignment/run through existing APIs; retain typed content, selected Tester and note; display refreshed context; require an explicit new save. Do not automatically replay stale intent. Archived/remapped source, a replaced or missing assigned run,401/403/404 or lost local write authority must block saving and explain. No new API/schema, no change to server optimistic concurrency checks.

Confirmed domain: ADMIN full authority; document clicks cycle Unexecuted→OK→NG→P→NA→Unexecuted. Manual document results never rewrite execution. New canonical execution projects into committed document rows for the same project/case. Second-test assignment points to a real pinned run. File/range selection is a source-ID selection and must retain pin, complete group assignment and session rules.

## Findings and disposition

| ID | Severity | Baseline evidence | Effect and repair |
| --- | --- | --- | --- |
| T-01 | P2 | `DocumentCellEditor.jsx:13-15,22-23` posted immutable `cell.version`/`cell.row.revisionId`; a409 only set an error. `TestDocumentEditingService.java:45,49-50` correctly rejects those stale tokens. | Every later save remained stale, requiring closing the dialog and losing its typed draft to get current data. Added explicit reload retaining content; refreshes both canonical revision and separate extra-column version; displays current content; blocks stale save and archived/remapped targets. |
| T-02 | P2 | `DocumentSecondTestDialog.jsx:34-35` posted immutable original assignment/run/revision versions. Retry at45 only refreshed choices through17-22. `TestDocumentEditingService.java:83,89,92` plus `ExecutionService.java:155` correctly reject stale tokens. | Concurrent assignment/execution made choice retry unable to recover the write while preserving note/Tester. Added existing-document reload, validated same source/case/run/cycle/config, updated expected versions and displayed current assigned Tester/result before explicit resubmit. |

For a **new/unassigned** second-test draft, a changed source revision deliberately remains blocked: the dialog explains that the user must reopen and compare current case content. This avoids silently approving an unseen newer revision or having the parent's original-revision approval callback mark old content approved. The typed note and chosen Tester remain available for copying. Same-case/same-revision assignment/run-version conflicts recover in place. A separate13th behavior regression observed this unsafe enabled approval RED before the small guard, then GREEN.

Seven new UI regressions failed before product edits for expected reasons: stale save buttons remained enabled and current-data reload actions were missing. No server stale-write rejection was weakened. Root authorized these two scoped repairs after the findings were reported. Product changes are three files: `DocumentCellEditor.jsx`, `DocumentSecondTestDialog.jsx`, and the two current-authority props in `TestDocumentPage.jsx`. New test file: `document-conflicts.test.jsx`.

## UI → API → authority → persistence/readback matrix

All entries below describe traced source behavior unless fresh runtime evidence is explicitly listed. Existing backend tests are evidence of available seams, not claims that they ran in this subtask.

| Module / action | Source chain | Static conclusion / evidence boundary |
| --- | --- | --- |
| Library search/page/import/open | `TestDocumentsPage.jsx`, `ImportExcelDialog.jsx` → test-documents/import-previews → `TestCaseService.createImportPreview/commitImportPreview` | Actor from server principal; current import/project guard; private previews; expiry, checksum replay, row validation and transaction. Multiple files commit separately and retain per-file outcomes. Runtime workbook/commit rollback was not rerun by owner. |
| Case create/revise/approve/archive | create dialogs, `CaseDetailModal.jsx` → `TestCaseController` → `TestCaseService:188,233,276,298` | Current writable project/PM; expected current revision; revisions immutable. Suite/case archive retains rows. Relevant test source `TestCaseIntegrationTest` includes conflicting revision/commit/rollback cases. |
| Document grid and export | `TestDocumentPage.jsx` → `TestDocumentController` → `TestDocumentService:52,105,181` | Committed batch and same-project rows; canonical current library content, unchanged source cells, cell overlays and pinned second-test projection. Export reads server state independently of UI filters. Original file bytes served separately. XLSX runtime export not rerun by owner. |
| Manual document result / quick clicks / history | `ResultCycleButton.jsx`, `useDocumentResults.js` → PUT result → `TestDocumentService:59-101` | Ordered per-row promises; expected version + UUID; row lock/audit; immediate exact replay avoids duplicate history. Different committed update invalidates old key/version. No execution write occurs. `DocumentResultServiceTest` covers expected methods via mock, not native account races. |
| Edit canonical/additional cell | `DocumentCellEditor.jsx` → PUT cells → `TestDocumentEditingService:41-73` | Canonical update creates revision via expected revision; extra column uses own version and history. T-01 fixed. Fresh mocked-API interaction tests cover retained draft and explicit save. |
| Second-test assignment | `DocumentSecondTestDialog.jsx` → PUT second-test → `TestDocumentEditingService:79-100` → addScope/assign | PM/ADMIN; active Tester; current row/revision; immutable existing cycle/config; assignment/run versions; real run and FK. T-02 fixed. Reload rejects a different run/source instead of silently moving intent. |
| Result/history context picker | `DocumentExecution.jsx` → cycle/config/run pages → `AttemptDialog` / grouped navigation | Reads all run pages; chooses matching case/config; group-bound runs route to file session; history-only stays read-only. Manual result and execution are distinct. |
| Cycle configure/scope/activate/assign | `ScopeSetup.jsx`, `ExecutionRunnerPage.jsx`, `AssignmentDialog.jsx` → `ExecutionController` → `ExecutionService:70-172` | Current PM project lock, active catalog context, approved same-project revisions, ≤500cycle runs, version guards, full transaction and assignment history. Group-bound assignment rejected in legacy route. |
| Canonical attempts and source document projection | `AttemptDialog.jsx` → `ExecutionService:175-260` | Identity/project guard precedes canonical replay; grouped legacy writes fail; active cycle/assignee/revision/context guards; version and required NG/P details; append attempt, latest pointer, document projection/version/audit in one transaction. Replay returns before document projection, preserving later manual changes. Native test source `NativeExecutionDocumentResultTest` covers projection across builds/cases/documents/projects and replay. NOT_RUN by owner. |
| File create/preview/range approval | `FileWorkPage.jsx`, `CaseRangePicker.jsx`, `caseRange.js` → `FileWorkService:62-188` / document approvals | Source IDs, no inferred Excel row IDs; approved same-document revision/case mapping; no duplicate scope/run reuse; validate preview and commit; project serialization; project-wide typed request key/actor/resource checksum. Chunked addScope remains inside enclosing transaction. |
| File assignment / lifecycle | `FileWorkDetail.jsx` → file-work services/guard | Current capabilities are hints; server rechecks. All run versions required; open DOING/PAUSED prevents reassignment. Session pins machine/allocation/build/executor. PM cancellation can resolve unusable resources. Reason, group/session/run versions and exact replay are separate. |
| Session races / replay | `FileWorkGuard.java:23-110`, `FileWorkSessionService.java:23-116`, V17/V28 | Identity→project→group→ordered runs→session→asset→allocation ordering, generated DOING uniqueness; resource usability before replay. Native concurrency/revocation/replay not rerun by owner; root owns isolated verification. |
| Pinned execution view / exported file | `FileCaseView.jsx`, `FileWorkExecutionService.java:48-102`, `FileWorkWorkbook.java` | Same-project selected archived build allowed for history; current writes still guard resources. Pinned revision/build attempts rather than library revision/annotation. Metadata marks out-of-scope rows; unsafe links/formulas sanitized for execution export. UI separates raw/source/execution view. |
| Queue / preparation / imported file navigation | `ActionInbox.jsx`, `ImportedDocuments.jsx`, `FilePreparation.jsx` → `ActionInboxService`, `FileWorkService.preparation` | Queue targets by kind+id; read does not acknowledge; visible-tab 60s refresh. Prep counts are hints, scope revalidates. Archived queue empty. No external delivery or auto mutation. |

DDL reviewed read-only: V13 result fields/version/actor, V27 cell edits/history and composite source/run FKs, V29 source index retaining disjoint range groups. No applied migration changed. Native schema/data/FK preservation requires root evidence and is not established by source DDL.

## Fresh verification

| Command / evidence | Result |
| --- | --- |
| `rtk proxy npm exec -- vitest run src/app/features/test-cases/document-conflicts.test.jsx --maxWorkers=1` before repair | RED:1 file /7 tests failed. Expected stale-button/missing-reload assertions, total3.20s. Full tool output contained final summary. |
| `rtk proxy npm exec -- vitest run src/app/features/test-cases/document-conflicts.test.jsx src/app/features/test-cases/document-editing.test.jsx --maxWorkers=1` after repair | GREEN:2 files /26 tests passed,8.65s. Direct tool output and poll contained final summary. |
| `rtk proxy npm exec -- vitest run src/app/features/test-cases/document-conflicts.test.jsx -t "does not switch" --maxWorkers=1` before revised-context guard | RED:1 changed-revision regression failed because the new revision approval button was enabled;12 cases intentionally filtered,2.39s. |
| `rtk proxy npm exec -- vitest run src/app/features/test-cases src/app/features/test-execution src/app/features/file-work --maxWorkers=1` | Vitest final summary21 files /289 tests passed,85.02s. The outer wrapper did not promptly finish/flush; owner interrupted only this test session after waiting, yielding exit1. Suite summary is valid observed evidence; this is **not** a clean command-exit PASS. |
| `rtk proxy node node_modules/vitest/vitest.mjs run src/app/features/test-cases/document-conflicts.test.jsx src/app/features/test-cases/document-editing.test.jsx --maxWorkers=1` using cmd.exe/login:false | Clean GREEN:2 files /32 tests passed,10.72s; final poll returned exit0. All13new conflict/source-identity/403/read-retry/changed-revision cases included; no skipped cases. |
| `rtk proxy git diff --check --` the three changed production document files | No whitespace error output; Git emitted existing Windows LF→CRLF conversion warnings. |
| Full frontend/build/contracts / backend/native | Owned by root; no result inherited from historical runs. |
| Coverage | NOT_MEASURED by owner. Test counts do not establish coverage. |

Post-success refresh boundary: production `onSaved` is `TestDocumentPage.load`, which catches GET failure, renders the page error and resolves. The current production path therefore does not throw refresh failure back as a false failed-save message. An arbitrary callback that throws would be caught by the dialog, but this is not a confirmed production trigger and was not expanded into an unrelated repair.

## Skills actually used and conditions

| Skill / source | Disposition |
| --- | --- |
| `C:/Users/admin/.codex/skills/frontend-patterns/SKILL.md` | Applied controlled drafts, resource identity, fail-closed write hints and explicit loading/error/retry. Existing React JavaScript retained. |
| `.../api-design/SKILL.md` | Applied route/payload/error/version comparison to existing APIs; no contract invented. |
| `.../systematic-debugging/SKILL.md` | Applied source trace, existing working conflict-refresh pattern in `AssignmentDialog`, narrow behavior reproducer, minimum repair then regression. |
| `.../test-driven-development/SKILL.md` + `writing-good-tests.md` | Applied RED7 before product edits, then GREEN26; real React interactions with API doubles modelling server stale-version rejection. |
| `.../verification-loop/SKILL.md` | Applied changed-scope verification/diff review. Root owns full build/test gates; type/lint conditional on real project scripts; coverage explicitly unmeasured here. |
| `.../code-review/SKILL.md` | Read. Generic empty-baseline/issue tracker/delegation sequence does not apply unchanged to the user's existing-system local audit. Current HEAD was baseline; root coordinates independent Spec+Standards review of new changes. No tracker/PR created. |
| `.../domain-modeling/SKILL.md` | Read; existing settled domain terminology consumed, no domain change/ADR/glossary creation needed. |
| `.../diagnosing-bugs/SKILL.md` | Read as supporting reference; no claim of completing its separate entire hypothesis/instrumentation ceremony. Reproducer and minimal existing-code repair are recorded above. |
| Other writing/TS/CI/skills tooling | Conditional, not invoked; no pipeline, language migration or new skill needed. Required skill files were available; no missing skill blocked the scoped work. |

## Explicit limits and next actions

- Source tracing and mocked API interactions are distinct from live browser/HTTP/database UAT. This report does not prove all roles, data sets, transient states, Safari/physical-device behavior or live external systems.
- Root received a static-only authorization audit question for `TestDocumentService.updateResult:60-64`: it has project share lock and requireNotDev/membership but no in-transaction identity lock/principal-version check. Existing mock test does not prove native simultaneous identity revocation/replay. This is an unresolved investigation boundary, not a confirmed defect or repaired claim here.
- Root integrates final docs, global verification and any native race evidence. S11 UAT remains separate.

Scoped implementation and targeted rerun are complete. Independent owner `audit_work_quality` reviewed these document changes and backend edit/assignment guards, reporting no confirmed critical/P1/P2 before the additional changed-new-revision guard; root should include that final small guard in its final review. Scope tests do not replace the root's full-suite/build/native checks.

## Independent review of other owners' diff

Reviewed `git diff c42e3f0` restricted to `AdminProjectDetail.jsx`, `AdminProjectLifecycle.integration.test.jsx`, `WorkItemDetail.jsx`, `WorkItemDetail.test.jsx`, `work-items-live.css`, `docs/api/admin-reporting.openapi.yaml`. Own document changes explicitly excluded. Standards sources: root AGENTS, RTK, `docs/development-skills.md`; spec is root's explicit failed/successful member-removal draft behavior and blocking ticket mutations during uncertain authoritative reads while retaining drafts and an accessible refresh.

Standards:0 actionable findings. Spec:0 actionable findings. `AdminProjectDetail.jsx:38-41` removes only the affected user's key after successful API removal; its catch leaves drafts. `WorkItemDetail.jsx:85-119` native disabled fieldset covers comment/evidence/edit/reference/QA/Retest/Redmine/transition controls; detail refresh at83 stays outside. Traced actual shared Button/Modal and descendants: native controls, no React portals; remaining anchors navigate to read-only external references, not mutation handlers. The two added test scenarios address retained comment/file and PM edit/reference state. The contract correction matches existing `ProjectStatusReportService` global ADMIN create/read logic.

This is static independent Spec+Standards review of the listed new diff and relevant descendants. It does not claim another owner's tests/browser ran in this review, runtime capability races were reproduced, or all unrelated source was reviewed. No edits to the other owners' product files.
