# Testing / Issue source audit — 19 October 2026

Scope owner: `ux_audit_testing_issues`. This is a **SOURCE_REVIEW** handoff, not a browser result. Every inventory row below is **BROWSER_NOT_RUN** by this owner. The root auditor alone controls Chrome. No application source, database, process, dependencies or Git history was changed; no Maven, frontend suite, test environment, migration or runtime restart was run. Coverage for this audit is **NOT_MEASURED**. Existing test results cited in prior reports remain historical results, not newly executed checks.

Root evidence received after source review: **TI-001 = root global UX-001 / P1, BROWSER_CONFIRMED for monkey entry**. Chrome preview5174/Admin/project156 `/issues`, viewport768×1024, Ghi lỗi monkey → FeatureB: backdrop and dialog both `position: static`, no `.work-items` ancestor; dialog top744.8/bottom1615.1/height870.3, extending below viewport. Root screenshot: `var/uiux-audit-2026-10-19/monkey-dialog-768.jpg`; root retains measurement JSON. This is root's browser observation, not an additional browser session by this owner. Other entry points retain source-only status pending root confirmation.

## Baseline and requirement precedence

- Working branch observed: `system-design`, HEAD `caf075af7231f207259b6a62808bff5c8445f6af`; working tree already contains extensive existing changes. HEAD alone does not identify the uncommitted audited source. Audit covers whole active components and call chains rather than only the diff.
- Read root AGENTS, RTK, planning README, active sprint/execution policy in STATUS (S11), execution guide, development-skills, FixReports, clarification, implementation plan and latest review checkpoints. Latest FR-12 checkpoint says main 5173/8080 was upgraded to V33 after explicit user authorization; early V30/404 statements are superseded. This owner has **not independently verified runtime**.
- Latest clarification wins: independent Feature-owned file/case content; no old run/build/device gate; U→OK→NG→P→NA→U; P and NA count as tested and NA remains in denominator; zero cases = 0%; Issue kinds Bug/QA; manual retest through Status/notes; monkey Bug belongs to chosen Feature and does not require a case. ADMIN retains global authority; PM ordinary CRUD remains project scoped; Tester self-assignment/own monkey rights and assigned DEV Issue actions remain distinct.
- Historical upload tool refusal is not evidence that the user's file URL permission is off. Upload and workbook download remain browser verification gaps in prior reports. No permission settings were changed here.
- Repository filename search found only root `AGENTS.md`, no descendant AGENTS or PRODUCT.md/DESIGN.md/design-system-named source document. Existing shared global/CSS tokens were used as the style baseline rather than inventing a new system.

## Skills actually applied

| Skill read | Actual work | Evidence/output and limit |
| --- | --- | --- |
| `code-review` | Compared full active components, related tests and call chains against clarification and project standards; distinguished source defect from visual/runtime hypothesis. | Findings TI-001 onward. User's full-system audit explicitly overrides this skill's default diff-only/fixed-point workflow. No additional agents spawned. |
| `frontend-patterns` | Followed keyed route/project lifetimes, asynchronous reads, AbortController/sequence guards, drafts, pending writes, refresh/error semantics. | TI-002, TI-004, TI-006, TI-009, risk register. |
| `frontend-ui-engineering` | Inspected modal ancestry/CSS, focus hook, portal order, horizontal table containment, control states and case dialog. | TI-001, TI-005, TI-007, TI-010–TI-012. No pixel/contrast/AT claims from source. |
| `api-design` | Traced raw Feature import preview shape, ownership/capability/assignment/history endpoints and version/idempotency behavior. | TI-003, TI-008, TI-009; backend lines cited below. |
| `security-review` | Inspected server scope/ownership/capabilities, soft deletion, upload input validation and safe React text rendering; did not perform a pentest or send data externally. | Positive checks and role matrix below. UI capability does not prove live server enforcement. |

Skill sources: `C:/Users/admin/.codex/skills/{code-review,frontend-patterns,frontend-ui-engineering,api-design,security-review}/SKILL.md`. Other UI/style and orchestration skills are owned by the root audit; this owner does not claim to have applied them.

## Active route and variant inventory

All rows: source reviewed; viewport/input **NOT_RUN** (proposed 320/390/768/1440, keyboard/touch, 200% zoom). Roles below describe static intent, not runtime authorization proof. A/P/T/D = ADMIN / project PM / TESTER / DEV with read access. Common components: `TableScroll`, `useDialogFocus`, `Modal`, `ResultCycleButton`, `useTestingQuery`; common API client and project/auth context.

