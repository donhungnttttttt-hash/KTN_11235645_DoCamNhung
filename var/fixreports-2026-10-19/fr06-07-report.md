# FR-06 / FR-07 implementation checkpoint — 19/10/2026

Owner: admin/search agent. Source: FixReports.md, clarification C09/C12, implementation plan FR-06/07 and docs/api/fixreports-contract.md. Baseline is the shared FR-00 snapshot at `baseline.json` / `baseline.patch`; unrelated existing changes were preserved. No commit/push/restart, main-database writes or migration was performed by this agent.

## FR-06 implemented behavior

* MemberPicker requests `unassignedOnly=true` on the existing Admin users interface. Default false retains general account administration. Backend adds `NOT EXISTS` active membership **in any project** before both count and pagination; no schema uniqueness or membership cleanup was added. Existing membership edit/restore/version behavior is retained.
* All Admin handover entry points offer enabled/active project PMs. The common recipient applies immediately to every selected device, and newly selected devices inherit it. Per-device recipient editors are removed. Per-device notes/expected-return dates, machine identity, partial additional-handover retry and optimistic versions remain.
* Backend locks and reads current membership role and rejects non-PM recipients. Initial project handover rejects more than one recipient with `SINGLE_PM_REQUIRED`; existing enabled-account, project/archive, stock/asset version, lock order and transaction behavior remain. PM is **project_role=PM**, consistent with existing project permissions; no new global-role restriction was invented.
* No PM-to-member distribution API/UI was introduced. Historical asset/allocation/audit information remains. Project device copy explicitly says PM distributes internally outside the application.
* Dashboard retains role Total/Active table and membership/inventory charts; duplicate role-distribution chart is removed.
* Admin sidebar is sticky and height-bounded with overflow. On small screens the navigation is a horizontal scroll row. Visual scrolling/keyboard/browser verification remains a separate gate for root.

Files: Backend `admin/{AdminManagementController,AdminProjectService,DeviceInventoryService}.java`; Frontend `admin/{AdminProjectForm,InitialDevicePicker,DeviceAllocationDialog,AdminDashboard}.jsx`, `handoverRecipient.js`, `admin.css`; project `ProjectDeviceAssignDialog.jsx` / `ProjectDevices.jsx`; related tests.

## FR-07 implemented behavior and interfaces

Java helper: `vn.syp.tms.shared.search.MultiWordSearch`.

```java
var search = MultiWordSearch.sql(keyword, "p.code", "p.name");
where += search.sql();
args.addAll(search.args());
// Use the same where/args in count and data, before stable ORDER BY/LIMIT/OFFSET.
```

`tokens(keyword)` performs Unicode NFD/mark removal, lower-case, explicit đ→d and Unicode-whitespace splitting/deduplication. SQL is AND between tokens / OR between approved fields. It converts ASCII fields to utf8mb4, explicitly replaces Đ/đ, uses `utf8mb4_0900_ai_ci` and bound literal LIKE values with !/%/_ escaping. Trusted field expressions are supplied only by source code. Native collation proof is tracked separately below.

Frontend helper: `utils/multiWordSearch.js` exports `searchTokens(keyword)` and `matchesSearch(fields,keyword)`. It applies the equivalent Unicode/token/literal semantics to complete local collections before client pagination.

Admin audit now accepts `projectId?,keyword,from?,through?,page,size`. Active HTTP/controller/UI no longer contain event-type or timezone selectors. The service pins Asia/Ho_Chi_Minh; UTC query interval is `[start(from,VN), start(through+1,VN))`. Example 19/10/2026: 18/10 17:00Z inclusive → 19/10 17:00Z exclusive. Invalid/reversed/unrepresentable windows are rejected. An internal compatibility overload ignores its old timezone argument; it cannot change the date window.

Audit searches public actor display name/username/identity, project name/code/identity, object type/identity and action, including Vietnamese public labels and system/global-scope labels. Count and rows share the same safe UNION, joins and predicates. No metadata/request/session/secret payload was added. Entity/action labels are returned from a fixed server vocabulary so displayed labels and searchable labels agree.

## Search inventory: changed / other owners / retired

| Surface | Implementation state in this slice |
| --- | --- |
| Admin project list and all Admin project dropdowns | Changed AdminOverviewService.projects only (plus import); shared helper predicate for rows/count. Metrics changes are root-owned. |
| Admin user list + globally unassigned MemberPicker | Changed AdminProjectService/users and additive controller option; server search/count/page remain global. |
| Admin devices and available-device pickers | Changed DeviceInventoryService.assets shared helper. |
| Admin audit | Changed controller/service/UI and label vocabulary; fixed Vietnam dates/search/count/paging. |
| Complete local SelectionTable choices | Changed matcher to shared frontend helper; server-backed Admin pickers retain searchable=false and send server keyword. |
| Work-items MultiSelect local options | Changed only import + local matcher in components.jsx; workflow/form untouched. |
| Existing complete document case grid | With core approval changed only import + matcher in TestDocumentPage; filters complete loaded document before slicing. |
| New Feature/document/TestingDocumentPage lists | Core owner consumes the helpers and owns source/test/native proof; this agent did not edit core services or new Feature UI. |
| New Bug/QA issue lists and active WorkItem/Qa search | Root applies shared helper to existing WorkItem/Qa reads. This agent was subsequently assigned the new FeatureIssueService, whose list/count uses the same helper; see fr04-backend-report.md. No ProjectData/router edits. |
| Note list | UI/Note owner owns it and consumes common semantics; no Note source edited by this agent. |
| Old standalone library/retest/filework/handoff lists | Audited in admin-search-audit.md; retired in FR-11/core flow, not rebuilt as a separate search engine. If any remains intentionally active after routing integration, root must explicitly attach helper rather than claim blanket completion. |

