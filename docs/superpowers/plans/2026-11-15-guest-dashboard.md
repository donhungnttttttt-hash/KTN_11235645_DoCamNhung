# Guest Dashboard Implementation Plan

> **For agentic workers:** Use executing-plans task by task with a final independent review.

**Goal:** Deliver the approved customer dashboard with scoped facts, simulated costs, AI risk advice and published Markdown reports.
**Architecture:** Dedicated reporting projection; immutable daily headcount snapshots; deterministic health calculations; background AI advice and notifications separate from guest GET requests. React portal consumes only safe reporting APIs.
**Tech Stack:** React JavaScript, Spring Boot, MySQL/Flyway.
**Spec:** ../specs/2026-11-15-guest-dashboard-design.md

## Global Constraints
- USER=1, managers=5, GUEST=0; rate500 simulation units; sample productivity50 cases/USER/weekday.
- No real contracts/salaries, invented history or cross-project access.
- Preserve existing uncommitted work; no commit/push without task authorization.

## Review Focus
- Membership revocation and stale project responses must remove private data (tasks1/3).
- Zero workers/cases, weekends and missing historical snapshots must not produce false healthy/financial claims (task1).
- Repeated status changes do not inflate case completion (task1).
- AI outages and repeated risk refresh must not invent advice or spam notifications (task4).
- Markdown injection and published edits must not expose unapproved/executable content (task2).

### Task 1: Reporting data and simulation
Files: new GuestDashboardService, GuestDashboardMath, GuestDashboardController, V44 migration; modify GuestRequestAuthorization. Tests: GuestDashboardMathTest, GuestReportingNativeTest.
Interface: GET /projects/{id}/management-reports/dashboard returns project, metrics, features, people, history, simulation, health, advice, asOf.
- [x] Write/run failing tests for headcount4+manager1,2days=9000, zero data and authorization.
- [x] Implement safe queries, snapshot capture and deterministic risk calculation.
- [x] Run isolated native tests including revoked membership and actual workflow counts.

### Task 2: Markdown and publication
Files: SafeMarkdown, ManagementReportService/Controller, ManagementAnalysisPage, report API and tests.
Interface: explicit publish command by project manager; guest sees published snapshot only.
- [x] Write/run failing Markdown and draft-access tests.
- [x] Add safe Markdown rendering and publication workflow with optimistic concurrency.
- [x] Run frontend report and native reporting suites.

### Task 3: Customer portal
Files: GuestWorkspace, GuestDashboard and focused charts/styles/API/tests.
Interface: task1 projection; task2 read-only published reports.
- [x] Write/run failing navigation, zero-data and project-switch tests.
- [x] Implement six menu sections, numeric accessible charts, people and simulation assumptions.
- [x] Run frontend tests/build.
- [ ] Browser responsive acceptance: Chrome native connection unavailable; automated UI and live HTTP checks passed.

### Task 4: AI advice and notifications
Files: dashboard risk monitor/advice service, project notifications, existing manager bell, AI report generator and tests.
Interface: scheduled capture and per-risk dedup, safe published AI advice projection.
- [x] Write/run failing risk dedup/outage tests.
- [x] Implement provider-grounded suggestions, manager notifications and comprehensive report context.
- [x] Run native and frontend integration tests.

### Task 5: Acceptance
- [x] Independent code review, fix material findings with regression tests.
- [x] Verify migration fresh/upgrade, build, native/frontend suites; record coverage limitations.
- [x] Update STATUS/review evidence and local runtime after backup, retaining all existing data.

Evidence: ../../reviews/2026-11-15-guest-dashboard-acceptance.md. Implementation complete; visual acceptance remains explicitly unverified.