| ID | Route / entry and distinct variant | Roles / main + secondary actions | Source / important states | Status / findings |
| --- | --- | --- | --- | --- |
| T01 | `/board/testing?projectId=P` active Feature list | A/P create/edit/archive; all project readers open/search/reload/page | `TestingFeaturesPage.jsx:13-33`; initial load, empty, keyword no match, read failure/retry, active vs archive, long name/environment/description | SOURCE_REVIEW / TI-006, TI-010 |
| T02 | Same route, archived Feature checkbox | A/P restore, all readers view archived Feature | `TestingFeaturesPage.jsx:20-31`; archive/restore pending/error/version conflict and page shrink | SOURCE_REVIEW / TI-006 |
| T03 | Feature create modal | A/P save; close/Escape; free-text environment | `FeatureForm.jsx:6-22`; required/whitespace/255/1000/4000 bounds, pending, failure draft | SOURCE_REVIEW / dirty close risk R02 |
| T04 | Feature edit modal | A/P update expectedVersion, close | Same form with Feature props; 409 and save/refresh failure | SOURCE_REVIEW / TI-006 |
| T05 | `/board/testing/features/F?projectId=P` file list, active | A/P import/hide; readers open/search/page/reload | `TestingFeaturePage.jsx:11-28`; empty/search no match, long filename/assignees, stale read, import success | SOURCE_REVIEW / TI-006, TI-010, TI-011 |
| T06 | Same, archived Feature | Readers see archive-only message; no import/hide | `TestingFeaturePage.jsx:19,23`; project archive differs from Feature archive | SOURCE_REVIEW / TI-010 |
| T07 | Import: select file(s), template/rules disclosure | A/P choose <=20 .xlsx, view preview, cancel/template download | `ImportExcelDialog.jsx:16-68,97-139`; empty/invalid extension/size, queued progress, late project response | SOURCE_REVIEW / upload BROWSER_NOT_RUN |
| T08 | Import: single preview, valid/error/expired/previously committed | A/P confirm, back to input, finish/open committed | `ImportExcelDialog.jsx:70-95,139-176`; `ExcelImportPreview.jsx:5-68`; preview rows/errors-only/table | SOURCE_REVIEW / TI-003 |
| T09 | Import: multiple previews, partial success, replacement/retry | A/P select file row, replace only failed file, retry unpreviewed, confirm remaining, finish | `ImportExcelDialog.jsx:141-176`; no re-commit successful entry, auth failure stop, unmount generation | SOURCE_REVIEW / TI-003; no new execution |
| T10 | `/board/testing/features/F/documents/D?projectId=P` manager grid | A/P edit non-ID cells, assign, cycle Status; all readers search/filter/page/export/history/case detail/Issue | `TestingDocumentPage.jsx:22-60`; zero rows, large 20/50/100 pages, horizontal/vertical scroll, current independent content | SOURCE_REVIEW / TI-001, TI-005, TI-007, TI-008, TI-012 |
| T11 | Same, Tester self/assigned/unassigned | Self receive/range edit; cycle own case if capability; create Issue; view others' cases | `TestingDocumentPage.jsx:49-57`, server capability at `FeatureService.java:125-131` | SOURCE_REVIEW / TI-008, TI-012 |
| T12 | Same, DEV / archived project/Feature/file read-only | Read case/Status/history/Issues and export; no mutation when server caps false | Same grid; read-denial/not-found, archived data, disabled reasons | SOURCE_REVIEW / TI-001, TI-012 |
| T13 | Document deep link with `caseId=R` | Focus/highlight linked row on correct page, back to Feature | `TestingDocumentPage.jsx:30-37`; rowId preferred then caseId; invalid/missing row | SOURCE_REVIEW; router rejects invalid scope; missing valid row has no explanatory feedback (R06) |
| T14 | Manager assignment modal | Pick active Tester, stage several ranges, save, reload version on conflict | `DocumentAssignments.jsx:8-31`; loading directory/error/retry, empty directory, overlap/out-of-range, pending/save fail | SOURCE_REVIEW / TI-008, TI-009 |
| T15 | Tester self-assignment modal | Only own scope, clear to release own part, save | Same; retains failed range; stable row IDs sent | SOURCE_REVIEW / TI-008, TI-009 |
| T16 | Cell editor modal + history disclosure | A/P edit/save, cancel, conflict current-content reload, history retry | `DocumentCellEditor.jsx:5-46`; row/revision/version checks, denied capability, long content/history, success vs failed refresh | SOURCE_REVIEW / TI-006 |
| T17 | Case ID detail modal | All readers inspect current Status and assignment names, close; rendered previous/next disabled | `DocumentCaseDialog.jsx:5-14`, caller `TestingDocumentPage.jsx:45-58` | SOURCE_REVIEW / TI-005 |
| T18 | Status history modal | All readers read actor/time/before/after, retry/cursor older 50 | `DocumentResultHistory.jsx:7-27`; empty, failed older read, long actor, timezone | SOURCE_REVIEW / TI-008, copy R07 |
| T19 | Per-case Issue control: no Issue/loading/error/has all closed or open | Readers click/focus/hover preview; authorized creators open form | `CaseIssueAction.jsx:9-35`; exact Feature/document/row query, page/error/retry, count includes closed | SOURCE_REVIEW / TI-001, TI-002, TI-007, R01 |
| T20 | Case Issue popover, paginated preview | Readers open Issue, next/previous; authorized create | Portal to body; fixed coordinates, 280px max height | SOURCE_REVIEW / TI-007, R04 |
| T21 | Case Issue create modal, Bug vs QA | A/P/T create; context autofill from server; cancel/close | `FeatureIssueForm.jsx:5-44`; context load fail/retry, required fields, 300/20000 bounds, revoked permission, save fail same-key retry | SOURCE_REVIEW / TI-001, TI-002 |
| T22 | Case Issue detail modal | Capabilities determine edit, transition, comments and own monkey delete; close | `CaseIssueAction.jsx:34`, `FeatureIssueDetail.jsx:17-168`; source case stays underneath | SOURCE_REVIEW / TI-001, TI-002 |
| T23 | `/board` / `?view=list` | All readers Kanban or list; allowed actor move select / drag opens confirmation; filter/page/reload/open detail | `FeatureIssuesPage.jsx:15-49`; statuses per current page explicitly labelled, no new-create button | SOURCE_REVIEW / TI-001, TI-004, TI-006 |
| T24 | `/board/list` | All readers table Bug/QA, open key/title, filter Feature/type/status/keyword/page | Same, server pagination; URL initializes filters, filter change local | SOURCE_REVIEW / TI-004, TI-006 |
| T25 | `/issues` error management | Same list; authorized A/P/T create monkey | `WorkBoardPage.jsx:9-18`, `FeatureIssuesPage.jsx:38-50`; archived project hides monkey | SOURCE_REVIEW / TI-001–TI-004 |
| T26 | `/board/issue/I` with `from=issues` or `view=list` | Detail drawer, reload, edit form/DEV picker, status form, note composer, delete confirmation, history disclosure | `FeatureIssueDetail.jsx:104-167`; read-only, partial read fail/retry, version conflict, revoked capability, long 20k text | SOURCE_REVIEW / TI-001, TI-002, TI-004 |
| T27 | Drawer expanded / normal | Readers expand/shrink/close | `components.jsx:189-223`, `work-board.css:253` | SOURCE_REVIEW / TI-001 |
| T28 | Monkey modal: no Feature chosen / chosen Feature form | A/P/T select Feature then Bug fields, cancel/save | `FeatureIssuesPage.jsx:50`; feature-list load fail/retry, change selected Feature while dirty | SOURCE_REVIEW / TI-001, TI-002 |
| T29 | `/board/new`, `/board?...create...` | Readers see retired-create explanation, open proper context | `AppRouter.jsx:48`, `WorkBoardPage.jsx:15`; no silent Feature mapping | SOURCE_REVIEW, intentional retired adapter |
| T30 | `/tests` and `/tests/**` (cycles, cases, documents, file-work, retests, runner IDs) | Readers see retirement guidance → current project testing | `AppRouter.jsx:43`; IDs not remapped to Feature IDs | SOURCE_REVIEW, intentional retired adapter |
| T31 | `/design/home`, `/design/new`, `/design/issues`, `/design/board`, `/design/issue/I`, unknown `/design*` | Normalize deterministic alias; preserve query | `legacyRoutes.js:3-14`; `/design/issue/I` targets new Issue endpoint, old non-Feature Issue can return 404 | SOURCE_REVIEW; no speculative old-ID mapping recommended |
| T32 | Malformed testing IDs/query scope / nonmatching route | NotFound or project selecting/denial notice | `routeInfo.js:1-29`, `AppRouter.jsx:31-40`; duplicate project/case IDs rejected | SOURCE_REVIEW; no runtime proof |

