# Independent action recheck — 2026-10-11

Scope: live work-items / Kanban, QA / handoff, overview / reports / inbox, auth, AI and the shared work-item modal. Product code was reviewed read-only first. Confirmed defects were reported to the parent agent before implementation. Parent then authorized the four bounded fixes below. Skills read: `code-review-and-quality`, `frontend-patterns`, `tdd-workflow`, and explicitly `ponytail-review` for the separate complexity-only pass.

## Confirmed findings and disposition

| ID | Severity | Trigger and actual problem | Final repair / proof |
| --- | --- | --- | --- |
| A1 | P2 | AI source lookup fails; clicking its visible “Tải lại danh sách” fetched metadata/history instead of retrying `targets`. The error disappeared but the chooser stayed empty and Phân tích stayed disabled. | Source errors now have their own local recovery action calling the source request. Existing generation request keys/pending state are unchanged. RED then GREEN: `retries the failed source request from the error recovery button`. |
| A2 | P2 | Click “Tải lại chi tiết” on an already loaded ticket; while GET is pending the button stayed active/unchanged and the old content had no pending indication. | Button becomes disabled “Đang tải chi tiết…” while existing data stays visible. RED then GREEN: `shows manual detail refresh progress while retaining the loaded ticket`. |
| A3 | P2 | Post a comment; no pending caption/success feedback by the comment form, and a failed write only appeared at the top of a long detail. | Local pending/success/error, focus the error beside preserved draft, lock duplicate submission, retain exact request key on retry. RED then GREEN pending regression plus focused-error/key-retry regression. |
| A4 | P3 | Transition is saving; the X stayed enabled but invoked an intentional empty function, so it appeared broken. | Optional shared `Modal busy` prop disables X and guards Escape/backdrop via the existing focus hook. `TransitionDialog` passes busy instead of a no-op close callback. Pending-close regression proves failure re-enables close. |

Product files changed in this recheck: `AiAssistantPage.jsx`, `WorkItemDetail.jsx`, `TransitionDialog.jsx`, `work-items/components.jsx` (Modal block only). Test files: `AiAssistantPage.test.jsx`, `WorkItemDetail.test.jsx`, `workItems.test.jsx`.

## Module evidence matrix

“No new confirmed defect” means this review did not establish another defect, not a claim every runtime combination is correct.

