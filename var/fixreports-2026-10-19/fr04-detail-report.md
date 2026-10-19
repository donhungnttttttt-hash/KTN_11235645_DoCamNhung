# FR-04 FeatureIssueDetail — 19/10/2026

Owned files: `Frontend/src/app/features/work-items/FeatureIssueDetail.jsx`, its test, appended `.feature-issue-detail` CSS only; additive backend `canAssign` projection and corresponding prepared native assertions. Root owns FeatureIssuesPage/WorkBoard/CaseIssueAction/Form/API adapter. No Maven, service restart, DB write or commit in this frontend slice.

## Result and integration contract

Detail renders content and actions from server capabilities. `initialStatus` selects only an allowed target, including a new target requested while the same drawer stays open. Status save requires reason and current version. Edit retains draft and its base version after failure; explicit “Tải lại Issue” shows current content, keeps the draft and refreshes its base for deliberate comparison/resubmission. Tester own-monkey editing does not expose priority/assignment or fetch the member directory. PM/Admin assignment uses the real project member API and requires active+enabled projectRole DEV and systemRole DEV, matching the server guard; system role alone never implies project eligibility. Directory failure blocks save, preserves draft and has its own retry.

Monkey-only deletion requires confirmation, defaults focus to the keep action, preserves confirmation on error and calls `onDeleted(id)` **only after successful versioned API removal**. Existing no-argument parent handlers remain compatible. No case delete button is rendered even for an old inconsistent canDelete response. `onChanged(freshItem)` remains the success callback for save/status/comment refresh. Capability `canAssign` is additive and equals active-context && manager; backend still enforces assignment/priority independently.

History loads on demand and can retry without closing the drawer. Actor, fixed Vietnam time, event, reason/comment and changed content are plain React text; no raw HTML rendering. Comments retain the existing synchronous command lock, UUID replay key for unchanged body/version, optimistic append and conditional draft clearing. A newer note typed while a save is pending survives. POST comment response advances local version even if the following detail refresh fails. An earlier comments read merges append-only entries instead of erasing a newly saved note. Separate read errors/retries keep existing content and drafts.

Project/Issue scope changes reset editors/comments/history/delete confirmation/commands and abort the lifetime. Late reads or writes cannot replace the new scope or invoke its callbacks. Forms/controls are labelled, current write locks prevent duplicate commands, focus returns from edit/cancel/delete confirmation, long content wraps, and scoped CSS preserves existing board/form rules.

## RED → GREEN

Public seams are the agreed rendered React component and injected public API adapter, not component internals.

| Slice | Observed failure before source change | Result |
| --- | --- | --- |
| Transition | Missing status control | GREEN: initial requested allowed status, reason preserved on failure, current version payload |
| Edit/assignment | Missing edit action (2 tests) | GREEN: PM eligible-project-DEV/priority/version retry and Tester own-monkey no directory/triage controls |
| Delete | Missing monkey-delete action | GREEN: confirmation, failure retention, exact version and success callback; case button absent |
| History | Missing history action | GREEN: retry, actor/time/reason/status text, literal script-looking text |
| Scope/detail retry/version conflict | Old editor remained when opening another Issue; retry action absent (3 tests) | GREEN: clean new scope, detail retry and explicit fresh-content comparison preserving draft |
| Comment/read race | Old version after saved comment plus failed refresh; comments retry absent (2 tests) | GREEN: optimistic version/newer draft and separate comments retry |
| Append race | Late old comments read erased saved note | GREEN: append-only merge; late command after scope switch ignored |
| Same open drawer target | Requested resolved stayed progress | GREEN: consume changed target without resetting user choice on ordinary detail refresh |

Additional conformance regressions cover directory failure/retry and read-only capabilities. No failing behavior was claimed for tests which already passed.

Final command: `rtk proxy npm test -- --maxWorkers=2 src/app/features/work-items/FeatureIssueDetail.test.jsx src/app/features/work-items/FeatureIssueForm.test.jsx src/app/features/work-items/FeatureIssuesPage.test.jsx src/app/features/work-items/CaseIssueAction.test.jsx --coverage --coverage.include=src/app/features/work-items/FeatureIssueDetail.jsx --coverage.reportsDirectory=../var/fixreports-2026-10-19/issue-detail-coverage`.

**4 files / 21 tests PASS**, including17 detail tests. V8 measured detail-only statements **94.03%**, branches **78.37%**, functions **88.23%**, lines **94.68%**. Branch target80% is not achieved; the report does not hide it or pad tests to meet a number. Artifact `issue-detail-coverage/`. Browser and whole-frontend coverage remain separate root FR-12 work.

Final `rtk proxy npm run build`: **PASS**,1696 modules,455.15kB JS,01:43 checkpoint. Owned-file trailing-whitespace check PASS. Lint/typecheck NOT_CONFIGURED. Existing service/native6 results in fr04-backend-report.md predate additive canAssign; its new native assertions are **NOT_RUN after that addition** because root owns the Maven slot. Root should include NativeFeatureIssueIntegrationTest in the combined native confirmation.

## Skills → actual use → evidence

| Skill | Application | Evidence |
| --- | --- | --- |
| frontend-patterns | Controlled local drafts, effect cleanup/scope guards, immutable comment merge, capability-driven conditional controls, labelled forms/focus recovery | Role/failure/scope/late-response regressions above |
| tdd | Render/API-adapter vertical RED→GREEN slices; use real user actions and payloads | Explicit failure/result table,21 final PASS; no implementation-ref/state assertions |
| api-design | Preserve public update/status/delete/comment adapter signatures; additive canAssign only; use actual MemberInfo shape | Version/key/recipient payload assertions; root callback contract above |
| security-review | Server capability before member fetch, project eligibility matches backend, no role inference or HTML injection, monkey-only delete defense, abort stale scope | Tester/read-only/case-delete/literal text/late-response tests; backend remains authority |
| frontend-ui-engineering / impeccable | Refine existing product tokens and drawer flow, semantic native controls,44px inputs/buttons, focus to safe confirmation action and bounded wrapping/history | Scoped CSS and DOM/focus logic; visual browser check NOT_RUN |
| implement / coding-standards | Stay in assigned files and JavaScript stack; preserve parent callbacks and original comment guarantees | No new dependency, no board/form/shared-doc edits |
| code-review / code-simplification | Self-review uncovered comment-version/read races and previous-scope editor leakage; simplify append-only merge rather than introduce global store | Concrete RED cases above; this is not independent review |
| verification-loop | Scoped regression/coverage, final build, whitespace checkpoint, explicit environment limits | Commands/results and measured limits above |