Not active in current router: old `features/work-items/BoardPage.jsx`, `features/work-items/IssuesPage.jsx`, `pages/IssuesPage.jsx`, `TestSpecsPage`, `TestRunnerGridPage` and old execution/file-work/retest pages. Their source presence/tests do not make their many former controls active. Current router imports `WorkBoardPage` → `FeatureIssuesPage`; `/tests/**` terminates at retirement explanation. This inventory does not propose restoring retired workflows.

## Findings and reproducible scenarios

IDs use a module prefix so the root report can assign global UX numbers without collisions. All causes labelled confirmed below mean **confirmed from static source**, not browser reproduced. Proposed priorities concern user impact if current runtime uses this source. Parent should update evidence/status after Chrome.

### TI-001 — P1 — Shared Issue dialogs lose all modal/drawer layout outside the old `.work-items` ancestor

- Group: visual / interaction / accessibility / responsive. Routes T19–T28; all read-capable roles; any viewport, particularly a long document, 320px and 200% zoom.
- Steps: open current `/issues`; press Ghi lỗi monkey. Separately open an Issue detail from board/list and a case Issue from the document grid. Inspect visual overlay and scroll position; try drawer expand.
- Expected: fixed bounded modal above page, visible heading/actions, scrolling in body; drawer expands visibly; background not part of the dialog.
- Source actual: `FeatureIssuesPage.jsx:37` root is only `cat-container feature-issues-page`; grid root is `testing-page`. Neither has `.work-items`. `components.jsx:200-220` emits `d-modal-backdrop`, `d-modal`, `d-modal-body`, but fixed backdrop/size/header/body rules are **all ancestor-scoped** in `work-items.css:1455-1487` and `work-items-live.css:52-63`. Expanded drawer additionally needs `.dashboard-board.work-items` in `work-board.css:253`. `MainLayout`/`App` add no such ancestor. Full Frontend CSS search found no unscoped replacement. StatusBadge and icon button decoration share that missing namespace.
- Cause: confirmed static CSS ancestry mismatch after new composition. Actual clipping/offscreen manifestation needs Chrome. The focus hook still locks body scroll (`useDialogFocus.js:15-19`) although panel may be normal flow, potentially making an offscreen form hard to reach.
- Remedy: give shared Modal an explicit self-contained scope with audited call sites, or a deliberate correct wrapper for these routes. Do not add broad global `.d-*` overrides. Preserve expanded drawer behavior and status/icon styles at intended roots.
- AC: all three current entry points fixed/bounded/visible at 320/390/768/1440, 200% zoom and low viewport; body scroll lock only with a visible overlay; Tab trap/Escape/return focus; long form actions reachable; expand changes geometry; add behavior/computed-layout regression using **actual current route ancestry**, covering Issue Modal as well as old tests' `.ex-modal` forms.

