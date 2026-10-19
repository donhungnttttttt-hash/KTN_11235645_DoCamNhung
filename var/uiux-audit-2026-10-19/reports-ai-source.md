# Dashboard, management reports, AI and shared shell — source audit

Date: 2026-10-19. Owner: delegated source reviewer. Scope: whole current files, not only the working diff. This is input to the root audit; root may map the local `UX-RA-*` IDs to the final global sequence.

**Evidence level:** `SOURCE_REVIEW`; **browser, screen reader, physical touch, computed style, zoom and runtime API execution: `BROWSER_NOT_RUN` / `NOT_RUN` by this reviewer**. The root agent is the sole browser controller. No application source, database, configuration or processes were changed; no real project content was sent to a provider. No tests or provider/OAuth/probe actions were run by this reviewer. Findings below are current source behavior or static risks, not established regressions. No P0 found in this source scope.

## Context and current baseline

- Read supplied AGENTS/RTK, planning README/STATUS/execution guide, development-skills, FixReports, clarification and implementation plan, and implementation/follow-up reports through their final checkpoints. `system-design` remains the working branch, with many pre-existing uncommitted files preserved.
- The final FR-12 checkpoint at `docs/reviews/2026-10-19-fixreports-ui-followup.md:76` confirms the explicitly approved main V30→V33 cutover/restart on8080. The earlier V30/404 observation is closed history, **not an open audit finding**. Root owns fresh runtime identity checks. This source review does not claim it independently revalidated8080.
- C10 governs reports: ADMIN or PM of the project; TESTER/DEV cannot view management analysis/export. Editing stored Markdown changes only report text. C11 keeps standalone chat and provider configuration, removes the AI menu/page, and pins existing conversations to provider/model/scope. PM's AI-wide visibility does not imply ordinary cross-project management rights. C14 binds the approved overview content only to `SPIDER-PLUS`.
- Existing report source tests were read as historical coverage evidence, not executed this pass. Earlier suite totals, API/native tests and upload limitations are not browser evidence for this audit.

## Skills actually used

| Skill | Applied work | Evidence / limitation |
| --- | --- | --- |
| `frontend-patterns` | Trace route/project/account lifetimes, async abort/generation checks, locks, drafts, retries and pinned chat scope | `ManagementAnalysisPage`, `AiChat`, `AiConnections`, providers/router/API client read in full; findings001–005 below. No React architecture replacement proposed. |
| `frontend-ui-engineering` | Inspect labels, focus entry/return, nonmodal chat, mobile sidebar modal, semantic progress/legend, overflow and responsive CSS | Inventory and shared observations below. No claim of measured accessibility conformance. |
| `ui-ux-pro-max` | Targeted local lookup on actual concerns, then validate applicability | Local `Python313/python.exe .../search.py 'focus not obscured' --domain ux` returned Minimum/Enhanced focus distinctions; used to specify the shared overlay verification gap, not to claim failure. `'form submission feedback'` returned Submit Feedback / Loading Buttons; used to check synchronous locks and saving feedback. Initial `'unsaved form navigation'` and `'history scroll position'` results did not directly answer those concerns; they were not treated as a verified rule for draft preservation/history anchoring. Python/py/python3 were absent from PATH; existing Python313 was located and used, without installs or PATH changes. |
| `code-review` | Separate source/spec evidence from styling judgement and avoid calling every defect a regression | Clarification C10/C11/C14 compared with whole active components and relevant backend contract. The skill's default diff-only/delegation workflow was adapted to the user's whole-system audit and this assigned no-subagent scope; no issue tracker, external issue or new review agents created. |
| `security-review` | Inspect escaped rendering, safe external links, account-keyed state, 401/403/404 handling, provider UI boundaries | `SafeMarkdown`, `AiChat`, `AiConnections`, `AppEntry`, API client; positive checks and permission gaps below. No pentest/provider execution. |
| `api-design` | Follow report CRUD/download/preview and error/idempotency semantics | `managementReports.js`, `ManagementReportController/Service/Dtos`, `AiManagementReportGenerator`, `docs/api/reporting.md`; findings003/005. No contract mutation. |

Root applies impeccable Operate. This audit preserves the current teal identity and compact administration density. No replacement palette/font/system was selected.

## Route and distinct variant inventory

