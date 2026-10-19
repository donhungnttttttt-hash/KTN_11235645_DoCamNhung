# Testing / Feature / Issue polish — 19 October 2026

Owner: `ux_audit_testing_issues`. Scope: current Feature/file/import/document/assignment/Status/Issue/board surfaces and their legacy entry adapters. Branch remains `system-design`. The working tree already contained extensive changes; this report describes this owner's additions, not every difference from HEAD.

**SOURCE_REVIEW + MOCKED_TEST_EXECUTED; BROWSER_NOT_RUN by this owner.** Root alone controls Chrome. No backend, DB, API invocation, environment/process, dependency installation, commit or push was performed. No claim of complete visual, accessibility, performance or security conformance follows from the passing tests. Coverage was **NOT_MEASURED**.

## Requirements and skills applied

Read repository AGENTS/RTK, planning README/STATUS/execution guide, latest FixReports clarification/implementation/checkpoints and the earlier audit/recheck. Latest clarification remains authoritative: independent mutable Feature-owned case/file content; Status U→OK→NG→P→NA→U; P and NA tested; NA remains in denominator; zero cases=0%; monkey Bug requires a Feature but no fabricated case. No old cycle/run/build/device gate was restored. Existing result/brand palette was preserved.

| Skill | Actual application | Evidence / limits |
| --- | --- | --- |
| `frontend-ui-engineering` | Reviewed current ancestry, portal clipping, bounded scrolling, focus/return, small screens, long tokens, actual shared CSS scope; added component-owned styles. | `work-item-modal.css`, `feature-issues.css`, `testing.css`; geometry still needs root Chrome. |
| `frontend-patterns` | Retained dialog children across auth state; connected busy/dirty state to modal lifetime; guarded stale reads; durable URL filters and current scope. | `components.jsx`, `CaseIssueAction.jsx`, `FeatureIssueForm/Detail.jsx`, `FeatureIssuesPage.jsx`, `FeatureForm.jsx`. |
| `ui-ux-pro-max` | Used built-in priority/quick-reference for keyboard focus, dialog visibility, form feedback, touch targets and restrained/reduced motion. | Python/python3/py were unavailable per root; search CLI not run, no database match claimed. Shared palette/type system remained root-owned. |
| `tdd` / `test-driven-development` and test-writing/mocking references | Used existing public React components and mocked APIs; reproduced the behavior failure before repair; tested state and user interactions rather than CSS literals. | RED→GREEN table below; no decorative-only tests added. |
| `code-review`, `api-design`, `security-review` | Reused full-file/caller/DTO/capability review, distinguished role visibility from server enforcement, checked real Feature preview fields and stable row IDs. | Prior source audit/recheck plus current source; no live authorization/pentest claims. |

Skill sources: `C:/Users/admin/.codex/skills/<skill>/SKILL.md`. The root coordinates shared hook/auth/navigation and final verification. This owner did not spawn agents or edit shared hooks/auth/global styles.

## Repairs and behavior evidence

