# FR-00/FR-01 UI and navigation audit

Date: 2026-10-19. Scope: read-only source inspection and local audit artifact. Product code, shared planning documents, browser, services and database were not modified by this audit. Branch observed: `system-design`; existing dirty AI/UI work must be preserved. This is implementation guidance, not FR-05/08/09/10 completion or runtime evidence.

## Brief and sources

Read AGENTS.md / RTK.md, required planning README / STATUS / execution guide; FixReports clarification C01, C11, C14 and implementation-plan FR-05, FR-08, FR-09, FR-10. The confirmed journey is project → Bảng công việc → Quản lý kiểm thử → Feature → files → cases. Feature means a testing batch. Preserve the inner board/list switch, private chatbot and its connection settings. Management analysis/report is PM/Admin only; ordinary work/file progress remains usable by authorized members. Project Note is separate from the read-only Spider Plus information copy.

Brainstorming classification: architectural change already decomposed by FR-00–12; this task explores the incumbent code and supplies bounded UI recommendations to FR-01. No implementation, additional approval flow or design-world replacement is introduced. Business decisions already settled by C01–C14 are not reopened.

## Actual runtime composition and affected seams

All frontend paths below are relative to `Frontend/src/`.

| Source seam | Current evidence | Required change / owner |
| --- | --- | --- |
| `AppEntry.jsx:39,46` | ProjectProvider and ProjectDataProvider wrap workspace; AiProviderProvider and AiChat are above the role app, shared across Admin/workspace | Keep provider and chat lifetime. FR-09 settings panel must use this provider rather than mount another connection store |
| `App.jsx:18,30,32,47` | Hash router normalizes legacy paths; page title and navigation are manual | New path parsing, title, Back and compatibility changes must agree; no new routing framework required |
| `app/routes/AppRouter.jsx:24–80` | Separate AI, board, tests/document, cycles/file-work/retest, progress, analysis, catalog, settings dispatch | FR-05 dispatcher must recognize Feature routes before the broad `/board/*` WorkBoard branch; replace routes only after replacements are ready |
| `app/routes/routeInfo.js:7–18,21–41` | File-work/cycle parsing and page titles, no Feature context | Parse and validate Feature/document IDs explicitly. New paths must never be interpreted as cycle IDs or issue IDs |
| `app/routes/legacyRoutes.js:2–13` | Only `/design/*` compatibility currently exists | FR-05/11 need real old→new identity mapping; unknown or ambiguous old file/cycle route needs an explicit explanation, never first-Feature fallback |
| `app/components/Sidebar.jsx:8–35,37–52,69–94` | Main testing section, board children Kanban/list, separate progress and AI; static array has no role/capability filtering | FR-05 replace board list child with testing child, rename Bảng trạng thái; FR-10 capability hides management entry; FR-08 Note and FR-09 AI replacement are dependency-gated |
| `app/layouts/MainLayout.jsx:11,14,28–45` | Document-focus regex only recognizes `/tests/documents/:id`; mobile sidebar already uses focus hook and inert workspace | Extend document-focus for new path; preserve mobile close/focus/backdrop behavior, don't reinvent shell |
| `app/pages/WorkBoardPage.jsx:19–43,46,63–69` | Same component handles board/list/issues/new/issue detail, contextual QA query, existing view switch | Keep status board/list below the board tab. Do not render Feature detail through this issue-oriented parser. FR-04 changes contextual issue scope before FR-05 redirects |
| `app/pages/DashboardPage.jsx:12–19` | Actual routed overview is ProjectOverview; both project and testing overview are mounted under hidden wrappers | Edit routed ProjectOverview, not an unused mock/dashboard. Review hidden testing report fetching when applying analysis permissions |
| `app/modules/ProjectOverview.jsx:15–37` | Work-items overview request, recent items → HomePage; generic create button; old HandoffPanel | Replace requested recent/inbox content with project information; remove unsupported generic creation under C06. Review HandoffPanel separately as retired retest UI |
| `app/features/work-items/HomePage.jsx:44,62` | “Công việc tạo gần đây”, “30 công việc mới nhất”; shared presentation also contains other status/milestone summaries | Replace the requested content region deliberately; don't delete unrelated shared components or summaries solely because copy moved |
| `app/features/qa/HandoffPanel.jsx:5–7,25–40` | PREPARE_RETEST / VERIFYING / READY_TO_CLOSE, build/count/retest-request conditions | Hidden residual old workflow in overview even after removing menu. FR-04/11 must remove its entry/dependency once new issue/Status behavior exists; not relocate it into new Analysis |
| `app/pages/AnalysisPage.jsx:3`, `app/pages/ProgressPage.jsx:3` | Thin wrappers for ReportsPage quality/progress mode | FR-10 can compose existing progress work into Analysis; wrappers alone don't enforce permission or implement Markdown |
| `app/features/reports/ReportsPage.jsx:13–36,49–71,86` | No role guard; requests cycles/builds; Excel export; old progress `(OK+NG)/applicable`, NA excluded/PM approved; links to cycle runners | FR-10 must replace underlying metric/filter/source links and add authoritative management capability. Merely moving the menu retains obsolete behavior |
| `app/features/projects/ProjectSettingsPage.jsx:17–28` | General/members/rules/handbook tabs; catalog dispatched separately | Rename settings parent to Thông tin chung; add Note entry/page after FR-08 API is ready; retain other tabs |
| `app/features/projects/CatalogPage.jsx:11–16,36` | Catalog types such as builds and existing management permission | Catalog is not Note. Remove its sidebar entry only after Note works; keep referenced catalog storage/API until dependency audit FR-11 |
| `app/features/projects/HandbookPanel.jsx:14,22,34–45` | Handbook revision UI, guide/spec/account-reference resource types, literal text rendering | Reuse form/loading/error/version idioms if helpful; do not silently recategorize handbook records as Note or add required code/resource-type/version workflow to Note |
| `app/features/projects/ProjectProvider.jsx:29–41,57–74` | Explicit URL projectId checked; local selection fallback; selector removes stale projectId parameter | Feature deep links need explicit project scope and project-switch policy. Ensure an old Feature path cannot survive switch and be read as belonging to the newly selected project |
| `app/features/projects/projectAccess.js:6–8` | canManageProjectWork excludes archived projects and applies current PM/DEV precedence | Reuse for write affordances where applicable; use a distinct read capability for Analysis so archived PM/Admin read does not depend on a write predicate |

