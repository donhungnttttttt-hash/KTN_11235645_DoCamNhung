# Testing UI and progress — 19/10/2026

## Findings and changes

The current file view inherited a solid teal title, tiny toolbar controls and solid result fills from the older workbook stylesheet. Its result cell was centered, but a later rule made every button a left-aligned block with zero horizontal margins. This produced inconsistent alignment between Status, Issue and history in the supplied screenshots.

Implemented within the active testing route:

- File heading uses a white background, explicit back button, readable filename and more space between heading and controls.
- Desktop toolbar separates progress/assignment from filters/downloads/pagination; below 1280 px the same controls remain in a horizontally scrollable toolbar to preserve vertical space for the case grid.
- Status, Issue and history share a centered action stack. Result colors are taken from the existing five tokens, with a small color dot and a 9% tinted background rather than an opaque black block for Unexecuted. Status cycling, disabled explanations and saving stay unchanged.
- Feature/file lists use consistent heading, filter, cell and pagination spacing. Progress columns show shared horizontal bars.
- `CaseIssueAction` receives a component-scoped stylesheet for the portalled preview. Only padding, separators, sizing, text and control presentation changed; popup behavior did not change.
- Shared `TestProgress` uses real case counts: orange incomplete, green complete only when total is positive and all cases are tested; zero-case scopes display `Chưa có case`. The visual bar and ARIA range are bounded; visible counts remain inspectable.
- Progress now shows one decimal place where needed: 1/128 → 0.8%, 199/200 → 99.5%, 9999/10000 → 99.9%, and 29/100 → 29%. Only genuinely complete scopes show 100%. Root's Chrome review found the first integer-only display hid small progress, prompting this refinement. File progress no longer uses a potentially rounded `progressPercent` separate from the displayed counts. P and NA still count as tested according to the existing business rule.
- A review found floating-point rounding of 29/100 to 28%; the component now multiplies before division and has an explicit regression test.

## Ownership

Three active page components, their integration tests, `testing.css`, new shared TestProgress component/CSS/test, and a one-line CSS import in CaseIssueAction plus its new stylesheet. See `source-hashes.json` for all 12 paths.

No global or legacy workbook CSS, routes, backend, database, data records, existing status tokens, API contracts, user permissions, provider configuration or business actions were changed in this subtask. Root owns hiding unrelated route tabs and Admin navigation.

## Skill use and evidence

| Skill | Use | Evidence |
| --- | --- | --- |
| `systematic-debugging` | Trace inherited title/toolbar/result styling and mixed progress calculations | Full review of three pages, testing CSS, workbook CSS, ResultCycleButton and CaseIssueAction before edits |
| `frontend-ui-engineering` | Consistent spacing, calm hierarchy, aligned action controls, responsive layout and accessible progress | Scoped CSS and named progress bars; Chrome finish gate delegated to root |
| `test-driven-development` + `writing-good-tests` | Test progress semantics and page integration before implementation | Integration RED 3 expected failures / 8 passes; GREEN 19/19 across four files; component RED 8 → GREEN 8 and floating-point RED 1 → GREEN 9 |
| `verification-before-completion` | Fresh related regression, preserved action tests and explicit remaining visual checks | `regression.log`: 45/45 tests, 12 files, exit 0; child final component test 9/9; scoped diff check exit 0 |

## Test commands and limits

Integration RED/GREEN used the three page test files and then TestProgress. Related regression:

`vitest run src/app/features/testing src/app/features/work-items/CaseIssueAction.test.jsx src/app/components/TestProgress.test.jsx src/app/features/test-cases/ResultCycleButton.test.jsx --maxWorkers=1`

Result: **45 passed in 12 files**, 14.55 s; no warnings in captured output. Logs and command receipt are adjacent. Full frontend suite/build are coordinated by root. Coverage was not measured; passing counts do not establish coverage.

Follow-up after root's browser review: fractional progress RED 5 → GREEN **22/22 in four files**, including the component and all three page integrations. See `fractional-progress-red.log` and `fractional-progress-green.log`; updated source receipt is `source-hashes-fractional.json`. Only TestProgress and three related test files changed in this follow-up; the visual width retains the unrounded ratio.

Browser checks remain for root: document desktop/1280/mobile/short viewport; only grid vertical scroll in focused mode; toolbar horizontal access; center alignment in unusually tall rows; Status cycle and Issue hover/keyboard popup; orange/green/zero progress; Feature/file table whitespace; long Japanese filename wrapping.

This subtask used no browser, DB, provider, restart, commit, push or deploy tools. Product files were paused immediately during root's live AI test and resumed only after root notified.