### TI-002 — P2 — Issue draft and write lifetime are not connected to enclosing modal close/Feature changes

- Group: data-state / interaction. Case create, monkey create and Issue detail (T21/T22/T26/T28); A/P/T and assigned DEV note/status; desktop/mobile.
- Steps: type a long unsaved Issue/monkey draft, press Escape or click outside, reopen. Monkey: change Feature after filling form. On isolated fixture only, slow a write, submit and then Escape/close while pending.
- Expected: retain or explicitly discard dirty drafts; pending close is guarded or preserves an idempotent recoverable outcome.
- Source actual: all current Modal calls omit `busy` (`FeatureIssuesPage.jsx:49-50`, `CaseIssueAction.jsx:34`), so default false allows Escape/backdrop/close (`components.jsx:195-217`). Draft lives only in child state. Monkey form is keyed by Feature; changing select unmounts it immediately. Issue form cleanup aborts client at `FeatureIssueForm.jsx:10-15`; a new instance gets a new command key. Detail child busy likewise does not reach parent.
- Cause: confirmed draft discard/pending close path in source. Server commit after client abort and possible user duplicate are **unverified risks**, not proven duplicate writes/data loss.
- Remedy/AC: explicit dirty-close decision or same-context preserved draft, lift pending/dirty lifecycle to Modal; selected Feature changes require clear draft handling. Fixture test delayed success/failure and Escape/backdrop/X: preserve outcome/request identity, no duplicate create, no silent loss; failed save retains fields; permission downgrade continues to retain draft without enabling submit.

### TI-003 — P2 — Feature Excel preview displays blank source IDs because response/renderer use different field names

- Group: content / data-state; T08/T09; A/P; any viewport.
- Steps on isolated fixture: import a valid workbook with distinct IDs e.g. TC-A and TC-B into a Feature, choose Xem trước, inspect ID nguồn column before confirming.
- Expected: each source ID visible for validation against Excel.
- Source actual: `FeatureService.java:160` returns `source_case_key AS caseNo`. `ExcelImportPreview.jsx:44` renders `r.sourceCaseKey`. `testCasesApi.js:14` directly aliases Feature preview API, and `features.js:17` returns untransformed apiRequest; no adapter bridges names.
- Cause: confirmed static frontend/backend contract mismatch; browser upload not run here. Import may still commit correctly, so this is loss of review information rather than proven wrong import identity.
- Remedy/AC: one canonical preview DTO or explicit adapter; real Feature endpoint contract fixture with several source IDs must render each exact ID in single/batch preview and errors-only view without changing import identity.

