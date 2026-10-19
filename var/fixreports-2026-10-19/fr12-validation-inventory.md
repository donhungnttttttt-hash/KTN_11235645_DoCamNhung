# FR12 validation preparation and source interaction scan

Prepared 2026-10-19 by fr_ui_audit. **No browser/E2E execution, services, HTTP requests or DB writes performed by this agent.** Root owns CUA and isolated runtime. This is preparation/source evidence, not A20 acceptance.

## Inputs / skills

Read FR12, skill matrix and A01–A20 in the implementation plan. Reused already-read code-review, impeccable Operate, verification-loop. Read e2e-testing, requesting-code-review, receiving-code-review, verification-before-completion and handoff. e2e-testing applied as deterministic role/fixture journeys and evidence separation; no Playwright install/config/runtime introduced. Browser-testing-with-devtools was read for inspection expectations but not invoked (root CUA only). No new reviewers/subagents spawned because root explicitly prohibited them; root receives precise scope/findings for independent review. No settled business decision reopened.

Root-ready route/viewport/role plan: `fr12-browser-plan.json` (PREPARED_NOT_RUN, null fixture IDs intentionally require actual isolated identities). Existing native test runners remain with root; none executed here. They have exact owned-schema/Flyway checks; do not substitute them with main application DB credentials or automatic cleanup. No secrets stored in this plan.

## Source scan and findings

`Scan-ActiveInteractions.cjs` traverses local relative JS/JSX imports from actual `src/main.jsx` plus AdminApp, parses JSX with existing frontend Babel parser, records native buttons/links and flags obvious empty handlers, placeholder hrefs, button-without-click/form-submit and double-click-only controls. It only reads product source and writes its JSON inventory. Run with `rtk proxy node var/fixreports-2026-10-19/Scan-ActiveInteractions.cjs`. No network, services or product writes.

First snapshot:99 reachable files,287 native controls,3 candidates. Latest snapshot after concurrent core work:99 files,289 controls,2 candidates. `active-interactions-source.json` contains exact file/line/snippets for every control.

| Finding | Verification / disposition |
| --- | --- |
| TestingDocumentPage:52 editable native button had double-click and Enter handlers but no single-click | **Not an empty handler/no-op**: desktop double-click and Enter were implemented. Touch accessibility concern sent to core owner. They reproduced single-tap RED and changed native activation, reporting GREEN3; root notified to reconcile exact desktop double-click requirement and touch fallback. This agent did not edit core. Latest scan no longer flags it. |
| components.jsx:31 IconButton and:51 Button do not declare onClick locally | **Static false positives**, both spread caller props. Reachable Modal supplies close/maximize handlers. This does not imply every unmounted legacy caller is valid; scan covers static graph, not dynamic capability evaluation. |
| ProjectDevices:11 actual member screen linked test-device catalog to now-retired `/settings/catalogs?type=devices` | **Real stale semantic link.** Root granted ownership. Removed only obsolete sentence/link; retained physical PM handover explanation, actual inventory link, assign/return actions. RED1/2 at01:37:55 then GREEN6/3files at01:38:25 including existing handover feedback/common-recipient regressions. diffcheck PASS. No redirection to Note. |

No obvious empty onClick/placeholder-link candidate remains in the parsed active graph. This is **not** a claim that all runtime buttons work: callback props, server capabilities, failures, CSS/pointer/focus and conditional branches require the browser matrix.

## Active screens / handler-capability-feedback inventory

