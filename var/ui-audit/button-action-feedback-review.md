# Action audit: work items, QA, overview/reports/inbox, auth, AI

Reviewed on 2026-10-11. Applied code-review-and-quality, frontend-patterns, tdd-workflow. Changes are local; no backend/schema change, database fixtures, commit or push.

## Confirmed and fixed

| Action | Reproduced defect | Repair |
| --- | --- | --- |
| Work item: Save information | Unchanged save caption and no local success response; errors could be above the long edit form | Pending caption, guarded submission, disabled pending inputs, success and error at save controls; retained conflict recovery |
| Save tracker reference / clarification | No pending/success feedback in the current form | Pending/success/error next to the action; request guard and pending input locks |
| Older comments / older history | At exactly 50 records, an empty next page left the same active button forever; clicks had no visible outcome | Track server page exhaustion, pending state and local errors; remove exhausted action and announce completion; avoid duplicate/stale paging |
| Evidence download | Slow request accepted repeated clicks without any response before download | Pending status, guarded duplicate download, browser-handoff confirmation; retained API failure retry |
| Kanban move menu | Initially enabled button used the current status; parent ignored same-status requests after closing menu | Explain selection requirement and enable only for a different status |
| Project overview Create | Failure loading permission metadata silently disabled Create while overview data remained visible | Display permission-load error and retry the permission provider; retain authorization enforcement |
| AI workspace / chat source Search | After failed source lookup, clicking Search with unchanged keyword did not re-run the React effect | Explicit search revision, retry same query, pending label, error reset on requested retry |

Self-review also caught a pending-paid-request regression when general metadata refresh was added as a source dependency. Removed that dependency and added a test that refreshing metadata preserves the exact paid request key.

## Active source inventory reviewed

- Router traced through `AppRouter.jsx`, `DashboardPage.jsx`, `WorkBoardPage.jsx`, `ProgressPage.jsx`, `AnalysisPage.jsx` to live modules (not standalone legacy demo screens).
- Work items: `ProjectData`, `WorkItemForm`, `WorkItemDetail` (edit, references, comments, history), `TransitionDialog`, `EvidencePanel`, `BoardPage`, `HomePage`, shared Button/Modal semantics. Server permission predicates preserved.
- QA: `QaForm`, `QaPanel`, `HandoffPanel`: explicit validation/error focus, accepted-write read recovery, guarded transitions and capability-specific actions, history loading and paging. No additional confirmed silent-action defect found.
- Overview/reporting: `ProjectOverview`, `TestingOverview`, `ReportsPage`: overview navigation, filters, refresh, export, pagers. Progress embeds `ProjectStatusReports`, owned by the admin audit agent.
- Inbox: `ActionInbox`: scoped refresh/loading/error, valid FILE vs ticket/retest navigation, paging. File detail owned by the execution/file-work audit agent.
- Authentication: `AuthBoundary`, `AuthProvider`, `AccountMenu`: login/retry/logout pending/error flows, busy/role/session guards; no guard removed.
- AI: `AiConnections`, `AiAssistantPage`, `AiChat`: source/model disabled explanations, authorize/retry/cancel/disconnect handlers, generation idempotency/pending inspection, draft edits/copy fallback, source search and history controls. No paid generation or external OAuth called during this audit.

## Evidence

- RED: `button-actions-red.log` (6 new failing regressions); `button-chat-red.log` (1); `button-evidence-red.log` (1); `button-board-red.log` (2). Failures correspond to the reported behavior, before the associated fixes.
- Self-review RED: `button-ai-review-red.log`, pending paid-request preservation.
- GREEN: `button-action-regression-final.log`: **239 tests, 19 files passed** across work-items, board, overview permissions, AI, QA, reports, auth and inbox.
- Scoped `git diff --check` passed (only existing Windows LF→CRLF advisory warnings).
- Coverage was not measured; test count is not a coverage percentage. This source/action regression pass is not a claim that every role and screen combination has been manually exercised.

Files edited: `WorkItemDetail.jsx/.test.jsx`, `EvidencePanel.jsx/.test.jsx`, `BoardPage.jsx`, `WorkBoardPage.test.jsx`, `ProjectOverview.jsx`, `ProjectOverview.permissions.test.jsx`, `AiAssistantPage.jsx/.test.jsx`, `AiChat.jsx/.test.jsx`. No shared CSS edits.