### TI-004 — P2 — Issue links omit project identity and local filter changes are not durable URL state

- Group: interaction / data-state; T23–T26; all readers; multi-project user, deep link/reload.
- Steps: in project A filter and open an Issue; copy URL. Select B, then paste/reload copied URL or open it for a user whose selected project is B. Separately change list filters/page then refresh without opening a detail.
- Expected: link chooses A and exact Issue; reload keeps chosen list scope.
- Source actual: `FeatureIssuesPage.jsx:31` rebuilds query only from filters (no projectId), so open/close/view-toggle URLs discard existing projectId. `ProjectProvider.jsx:29-41,58-63` selects project from query or per-user stored project. On reload link can request Issue I under B and return not-found. `change()` and pagination update local state only (`:30,48`), so refresh resets filters unless an intervening navigation serialized them.
- Cause: confirmed static navigation-state omission. No cross-project disclosure claim: server scopes endpoints by project.
- Remedy/AC: include current projectId in generated Issue/list/board URLs and deliberately synchronize filters/page to URL. Copy/open under different stored project must select correct project and Issue; Back/refresh restore scope; invalid project denies clearly; no stale data frame during switch.

### TI-005 — P2 — Case detail renders Previous/Next controls that can never work on the active route

- Group: interaction; T17; all readers; multi-case file.
- Steps: click any case ID in current document, try Trước/Tiếp for a middle case.
- Expected: browse adjacent cases or omit unavailable navigation with appropriate context.
- Source actual: `TestingDocumentPage.jsx:58` passes only row/headers/onClose. `DocumentCaseDialog.jsx:12` always renders both buttons disabled when callbacks missing. Every position, including middle rows, is disabled.
- Cause: confirmed incomplete reuse of detail dialog. Visual contrast requires Chrome.
- Remedy/AC: wire navigation through filtered order and page boundaries (with current Status/context) or remove navigation when unsupported. Test first/middle/last plus filtered rows; keep trigger/focus and do not change case identity.

### TI-006 — P2 — Successful mutations can be followed by an unrecognised failed refresh; archive/hide page can become out of range

- Group: data-state / interaction. Feature create/edit/archive, file hide, assignment/cell save; A/P or self Tester.
- Steps with isolated mocked read boundary: let mutation succeed then reject following list/document GET. Inspect save dialog/list feedback. Separately on a paginated Feature/file list, archive/hide the only entry on final page.
- Expected: explicitly distinguish saved-but-refresh-failed, offer reload without repeating mutation; return to a valid page after removal.
- Source actual: `testingState.js:6-9` (`useTestingQuery`) catches errors and resolves `load()` normally. FeatureForm `:12`, assignment `:20`, cell editor `:28` await onSaved=query.load then close as though refreshed. Archive/hide `TestingFeaturesPage.jsx:23` / `TestingFeaturePage.jsx:20` similarly await swallowed load; resulting page error does not say mutation already succeeded. Page state remains unchanged after archive/hide and no totalPages clamp exists in those lists (`TestingFeaturesPage.jsx:31`, `TestingFeaturePage.jsx:26`).
- Cause: confirmed refresh result is not communicated and page is not clamped. Exact runtime network scenario unrun.
- Remedy/AC: return explicit refresh outcome, keep saved confirmation and retry read only; deletion/archive selects valid page. Assert one write on save-success/read-fail, clear message and correct later list; last-entry removal cannot display page2/1 or misleading empty result.

### TI-007 — P2 — Issue preview portal has no direct keyboard focus path; each visible case eagerly starts an Issue list request