| Finding / repair | Current source | RED observed → GREEN |
| --- | --- | --- |
| UX-001 Issue Modal/drawer layout, document-cell clipping | `work-items/components.jsx:200`, new `work-item-modal.css` | Real clipped-cell harness contained dialog before fix; portal now escapes cell, closes on Escape and restores trigger. Existing expand/shrink test retains typed content. Own host CSS provides fixed backdrop, bounded body, visible header, right drawer/expanded/mobile sizing. |
| Auth portal regression caused by moving outside retained subtree | Modal `components.jsx:214`; preview `CaseIssueAction.jsx:50`; `[hidden]` overrides | Auth agent reproduced retained draft remaining visible during reauth. Both hosts now consume the one `auth/DialogVisibilityContext`, set hidden/inert, retain mounted children, and Modal passes visible readiness. Root hook consumes the same context to release traps/body locks. Root reports integrated auth+dialog **24 PASS**, receipt `auth-dialog-integrated.json`; auth owner reports final186 PASS. These are team results, not this owner's browser. |
| Dirty/pending Issue modal dismissal | Modal activity context `components.jsx:192`; `FeatureIssueForm.jsx:11`; `FeatureIssueDetail.jsx:27` | Delayed create + Escape previously removed dialog; now pending cannot dismiss. After rejected save Escape opens explicit discard decision; continue retains fields. X/backdrop/Hủy use the same close path. |
| Dirty monkey Feature change | `FeatureIssuesPage.jsx:15,54` | Picker previously enabled after title edit; now dirty/pending form disables picker with explanatory text. Explicit Hủy/discard allows a fresh context. |
| UX-005 Feature import preview ID | `test-cases/ExcelImportPreview.jsx:44` | Real Feature fixture returned `caseNo`, source IDs absent before repair; fallback renders exact `caseNo` while accepting legacy `sourceCaseKey`. Unicode and numeric-looking ID fixture passes. Import identity/commit untouched. |
| UX-006 project/filter durable links | `FeatureIssuesPage.jsx:30-34,52` | Changed keyword missing in URL before repair; replaceState/hashchange now persists filters/page, explicit projectId and workspace marker. Open/detail/close/view links retain this scope. No history entry on every character. |
| UX-007 case previous/next | `TestingDocumentPage.jsx:34-50,79` | Next always disabled before repair; callbacks now follow filtered case order, update page at boundaries, disable only endpoints, and return focus to last selected source ID. Fixed accidental first-row match when caseId absent; linked-row focus uses layout effect. |
| UX-008 Issue preview keyboard path and anchor | `CaseIssueAction.jsx:22-50` | Tab went straight to history before repair; Tab/ArrowDown enters preview actions, ShiftTab returns badge, final Tab continues next logical case control, Escape closes. Outside press dismisses; scroll/resize repositions; hidden/inert/negative-tab controls excluded. |
| UX-009 assignment history discoverability | new `testing/DocumentAssignmentHistory.jsx`; document toolbar `TestingDocumentPage.jsx:55` | Null component produced missing actor/case/history action before repair. Public component now displays exact case, actor, previous/new owner, VN time and older cursor. Directory failure retains ID fallback; history failure retries; empty/loading states explicit. Neutral table cells preserve separate before/after cell-history styling. |
| UX-013 disabled Status explanation | `TestingDocumentPage.jsx:43,70` | Delayed row1 write made row2 show permission reason before repair; pending now says “Đang lưu Status. Vui lòng chờ.” Error/reload/export states have appropriate reason; otherwise read-only/out-of-scope wording. Existing pending status text remains live feedback. |
| Archived project Admin affordances | `TestingFeaturesPage.jsx:19`, `TestingFeaturePage.jsx:19` | Archived project fixture exposed Create before repair; now Admin/PM creation/edit/archive/import/hide controls honor archived project, while readable content remains. Server checks unchanged. |
| Feature edit409 recoverability | `FeatureForm.jsx:9-20` | Missing reload/current comparison before repair; current server name/environment/description is now visible without replacing local draft. Explicit retry uses current version; archived/401/403/404 prevents write. A separate creation409 RED caught unknown Feature reload: only existing Feature edit enters version conflict flow. Create draft stays editable/retryable. |
| Source traceability / read-only priority | `FeatureIssueDetail.jsx:16,111-117` | Source links absent before repair; reader now gets Feature/file/case anchors with explicit project and stable rowId. Monkey has Feature only. Priority rendered in Vietnamese to readers without granting edit. |

## Controls / states covered by source review

This extends the earlier 32-row route inventory at `../uiux-audit-2026-10-19/testing-issues-source.md`. All rows below remain **BROWSER_NOT_RUN** here. A/P/T/D = Admin / project PM / Tester / assigned or read-capable DEV; actual visible mutation controls also require API capability. The table covers visible, conditional and hidden groups rather than treating old source files as active routes.