## Recommended navigation design (proposal for FR-01)

Use the incumbent shell and compact controls. Preferred route family: `/board` and `/board/list` remain status board routes; `/board/testing`, `/board/testing/features/:featureId`, `/board/testing/features/:featureId/documents/:documentId` represent the testing journey. Include/retain `projectId` and case anchor/query in shareable deep links. Exact URI names are a technical proposal, not a new business rule; finalize with the domain/API owner.

Add a small board-section composition boundary at router/page level, with “Bảng trạng thái” and “Quản lý kiểm thử” links/tabs. It chooses WorkBoardPage or the new Feature screens; it must not couple Feature screen mounting to WorkBoardPage's QA/issue modal effects. A route-linked navigation bar with `aria-current` matches the existing manual router. Use true ARIA tabs only if implementing the complete tab keyboard pattern. Retain the inner Bảng trạng thái/Danh sách mode switch and its selected state.

Alternative considered: keep `/tests` canonical but only move its menu entry below board. It reduces URI changes but leaves the independent old library route/semantics and complicates nested selected state. Alternative: put all Feature logic inside WorkBoardPage. It adds work-item/QA/modal coupling to an already large multipurpose component. Prefer the small composition boundary and explicit route parser, with compatibility adapters after identity mapping is available.

The testing first screen is a Feature list, not a combined file library. A Feature opens only its own file copies; document detail has visible breadcrumb/context and a Back target to the same Feature/list filters. Case→Issue→save/cancel returns to the exact project/Feature/document/case and refreshes that case's issue badge. URL context is input, never permission evidence. Preserve filters/page/scroll in URL or an explicit return context rather than relying on browser history alone.

`TestDocumentsPage.jsx:16–19,38–47,53–78` already supplies server pagination, request-generation protection, loading/error/empty, Excel import dialog and file list pattern. Extend it behind an explicit Feature scope; current `listDocuments(project.id,...)`, project-only import props and `/tests/documents/:id` targets do not meet Feature independence. Its project-wide file-work links and “Tất cả test case” must not survive as hidden bypasses.

`TestDocumentPage.jsx:45–58` keys current grid by project/document, but not Feature. `:132,153` hardcode Back to `/tests`; `:170,187,209,212` expose cycle/run/NA-approval/second-test dependencies. FR-02/03/04 must supply the Feature-aware document/read/status/assignment seam before FR-05 retires the old routes. Preserve cell editing/history/export behavior where required, with new identity and first/latest tester semantics rather than merely relabeling old second-run columns.

## Analysis, progress and Note

Management sidebar/menu, direct route and request issuance all need the new capability. FR-10 must enforce the same permission server-side for summary/report read/create/edit/download; TESTER/DEV direct hashes must show the clear denied state and must not fetch hidden management data. Use a server capability or current project role plus ADMIN convention; a global PM AI capability must not grant project management screens outside membership. Do not apply the management block to authorized file-work progress or ordinary case/issue chat.