- Group: accessibility / interaction / perceived-performance. T19/T20; keyboard readers, 20/50/100-row files.
- Steps: Tab onto a middle row's Issue button to open preview; Tab once toward preview's first Issue/create action. On read-only fixture observe request count on loading 100 rows.
- Expected: predictable keyboard route from trigger to its preview content, without traversing the remainder of document; count retrieval scales without individual content reads per row.
- Source actual: `CaseIssueAction.jsx:27-33` opens on focus but creates preview at document.body end and never transfers focus, sets aria-controls or handles ArrowDown/Enter-to-focus. Native next Tab proceeds to history/next case controls before portal content; popup may close on blur timer. Every mounted CaseIssueAction immediately executes `api.list` (`:13-17`); grid mounts one for each visible row (`TestingDocumentPage.jsx:55`), i.e. up to100 list reads, plus document read. This is a structural request fan-out; latency is **NOT_MEASURED**.
- Cause: confirmed DOM order and eager fetch strategy. Keyboard burden/slow UI need Chrome verification; do not label formal WCAG failure without measured criterion evidence.
- Remedy/AC: direct documented focus action/relationship with Escape/return focus, touch equivalent; batch counts in document response and lazy detail preview read or bounded cached equivalent. Middle-row keyboard access takes a predictable small number of steps; 100-row load does not issue100 Issue-detail-list requests; count includes closed issues and exact copied row scope.

### TI-008 — P2 — Assignment change history is persisted but has no active UI entry point

- Group: interaction / content; T10–T18; all readers, especially manager/Tester checking who was assigned between first/latest names.
- Steps: on isolated fixture assign A→B→C, open file/case and search for full assignment actor/timeline.
- Expected: inspect the intervening changes/history promised by clarification C03; first/latest columns alone cannot show B or who reassigned.
- Source actual: `featuresApi.history` exists (`services/api/features.js:21`) and `FeatureController.java:31` exposes assignment-history. Full active source search found no consumer. Grid exposes only `Lịch sử Status` (`TestingDocumentPage.jsx:55,59`), whose `DocumentResultHistory` displays time/actor/result before/after only. Assignment modal contains no history view.
- Cause: confirmed active UI coverage gap; data is not claimed missing at server.
- Remedy/AC: add focused assignment history entry at file/case assignment context using current endpoint; show actor/time/before/after and cursor/retry, scoped correctly, without adding run/retest workflow. A→B→C history visible and preserved after Status change/archive; all actors remain distinct from assignees.

### TI-009 — P2 — Assignment conflict reload advances version but offers no fresh assignment data for comparison

- Group: data-state; T14/T15; A/P/T after409.
- Steps: open assignment modal; another fixture session changes the file's assignments. Save to get409; click Tải phiên bản mới, giữ lựa chọn; inspect what changed before resubmitting.
- Expected: retain draft and display fresh affected ownership/ranges for an informed explicit reconciliation.
- Source actual: `DocumentAssignments.jsx:30` reads latest assignments but only sets version/key/conflict/message. It does not retain/display `latest.items`; range defaults continue reading original `data.rows` in `ordinals`/`choose` (`:7,15`). Message asks user to check again without displaying the fresh state; PM can resubmit stale staged scopes with new version.
- Cause: confirmed incomplete comparison UI; overwriting teammate work under a permitted PM reassignment is a **risk**, not reproduced corruption.
- Remedy/AC: present fresh ownership/ranges alongside draft or explicit diff before accepting new version; refresh eligible members/caps if changed. Two-session test must show actual competing changes and preserve draft, block unauthorized takeover and allow a deliberate permitted resolution.

### TI-010 — P2 — Feature/file management capability incorrectly remains visible on an archived project

- Group: permission / content. T01/T05; ADMIN; project archived but Feature active. PM helper correctly checks project archive in `projectAccess.js:6-9`, so this particular bypass is ADMIN-only.
- Steps: open archived project's testing list/file list, inspect Tạo Feature / Nhập Excel / Sửa / Lưu trữ / Xóa khỏi danh sách.
- Expected: project read-only state consistently hides/disables write affordances with clear explanation.
- Source actual: `TestingFeaturesPage.jsx:19` uses `hasRole('ADMIN') || helper`, bypassing project archive for Admin. `TestingFeaturePage.jsx:19` checks Feature archivedAt but not project.archived and has same Admin bypass. Server `FeatureService.writer:36-40` checks project archive before ADMIN and rejects409. MainLayout's read-only banner does not disable these controls. Document detail's server capabilities correctly include projectActive (`FeatureService.java:126-130`).
- Cause: confirmed UI/server permission-state mismatch, not privilege escalation. Runtime fixture confirmation needed.
- Remedy/AC: compose active-project requirement outside role union or use backend capabilities consistently. Archived A/P can read/export/history but cannot open enabled mutation forms; restore project then permitted controls recover; ADMIN authority on active projects remains intact.

### TI-011 — P2 — File hide acts immediately and provides no contextual confirmation, undo or discoverable restore