| Route / variant | Complete control group and text/content review | States / role boundaries / source |
| --- | --- | --- |
| `/board/testing?projectId=P`, active + archived Feature | Create/edit form, Feature link, keyword, archived checkbox, reload, archive/restore, prior/next/page-size; name/environment/description, progress ratio/bar, counts | A/P write active project only, readers open; loading/empty/no-match/error/retry/pending/last-page risk; long text wrap and headers/filters scoped. `TestingFeaturesPage`, `testing.css`. |
| Feature create/edit | Name/environment/description, save, close/Escape; required/max lengths; edit409 reload/current comparison | Busy disables close/save; failed save retains draft; edit409 blocks stale resave; archive/auth/notfound blocks write. Idle dirty close still a remaining risk. `FeatureForm`. |
| `/board/testing/features/F?projectId=P`, file list | Back, keyword, reload, import, open file, hide, pagination; filename/assignee/count/progress text | Archived project/Feature read-only; empty/no-match/read error; filename overflow contained by table. Hide remains immediate soft hide. `TestingFeaturePage`. |
| Import input / disclosure | File picker/multiple files, template download/rules disclosure, preview/start/cancel/back | Extension/size/20-file bounds, queued/progress/error, busy lifetime and scope; no real filesystem upload by this owner. `ImportExcelDialog`, `excel-import.css`. |
| Single preview | Exact source ID, per-row fields/errors, valid/invalid count, errors-only toggle, confirm/back/finish/open | Real Feature `caseNo` contract now tested; expired/previously committed/invalid; long text/table horizontal scroll intentional. `ExcelImportPreview`. |
| Batch preview | File selector, failed-file replacement, retry unpreviewed, confirm remaining, partial success, finish | Existing mocks verify successful entries not recommitted, authorization stop, generation guard. No live import. `ImportExcelBatch.test`. |
| Document manager grid | Back, search/status filter, font-size/page-size, page prior/next, export, assignment, history, case ID/detail, editable fields, Status and per-row Issue | Independent latest row; manager/Tester/DEV/read-only variants; zero/loading/error/late/reload/export/pending; long-token wrap; wide horizontal grid preserved. `TestingDocumentPage`. |
| Document deep link | Stable rowId preferred with caseId fallback, page/focus/highlight | Missing query no phantom highlight now. Invalid/missing valid row still lacks explanatory feedback. `TestingDocumentPage:34-40`, router validates syntax. |
| Case detail | Current content/Status/assignee, previous/next, close/Escape | Filtered order and page change, first/last disabled, focus return tested; required long text still wraps. `DocumentCaseDialog`, caller. |
| Status control | U→OK→NG→P→NA→U, current status text/palette, disabled title, history | Existing mocks verify P/NA tested and no legacy gate; pending/error/export reasons fixed; palette unchanged, no live write. `ResultCycleButton`, `useDocumentResults`. |
| Status history | Actor/time/before/after, empty/loading/error/retry/older cursor, close | Read-capable roles, no mutation, VN time helper. `DocumentResultHistory`. |
| Manager assignment | Tester selector, range input/staged ranges, save, close, conflict reload, directory retry | Stable row IDs, overlap/range validation, pending/failure retained; current comparison and empty directory feedback remain gaps. `DocumentAssignments`. |
| Tester assignment | Own range/self receive/release, save, close | No arbitrary actor selector; server scope unchanged; busy guard. `DocumentAssignments`. |
| Assignment history (new) | Open toolbar button, history rows, older cursor, error retry, close | All readers; actor distinct from Status recorder; directory name fallback; empty/loading/error. `DocumentAssignmentHistory`. |
| Cell editor/history | Edit textarea/save/cancel, approval if current contract requires, conflict current-content reload, history disclosure/retry | Source ID immutable; stale version/capability checks unchanged; old before/after colors not globally neutralized. `DocumentCellEditor`, `CaseHistoryDialog`. |
| Per-case Issue badge | Loading count / ? error / zero / populated, hover/focus/click, retry via click | Exact project/Feature/document/row scope; readers inspect, authorized create; closed Issues still counted. `CaseIssueAction`. |
| Issue preview (portal) | Issue key/title open, kind/status, create, previous/next page, Escape/outside/Tab actions | Loading/error/empty/no create; keyboard ordered, scroll/resize anchor; hidden/inert during reauth. `CaseIssueAction`, `feature-issues.css`. |
| Case Issue create | Bug/QA select, title/description/steps/expected/actual, context reload, save/Hủy/discard/continue | Source autofill, required bounds, server context retry, revoked permission retains draft, busy close guarded; one request identity retained in mounted draft. `FeatureIssueForm`, Modal. |
| `/board` Kanban / `?view=list` / `/board/list` | View toggles, Feature/type/status/keyword filters, reload, page controls, Issue key open, allowed move select/drag request | Current-page counts explicitly labelled; read-only cannot mutate; transitions open detail reason flow, URL scope durable. `FeatureIssuesPage`, `WorkBoardPage`. |
| `/issues` | Same list and filters, monkey entry for authorized A/P/T | Archive suppresses create; loading/error/empty; user palette/status retained; scoped badge/button styles now apply without legacy ancestor. |
| `/board/issue/I` / modal detail | Header/reload, source anchors, type/status/assignee/priority/current text, edit, DEV/priority selectors, save/cancel edit, transition/reason/save, comment composer/add/retry, history/open/retry/disclosure, monkey soft-delete/keep/confirm | API capability controlled; partial failure + drafts, history timestamps, late merge/abort, deleted state; full-page/route exit risk remains. `FeatureIssueDetail`. |
| Drawer normal/expanded | Close/Escape/backdrop, expand/shrink icon and aria-pressed | Mounted draft survives geometry change; body scroll bounded, reduced motion; true pixel dimensions root-only. `components`, `work-item-modal.css`. |
| Monkey no Feature / chosen Feature | Eligible Feature selector, explanatory text, BUG fixed type, draft fields/save/Hủy, discard/continue | Dirty/busy disables context change; selected Feature persisted until explicit discard; auth false keeps children hidden. `FeatureIssuesPage`, `FeatureIssueForm`. |
| Retired/legacy adapters | `/board/new` explanation; `/tests/**` retirement guidance; `/design*` deterministic aliases; malformed scope NotFound/selection/denial | No old ID→Feature invention, no cycle restoration; source and router mocks reviewed. Old BoardPage/IssuesPage/file-work/run/retest source presence is not active-route coverage. `AppRouter`, `legacyRoutes`, `routeInfo`. |