Move the progress surface, including the existing ProjectStatusReports seam at `ReportsPage.jsx:57`, under Analysis using a compact secondary view. It must consume Feature/Status metrics before removing `/progress`. Old formula/copy/Excel output in ReportsPage are evidence that this is a data contract change, not a cosmetic label change. The new Markdown report has project + optional Feature, saved text editor, preview and download. Persist successful server response; retain draft on error/409; subsequent read/export must use saved text. Keep report storage independent of business counts and AI/chat draft TTL. Avoid arbitrary HTML rendering; links and Markdown need safe rendering.

Note should replace only the catalog navigation entry with a simple project-scoped list/read/editor. PM/Admin get create/edit/archive or delete behavior per approved contract; other members get read only. C11 does not request attachments, custom permission management or approvals. Note API/storage remains a domain decision in FR-01; handbook is reference evidence, not proof that its semantics match Note. For archived projects keep readable content and applicable write restrictions consistent with project behavior.

## AI entry audit and safe replacement

`app/features/ai/AiConnections.jsx:20–78` owns capability/catalog/connection/probe/authorization state, per-provider preferred models, cancellation and abort guards. `:80–109` exports AiSourceSelector with provider/model and connection actions. It takes `disabled` and `connectionsOnly`; it already renders server returned statuses, errors/retry and user connection controls. Reuse this component; no credential form or provider recreation is needed.

`AiChat.jsx:22,155–161` currently has only scope-settings and history toggles. Add a separate visible “Cấu hình AI” toolbar control and inline panel in the existing chat scroll area, reusing AiSourceSelector. Keep the existing Phạm vi chat control. This avoids nesting a second modal inside the chat and preserves the compact app surface. Expose expanded/control labels; panel should have readable heading, close behavior and focus return to its trigger. Opening configuration must not call fresh(), clear pending, rewrite turns or discard composer text.

Critical pins: `AiChat.jsx:82–83` fresh/changeScope preserves text; `:113` copies provider/model only when creating a new thread; `:134–142` readiness uses thread's pinned provider/model; `:102–129` guards send/retry/idempotency. Configuration changes apply to the next new conversation; existing thread's provenance and in-flight request stay pinned. Disable connection/model mutations while send/pending/history read is unresolved, including GENERATING turn state; keep retry usable. Be explicit about new-conversation application rather than implicitly resetting an open thread.

`AiChat.jsx:173` still links to `#/admin/ai` or `#/ai` when source/model is unavailable. Replace it with an action opening the same config panel before removing menu access. Both `Sidebar.jsx:27` and `features/admin/AdminLayout.jsx:25` contain the old AI menu; `AppRouter.jsx:24` and `AdminApp.jsx:24` dispatch old assistant pages. Compatibility of bookmarked AI pages needs an explicit “open chat configuration” handoff or clear retired-page message; do not redirect to an unrelated project/Feature. Keep provider/model capability and local-owner conditions server-driven. Do not infer all settings are ADMIN-only from the old Admin link.

Current chat project list is `projectsApi.list` (`AiChat.jsx:64`), purpose is PROJECT_CHAT or MY_PROJECTS (`:113`), with only Admin-specific portfolio label (`:143`). FR-09 cross-project PM retrieval/Feature targeting requires a backend capability/context change; relabeling this combobox cannot establish it. Preserve current scope-only/history/Enter/preset-send improvements in dirty working tree while extending the contract.

## Spider Plus identity and overview content

Approved copy: `docs/content/spider-plus-project-overview.md` (introduction; System Test Flutter scope; Spider Plus/SHIFT/SYP; two document packs; results/handover). C14 says it is a read/reference block, not a CMS, integration or acceptance workflow. Render only the selected, confirmed target project's copy; preserve supplied external reference links without fetching them or claiming access checks. Render structured safe React content or safe Markdown; don't inject unrestricted HTML. Wrap long URLs, give links meaningful pack/source labels, allow table scrolling without whole-page overflow.

Identity evidence searched: product source `Frontend/src`, `Backend/src/main` (including migrations), scripts, planning/review/content docs using Spider/SpiderPlus/SPP/Flutter variants. Source contains no confirmed Spider Plus project ID/code binding. `Frontend/src/mocks/storeData.js:2` says “Flutter” without a real project identity; it is not mapping evidence. Business-context/planning prose confirms domain context, not the runtime record. No production database/browser was consulted in this subtask.

