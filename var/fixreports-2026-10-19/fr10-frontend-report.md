# FR-10 frontend handoff

Date2026-10-19; system-design. New frontend source only, no edits to old ReportsPage/AnalysisPage/router, backend/migration/native/browser/services or commits. Root owns wiring and runtime/security/persistence integration.

New files: `features/reports/ManagementAnalysisPage.jsx`, `SafeMarkdown.jsx`, `management-analysis.css`, corresponding tests, and `services/api/managementReports.js/.test.js` under Frontend/src/app.

## Behavior

- Export `ManagementAnalysisPage({project optional,api optional})`; project defaults to current ProjectProvider selection. PM of that project or global ADMIN may mount the data workspace. TESTER/DEV and global PM without project PM membership see denied before any management request. Archived projects remain readable; editor/AI writes are unavailable. Server401/403 subsequently hides previously loaded management data. Backend guards remain authoritative.
- Summary uses optional Feature (blank=whole project), five Status colors from global semantic tokens, tested/total, horizontal Feature progress, environment, Bug/QA status counts and Vietnam as-of time. P/NA count as tested, zero-case state is explicit. No cycle/build/retest gate or generic work-creation point.
- Saved report catalog is project-scoped and paginated. Open/edit/create uses server version; errors keep draft, success waits for server response. Unsaved content needs explicit discard confirmation before switching Feature/report/new. Saved Feature is preserved; changing scope starts a new buffer rather than rebinding an old report silently.
- AI preview copies current shared provider/model into one request key, uses35s client timeout, and reuses that body/key for GENERATING/uncertain retries. Definite failures release pending state. Output remains a separate unsaved proposal until “Đưa vào bản soạn”; no automatic overwrite or save of current user text. Provider configuration stays in chat. Save sends report title/markdown/optional Feature, never AI draftId; persisted reports must be independent of draft TTL on the server.
- Download reads only GET/{id}/download stored bytes, not a regenerated editor string. SafeMarkdown uses escaped React text for headings/lists/paragraphs/inline/fenced code; only absolute HTTP(S) links become anchors. HTML/script/data/javascript/relative URLs remain literal. No new package or raw HTML rendering.

API adapter follows root contract `/projects/{p}/management-reports`: summary, paginated list, get, POSTcreate, PUTversion update, download response, POSTpreview. Writes use existing session/CSRF and same abort signal. Explicit invalid Feature0 is retained for server rejection instead of silently broadening to project scope.

## Verification

Behavior RED:11/11 failed against compilable placeholders (missing denied view, metrics, editor/save/download/preview and safe Markdown). GREEN initial11 then final **24/24 PASS across3 test files**. Cases include role/no-fetch, Admin no membership, PM outside denied, P/NA60%, optional Feature, zero/empty/error/retry/pagination, version conflict,10→8 report text while displayed issue count stays10, server-byte download, preview GENERATING/timeout same-key, failure/no autosave, discarded-switch protection, project-race cancellation, archived read and server permission revocation. These are component/mock-API tests; the10→8 case does not prove backend business-table preservation.

Measured coverage3production files (`fr10-fe-coverage/coverage-summary.json`, HTML): total statements95.25%, branches86.29%, functions100%, lines99.02%. ManagementAnalysisPage94.11/83.98/100/98.48; SafeMarkdown98.24/96.66/100/100; API adapter100statements/functions/lines (see JSON for branch count).

Command: `rtk proxy npm run test:coverage -- src/app/features/reports/ManagementAnalysisPage.test.jsx src/app/features/reports/SafeMarkdown.test.jsx src/app/services/api/managementReports.test.js --coverage.include=src/app/features/reports/ManagementAnalysisPage.jsx --coverage.include=src/app/features/reports/SafeMarkdown.jsx --coverage.include=src/app/services/api/managementReports.js --coverage.reportsDirectory=../var/fixreports-2026-10-19/fr10-fe-coverage`.

Frontend build PASS with existing>500kB chunk warning; at this revision the new page is not yet wired into the app entry, so root must rebuild after routing it. Tests transformed/exercised the new files. Impeccable detector on all3UI files: `[]`. Owned tracked diff-check PASS (LF/CRLF notices only). No lint/JS typecheck configured. Native/backend/browser/UAT NOT_RUN by this agent.

## Skills/review and handoff

Read/apply `api-design` (resource/DTO/version/status/CSRF), `security-review` (role/scope/no-fetch, safe text, preserved invalid IDs), `tdd-workflow` (behavior RED→GREEN + measured coverage), `frontend-patterns` (composition, separate server/editor/proposal state, abort on project/scope change), `frontend-ui-engineering` (labels, pending/error/empty, responsive table/text/focus), `impeccable` Operate + craft-floor (incumbent controls/density and detector), concrete `ui-ux-pro-max` keyboard/touch/back/hierarchy references, `verification-loop` (tests/coverage/build/diff/limitations). No subagents invoked, as parent prohibited them.

Standards/spec self-review fixed two edge cases: known preview rejection must not trap the editor in pending state; server permission revocation must hide old content. Scope remains report text only; backend enforcement, report TTL isolation, concurrent persistence/download, real AI quality and business-table preservation require root native tests.

Root next: import this component through AnalysisPage/router and role-filter sidebar; retire external progress and hidden legacy report mount; verify full app build, integration/browser320/768/1440, keyboard, real role+Feature scope, saved report cleanup independence and10→8 stored-content/business-count test. Do not mark all FR10 DONE from mock frontend evidence.