- Group: interaction; T05; A/P; existing file with assignments/results/Issues.
- Steps only on isolated fixture: press Xóa khỏi danh sách on a populated file.
- Expected: clear scope/effect and opportunity to avoid accidental removal; preserve data and a discoverable recovery strategy appropriate to soft archive.
- Source actual: `TestingFeaturePage.jsx:20,25` directly writes archive and refreshes; list endpoint excludes archived files (`FeatureService.java:107`). Current UI offers no archived-file toggle/restore and API client has no restore file action. No confirmation/undo or success explanation accompanies it. Feature archive/restore does have a dedicated archived view; file hide differs.
- Cause: confirmed immediate hide and no active recovery UI. This is not hard deletion; deep link read/data preservation remain possible.
- Remedy/AC: explicit contextual hide confirmation or undo/recovery using approved soft-preservation model, say that data/history remain; do not invent hard-delete semantics. Cancel performs no write; confirmed hide clearly reports outcome; retained data can be accessed/restored by a deliberate supported route.

### TI-012 — P3 — Status disabled explanation always claims assignment/permission even for pending/error/archive

- Group: content / permission. T10–T12; especially A/P with Status pending or an error.
- Steps: inspect disabled Status while a save is pending, after save failure, or on archived Feature.
- Expected: reason matches actual blocking state and is available without hover on disabled element.
- Source actual: `TestingDocumentPage.jsx:39,55` combines pending/error/loading/export and row capability into disabled, but always passes “Bạn cần được phân công case này, hoặc có quyền PM/ADMIN.” `ResultCycleButton.jsx:12-14` puts it only in title on disabled button. Manager may be told to obtain authority already held.
- Cause: confirmed conflation of role and operational states; browser/touch/AT behavior unrun.
- Remedy/AC: derive precise state and visible associated helper where necessary. Distinguish pending, error/reload, read-only archive and missing assignment; no false role guidance for authorized A/P.

## Additional risks / checks, not counted as confirmed product findings

| Risk | Concrete check / source basis | Current status |
| --- | --- | --- |
| R01 long unbroken grid content | New grid uses plain spans or `.testing-case-text` with pre-wrap but no overflow-wrap-anywhere (`testing.css:1`), unlike `.td-cell-text` in legacy grid. Its own scroll area bypasses shared `.ui-table-region td` wrap rule. Try synthetic 1000-character URL/token in allowed extra cell, manager + read-only variants. Inspect spill across cells and table width rather than assuming from declarations. | SOURCE_RISK / BROWSER_NOT_RUN |
| R02 other form dirty close | Feature, assignment and cell forms prevent close while busy, but Escape/close while dirty idle discards local draft without prompt. Explicit Hủy may be reasonable; inadvertent Escape should be verified against desired UX. | SOURCE_RISK / design choice, not separately counted |
| R03 Issue edit permission downgrade | Reload item with canEdit=false hides editor; draft remains internal state but no explanation/visible copy mechanism (`FeatureIssueDetail.jsx:50,121`). Server denies stale writes. Test in isolated capability fixture. | SOURCE_RISK / BROWSER_NOT_RUN |
| R04 detached preview position | Preview position set only in show(), not scroll/resize (`CaseIssueAction.jsx:19`). With focus held, scroll grid/horizontal table or resize and observe anchor relation. | SOURCE_RISK / BROWSER_NOT_RUN |
| R05 file progress visualization | File list renders ratio/rounded percent plain text (`TestingFeaturePage.jsx:25`), while FixReports asked horizontal bar. Main file detail has native progress. Verify whether text-only list is accepted; do not change formula or call 100% acceptance. | Requirement presentation gap; parent decide finding vs optional |
| R06 missing valid case link | Valid caseId not found simply renders unselected document. Router syntax validation is sound, but missing-case notice absent. Test stale/deleted/other-document linked ID; no server mutation. | SOURCE_RISK / BROWSER_NOT_RUN |
| R07 raw history enums | `DocumentResultHistory.jsx:24` renders before/after verbatim, likely UNEXECUTED vs visible Unexecuted. Confirm contract and display copy; static status-cycle behavior remains correct. | Copy risk / low priority |
| R08 IME and dialogs | Forms mostly use native submit, no custom composition guard; verify Vietnamese IME Enter behavior in short text fields, focus after validation, mobile virtual keyboard and long modal. Do not infer failure from absence alone. | BROWSER_NOT_RUN |
| R09 stale Issue panel counts | List data retained during new request; table hidden while loading, but header/pagination show prior counts. Check whether stale values need refresh indicator; not asserted wrong persisted data. | BROWSER_NOT_RUN |
| R10 manual file/source roundtrip | Prior native/API export proof does not prove browser download/upload. Use only isolated synthetic workbook and compare resulting source IDs/current content; if tool upload remains blocked, record exact tool limitation. | NOT_RUN here |

## Positive source checks and limits