**Open mapping question for root/user if no authoritative runtime evidence is available:** “Trong danh sách dự án hiện có, mã hoặc ID nào là dự án Spider Plus để gắn khối Thông tin dự án?” Do not choose first project, match loosely by name, infer an ID from a fixture, or show copy globally. This blocks only content binding; navigation/Note/config/analysis design can continue. For non-target projects show their own existing authorized description or a truthful no-description state rather than Spider copy.

Overview must drop the generic “Thêm công việc” point under C06; future issue creation belongs at case and monkey Bug management. Remove old inbox/recent routes/entries together with the appropriate replacement gate. Check both desktop sidebar and residual action links—removing a visual block alone leaves old workflow reachable.

## Verification work to attach to implementation

No tests/build/coverage/browser verification were run in this read-only audit. Coverage is **NOT_MEASURED**. Existing tests were inspected as a change map, not reported as passing.

| Behavior | Existing test seam / additions required |
| --- | --- |
| New hierarchy; one selected nav; Back and collapsed/mobile menu | `app/routes/navigation.test.jsx`, `sidebar-groups.test.jsx`, `layouts/ui-audit.test.jsx`; update old cycle/file-work expectations only with replacement-ready tests |
| Inner board/list remains; Feature route not swallowed; unsupported create actions absent | `app/pages/WorkBoardPage.test.jsx` + router tests; QA/issue return context assertions |
| New Feature document scope; old bookmarks map or explain ambiguity; switch project during load | `features/test-cases/test-documents.test.jsx`, `document-editing.test.jsx`, `ProjectProvider.test.jsx`; source response is discarded after scope/owner change |
| Overview correct identity + safe copy; no generic creation/inbox/retest workflow | `modules/ProjectOverview.test.jsx`, `.permissions.test.jsx`; target/non-target/loading/error and late response tests |
| Analysis management allow/deny, including direct hash and API | `features/reports/reports.test.jsx` plus backend contract/security tests owned by FR-10; hidden dashboards must not fetch blocked summaries |
| Note PM/Admin CRUD, member read, ID tampering, pending/error/conflict | `features/projects/settings.test.jsx`, new focused Note tests and backend allow/deny/version tests |
| Config keeps chat, draft, history, provider pins; footer recovery works without menu | `features/ai/AiChat.test.jsx`, `AiConnections.test.jsx`; pending retry, account switch, provider-change→existing/new thread tests |
| Report saved edit/export; unsafe Markdown; 10→8 text with 10 source issues; cleanup isolation | FR-10 UI/service persistence and cleanup tests; avoid implementation-mirroring snapshots |

After actual UI implementation: one batched check at 320/768/1024/1440, keyboard/focus/back, accessible badge interaction by keyboard/touch, tables/long text, project switch and role states. Reuse shell tokens and work-items/test-document classes; preserve established Status semantic colors. These remain NOT_RUN here; source inspection cannot prove rendered behavior.

## Skill → application → evidence

| Skill read | Application in this audit | Evidence / limit |
| --- | --- | --- |
| `brainstorming/SKILL.md` | Architectural scope grounded in confirmed brief; compare small composition boundary vs route-only move vs growing WorkBoardPage | Recommendations above; read-only exploration only, no product implementation gated/claimed |
| `frontend-patterns/SKILL.md` | Composition, URL state, fetch invalidation, provider ownership, focused seam reuse | Router dispatch; ProjectProvider generation guards; chat shared provider and pinned thread; no framework/TypeScript migration |
| `frontend-ui-engineering/SKILL.md` | Existing design consistency, loading/empty/error/permission, semantic nav/focus/responsive checks | Current Sidebar/MainLayout, future verification matrix; browser/a11y runtime checks NOT_RUN |
| `impeccable/SKILL.md`, `reference/operate.md`, `reference/mode-operate.md` | Operate: predictable standard controls, compact tables, meaningful hierarchy, existing identity | `impeccable.cmd context --target Frontend/src/app/pages/WorkBoardPage.jsx` ran successfully; no PRODUCT/DESIGN found, incumbent source used. Scoped planning only, no craft-floor/detector because no UI edit. Update available notice v4.6.0; no update installed |
| `ui-ux-pro-max/SKILL.md` + `references/quick-reference.md:200–206` | Concrete back-behavior/deep-linking/nav-hierarchy guidance for nested Feature journey | Directly verified local reference, plus `data/ux-guidelines.csv:12,42` hover/tap and keyboard rules for badge. Search CLI unavailable (`python`, `py` not on PATH); no generated design-system result or external reference claimed |

Only new artifact owned by this subtask: `var/fixreports-2026-10-19/ui-audit.md`. No commits, services, DB mutations, browser actions or subagents.
