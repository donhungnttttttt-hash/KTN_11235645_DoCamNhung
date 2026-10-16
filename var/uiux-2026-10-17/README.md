# UI/UX evidence — 17/10/2026 Asia/Saigon

Authoritative handoff: [dated report](../../docs/reviews/2026-10-17-uiux-refinement.md), [plan](../../tasks/plan.md), [checklist](../../tasks/todo.md). JSON timestamps are UTC; date16/10T17:xxZ is17/10 local. This folder is new evidence, not permission to execute historical `var` scripts.

## Evidence index

- `baseline.json` / `baseline.patch`: original dirty tree and tracked-file hashes; not a clean HEAD baseline.
- `runtime-before.json`: current8080/5173 unavailable; no backend started.
- `shared-red.log`, `shared-green.log`, `shared-green-final.log`, `selection-error-red.log`: real shared RED/GREEN including an intermediate heading regression and final empty-source RED.
- `admin-source.md`, `testing-source.md`: owner source surveys, exact RED/GREEN records, untouched candidates and limits.
- `independent-review.md`: bounded Spec + Standards and final empty-source review.
- `frontend-final-coverage.log`, `coverage-summary.json`: fresh884/82files and V8 coverage. Targeted owner totals overlap; do not add them together.
- `frontend-final-build.log`: fresh Vite build,674.42KB bundle advisory.
- `before-1440.jpg` / `after-1440.jpg`: primary comparable shared-component view; same synthetic state/viewport/scoped CSS.
- `before-375.jpg` / `after-375.jpg`: responsive view with different vertical scroll offsets; not pixel-identical comparison. `after-768.jpg`: after only.
- `retest-read-error.jpg`, `member-feedback.jpg`: mocked role/state evidence, not backend identity/authorization proof.
- `browser-after.json`:15 state/geometry/contrast records; historic bootstrap/HMR console entries retained. `focus-before.json`: original disclosure focus behavior.
- `browser-before.json`: **diagnostic incomplete fixture styling**, not production contrast baseline. Reports scoped CSS made the apparent KPI problem a false positive; global.css reverted and unchanged.
- `browser-final-console.json`: full historical issues retained; no new warn/error in final reload observation window. Never interpret this as zero historical errors or full app console certification.
- `contracts-final.log`, `diff-check-final.log`, `branch-final.txt`, `head-final.txt`, `verification-summary.json`: final structural/source preservation checks. `Record-Final.cjs` only reads files and writes summary; no API/DB/remote operation.

## Reproduce frontend verification

From canonical `Frontend` with already-installed dependencies:

```powershell
rtk proxy npm run test:coverage -- --maxWorkers=2
rtk proxy npm run build
```

No backend/native suite needed for these UI-only changes. Backend/native, real role-data app browser tests, zoom200%, touch/Safari/AT/UAT remain open. Lint/typecheck scripts are not configured. No dependency installation, backend restart, database seed or main-schema mutation is authorized by this fixture.

## Optional isolated component preview

The preview is a test tool, not a shipped screen. It imports production React components/styles and synthetic in-memory data, blocks `/api` and `/actuator`, and listens on loopback4173 only. Root stopped the owned preview after this check. Starting it later is a new local test action, not permission to start/restart the backend or replace the existing app.

From `Frontend`:

```powershell
rtk proxy node ../var/uiux-2026-10-17/Start-Preview.mjs
```

Open the exact URL printed by the process. `?surface=selection` tests shared picker/modal; `?surface=members` uses fake ADMIN API; `?surface=read-state` uses fake PM retest read with deferred retry. The explicit “Hoàn tất phản hồi mô phỏng” button resolves the fake read. No real login, requests, roles or DB writes. Controls/render of the fixture wrapper are not product changes. Stop only this process with Ctrl+C after testing.

Initial fixture required correct Frontend cwd/Tailwind, React-refresh preamble and HMR root reuse. Those harness issues were fixed; they are recorded, not attributed as product defects. Chrome viewport override was reset. Screenshots are actual Chrome captures, no image generation/editing.
