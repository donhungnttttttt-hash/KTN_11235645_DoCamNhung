# Independent UI/UX review — 17/10/2026

**Result: no confirmed critical, P1 or P2 finding in the bounded new change set.** Spec and Standards reviewed separately below. This is a source/evidence review; this reviewer did not edit production/CSS/tests, run tests, operate the browser, start a service or access the database.

## Review boundary and baseline

Read the user's pasted request at `C:/Users/admin/.codex/attachments/1c38374f-b206-4a78-8d2a-6b0a43f9845d/Pasted text.txt`, current `tasks/plan.md` UI-R1–R5, `tasks/todo.md` and `docs/reviews/2026-10-17-uiux-refinement.md`. Existing AGENTS/RTK/current permissions/development-skills rules remain applicable. Used the already-read Matt Pocock code-review Spec/Standards distinction and frontend-patterns for controlled state/async/focus checks; no duplicate discovery, tracker setup, subagent spawn or verification workflow.

HEAD is `c42e3f0`, but the real UI/UX baseline is the preserved dirty audit tree in `var/uiux-2026-10-17/baseline.patch` / `baseline.json`. Reviewed only new UI changes. Earlier member-role-draft cleanup and document/work-item/Unicode repairs are protected P0 baseline, not UI/UX changes attributed to this task. Admin diff assessment excludes the prior successful-removal cleanup and checks its preservation.

Fully read current bounded components/hooks and relevant new tests:

- `Frontend/src/app/components/SelectionTable.jsx` and `selection-table.css`, `selection-ux.test.jsx`.
- `Frontend/src/app/hooks/useDialogFocus.js`, `useDialogFocus.test.jsx`; existing heading/alert-focus regression context at `Frontend/src/app/features/admin/button-recheck.test.jsx:23`.
- `Frontend/src/app/features/test-execution/ScopeSetup.jsx`, `read-state.test.jsx`; `Frontend/src/app/features/retest/CoverageEditor.jsx`.
- `Frontend/src/app/features/admin/AdminProjectDetail.jsx`, `AdminProjectForm.jsx` MemberPicker portion, `admin-member-feedback.test.jsx`.
- Inspected the three proposed global KPI color changes and final diff confirming they were reverted. `global.css` has no new UI/UX diff at review completion.

## Spec review

**No confirmed critical/P1/P2.**