Every row here is `SOURCE_REVIEW` + `BROWSER_NOT_RUN`; all viewports320/390/768/1440, keyboard/touch/200% zoom are pending root evidence unless root separately records them. “Roles” describe source gates, not proof of server enforcement by this reviewer. Common shell is Header/ProjectSelector/AccountMenu/Sidebar/Footer; shared table is `TableScroll`.

| ID | Route / access | Roles | Source / shared components | Actions and distinct states inventoried |
| --- | --- | --- | --- | --- |
| RA-I01 | `#/dashboard` | Authenticated project readers; ADMIN workspace uses `workspace=1` | `DashboardPage.jsx`, `modules/ProjectOverview.jsx`, `ProjectInformation.jsx` | Loading project, error+retry, no project, generic project description, approved Spider Plus article, archived banner; Drive/SharePoint links open externally (not visited). No dashboard modal. |
| RA-I02 | `#/dashboard/*` | Authenticated workspace | `AppRouter.jsx:44` | Retirement explanation and CTA to current overview; old activity/testing dashboard is not silently revived. |
| RA-I03 | `#/analysis`, `#/progress` | ADMIN or project PM excluding global DEV; worker denial | `AppRouter.jsx:49`, `AnalysisPage`, `ManagementAnalysisPage` | Project loading/no project/denied; current progress aliases to current analysis, not legacy report implementation. |
| RA-I04 | Analysis summary whole project | Same as above | `ManagementAnalysisPage.jsx:84–86,102–109`, `TableScroll` | Refresh, pending/error/empty metrics, all five Status counts/legend, tested/total, timestamp Vietnam, Feature rows and Bug/QA table. |
| RA-I05 | Analysis Feature scope | Same as above | `ManagementAnalysisPage.jsx:55,85,107`; service summary | Native select whole/specific/missing Feature fallback; confirmation when editor dirty; stale request aborted. Scope ambiguity in UX-RA-003. |
| RA-I06 | Saved report list | Same as above; archived read allowed | `ManagementAnalysisPage.jsx:89–90` | Loading/error+retry/empty, open report, selected item, previous/next page20, Feature or whole-project metadata and updated time. |
| RA-I07 | New manual report editor | ADMIN/project PM; active project | `ManagementAnalysisPage.jsx:87,92–96` | Title, Markdown textarea, live preview, disabled blank submit, save busy/success/error; dirty Feature/report/new switch native confirm. No custom editor dialog. |
| RA-I08 | Existing report edit/download | Same; archived can read/download but cannot edit | `ManagementAnalysisPage.jsx:60–65,81,95–96`, SafeMarkdown | Versioned update/conflict/draft retained on error; saved-vs-unsaved download explanation; exact stored text download; action lock. |
| RA-I09 | Report AI proposal | Active project ADMIN/project PM with configured provider | `ManagementAnalysisPage.jsx:68–79,93–94` | Provider absent/loading/disabled reason; create/pending/check same request/FAILED/uncertain request/READY proposal/explicit apply. No autosave or business-data command. Provider call NOT_RUN. |
| RA-I10 | Chat launcher in workspace and Admin headers | Authenticated account | `AiChat.jsx:173–176`, `ChatLauncherSlot`, Header; Admin host owned by other reviewer | Closed launcher, open nonmodal dialog, minimize/Escape, focus composer / return trigger; source layout44px mobile,40px desktop. |
| RA-I11 | Chat blank/new conversation | All authenticated roles with provider capability | `AiChat.jsx:97,150–172,190–202` | New, draft, preset one-click send, new/legacy/general scope labels; suggestions differ manager vs member; send disabled by read/provider/scope/archived/denied. |
| RA-I12 | Chat scope panel | ADMIN/PM AI-wide project list; members API-scoped list | `AiChat.jsx:83–94,98–99,182–187` | Whole permitted portfolio, specific project, optional Feature; Feature loading/error+retry/archived option/missing target; scope controls locked during pending/read; draft preserved by `fresh()`. |
| RA-I13 | Chat history list | Owner account; backend scope still required | `AiChat.jsx:38–40,188` | Empty, history rows provider/model/purpose/project, older page cursor, history read errors; no create/delete history action. |
| RA-I14 | Chat historical thread/detail | Owner account; permitted retained history | `AiChat.jsx:41–61,71–80,193–194` | Read pending, pinned provider/model/scope, READY, source disclosure, context truncation, escaped text, copy success/failure, older turns, provider unavailable read-only, revoked context. |
| RA-I15 | Chat send / uncertain recovery | Same capability and current scope | `AiChat.jsx:100–148,194–202` | SENDING, GENERATING, inspect same key, READY/FAILED, failed body retry, continued draft while busy, IME/Enter/Shift+Enter, quota link, denied explanation, archived read-only. No provider send run. |
| RA-I16 | Chat configuration panel | Backend-returned capability, no blanket ADMIN-only assumption | `AiChat.jsx:181`, `AiConnections.jsx:80–109` | Source/model select; API configured-vs-live text, provider loading/error, refresh, Ollama disabled/unavailable/no models/error, ChatGPT states below. |
| RA-I17 | ChatGPT no connection/reconnect/permission | Only local-owner/localhost capability when returned enabled | `AiConnections.jsx:64–68,88,96–105` | Connect, reconnect, missing plan permission, new account, popup blocked fallback, official authorization link; no credentials form. No OAuth action run. |
| RA-I18 | OAuth pending popup + cancel | Same capability | `AiConnections.jsx:55–60,66–67,102–104` | about:blank temporary window, HTTPS auth.openai.com allowlist, polling pending/processing/authorized/failure/networkretry, cancellation; unique transient variant, not a route. |
| RA-I19 | Verified/unverified ChatGPT + probe/disconnect | Same capability | `AiConnections.jsx:69–77,92–100` | Account label, verified model/version, failureCode, explicit quota-using probe, generating same key, ready/failed, disconnect local-vs-remote result. Probe/disconnect NOT_RUN. |
| RA-I20 | `#/ai` | Authenticated workspace | `RetiredAiEntry.jsx` | Explains configuration moved to chat; CTA opens existing launcher or explains already open. Former full AiAssistantPage is unreachable from active router/menu. |
| RA-I21 | Workspace sidebar desktop expanded/collapsed | Authenticated; management menu filtered by capability | Sidebar/MainLayout/app-shell.css | Parent group toggles, board/settings children, active route, collapse/expand, overflow vertical menu. Buttons have `title`; hidden spans alone are not proof of a missing accessible name. |
| RA-I22 | Mobile/document-focus sidebar drawer | Same | `MainLayout.jsx:35–69`, `Sidebar.jsx:53–60`, `useDialogFocus` | Dialog role/aria-modal, close/backdrop/Escape, focus containment/return, workspace inert. Header and chat remain outside inert area: requires root combined-overlay check. |
| RA-I23 | Header project selector dropdown | Readers; create project link ADMIN only | `ProjectSelector.jsx`, `ProjectProvider.jsx` | Trigger title/current value, loading/error/retry/no projects/list/current/archived, native buttons, blur/Escape/backdrop close and focus return; create redirects Admin projects. |
| RA-I24 | Shared TableScroll | All consuming roles | `components/TableScroll.jsx`, table-scroll.css | Measured overflow hint, labelled focusable region, keyboard horizontal scroll, ResizeObserver, sticky header, vertical max-height65dvh/640px. Source only, no actual measured overflow. |
| RA-I25 | Shared SelectionTable and SelectPageCheckbox | Consumer-specific; Admin/testing owners cover instances | `SelectionTable.jsx`, selection-table.css, SelectPageCheckbox | Local multiword AND query, selected/unselected filter, disabled eligible rows, indeterminate select visible/page, hidden-selection count, empty-vs-filtered/loading, reset focus. Active use is chiefly Admin selectors; old test/retest uses do not create active routes. |
| RA-I26 | Legacy adapters / unknown routes | Authenticated | `legacyRoutes.js`, `routeInfo.js`, `AppRouter`, NotFoundPage | `/design/*` deterministic aliases; `/tests/*`, `/board/new`, `/settings/catalogs`, `/dashboard/*` explanatory retirement; unknown/invalid route recovery. Detailed active testing/issues/settings routes owned by peer reviewers. |

