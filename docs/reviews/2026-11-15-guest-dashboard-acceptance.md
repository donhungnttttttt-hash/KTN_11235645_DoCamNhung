# Guest dashboard — implementation and verification

## Scope delivered

Customer portal with six sections: overview, progress/quality, **Đánh Giá Chi Phí**, personnel, health/AI and published reports. Removed the “Minh bạch từ dữ liệu” sidebar card per the latest user correction. Charts have numeric alternatives, empty/loading/error states and project-scoped data. No contract, salary or personal contact fields are exposed.

Cost assessment uses the approved sample: USER = 1, active project manager = 5, GUEST = 0; 500 simulation units per weighted person-day and 50 cases per USER per weekday. These are visible assumptions, not international benchmarks or actual payroll. Daily workforce snapshots retain prior staffing. No historical staffing or past execution series is fabricated. Insufficient or changed baseline produces an insufficient-data state.

The monitor records factual risks and asks the system AI for bounded recommendations. New, worsening and reopened risks notify project managers in-app without duplicate notifications for repeated polling. AI input changes invalidate previous advice. Provider failure leaves factual warnings available without invented AI text. Reports support safe Markdown and explicit manager publication; later edits remain private until republished.

## Independent review and corrections

The final independent review found no critical issues and three important issues, all corrected with regression tests:

1. Reference-style Markdown images could bypass inline-image handling. Inline, reference, collapsed and shortcut images now render as text; defensive image rendering also returns no image.
2. Scope replacement, missing previous working-day snapshots and zero workers could produce misleading progress health. Ordered case-scope fingerprints, baseline freshness and worker guards now invalidate comparisons.
3. AI advice could remain visible after staff/cost facts changed without changing the short risk message. Stable fact fingerprints now guard persistence, completion and both server/client visibility.

Hidden open Tickets intentionally retain their obligations, matching the previously approved recovery policy. The dashboard explicitly counts hidden obligations; it does not silently exclude them.

Live API acceptance additionally reproduced a missing security route for project-health notifications (HTTP 403). A native HTTP regression covers manager reads, recipient-only acknowledgement and Guest denial. The route is declared after the Guest reporting restriction.

## Verification

- Full frontend suite: 154 files, 1,406 tests passed. Production build passed; existing large-bundle warning remains.
- Native backend tests use an owned isolated MySQL schema; no fixture writes run against the working database.
- V44 fresh installation and V43 → V44 upgrade passed, including retention/publication of an existing report with a 255-character title and repeated migration being a no-op.
- Production npm dependency audit: zero vulnerabilities. Development dependency findings were not part of this task.
- Java diagnostics: 405 sources, zero errors; seven existing warnings in SystemAdminStartupTest. No new dashboard diagnostic warnings were reported.
- No new coverage percentage was measured or inferred from test counts.
- Chrome visual/responsive acceptance remains unavailable: the native Chrome connection could not be established. Automated UI tests and live HTTP checks do not constitute visual acceptance.

## Runtime and remaining acceptance

The local database was backed up before applying V44. Compared with V43, account/project/membership/Feature/import/case/revision/assignment counts, status distribution and revision/cell/history fingerprints remain unchanged. Runtime evidence and artifact receipts are retained under ignored `var/guest-dashboard-release` and `var/guest-dashboard-final` directories.

Final native regression and live HTTP receipt are recorded in STATUS.json after the notification-route correction. Manual browser acceptance is the remaining verification item. No commit or push was requested for this dashboard task.