| Acceptance | Source assessment | Evidence / limit |
| --- | --- | --- |
| UI-R1: clarify selection/filter scope without losing off-page choices | `SelectionTable.jsx:14` derives hidden-selected count from the global selected set versus visible rows. Local clear resets only query/view and returns focus to search/view; its button is `type=button`. Existing select-all still changes only visible eligible IDs. Page-scope selected/unselected labels and empty guidance distinguish a filtered page from the whole collection. | Real component new tests cover off-page selection retained, clear/no parent submit and reset focus. Existing algorithm/API payload unchanged. Reviewed `before-1440.jpg` / `after-1440.jpg`: same fixture viewport/table state, added offscreen summary visible. These images do not prove integrated app behavior. |
| UI-R1: usable modal keyboard traversal | `useDialogFocus.js:20` excludes disabled, hidden/inert/aria-hidden, CSS-hidden and closed-details content while retaining the first visible summary. Sequential stops require nonnegative tabindex; explicit available initial-focus targets may have tabindex=-1 (`:34`), preserving Admin heading focus. Existing busy Escape, return focus, nonmodal/nested modal and programmatic feedback traversal remain. | New tests exercise disclosure and hidden/disabled/inert fallback. `shared-green.log` correctly records an intermediate existing heading regression; final available(initial) repair preserves the existing `button-recheck.test.jsx:23` assertion. `shared-green-final.log` records49/49 across7files. Reviewer did not rerun. |
| UI-R2: read failure ends busy state, preserves selection/draft and exposes retry | `ScopeSetup.jsx:55` and `CoverageEditor.jsx:17` pass busy only while data absent and no read error; retry clears error first and restores busy until result. Failure-specific empty copy replaces the false loading text. No mutation/capability/version changes. | `read-state.test.jsx` follows real UI through selected/config/assignee/reason → deferred failed fetch → aria-busy=false/alert → retry → restored checked rows. Owner report records RED2 then GREEN79/5files; no independent test run here. |
| UI-R3: await successful role/remove operation before announcing; keep audit drafts | `AdminProjectDetail.jsx:39` awaits removal, preserves existing cleanup of only that user's role draft, then sets notice. Role-save likewise awaits API before clearing its own draft/notifying (`:46`). Existing focus effect runs after readback state settles (`:24`); failure still only reports error and preserves drafts. | Deferred success and failure branches in admin-member-feedback tests check status/focus and draft retention; owner evidence records31/31 across5files. No payload, backend authorization or partial-add behavior change. |
| UI-R3: MemberPicker context and correct removal names | `AdminProjectForm.jsx:19` gives page/total based on server total and unchanged20-row request. `:20` names each removal with the person; existing ID-based filtering preserves other page selections. Buttons remain explicit type=button. | Two-page test retains Beta after removing Alpha from the previous page, with correct checked state and endpoint paging. |
| UI-R4: contrast review reflects actual styles, avoid false repair | Root reverted the proposed global KPI palette after finding the Reports scoped CSS overrides it. Final `git diff c42e3f0 -- .../global.css` is empty. Current report/plan classify KPI as audit-only and explicitly reject the initial incomplete-fixture false positive. | Viewed the1440before/after screenshots: pale scoped Reports palette, not the vivid colors in initial diagnostic `browser-before.json`. That JSON is not valid production contrast baseline. No claim of3color repairs, full WCAG conformance or final computed contrast verification is made by this reviewer. |
| UI-R5: honest browser/runtime boundary and P0 regression preservation | Review/report stub distinguishes synthetic component fixture4173 with API blocked from unavailable integrated8080/5173. New changes stay within UI components/hooks and retain existing business handlers/payloads. | Root owns completion of viewport/zoom/browser/coverage/build artifacts. This review does not certify their unfinished checks or S11/UAT. |

## Standards review

**No confirmed critical/P1/P2.** Changes use the current React JavaScript/native controls and small local state derivations. No dependency/framework, API/backend/schema, brand, navigation or business-state change is introduced. Semantics added are contextual labels, polite selection announcements, reset-button type, current control availability and truthful read states. New tests exercise actual components with API-boundary doubles; they do not merely assert source text or a mocked visual.

Existing local primitives/inline JSX are not grounds for broad refactor. The small hidden-selection scan and focus availability traversal do not constitute a demonstrated performance regression; no speculative optimization is requested. Code follows the repository's scope and evidence constraints. P0 member draft cleanup remains after successful removal; no recovery/idempotency/role guard is weakened by the reviewed edits.

## Verification and remaining limits

Read owner RED/GREEN summaries, intermediate `shared-green.log`, final `shared-green-final.log`, `admin-source.md`, `testing-source.md`, report stub, initial fixture metadata and the1440before/after screenshots. Reviewer's evidence is read-only source/log/image inspection. The review was not a fresh test/build/coverage run, accessibility scan, screen-reader test, responsive/touch acceptance, whole-app contrast measurement or integration/UAT pass.

Root should finish and report only the browser viewports/states and final suites actually run. Keep S11 IN_REVIEW and retain existing live/native/role-data/device gates. No actionable finding from this bounded review requires an additional implementation or broad test cycle.

## Final empty-source boundary

Reviewed only the final `SelectionTable.jsx:30` condition, new `selection-ux.test.jsx:31` case and `selection-error-red.log`. No new actionable Spec/Standards finding. `loading` still has first precedence; a local no-match explanation is now used only when actual source rows exist (`filtered && rows.length > 0`). With `rows=[]`, the caller's failure/not-loaded/empty message is preserved even if the user has kept a local selected filter. Existing selection IDs, hidden count, controls, reset and callbacks are untouched; nonempty source rows filtered to zero still show the scoped filter-recovery explanation.

The new real-component test opens the selected view with no source rows and asserts the caller's failed-read text. Root's saved RED shows exactly that text missing,1FAIL/2PASS before the one-line fix. Root is running final frontend/coverage verification; this reviewer did not rerun tests, operate browser or assert a final GREEN result from the earlier49-test log.