## Visual / interaction finish

Component-owned Modal scope fixes the root CSS mismatch rather than adding global `.d-*` rules. Header stays outside scroll body; long title wraps; drawer/panel radii use root tokens; 8px mobile inset and bounded dynamic viewport avoid a below-page form. Modal icon controls have explicit focus/hover/disabled treatments. Motion is a short opacity/8px entrance, disabled under reduced motion; no looping or large movement.

Current Feature forms and Issue surfaces now have consistent field gaps, readable context strip, explicit primary/secondary buttons, border/focus states, wrapped long text, and scoped error panels. Feature header/filter/progress/table styling uses existing colors and spacing. The required wide case/table layout remains horizontally scrollable; density/fixed column widths are not automatically defects. Assignment-history neutral styling is isolated from existing content before/after history colors. Remaining `tc-tab-btn transition:all` was narrowed to color/background-color/border-color with `--motion-fast`.

No pixel measurement or contrast ratio was inferred from source. Root is responsible for final visual review at real viewports and user palette confirmation.

## Executed tests / receipts

From `Frontend`, all commands prefixed RTK. Existing Vitest/jsdom mocks only; no live API/DB/provider tests.

```text
rtk proxy npm test -- src/app/features/testing src/app/features/test-cases src/app/features/work-items src/app/pages/WorkBoardPage.test.jsx src/app/routes --reporter=dot --reporter=json --outputFile=../var/uiux-polish-2026-10-19/testing-issues-regression.json
```