**Inactive implementation files, not active screens:** `ReportsPage.jsx` (legacy cycle/build/Excel formulas), `TestingOverview.jsx`, `ProgressPage.jsx`, `AiAssistantPage.jsx`. Verified via `rg` references plus AppRouter. Do not report their retired NA/retest/cycle UI as a current UI regression or propose restoring it. Global `project-overview.css` mostly targets `.project-overview.work-items`, absent from the new overview article; stale styles exist but are not proof of a visible failure.

## Findings and precise repair criteria

### UX-RA-001 — P2 / interaction, data-state — report drafts disappear on ordinary route/project navigation

**Classification:** SOURCE_CONFIRMED lifecycle defect; browser reproduction pending. Not proven regression. Roles ADMIN/project PM; any viewport; new manual draft or edits to a stored report. Environment: source, parent to confirm main browser.

**Reproduction:** Open `/analysis`, type synthetic unsaved Markdown, click sidebar Tổng quan, return to analysis. Separately change the header project and return. Refresh is another independent exit. Do not save to main.

**Expected:** A dirty draft survives a return under its project/report identity, or navigation offers an explicit discard choice. **Source actual:** `ManagementAnalysisPage.jsx:25` keys workspace by project; local editor/baseline state is created at33. `permitDiscard()` at53 protects only Feature selection/open report/new (55,60,87). `App.jsx:47–50` changes route unconditionally, `ProjectSelector.jsx:67` changes project unconditionally, and unmount aborts requests but retains no editor. `AiEditBuffer` is not consumed by this editor. Thus it resets to empty/default on return.

