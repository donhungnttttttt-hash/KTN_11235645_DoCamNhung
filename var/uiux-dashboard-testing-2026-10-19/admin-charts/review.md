# Admin overview charts — 2026-10-19

## Scope and skills

- `frontend-ui-engineering`: factual overall chart followed by two-column project cards; one column below 1100px, wrapping at mobile widths, consistent semantic tokens, visible counts independent of chart colors, native links, labeled loading/error/retry/empty states. User screenshots supplied the layout reference. Existing dashboard sections preserved.
- `test-driven-development` and `writing-good-tests`: nine behavior tests ran RED before implementation because the health-chart regions/requests were absent. Then implemented rendering, API pagination, retry, stale-scope protection, and zero/archive states.
- `verification-before-completion`: receipts below; no coverage claim or real-browser claim from the component tests.

## Data contract checked against backend source

- `AdminOverviewService.overview` has full-scope metrics but limits `byProject` to ten projects.
- `AdminOverviewService.projects` permits `size <= 100`, returns `items/page/size/totalElements`, plus current case metrics, open bugs, awaiting verification, overdue milestones, insufficient deadline data, and archive timestamp.
- If the overview contains the complete scope, charts reuse those rows. Otherwise they read the existing project API page by page (100 per page) with the selected project filter and AbortSignal.
- No partial success when a page fails or changes its total/count/identity. Retry reloads the full chart data. Late responses cannot overwrite a new selected scope.
- The overall chart uses server aggregate counts; it does not average percentages or sum only the ten preview projects. Existing P/NA/zero-case semantics are retained.
- These are factual indicators, not an invented health grade. A zero-case project is explicitly described as lacking cases; archived projects remain labeled as archived.

## Owned source files

- Modified: `Frontend/src/app/features/admin/AdminDashboard.jsx` (new import and appended component only).
- Added: `Frontend/src/app/features/admin/AdminHealthCharts.jsx`.
- Added: `Frontend/src/app/features/admin/admin-health-charts.css` (self-imported by component).
- Added: `Frontend/src/app/features/admin/AdminHealthCharts.test.jsx`.
- No backend, shared CSS/components, dependency, database, runtime or configuration changes.

## Verification receipts

- `red.json` / `red.log`: expected RED — 9 of 9 new tests failed due missing chart feature.
- `green.json` / `green.log`: 14/15 passed; existing global text query found duplicate KPI/chart captions. Clarified chart copy to “Đã test N/M case”; no existing assertion weakened or changed.
- `green-final.json` / `green-final.log`: 15/15 passed (9 new chart tests + 6 existing dashboard tests).
- `admin-regression.json` / `admin-regression.log`: 185/185 tests across 25 Admin test files passed, exit 0, 56.09 seconds. No warnings in captured output.
- `final-accessibility.json` / `final-accessibility.log`: 15/15 relevant tests passed after the last semantic `role="group"` addition to chart text legends.
- `git diff --check` on owned files passed.
- Full frontend suite/build and real-browser viewport/keyboard inspection are delegated to root; not claimed here. Coverage not measured.

No API/provider calls or business writes were made. No commits/pushes/restarts.

## Final source review

- Independent chart read has a stable `useCallback` dependency on the returned overview object, API, and selected project. `useAdminRead` cleans up and aborts old reads; its live guard rejects late responses after scope/retry changes. Pagination checks the abort signal before each next page.
- Overview loading/error behavior remains owned by `AdminDashboard`. Project-chart errors do not replace the valid overall chart; partial project rows are not published.
- Top-level dashboard reload causes a new overview/child read. Selected-project links preserve the scope query parameter.
- Responsive CSS uses `minmax(0, 1fr)`, breakable project titles, wrapping captions, and a single project column below 1100px. Numeric details do not depend on color; the visual stack is redundant and hidden from screen readers. Real responsive rendering remains root's verification gate.