**37 files / 290 PASS, exit0**,28.07s. [JSON receipt](testing-issues-regression.json). Includes old lifecycle/search/modal tests and current import/result/document/Issue/router tests; their presence does not make retired routes active.

After this consolidated run, the additional Feature creation409 boundary regression was added and failed for the intended reason (incorrect current-Feature reload button). Guard repaired, then:

```text
rtk proxy npm test -- src/app/features/testing/FeatureForm.test.jsx --reporter=dot --reporter=json --outputFile=../var/uiux-polish-2026-10-19/testing-feature-create-conflict.json
```

**2/2 PASS, exit0**,2.34s. [JSON receipt](testing-feature-create-conflict.json). One of these tests overlaps the290; do not add counts as292 distinct tests. Root has been asked to run full frontend/build after team integration. Root-reported auth integrated24PASS/owner186PASS are separate overlapping suites, not totals to sum. Browser, coverage, build and backend checks were not executed by this owner.

Other targeted RED→GREEN observations are recorded in the session tool transcript: modal containment; keyboard preview focus; pending/draft close; monkey selection; Feature preview IDs; Issue URL keyword; filtered case navigation/focus; assignment-history missing behavior; disabled Status reason; archived Admin create affordance; Feature edit409 comparison; source links/priority. Test syntax/import failures were not counted as behavioral RED evidence.

## Remaining risks / incomplete states

These are explicit remaining source findings, not proof of production failure, and are not silently closed by290PASS:

1. **Route exit can discard Issue drafts.** Modal close paths and monkey context changes are guarded, but sidebar/back/hash/source-link navigation and refresh have no global Issue draft persistence/guard. Root explicitly chose no shared Issue route guard this turn. Feature/assignment/cell idle dirty close likewise not comprehensively guarded. Test/browser acceptance must distinguish dismissal from route exit.
2. **Assignment409 comparison incomplete.** Existing reload refreshes version/key but does not display latest assignment items; empty eligible Tester directory has no specific no-eligible-Tester message. Server overlap/scope guards remain; no claim of data overwrite.
3. **Saved mutation vs failed refresh.** `useTestingQuery.load` records read errors internally; a caller can close after a successful write followed by failed refresh. UI lacks a precise “saved, refresh failed” distinction in every flow.
4. **Last-page shrink.** Feature/file list pagination may show empty prior page after archive/hide; no new many-page fixture added.
5. **Per-row Issue request fan-out.** One mounted badge requests one list;100 rows can mean100 reads. No production latency/load measurement; bulk count endpoint would require backend work outside scope.
6. **Priority/assignee history presentation.** Current priority is readable now; existing Issue history does not expose every priority/assignee-only before/after snapshot field. No schema/history loss claimed.
7. **Missing valid caseId / file hide discoverability.** No not-found-row explanation; file hide remains immediate soft hide without a corresponding archive-list restore UI. No hard deletion was introduced.
8. **Untested physical interaction.** Screen reader, actual touch/IME,200% zoom, virtual keyboard low-height, real workbook upload/download, live permission downgrade, archived target links and delayed server outcomes require root/authorized environment. JSDOM focus success is not equivalent to browser geometry/AT proof.

## Root Chrome scenarios (no main mutation needed unless isolated fixture explicitly authorized)