**Root cause / confidence:** Confirmed local state lifetime and incomplete exit guard; high confidence. Impacts manual report writing and saved-report editing; same-project provider refresh can also replace the workspace with its loading branch at22.

**Proposed repair:** Add an account-owned report draft buffer keyed project/report (and new-report Feature identity) plus a consistent unsaved navigation/discard policy; clear at successful save or explicit discard/account change. Do not autosave report changes to business data.

**Acceptance:** Type unique draft; sidebar away/back and project A→B→A preserve the correct A draft or offer a usable cancel/discard choice before loss. No A text appears in B. Save success clears dirty status; failed save preserves it; different account cannot recover previous account text. Refresh/close has explicit chosen behavior, verified separately.

### UX-RA-002 — P2 / interaction — loading older chat messages jumps back to the newest message

**Classification:** SOURCE_CONFIRMED scroll mechanism; actual browser/scroll measurement pending, not regression. All chat roles, any viewport, an existing permitted thread with more than one page and enough text to overflow.

**Reproduction:** Open existing long history, scroll up, activate “Xem tin nhắn cũ hơn”. No send/provider action needed. Main may lack a qualifying thread; use an existing isolated fixture, not new main data.

**Expected:** Read older turns at the existing visual anchor or at the newly revealed older content. **Source actual:** `AiChat.jsx:193` prepends older turns using `setTurns`; the effect at96 runs on every `turns`, `busy` or `outgoing` change and assigns the scroll container's `scrollTop=scrollHeight`. `perform()` busy transitions can scroll before and after the read too. This moves the reader to the bottom after older results arrive; the newly requested content is offscreen.

**Root cause / confidence:** Confirmed unconditional auto-scroll shared by append/prepend/status changes; high source confidence. Existing test232–233 verifies presence/API cursor, not a visible scroll anchor.

**Proposed repair:** Preserve scroll anchor on prepend; auto-follow new output only when the reader is already near the bottom or explicitly requests latest. Keep keyboard focus visible at its logical control.

**Acceptance:** Existing long fixture, capture visible turn and offset; loading older preserves the reader's position, older turns remain reachable, latest send at bottom still follows. Incoming status/read refresh must not drag a reader who scrolled upward to latest. Cover mouse and keyboard at390/1440.

### UX-RA-003 — P2 / content, data-state — Feature filter leaves an unlabelled whole-project Feature table

**Classification:** Confirmed mixed source scope; usability finding pending browser confirmation. It is **not** evidence that progress arithmetic is wrong. ADMIN/project PM; project with at least two Features with different totals; any viewport.

**Reproduction:** Open `/analysis`, select Feature A. Compare aggregate tested/total and Bug/QA with the subsequent Feature rows, including Feature B.

**Expected:** The selected scope is clear for every dependent block. A whole-project comparison may remain if visibly labelled as such. **Source actual:** `ManagementAnalysisPage.jsx:85` labels the control “Phạm vi Feature”; summary at104 and Issue section108 use scoped data, but107 always maps `data.features`. `ManagementReportService.java:34–39` scopes metrics/Issue but the features query at36 returns every active Feature and serves the dropdown catalog. No visible table heading says it ignores the selected filter; its aria label is simply “Tiến độ theo Feature”. `AiManagementReportGenerator.java:34` separately filters this array for a Feature proposal, so source AI/report scope differs from the visible table scope.

