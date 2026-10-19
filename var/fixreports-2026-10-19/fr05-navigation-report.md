# FR-05 navigation integration — source checkpoint

Date: 2026-10-19 (local environment clock reported 01:29–01:36). Owner: fr_ui_audit. Scope: frontend source, jsdom tests and build only. Browser/native HTTP integration NOT_RUN by this agent. Parent coordinates those checks.

## Implemented

- AppRouter dispatches `/board/testing`, Feature and nested document before generic board. IDs are canonical positive safe integers; duplicate/invalid projectId and caseId are rejected. Canonical callbacks include actual current projectId. Document receives validated caseId and the existing CaseIssueAction; DEV gets canCreate=false, ADMIN overrides DEV membership. Core component source remains with its owner.
- Outer status/testing destinations are accessible navigation buttons with aria-current, wrapping layout and 44px touch height. `/board` and `/board/list` still dispatch the same WorkBoardPage; its inner board/list behavior belongs to parent. No WorkBoard source edited.
- MainLayout recognizes new document focus. Project changes suppress old deep children immediately and keep them suppressed until navigation resets to the new project's Feature list. A fresh explicit link for the newly selected project is preserved. Added two regression tests after review: both observed RED then GREEN.
- AnalysisPage mounts ManagementAnalysisPage. AppRouter and Sidebar enforce ADMIN or actual project PM (global DEV excluded except ADMIN). `/progress` is a guarded Analysis alias. Tester/DEV route cannot instantiate report component. DashboardPage mounts only read-only ProjectOverview; hidden TestingOverview and legacy HandoffPanel are absent from active overview.
- Sidebar has overview, board/status+testing, issues, scoped Analysis and Thông tin chung/general+members+Note+rules+handbook. Independent tests/cycles/retest/filework, progress and AI entries are removed after replacement entrypoints exist.
- AdminLayout removed only AI menu entry. Parent expanded ownership to the old `/admin/ai` branch in AdminApp: it now shares RetiredAiEntry with `/ai`, opens the existing header launcher through ChatLauncher host, and explains Cấu hình AI. No AI source changed in FR05.
- Existing Notes and Spider Plus overview implementation/evidence remains in fr08-05-report.md. SPIDER-PLUS code is exact identity; other projects use their own actual description.

## Legacy route inventory / decisions

| Entry | Decision |
| --- | --- |
| `/tests`, `/tests/cases`, `/tests/documents/*`, `/tests/cycles/*`, `/tests/{id}`, `/tests/retests`, `/tests/file-work/*` | Friendly retired workflow notice, explicit button to scoped Feature list. Never reinterpret old IDs as Feature IDs. Old low-level parser/API helpers retained for isolated legacy components/transport tests. |
| `/dashboard/actions`, `/dashboard/testing` and old dashboard subpaths | Friendly overview notice. No inbox, management metrics or hidden old report mounted. |
| `/progress` | Guarded new Analysis entry; menu removed. |
| `/settings/catalogs` | Friendly replacement notice with explicit Note button; no catalog data mapping. Existing device/catalog admin source references need parent/FR11 review where still reachable. |
| `/ai`, `/admin/ai` | Friendly configuration-in-chat notice and existing launcher CTA; no replacement AI menu or redirect. |
| `/board/new` (including `/design/new` alias) | Friendly creation guidance: case context or Monkey in issues; generic create screen not mounted. |
| `/design/home`, `/design/board`, `/design/issues`, `/design/issue/{id}` | Deterministic existing aliases retained; query preserved. No Feature identity inference. |
| Unknown new testing path / invalid canonical IDs / duplicate project context | NotFound; no wrong Feature/document fetch. |
| Explicit linked project differs from current project | Wait for ProjectProvider selection, do not mount under current wrong identity; project errors surfaced. |

## Test evidence

- Initial router/shell/sidebar contract: RED **20/20** against old source at 01:29:51; GREEN20 at01:32:00.
- Project-switch follow-up: RED **2/22** at01:35:15 (query-free stale Feature reappeared, fresh scoped new link reset); corrected suppression/explicit scope; GREEN22 at01:35:24.
- Old Admin AI entry RED1 at01:34:17 (`retired AI page mounted`); GREEN after replacement. Test asserts existing launcher is invoked.
- Final scoped run at01:35:41: **101/101 tests, 9 files PASS**. Includes route callbacks/Back/query rejection, sidebar keyboard/selection/collapse, mobile drawer/focus, browser title/hash/scroll semantics in jsdom, old raw export transport8 unchanged, new page adapters, retired overview no hidden API for PM/Tester/DEV/ADMIN/archive, legacy ReportsPage behaviors with Tester Analysis denial. All nine old typed Kanban tests in qa-dashboard retained.
- Coverage V8 measured (scoped report, not full repository): **statements85.96%, branches87.39%, functions88.09%, lines92.56%**. HTML/LCOV artifacts: `fr05-fe-coverage/`. coverage-summary.json includes eight source files including Dashboard/Analysis adapters (the CLI condensed table omitted their trivial group). Does not imply browser/backend coverage.
- Full FE **diagnostic only**, before source freeze, at01:32:56: 97filesPASS/4FAIL; 888testsPASS/38FAIL of926. Failures: qa-glue20 (parent), WorkBoardPage9 (parent), qa-dashboard8 old overview and reports1 old analysis expectation (now replaced with agreed new behavior and scoped GREEN). Parent owns final full run; no second full run performed by this agent.
- Latest build at01:36: **PASS**, 1696 modules, JS444.10kB (gzip130.17), CSS157.93kB. New report/testing routes included in app entry. No native service or DB used.
- Impeccable detect on AppRouter/RetiredAiEntry/navigation.css/Sidebar/MainLayout: **[]**. Scoped `git diff --check`: PASS, only configured LF→CRLF advisories.

## Skills → use → evidence

| Skill read | Application | Evidence |
| --- | --- | --- |
| brainstorming | Constrained integration to approved C01/C11/C14 and existing replacement-ready components; no new business workflow | Legacy inventory and explicit route decisions above |
| frontend-patterns / frontend-ui-engineering | Project-scoped remounts, guard-before-mount, explicit callbacks, no hidden fetch | AppRouter, MainLayout, DashboardPage and regression tests |
| tdd-workflow | Router behavior and switch edge cases tested failing before fixes | Timestamped RED→GREEN above |
| impeccable, Operate/craft-floor | Task navigation hierarchy, selected state, document focus, clear retired/error states | Detector[] and keyboard/mobile-focus tests; browser visual NOT_RUN |
| ui-ux-pro-max | Read concrete local navigation/back/deep-link and keyboard/touch guidance; 44px wrapping outer navigation | navigation.css, Back/selection/focus tests. No generated design system or redesign |
| security-review | Canonical URL validation; project mismatch suppression; scoped PM/ADMIN guard; DEV action capability | Malformed and authority tests; backend still independently enforces |
| code-review / verification-loop | Manual spec/source review and targeted checks; parent owns final consolidated evidence | Two switch bugs caught and fixed; measured coverage/build/diffcheck; no E2E claim |

## Remaining with parent / FR12

Actual browser viewport320/768/1440, native isolated HTTP journey, complete role/capability lifecycle and final full-suite after source freeze. Verify existing issue deep links and actual file row focus with core's new caseId support; verify Spider Plus project creation/identity in actual authorized data. Review residual device/catalog legacy hrefs without redirecting equipment links to Note. No commits or shared planning state changes by this agent.