1. At390×844/768×1024/1440, open monkey modal, case create from scrolled/wide grid, and list/board detail drawer. Verify fixed overlay/body lock, complete visible header, reachable save via body scroll, no ancestor clipping; resize/zoom; expand/shrink retains draft. Verify reduced-motion setting.
2. From a case badge use keyboard only: focus→Tab/ArrowDown into preview, activate Issue, Escape returns badge, ShiftTab from first and Tab from last continue logically. Scroll grid/page and resize with preview open; outside press closes.
3. Type monkey/case create; Escape/X/backdrop/Hủy opens discard confirmation; continue preserves fields. Feature picker disabled after edit. Explicit discard/reopen unlocks choice. On mocked delayed submission, close disabled until result. Route navigation remains known risk, do not claim persistence.
4. Trigger auth revalidation using existing isolated fixture: modal and preview hidden/inert, login keyboard focus not trapped by retained child, body lock released; same-account restore retains draft; account-switch isolation still follows AuthBoundary tests. Root auth regression receipt already covers mocked state.
5. Filter cases to a nonadjacent subset; open middle case, previous/next crosses grid pages and filters, endpoint buttons disabled appropriately, close returns selected source ID. Open no-caseId document: first row must not falsely highlight. Open source link from global Issue: correct project/Feature/file/row.
6. View source IDs in actual Feature import preview (including Unicode/numeric-looking IDs), assignment-history actor/from/to/cursor, Status disabled reason during isolated pending save, read-only DEV priority, and archived project no write affordance. Preserve U/P/NA colors/formula. Real upload/write tests require authorized fixture.
7. Change Issue keyword/Feature/type/status/page, reload/copy URL, toggle list/board/open/close detail: projectId/workspace and filters remain. Verify back behavior because keyword changes replace rather than push history.

The source fixes are ready for root review; final closure of browser-confirmed UX findings requires root's new evidence against this exact working tree.

## Integration follow-up: coverage timeout diagnosis and badge contrast

Root's first full coverage run recorded **1031 PASS /3 FAIL /1034 total,114 files** in `frontend-full-coverage-tests.json`; that receipt was preserved. Failures were required-VI-from-JP timeout5075.30ms, next server-save-focus test missing a VI label, and the101-row legacy document pagination timeout15454.48ms. No test/source/timeouts were changed to investigate.

Performed one bounded isolated run, with the same coverage enabled and `--maxWorkers=1`, against exactly the two affected files:

```text
rtk proxy npm test -- src/app/features/test-cases/test-cases.test.jsx src/app/features/test-cases/test-documents.test.jsx --coverage --maxWorkers=1 --coverage.reportsDirectory=../var/uiux-polish-2026-10-19/isolated-cases-documents-coverage --reporter=verbose --reporter=json --outputFile=../var/uiux-polish-2026-10-19/isolated-cases-documents-tests.json
```

**2 files /48 PASS, exit0**,36.26s. Previously failing tests took1876.38ms,1474.68ms and7606.20ms respectively. [Test receipt](isolated-cases-documents-tests.json); coverage outputs are in `isolated-cases-documents-coverage/`. These isolated coverage percentages measure only this selected run while including all source; they do not replace whole-project coverage or establish route/visual coverage.

Evidence for a cascade is strong: the second failed test's captured DOM had **JP active** and caseNo `ỂTNC -T1HỊ B`, although that test begins on VI and types only `TC-1` into caseNo. The immediately preceding timed-out test continues multiple awaited `user.type` operations followed by switching to JP. `src/test/setup.js` performs afterEach cleanup, which unmounts DOM but does not cancel an already running async test continuation. That continuation can query and interact with the next test's newly mounted dialog after timeout. This explains the unexpected tab and mixed text more specifically than a missing label regression. Exact scheduler interleaving was not instrumented, so classify cascade as a supported inference, not proven trace.

The timeout reduction with one worker supports resource contention/coverage overhead as the leading cause of the primary timeouts. It does not prove every parallel run is invalid or eliminate all potential flakiness. No product fix is justified by these results. Recommended final integration check is full coverage with one worker and unchanged timeouts, preserving both the original failure and this diagnosis. These old library/grid components also remain retired from current routes; their regression tests should still pass, without restoring them to the product.