**Root cause / confidence:** Confirmed catalog reused as displayed data without explicit scope communication; high source confidence, medium severity confidence until visual reproduction. Impacts scope comprehension and comparison of exported/AI proposal versus screen.

**Proposed repair:** Retain the full catalog for select options, but render the selected Feature in the scoped table, or explicitly label the table “So sánh mọi Feature của dự án — không áp dụng bộ lọc trên” and clearly name the selected scope for summary/Issue/proposal. Choose within current C10, not a new reporting feature.

**Acceptance:** At two-Feature fixture, selected A cannot be mistaken for B/project totals. Whole-project mode still lists both. Keyboard/screen reader labels convey the same scope as visible heading. AI preview and saved new report attach the selected Feature; no formula changes.

### UX-RA-004 — P2 / data-state, content — transient chat detail read failure is handled as denied access

**Classification:** STATIC_RISK pending isolated failure reproduction; no evidence of current main network failure. All roles, existing thread, any viewport.

**Reproduction:** With a permitted thread already selected, minimize then reopen while its GET detail fails once with a network/timeout/5xx response. Restore GET success. This should use an isolated fixture or controlled request seam, not restart services.

**Expected:** A recoverable read error with direct retry, draft retained; revoked access is distinguished. **Source actual:** reopen catch at `AiChat.jsx:73–78` sets `denied=true` and clears turns for **every** error, though only403/404 get access-specific error text. `canSend` at164 then blocks;201 says “Tạo hội thoại mới hoặc chọn lại lịch sử được phép”, and no direct retry-detail control is rendered for this case. The user can reselect history/reopen, but a transient outage is explained using a permission recovery path.

**Root cause / confidence:** Confirmed catch branch merges transient failure and revoked access; high source confidence. Do not preserve sensitive transcript after actual401/403/404: that security behavior is deliberate.

**Proposed repair:** Track failed-read separately from denied; show direct retry for retryable GET failure, retaining composer. Continue hiding revoked data and applying current permission checks. For transient errors, any retained content must be visibly stale and follow the existing privacy policy.

**Acceptance:** Fail GET once with NETWORK_ERROR/503, then retry restores same thread and draft without creating/sending.403/404 still hides denied transcript and blocks sending; no private content leaks during account changes.

### UX-RA-005 — P2 / data-state — manual new-report save has no recovery identity after uncertain response

**Classification:** STATIC_RISK requiring isolated transaction/response-loss reproduction, **not a proven duplicate in main**. ADMIN/project PM; new report only; any viewport.

**Reproduction:** In an isolated fixture only, let POST create commit but lose its response/timeout. Retry the visible save. Do not create reports on main to test this.

**Expected:** Recover the first committed report or retry the same create intent without duplicating it. **Source actual:** `ManagementAnalysisPage.jsx:64–65` sets `saved` only after the awaited response. On TIMEOUT, `saved` stays null and draft is retained; next save calls `api.create` again. `managementReports.js:12`, `ManagementReportDtos.java:6`, controller19 and service60 have no request key/lookup; insert is unconditional. Synchronous lock at57 does protect double-click while an action is running, but does not identify an uncertain completed POST across retries.

**Root cause / confidence:** Confirmed missing create-intent idempotency; high source confidence, occurrence unmeasured. Scope is duplicate saved reports/catalog confusion, not underlying Issue/Status corruption. Existing report updates have version conflict protection.

**Proposed repair:** Give manual create a durable client intent/request key and backend replay lookup scoped to actor/project/body, reusing it after uncertain errors until confirmed or explicitly abandoned. Explain pending/unknown save and provide recovery rather than blindly retrying a fresh POST. Preserve existing download semantics.

**Acceptance:** Commit+lost-response followed by retry yields exactly one stored report and same ID/content. Changed body/key conflict gets explicit outcome; double Enter/click remains one in-flight operation; successful response establishes the report ID/version. Verify only isolated database/fixture.

## Shared visual/accessibility observations and remaining checks

These are source facts and targeted verification needs, not measured visual failures:

- Global type tokens are caption/table12px, body13px, section15px, title18px at default16px root; `global.css:11–17`. Compact controls36px become44px at mobile/coarse rules. This density suits the current administration brief; small type is not automatically declared a standards violation. Root must judge actual legibility/zoom with Vietnamese content.
- Shell header48px/sidebar200px (collapsed60px), fixed header and sidebar scroll; `app-shell.css:1–3,23–35,125–155,267`. Main starts after the header. No workspace skip link is present; Admin has a separate implemented skip link. Root should check keyboard traversal cost and focus visibility beneath fixed header/chat before deciding priority. Do not conflate “no skip link” with a measured conformance failure.
- Scope/control labels are generally wrapped in native label elements, buttons have text/accessible names, statuses have textual legend and labelled progress values, copy result/error/status are announced, source/output HTML uses React-escaped text. `SafeMarkdown` permits only absolute HTTP(S) links and uses noopener/noreferrer. No unsafe HTML renderer was found in active report/chat output.
- Chat is explicitly nonmodal (`aria-modal=false`), so a focus trap is not automatically expected. It autofocuses composer when opened and restores launcher on minimize; Escape excludes SELECT. It has mobile viewport/dvh/safe-area rules. Root must test focus that can move behind this persistent overlay, interaction with sidebar/modal layers and320px/short-height/200% zoom; no computed overlap was measured here.
- Report list/editor becomes one column at1024px. Feature table has42rem minimum and wraps in shared TableScroll; CSS values are source declarations, not measured viewport widths. Table text uses12px, normal cell padding12px, while global compact `.cat-table` uses5–8px. This difference may be appropriate for narrative/environment data; no global padding change is proposed without root visual evidence.
- Existing shared palette/result tokens are reused by report Status bars. AI has local teal/background/border literals and larger radii (chat16px, report preview8px, global buttons2px). This is a consistency maintenance concern, not sufficient evidence of a user-visible bug; consolidate only after identifying semantically matching surfaces.
- `TableScroll` has labelled region, focus ring, horizontal-overflow hint and sticky headings. `SelectionTable` preserves hidden selections and communicates hidden count; tests and consumers must validate whether parent scope changes clear selections. Admin/testing owners own those parent workflows; this reviewer did not infer their correctness from the shared control alone.
- Shared `useDialogFocus` excludes hidden/inert/closed-details controls, handles topmost modal, Tab/Escape, scroll lock and trigger restoration. Actual screen reader behavior, touch targets and dynamic combined overlays are pending browser evidence.
- Performance/layout shift/font loading/network timing not measured. CSS imports Google Inter; no claim about runtime font download, external content access or production latency. Reduced-motion CSS exists. App.navigate explicitly requests smooth scroll; actual reduced-motion behavior needs a browser check before calling a defect.

## Suggested repair order and test boundaries

| Order | Finding / files | Target and skills | Dependency / regression risk | Verification / done |
| --- | --- | --- | --- | --- |
| 1 |001; editor + navigation/project boundary | `frontend-patterns`, behavior TDD when later authorized, `security-review`: account/project-owned drafts and consistent exit policy | Decide buffer/guard behavior; risk stale data across account/project, avoid retaining sensitive data cross-account | Synthetic navigation/project scenarios, errors and account switch; root browser and isolated component tests |
| 2 |005; report create UI/API/service | `api-design`, `security-review`, behavior TDD: recover uncertain create | Requires additive persistence/contract if adopted; unique scoping/conflict semantics must not affect existing reports | Isolated lost-response test proves one row/one ID; no main writes |
| 3 |002/004; chat read state and scroll | `frontend-patterns`, `frontend-ui-engineering`: separate append/prepend/retry/denied | Must preserve current privacy/generation/pinned-source checks and no automatic provider sends | Long existing fixture, one-time GET failure/retry,403 denial; no live AI required |
| 4 |003; report summary view/catalog | `frontend-ui-engineering`, `api-design`: make selected scope explicit | Retain catalog/all-Feature ability and approved formulas; avoid unintentionally restricting existing AI rights | Two Features with distinct counts; dropdown/table/totals/Issue/proposal scope aligned or visibly distinguished |
| 5 | Shared focus/visual gaps | Root browser first; impeccable Operate + targeted UI guidance | Do not change global CSS from a single isolated visual complaint |320/390/768/1440, keyboard, short viewport,200% zoom; measure actual issue, group by root cause before proposing changes |

Root browser reproduction candidates:001 is safe with unsaved synthetic text and no POST.003 is safe with read-only Feature select.002 needs qualifying pre-existing long history.004/005 require isolated fixture/failure seam, not main environment manipulation. All live provider generation/probe/OAuth, main report writes and downloads beyond root's explicitly performed evidence remain NOT_RUN by this reviewer.
