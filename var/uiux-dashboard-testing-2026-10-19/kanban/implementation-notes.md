# Kanban visual restoration — 19/10/2026

## Scope and reference

User requested the original Kanban layout and improved whitespace. Compared the first work-item implementation in commit `bd7e482` (`BoardPage.jsx` and `work-items.css`) with the current Feature issue board introduced in `953c588`.

Original: white columns approximately 326 px wide, 20 px gutters, small status dots and counts, distinct card bodies, vertical space preserved by the board container. Current Feature board before this change: 260 px columns without a stable body height; when empty only the headers remained, matching the supplied screenshot.

Restored the original visual structure in the current Feature workflow, using 320 px columns, 20 px gutters, restrained borders, status dots/counts, stable board height, independent vertical card scrolling, and horizontal board scrolling. Cards separate type/key, title, Feature, assignee, and the existing transition selector. The toolbar has clearer spacing and an explicit selected view. Mobile columns fit the available viewport and controls wrap.

No restoration of retired workflow routes, demo issues, legacy create-work-item controls, or direct status writes. Existing status definitions, server permissions, API requests, pagination, filter URLs and drag-to-confirm behavior remain in use.

## Files owned

- `Frontend/src/app/features/work-items/FeatureIssuesPage.jsx`
- `Frontend/src/app/features/work-items/FeatureIssuesPage.test.jsx`
- `Frontend/src/app/features/work-items/FeatureIssueBoard.jsx` (new)
- `Frontend/src/app/features/work-items/feature-kanban.css` (new)

The shared issue stylesheet, global styles, route tabs, admin/testing/reporting features, backend, database, preexisting dirty changes and planning documents were not edited by this subtask.

## Skills → use → evidence

| Skill read | Application | Evidence |
| --- | --- | --- |
| `systematic-debugging` | Compare screenshot symptom with current markup/CSS and original Git implementation | Missing column-body height identified before editing; historical comparison above |
| `frontend-ui-engineering` | Reference-led restoration, scoped CSS, semantic regions, keyboard scroll target, responsive spacing and reduced-motion handling | New board/component stylesheet; browser finish gate delegated to root |
| `test-driven-development` + `writing-good-tests` | Behavior-first checks for keyboard discoverability, empty/grouped columns, permitted transition navigation and rejected transition feedback | `red.log`: 4 failed / 6 passed, expected missing named regions; `green.log`: 10 passed |
| `verification-before-completion` | Run actual focused and related regression tests; keep browser limits explicit | `regression.log` + `regression-result.json`: 86 passed / 12 files, exit 0; scoped `git diff --check`: exit 0 |

## Verification

- RED: `vitest run src/app/features/work-items/FeatureIssuesPage.test.jsx --maxWorkers=1` → 4 expected failures and 6 passes.
- GREEN: same command → 10/10 PASS.
- Related regression: `vitest run src/app/features/work-items --maxWorkers=1` → 86/86 PASS, 12 files, 21.91 s. No warnings in output.
- Source receipt: `source-hashes.json`.
- Coverage not measured. Test count does not imply coverage.
- Full frontend suite, production build and Chrome finish gate are coordinated by root, not claimed by this subtask.

## Remaining browser checks

- Empty board: stable white columns, 10 visible/reachable headers, horizontal scrollbar usable.
- Populated board: card spacing, long Vietnamese/Japanese strings, multiple cards in one column, independent vertical scroll.
- 320/768/1024/1440 px: no page-width overflow; filter controls usable; only the board scrolls horizontally.
- Keyboard Tab reaches the board; arrow keys scroll horizontally; card title/key and transition selector reachable.
- Valid drag or selector opens existing confirmation; denied drops show feedback and never mutate data.
- Loading/error states remain distinct from empty columns.

No browser, database, provider, restart, commit, push or deployment action was performed by this subtask.