Root separately confirmed white text on current Issue list status pills at1440. `issue-palette-contrast.json` measured white2.4–3.87:1 against the7 preserved Issue status backgrounds, while `#0f172a` achieves4.62–7.45:1. Changed only `.feature-issues-page .d-status-badge` foreground to `#0f172a`; no background, data, status mapping or five-result palette changed. Current Kanban cards, detail and case preview use ordinary status text rather than this badge, as verified from their callers. This is a visual-only correction based on root's browser/math evidence; no decorative unit test added. Root will verify resulting Chrome rendering.

## Final source freeze / unresolved mobile geometry

Root's actual390×844 `pm-monkey-draft-390.jpg/json` is **a failed responsive observation**, not acceptance: document scrollWidth458>390, dialog close y−35.7 and Save y819.7, title focused, form extends beyond screenshot. This owner inspected the saved screenshot/metrics only, without browser control. No PASS was assigned to this state.

Confirmed separate source causes repaired in `feature-issues.css`:

- Lines39–40: Issue filter labels lacked `min-width:0`; an intrinsic long-option select in the failed capture was x216,width241.6 and extended past the narrow main container. Added label min-width0/max-width100% plus full-width/min-width0/border-box controls. This constrains the flex/grid item rather than hiding document overflow.
- Line41: later imported `work-items-live.css:4,49` uses unscoped `.wi-field input/select/textarea`, equal specificity to `.feature-issue-form input/...`, overriding the new form's44px minimum/radius. Added component+field specificity for both create/detail controls to own44px/radius8 independently of stylesheet order. The captured title input had36px/radius3; this is a confirmed style cascade cause for controls, not proof that it caused the entire modal height failure.

Modal source review: `work-item-modal.css:3-8` defines fixed full-viewport backdrop, flex column bounded panel and min-height0/overflow-auto body; line18 provides8px phone inset, calc(100dvh−16px),12px header/16px body and44px icons. Old `work-items.css:1455-1487`, `work-items-live.css:52-63` and `work-board.css:322-337,377` all require `.work-items`/`.dashboard-board.work-items` ancestry. Current body portal host has neither, so those old modal selectors cannot collide by source ancestry. Header is a sibling of the scrolling body; no owned selector sets fixed/minimum panel height that exceeds the viewport.

Other captured geometry needs runtime provenance: screenshot has desktop-like24px left modal inset and200px main/sidebar offset despite390px reported width, while source mobile rules specify8px and zero workspace offset. `app-shell.css:336-413` does contain the mobile overrides. On-disk `Frontend/dist/assets/index-D5jwajyQ.css` was independently read and is stale (no `.wi-modal-host`, no new badge selector); that alone does **not** prove5174 is serving that bundle. Root was asked to inspect loaded stylesheet provenance, `matchMedia('(max-width:640px)')`, panel/backdrop/body computed height/max-height/overflow and visualViewport dimensions. No speculative global/modal override was added before that evidence. **Residual: full mobile modal geometry remains open for root Chrome.**

Independent reviewer identified a second behavioral issue: dirty monkey→Escape→Bỏ bản nháp unmounts both nested dialogs and loses opener focus. Added exact public-component/user-event regression to `FeatureIssuesPage.test.jsx`: **RED1 FAIL/5 PASS**, receipt [monkey-discard-focus-red.json](monkey-discard-focus-red.json). Modal is gone but body focused. Source cause: outer `useDialogFocus` cleanup sees itself not topmost and skips restoration; inner cleanup's captured opener is the now-disconnected outer close button. Root owns the shared hook repair; this owner did not edit it. Do not claim final GREEN for this new regression until root's hook fix is verified.

Owned product source is frozen after these scoped CSS changes. Last consolidated290PASS predates the final visual-only CSS and new intentional focus RED; it must not be reported as the latest entire tree clean. Root will run final full integration/coverage/build after the hook and browser geometry are resolved. Remaining route-exit/assignment-comparison/fan-out and other risks above remain explicitly open.