| Live module / action family | Source and control path inspected | Feedback / disabled / retry / keyboard evidence | Recheck result |
| --- | --- | --- | --- |
| Work board list | `WorkBoardPage`: create, filters, advanced/reset, select all, batch, row open, paging, reload, list/Kanban switch | `WorkBoardPage.test`: real numeric navigation, filters/paging, failed move no success, batch callback only on accepted write, loading/retry; controls use shared Button default type=button. | No new confirmed defect. |
| Kanban | `BoardPage`: open card/menu, collapse/expand, move/drop and same-status gate | `qa-dashboard.test`: Enter activation, QA excluded from generic moves, authority loss removes menu, unknown/terminal guards; prior same-status regression still passes. | No new confirmed defect; terminal moves deliberately remain detail-only, no permission rule removed. |
| New work item | `NewWorkItemForm`: create, choose type, source/case retries, case pages; `WorkSelect` | `workItems.test`: native required controls, retained draft/idempotency, source retry, case pagination, type switch to separate QA form (no nested form submit). | No new confirmed defect. |
| Ticket detail | `WorkItemDetail`: refresh, transitions, edit, references, comment, older pages | Prior save and exhausted-page regressions retained; new slow refresh, pending comment, failed comment focus/retry tests. | A2 and A3 fixed. |
| Transition modal | `TransitionDialog`, shared `Modal`, `Button` / `IconButton` | Required reason/build, 409 explicit reload, failed batch, pending close/Escape and restored X after failure. `Button` defaults to button; explicit submit callers override it. | A4 fixed. |
| Evidence | `EvidencePanel`: upload, remove, download, read retry | `EvidencePanel.test`: failed upload preserves file, oversize rejection, removal failure, permission handling, download pending/duplicate guard/browser handoff. | No new confirmed defect in this pass. |
| QA create | `QaForm`, `QaErrorSummary`, `QaField` | `qa.test`, `qa-glue.test`: validation focuses summary/fields, strict grant, pinned source, stale scope, accepted POST read recovery without duplicate POST, permission downgrade. | No new confirmed defect. |
| QA lifecycle | `QaPanel`: assign/start/request-info/provide-info/answer/confirm/close/exception/reopen; draft discard/current-data acknowledgment; history paging | `qa.test`: per-capability command guards, effective Dev candidates, version/generation pin, exact-key retry, 409 reload requirement, current-detail notification, old scope ignored. Buttons default type=button inside explicit submit form. | No new confirmed defect. |
| BUG handoff | `HandoffPanel`: filters, previous/next/reload, detail link | `qa-dashboard.test`: typed queue states/counts, forbidden/error retry, paging/scope; native anchor preserves modifier/new-tab behavior. Loading replaces stale control region. | No new confirmed defect. |
| Overview | `ProjectOverview`, `HomePage`: create, permission retry, detail/status/milestone navigation, more recent work | `ProjectOverview.permissions.test`, `HomePage.test`, overview tests: real targets and permission-load recovery; prior permission error fix retained. | No new confirmed defect. |
| Reports / progress / analysis | `ReportsPage` via `TestingOverview`, `ProgressPage`, `AnalysisPage`: filter pages, refresh, export, source/bug links | `reports.test`: API read retry, exact export filters, failed export retry, page ranges, missing project, old project response/download ignored. Embedded project status report owned by the admin audit. | No new confirmed defect. |
| Action inbox | `ActionInbox`: type filter, refresh, item navigation, paging | `ActionInbox.test`: retained focus on same-scope refresh, revoked/changed scope clears rows, retest parent bug navigation, last-page recovery, error retry. | No new confirmed defect. |
| Authentication | `AuthBoundary`, `AuthProvider`, `AccountMenu`: login, password visibility, session retry, logout | `auth.test`: busy login, rejected login/draft handling, retry, logout error and recovery, hidden/inert expired app, Escape isolation. No credential or role gate changed. | No new confirmed defect. |
| AI provider connections | `AiConnections`: source/model selection, refresh, connect/reconnect, permission grant, probe, disconnect, change account, cancellation | `AiConnections.test`: blocked-popup fallback validation, exact model/readiness gate, probe key retry, busy connection state, server error, account-switch late response. API mocks only. | No new confirmed defect. |
| AI analysis workspace | `AiAssistantPage`: targets/search, generate/check request, draft open/edit/copy, histories, refresh | `AiAssistantPage.test`: A1 recovery plus unchanged-query search, exact paid retry key, metadata refresh preserves pending key, preserved edit conflict, role/target gates. | A1 fixed. |
| AI chat | `AiChat`: new/history/settings, scope/source search, send/Enter, inspect pending, copy, minimize and paging | `AiChat.test`: same-query retry, Enter vs Shift+Enter/composition, preserved draft, minimized/reopened scope checks, stale read/owner denial, exact pending key, provider readiness. | No new confirmed defect. |

## Verification

Custom-control context check: `work-items/components.jsx` exports `Button` and `IconButton`, each rendering a native `<button type="button" {...props}>`; only explicit `type="submit"` callers submit their surrounding form. Inspected their usages inside new work-item, edit/reference/comment, transition, QA create/command forms and outside forms in board, handoff and evidence. Click handlers or explicit form submit handlers are present; icon buttons preserve accessible names. The parent's extended declaration inventory includes these wrappers, not just raw `<button>` tags. No confirmed unwired wrapper or accidental implicit submit remains in this scoped review.

- `button-recheck-actions-red.log`: **3 failed / 25 passed** before fixes (AI recovery, manual detail refresh, pending comment).
- `button-recheck-comment-close-red.log`: adds focus/key-retry and explicit disabled-close regressions; failed before fixes. Error-focus selector was subsequently narrowed to the comment’s own alert because unrelated nested panels can render their own alerts.
- Final `button-recheck-actions-green.log`: **244 tests / 19 files passed** across all module groups above (including five newly added regression cases). This is a fresh run, not the earlier 822-test baseline.
- Scoped `git diff --check`: PASS (Windows LF→CRLF advisories only).
- No coverage measurement in this recheck. No paid AI call, live OAuth, external write, production database fixture, commit or push.
- Browser-wide role combinations are not asserted by these unit/component tests; parent owns the UI smoke pass and final full build/test run.
- At freeze, no confirmed actionable defect from this scoped review remains open. This statement excludes paid/live AI, live OAuth and external tracker behavior; Redmine has a separate parent-owned review and test result.

## Complexity-only review (ponytail-review; not applied)

`Frontend/src/app/modules/ProjectOverview.jsx:L16: delete: notice/setNotice state, notify prop, and unreachable notice paragraph; HomePage never invokes notify. Remove this dead feedback branch and HomePage's unused notify argument.`

`net: -1 lines possible.`

The reduction above counts the removed standalone notice-render line; other removals are inline fragments. No correctness/permission/idempotency guards are proposed for deletion. Legacy standalone prototype branches in BoardPage were noted, but are not removal findings without a separate decision about retained prototype compatibility.