| Screen/source | Real actions / capability gate | Feedback / checks for root browser |
| --- | --- | --- |
| Sidebar/MainLayout/Header | Expand/collapse, mobile drawer, scoped destinations, project selector, account/chat launcher | aria-current/expanded, Escape+return focus, project error, archived read-only; deep project switch suppression. Status/testing outer nav plus inner Kanban/list retained. |
| ProjectOverview/ProjectInformation | Read-only approved links/copy for exact SPIDER-PLUS; actual description otherwise | Loading/error/empty-project; no legacy overview/Handoff/management API. Check real project code after root provisioning. |
| TestingFeaturesPage/FeatureForm | Create/edit/archive/restore from PM/Admin helper, read for members; keyword/archive/page | Busy/lock, mutation and query alerts/retry, required name, version/request key. Root verify ADMIN no membership and PM observer denial. |
| TestingFeaturePage/ImportExcelDialog | Open document and scoped Back; import preview/commit and hide file when canManage | Loading/error/retry; preserved imported workbook; hide must retain linked data. Import is allowed only on isolated fixture. |
| TestingDocumentPage/DocumentAssignments/DocumentCellEditor | Source ID opens read dialog; content editor PM/Admin; result cycle governed by row.canUpdateResult; assignment own/manager; history; export | Version conflict recovery keeps chosen range; status queue pending/error; deliberate table scroll; two tester columns; caseId row focus; no run/cycle gate. Root must examine touch activation separately from desktop double-click. |
| CaseIssueAction/FeatureIssueForm | Click or keyboard popup, pagination/open/create, contextual prefill; DEV create withheld; server still authoritative | Spinner/error/retry, public rowId context, request-key lock; save closes back at same case, failure keeps form. Touch must work without hover. |
| FeatureIssuesPage/FeatureIssueDetail | Same data Kanban/list; Issue filter/page/open; transition dropdown/drag opens actual detail; server canTransition/allowedStatuses; context edit/assignment/comment/soft delete; Monkey in issues | List/Feature errors+retry, busy locks, reason/version, conditional capabilities. New import graph excludes generic old IssuesPage/BoardPage runtime. Verify actual deep Issue modal and Back/filter persistence. |
| ProjectSettings/ProjectNotes | General fields/rules/handbook retain existing scope; Notes CRUD PM/Admin, member read, optimistic version | Busy/error/409, no attachment, delete confirm, focus restoration, stale response abort. ProjectDevices uses actual PM physical handover flow and no retired catalog CTA. |
| ManagementAnalysisPage/SafeMarkdown | Role guard before data mount; optional Feature summary; new/open/edit/save/list page/download; AI proposal separate apply; shared providers | No management fetch for Tester/DEV; 35s preview client deadline/reused key; edit survives failure/conflict; latest stored download not unsaved editor; unsafe HTML/URLs escaped. Native persistence and counts require root HTTP, not mock tests. |
| AI chat | Existing header launcher, scope/project/optional Feature, presets by role, config/settings/history/new/cancel/send | Toolbar4 responsive; catalog abort/stale handling; pinned thread/provider/model, in-flight locks; wrong-user/session history guards. Root owns AI final source and browser. |
| Admin dashboard/projects/users/devices/audit | Real existing controls; removed only old AI menu. Role ADMIN gate in AdminApp | Sticky/sidebar long-content short-height; table total/active count without duplicate role chart; handover common active PM; inline errors. Vietnam date/keyword query must be checked against actual DB evidence. |
| Retired /tests, /dashboard/*, /board/new, catalogs, AI routes | Explicit notice and real destination or existing Chat launcher; no guessed Feature ID or new generic workflow | Keyboard reachable CTA, correct scope, no hidden old page fetch. Old low-level source retained for compatible isolated tests/transport, not active router. |

## Acceptance handoff

| IDs | Existing source/test owner evidence | Remaining integrated proof |
| --- | --- | --- |
| A01–A06,A19 | Core fr02-03-report + domain owner, native integration/root runners | Actual browser import/copy independence, assignments/status/history and archive/file removal; compare root DB/API export evidence |
| A07–A08 | Root Issue source/tests and fr04-backend-report | Actual case popup/save/return, badge closed issues, monkey Feature ownership and DEV capabilities |
| A09–A10 | fr05-navigation-report + fr08-05-report;101 scoped navigation tests/build | Browser Back/deep links/project switch and real SPIDER-PLUS identity |
| A11–A12 | fr06-07-report + ProjectDevices navigation fix above | Browser picker/PM handover, sticky shell, Vietnam full day/unaccented AND count |
| A13 | Notes18 backend mock/service-policy+MockMvc, FE38 per fr08-05-report | Root native Notes persistence/cross-project HTTP + browser CRUD/member read |
| A14–A17 | FR09 frontend64 and parent AI/core evidence | Root native whitelist/output/owner scope; browser configuration/history/thread/draft; live external AI explicitly separate |
| A18 | FR10 frontend24 API-mock tests and root report backend evidence | Native saved10→8 reread/download exact8 while issue total10; cleanup survival; unsafe Markdown browser |
| A20 | Prepared plan only | Root isolated PM→Tester→Issue/Monkey→DEV→PM report journey and durable reread; browser console/screenshots and non-sensitive HTTP evidence |

Viewport minimum plan390/768/1440 plus320 stress; record exact route, role, fixture IDs, source revision and same viewport for screenshot pairs. Check native horizontal/vertical scroll, focus order, Escape/return focus, actual disabled explanations and text labels alongside Status colors. Do not call screenshots or fixture mocks native integration. Do not mark final full suite GREEN until root source freeze and a fresh consolidated run. No second full run performed here.