Do not change exact login/username account lookup to fuzzy token matching; it is an identity interface rather than a keyword list.

## RED → GREEN evidence

The agreed seams are the shared contract's React/API adapter and public HTTP/service interfaces. No new confirmation was requested because those seams were already approved.

| Slice | Observed RED | GREEN / current evidence |
| --- | --- | --- |
| Member picker contract | `fixreports-members.test.jsx`, 1 failed: missing unassignedOnly | 1 PASS, including page2/server total and keyword reset. |
| Common PM handover | `fixreports-handover.test.jsx`, 1 failed: Tester offered as recipient | 1 PASS; excludes Tester/inactive/disabled, new devices inherit common PM, no per-device recipient editor. |
| Backend PM/single-recipient | Root grouped run 01:11:18: AdminFixReportsTest 2 failed for missing guards | Final 4 PASS in root 01:26:59 grouped run and agent 01:28:38 focused run. |
| Role chart duplication | Admin dashboard test failed because duplicate cells/chart repeated totals | admin.test.jsx 5 PASS after removal; table and membership chart retained. |
| Multi-word helper | Missing import caught first; then working baseline whole-phrase matcher produced 2 assertion failures | multiWordSearch.test.js 2 PASS for cross-field order/accent/đ/decomposed Unicode and literal punctuation. |
| Generic selection search | selection-search.test.jsx 1 failed: Cẩm Nhung disappeared under NHUNG do cam | 1 PASS. |
| Work MultiSelect search | local-search.test.jsx 1 failed: Đỗ Cẩm Nhung missing under NHUNG do | 1 PASS. |
| Audit UI | fixreports-audit.test.jsx 1 failed: event type selector still present | 1 PASS for removed controls, Vietnam display, search/date contract and page reset. |
| Backend Admin search | Root grouped run 01:13:34: AdminSearchTest 2 failed for whole-query and audit join/filter behavior | AdminSearchTest 2 PASS in root 01:26:59 grouped run and agent 01:28:38 focused run. |

An initial agent Maven attempt reached unrelated concurrent Notes testCompile before production types existed, and did not execute behavior tests; it is **not** counted as a RED behavior result. Following root coordination all later Maven runs use explicit exclusive slots. FR-06 Admin native tests remain NOT_RUN by this agent; subsequent FR-04 native Issue/search checks are separately recorded in fr04-backend-report.md.

## Regression and coverage checkpoint

* Backend focused 01:28:38: AdminFixReports4/AdminSearch2/AdminAudit3/Device8/AdminProject6 plus Issue/type4 = **27 PASS**. Final 01:34:34: AdminOverview7/MultiWordSearch2 plus Issue/type4 = **13 PASS**, no skips. Overview expectations were deliberately aligned to root's R03/C05 case-status formula (11/12 tested=91.67%, 4/12 OK=33.33%, empty=0), not the retired run-based denominator. This agent did not change root's metric implementation.
* Initial combined regression exposed 11 old expectations that permitted member handover/per-device recipient selectors. Updated fixture recipients to legitimate project PMs and assertions to common PM while retaining draft/partial-retry/focus tests.
* Selected six-file regression after these changes: **38 tests PASS** (`inventory`, `action-button-audit`, `button-recheck`, `admin-dialog`, `fixreports-audit`, project `device-handover-feedback`).
* Expanded Admin/local/document regression: **25 files / 150 tests PASS**. Command: `rtk proxy npm test -- --maxWorkers=2 src/app/features/admin src/app/features/projects/device-handover-feedback.test.jsx src/app/components/SelectionTable.test.jsx src/app/components/selection-ux.test.jsx src/app/components/selection-search.test.jsx src/app/features/work-items/local-search.test.jsx src/app/features/test-cases/test-documents.test.jsx src/app/utils/multiWordSearch.test.js --coverage --coverage.include=src/app/features/admin/** --coverage.include=src/app/utils/multiWordSearch.js --coverage.reportsDirectory=../var/fixreports-2026-10-19/admin-coverage`. V8 measured statements **89.42%**, branches **85.68%**, functions **87.93%**, lines **94.10%** for declared Admin/helper scope, not whole frontend. Artifact `admin-coverage/` preserves the report. Not every individual file exceeds 80%; the included old useInlineEditorFocus has no exercised callers and is honestly 0% in this scoped run.
* Backend requested final unit set: AdminFixReportsTest, AdminSearchTest, MultiWordSearchTest, AdminAuditServiceTest, DeviceInventoryServiceTest, AdminProjectServiceTest, AdminOverviewServiceTest. Shared target is root-controlled while core native work runs.
* New native HTTP tests prepared in AdminNativeIntegrationTest: globally unassigned AND Unicode / paging / old-membership preservation; Vietnamese audit labels and exact UTC boundary rows on page2; direct API rejects Tester but accepts project PM. Existing allocation lifecycle native test now uses its existing PM owner. All use the existing explicit isolated-schema guard and rollback-owned fixture. NOT_RUN by this agent.
* Browser sticky/navigation/handover/audit check: NOT_RUN by this agent; checklist sent to root/UI owner. Frontend `rtk proxy npm run build`: **PASS**, 1736 modules, existing-style bundle advisory (680.39 kB); this is a compile/bundle check, not browser or runtime proof. Lint/typecheck: NOT_CONFIGURED in repository. Coverage is reported only when a real measurement exists.