- Independent ownership is enforced at Feature/document/row read/write chain; server source context loads current case content. AppRouter keys by project/Feature/document; validates linked project/case IDs and does not remap old cycle IDs to Feature IDs. `useTestingQuery` sequence and Issue AbortControllers reject late data; project switch remounts relevant children.
- Status cycle remains Unexecuted→OK→NG→P→NA→Unexecuted (`ResultCycleButton.jsx:3-14`); document metric counts every result except UNEXECUTED, zero denominator guarded (`TestingDocumentPage.jsx:38`). Tests read show P/NA=3/5=60%, linked-row focus/current assignment values and cell tap behavior. No old run/build/device prerequisite introduced by active UI.
- Issue form uses exact context endpoint, Bug/QA only, failed save retains draft, context retry and revoked permission disable. Create command idempotency key is reused while payload matches. Board has drag alternative via status select; transition requires allowed server status and explicit reason in detail. Board count explicitly says current page, so not incorrectly reported as project totals.
- Server FeatureIssueService checks project/Feature/document/row scope, read-only archives, ownership/assigned DEV, version and idempotency; soft deletion/history remain. React text rendering avoids raw HTML in Issue description/history. This is static review, not live security proof.
- FeatureIssueDetail tests read in full cover failed note/save same-key, comments late merge, stale ID response, member directory retry, capability false, version refresh, safe text history, delete confirmation, assignment DEV filtering and transition. They do **not** establish enclosing current Modal CSS ancestry, dirty close, URL project identity or real keyboard portal traversal.
- Existing `testing-modal.test.jsx` covers FeatureForm/DocumentAssignments/DocumentCellEditor `.ex-modal` overlays only. It does not mount current Issue Modal, explaining why that source gap can coexist with passing test totals. Import batch tests read cover generic legacy preview wrappers with empty rows; no Feature endpoint DTO-to-source-ID assertion was present in those files.
- Accessibility/contrast, actual sizes/overflow/latency, screen reader, zoom/reduced-motion, touch/IME and runtime network states remain unmeasured by this owner. No formal WCAG failure is asserted solely from CSS/source.

## Suggested remediation order / verification work

| Order | Findings / files | Target + skills | Dependencies / risk / completion |
| --- | --- | --- | --- |
| 1 | TI-001; shared Modal and scoped CSS/current roots | `frontend-ui-engineering`, `frontend-patterns`, TDD when implementing; restore actual modal boundary and drawer behavior | Audit every Modal call site before selector change. Regression old/new dialogs, nesting/chat/header layers. Current-route Chrome geometry/focus at target widths is completion evidence. |
| 2 | TI-002; FeatureIssuesPage/CaseIssueAction/FeatureIssueForm/Detail | Own pending and dirty lifetimes; `frontend-patterns`, `api-design` idempotent outcome | Depends on visible overlay. Avoid blanket forbid-close or duplicate API writes. Delayed fixture success/failure plus draft-preservation journey. |
| 3 | TI-003; FeatureService preview DTO/ExcelImportPreview | `api-design`, `frontend-patterns`, TDD contract fixture | Preserve both supported import formats and original IDs. Exact IDs visible in real Feature preview, then isolated roundtrip. |
| 4 | TI-004/TI-006; route state/query lifecycle/list pages | `frontend-patterns`, `frontend-ui-engineering` | Distinguish write and refresh success; URL state retains project/filter/page; no scope leakage/stale navigation. Refresh/copy/Back and last-page removal fixtures. |
| 5 | TI-008/TI-009; assignment modal/history endpoint | `api-design`, `frontend-patterns`, `frontend-ui-engineering` | No new run workflow. Add actual competing/current assignments and historical actors without overwriting draft; two-session fixture and all roles. |
| 6 | TI-007/TI-005/TI-012 and long-content risks | `frontend-ui-engineering`, `frontend-patterns`; API skill for batched counts | Keep exact row count and safe focus; test first/middle/last/filter page, touch, keyboard, 100 rows. Measure requests/latency before performance claim. |
| 7 | TI-010/TI-011; Feature/files management UI | `security-review`, `frontend-patterns`, `frontend-ui-engineering` | Maintain ADMIN active-project authority; preserve soft-archived data; no destructive main writes. Archived role matrix and cancel/restore fixture. |

Root Chrome priority: inspect Issue overlay ancestry first; test no-write dirty close / keyboard preview / detail previous-next / archived-project controls on main only if read-safe; perform any pending write, import, archive, assignment conflict or Status mutation only on known isolated fixture. Root report must merge browser evidence with these source findings and retain all remaining NOT_RUN entries.