## Skills → actual use → evidence

| Skill | Applied work | Evidence / limitations |
| --- | --- | --- |
| implement | Finished FR-06/07 source in delegated sequence, retained one project ledger owned by root | This artifact and small source diff; no automatic commit because task explicitly forbids it. |
| tdd | Vertical RED/GREEN React and service/query slices at pre-agreed interfaces | Table above; real native proof remains separate from mocked SQL contract tests. |
| api-design | Additive unassignedOnly, existing paging envelope, shared count/data predicates, literal keyword contract, fixed local-day interval | Controller/service/adapter changes; no new broad engine or response-envelope replacement. |
| security-review | Server PM role/enabled snapshot, existing locks/version/admin checks; no global membership uniqueness; bound SQL and audit allowlist | AdminFixReportsTest4/AdminSearchTest2/AdminAuditServiceTest3 PASS; Admin native fixtures prepared, not run. |
| frontend-patterns | Single common recipient state, immutable array updates, preserve draft/retry/selection across pages; reuse live/abort read guards | Handover/picker/stale-response regression suites. |
| frontend-ui-engineering | Semantic labelled common selector, keyboard focus recovery, removed redundant choice controls, bounded mobile/sidebar overflow | React focus/control tests; browser viewport proof remains open. |
| impeccable | Operate-mode refinement on existing product context from FR-00, craft-floor read before edits; keep existing tokens/identity | No redesign/new branding; duplicate chart removed and recipient copy clarified. Root context was already loaded once per shared session. |
| coding-standards | Small named pure helper, trusted SQL expressions, existing stack/style, scope-limited changes | Java/JS helpers and call sites. No framework/toolchain replacement. |
| code-review | Self review against clarification/spec and repo standards, preserving baseline and peer ownership | No subagents per explicit task instruction; this is not called independent review. Findings below. |
| code-simplification | Shared PM eligibility and token matcher replace duplicated local decisions after behavior tests | No broad refactor; a separate generic state/query abstraction was unnecessary. |
| verification-loop | Selected regression, scoped coverage, compile/test/build/security/diff checkpoints | Exact PASS/FAIL/NOT_RUN recorded; no coverage inferred from test count. |

## Self review / remaining integration

Standards: source changes preserve session/CSRF conventions, no secrets/telemetry/dependencies introduced. Prepared tests use synthetic UUID data and schema guards. SQL field expressions and translated labels are source-owned; request values stay bound. Existing dirty CSS and other baseline files were not reset or reformatted wholesale.

Spec: C09 filters the picker; mutation uniqueness was not invented. Current-role PM enforcement lives in locked assignment path. C12 searches before count/paging and renders fixed Vietnam times. Native audit tests assert **specific row timestamps**, not just a count that could accidentally pass under UTC dates.

Dependency still owned by core: prove the new Tester Feature/range/Status path works without a personally named device allocation. Old FileWorkGuard/SessionService's recipient gate is not weakened here or replaced with a new distribution workflow. Root/core own retirement of those routes, new Feature identities, progress metrics, migration and final browser/native integration. No migration is needed for these Admin/search source changes themselves.
## Final native follow-up

AdminNativeIntegrationTest13/13 GREEN at02:10:59 on exact integration schema206/Flyway33, rollback fixtures only, providers and cleanup crons disabled. Includes globally unassigned pagination/old membership preservation, public audit labels with Vietnam inclusive end-day, PM-only handover and current Admin60% KPI/history rights. First native pass exposed a real FR07 NFD SQL defect (count1 instead2); MySQL LIKE accent collation did not skip decomposed combining marks. MultiWordSearch.sql now strips Unicode marks through ICU REGEXP_REPLACE before existing đ/Đ folding and literal AND-token predicates; signature and bound argument order unchanged. RED admin-native-nfd-red.xml; GREEN admin-native-current-green.xml. Final focused24/24 includes helper/Admin search tests. Detailed KPI/retirement evidence and scoped coverage limits are in admin-kpi-retirement-report.md. Native test success is separate from a Windows runtime jar lock repackage failure, resolved by parent stopping only its own isolated backend and agent packaging successfully02:12:19. No service changes by this agent.

