# Second button review — admin, project, memberships, devices, catalogs

Date: 2026-10-11. Reviewed current source and behavioral tests independently of the earlier pass counts. Initial work was read-only except failing tests; root subsequently authorized the three confirmed corrections. Production source is frozen after the focused fixes below. Existing unrelated dirty changes were preserved.

## Required findings and resolutions

1. **Stale project creation redirects the user after leaving the screen.** `Frontend/src/app/features/admin/AdminProjects.jsx:14` previously invoked a global hash change without checking whether the page still existed. Reproduction: submit project creation with a delayed response, navigate to accounts/unmount projects, resolve creation. Actual route became `#/admin/projects/99` instead of staying `#/admin/users`. Fixed with a mounted ref at lines 9–10 and an early callback guard at line 14. The server operation is allowed to complete; its old UI completion cannot take over the user's new route.

2. **Partly successful handover offers fulfilled assets again with stale versions.** `Frontend/src/app/features/projects/ProjectDeviceAssignDialog.jsx:27` removed fulfilled assets from the draft, but its picker still held the original AVAILABLE list. Reproduction: select assets 1, 2, 3; asset 1 succeeds, asset 2 conflicts, asset 3 remains unattempted. Asset 1 remained enabled in the picker and could be selected into another conflicting request. Fixed by refreshing authoritative stock once after a batch has fulfilled assets, passing a refresh key at line 32 to `Frontend/src/app/features/admin/InitialDevicePicker.jsx:10`. The read hook invalidates the previous stock while reloading. Failed and unattempted recipients/notes remain in the parent draft. The regression now waits for the second API stock read and disappearance of asset 1, then verifies retry call IDs `[1,2,2,3]`, including the preserved note for asset 3.

3. **Reverse Tab escapes a form dialog from its initial heading or top feedback.** `Frontend/src/app/hooks/useDialogFocus.js:41` previously wrapped only from the first sequential control or an element outside the dialog. `AdminFormDialog` initially focuses an in-dialog heading with `tabIndex=-1`; Shift+Tab therefore reached the background page button. Confirmed with user-event keyboard navigation. Fixed at lines 35–42 using DOM order to wrap from focused elements before the first or after the last sequential control. Natural traversal from feedback between controls remains unchanged; the existing busy/Escape and topmost-modal rules are retained.

## Per-module action matrix

Locations are relative to `Frontend/src/app`. “Reviewed” means the handler and state transitions were inspected, not that all browser/data permutations were exercised.

| Module / actions | Validation and disabled conditions | Pending, result, failure and state review | Result |
| --- | --- | --- | --- |
| `features/admin/AdminProjects.jsx` — create, list search, page | Project form owns required fields/PM; paging bounds from total | Create redirects on completion; read hook retries/aborts stale loads | Required stale navigation fixed |
| `features/admin/AdminProjectForm.jsx:28` — create/edit, reload version, cancel | Required fields and visible native validation; PM required; missing initial recipients rejected; busy fieldset | Keeps failed draft; explicit version refresh; onSaved only after API | Reviewed; no additional confirmed defect |
| `features/admin/AdminProjectForm.jsx:9` MemberPicker — select visible, remove, role, search/page | Existing members disabled; account search requires enabled users; compatible role choices | Selection persists across pages; stale read results invalidated | Reviewed |
| `features/admin/AdminProjectDetail.jsx:26` — save selected/role, remove, retry | Busy/archive fieldset; selected additions guarded against existing memberships; candidate membership version used | Names failing person; removes only fulfilled selections; refreshes after partial success; project-key remount isolates drafts | Reviewed |
| `features/admin/AdminProjectLifecycle.jsx` — check archive, reopen, confirm, retry, history | Pending edits, readiness blockers, reason, version and busy locks | Unknown-result retry reuses command key; reason retained; permission/conflict explanations; stale read guard | Reviewed |
| `features/admin/AdminUsers.jsx:14` — lock/unlock, delegate, create, filters/page | Self-lock reason linked accessibly; busy prevents row mutation; native create constraints | Pending and success notices; API errors keep drafts/current page; current versions sent | Reviewed |
| `features/admin/AdminDevices.jsx` — import/edit, handover/return, refresh/filter/page/history | Asset state controls available actions; busy state belongs to modal | Editor generations ignore old completions/lookups; success notices and read retry | Reviewed |
| `features/admin/DeviceAssetForm.jsx:8` — create/update, reload version, cancel | Native required fields, validation summary and busy fieldset | Version conflict retains draft; latest version reload explicit | Reviewed; verified API supplies conditionCode rather than assuming status is missing |
| `features/admin/DeviceAllocationDialog.jsx:12` — assign/return, reload, cancel | Explicit project/active enabled recipient check; checkValidity retained; busy fieldset | Focused errors; note/date retained; return and asset version reload; API performs final status/project guards | Reviewed |
| `features/projects/ProjectDevices.jsx` — add, return, paging, links | Add is Admin-only and hidden for archived project; return remains an inventory recovery action | Project-key callers isolate context; child success updates list; partial count shown | Reviewed |
| `features/projects/ProjectDeviceAssignDialog.jsx` — batch handover/cancel, stock link | Recipient validation covers whole batch before writes; ref lock prevents duplicate batch; busy fieldset | Stops on first failure; fulfilled draft entries removed; named error and partial notice; authoritative stock refresh added | Required stale stock fixed |
| `features/admin/InitialDevicePicker.jsx` — select, bulk recipient, focus missing, per-device fields, reload/page | Bulk apply requires a listed member; loading disables selection/page; recipients explained | Preserves selected drafts across stock pages; explicit stock reload; new refresh key invalidates successful batch stock | Required recovery support fixed |
| `components/SelectionTable.jsx` — individual/select-visible, filter/view | Select-all only visible eligible rows; loading/disabled rows respected | Off-page selections survive; indeterminate header; no write side effects | Reviewed |
| `features/admin/AdminFormDialog.jsx` and `hooks/useDialogFocus.js` — close, Escape, Tab | Busy disables close and Escape dismissal; controls omit disabled/hidden elements | Initial heading focus, opener restoration, dialog stacking, nonmodal chat coexistence | Required keyboard boundary fixed |
| `features/admin/AdminUserProjectFilter.jsx` — select, search, project page | Search does not commit scope; selected labels are keyed to selected ID | Abort/live read guards; missing project label fallback; page preserves chosen project | Reviewed |
| `features/admin/AdminProjectDropdown.jsx` — open/close, choose, keyboard, page/retry | Pending/stale search cannot choose; Enter prevents accidental form submission | Escape/outside/blur dismiss; focus restored on choice; viewport positioning listeners cleaned up | Reviewed |
| `features/admin/ProjectRoleSelect.jsx` — role changes | System-role-compatible options | Controlled values; no independent mutation | Reviewed through its callers |
| `features/projects/CatalogPage.jsx` — add/edit/archive, tab, retry | Archive confirmation; canManageProjectWork gates management; tabs/actions blocked during editor/archive | Archive/save success notices; read errors retry; project-key remount discards old reads | Reviewed; optional redundant guard below |
| `features/projects/CatalogEditor.jsx:19` — save/cancel | Trimmed required fields checked and focused; native summary; busy; immutable code | Date clearing explicit; expected version sent; draft retained on failure | Reviewed |
| `features/projects/ProjectSettingsPage.jsx:44` General — save/reload | canManageProjectWork and busy; native fields | Latest version loaded; success status; API conflict retains draft; settings keyed by project | Reviewed |
| `features/projects/HandbookPanel.jsx` — add/select/revision/history/retry/save | canEdit for entry points; archived item has no new revision; busy form; native summary | Content rendered as text; immutable revision ID sent; draft retained; success and read retry | Reviewed |
| `features/projects/RulesPanel.jsx` — create ruleset/draft/publish/retry | canEdit; busy; required source; publish confirmation; published history read-only | Expected active version sent; typed internal policy payload; pending/success/error feedback; read retry | Reviewed |
| `features/admin/ProjectStatusReports.jsx:17` — send/read retry/page | sending ref, canPost, required overdue explanation/recovery, busy | Idempotent request key retained for identical retry; live guard; status after save | Reviewed |
| `features/admin/AdminAudit.jsx`, `AdminDashboard.jsx`, `shared.jsx` — filters, paging, refresh/retry, links | Paging bounds; API-scoped reads | useAdminRead hides obsolete data and aborts previous loads; connected retries | Reviewed |
| `features/projects/ProjectMembers.jsx` legacy editor | Actual settings caller explicitly uses `canEdit={false}` at ProjectSettingsPage:26 | Write handlers exist and tests exercise them, but current product route uses centralized admin management | Read-only product routing verified; no deletion made |
| `features/projects/CreateProjectDialog.jsx` legacy create | Only definition/tests found by repository reference search | No production caller found; current create uses central AdminProjectForm | Unreachable legacy flow noted; no deletion made |

Backend boundary checked read-only: `Backend/src/main/java/vn/syp/tms/admin/DeviceInventoryService.java:44–55` locks recipient/project/asset, checks enabled identity and active membership, archived project, expected version, availability and return date. Receiving at lines 65–72 intentionally permits inventory recovery and validates version/already-returned state. No frontend correction weakens those guards.

## Ponytail review — optional complexity only

`features/projects/CatalogPage.jsx:L61: delete: unreachable repeated empty-project guard inside ProjectCatalog; outer CatalogPage:L21 already returns before instantiating it. Nothing replaces it.`

`net: -3 lines possible.` No cleanup applied; this is independent of the required correctness fixes.

## Skills and verification

- `code-review-and-quality`: independent source/test review, required vs optional findings, evidence-based race probes. The initial RED tests demonstrate missed behavior rather than relying on prior PASS totals.
- `ponytail-review`: separate optional dead-guard finding above.
- `using-superpowers`: read; its SUBAGENT-STOP explicitly exempts this dispatched agent.
- `brainstorming`: read; the first phase was read-only exploration. Root explicitly approved the bounded three-fix design before product edits.
- `prompt-master`: read; its own activation boundary excludes ordinary coding/review tasks, so no artificial prompt artifact was generated.
- New `features/admin/button-recheck.test.jsx`: initial 3 failures; expanded 5 cases produced 4 RED and 1 existing-behavior PASS, then all 5 GREEN. Covers late completion navigation, authoritative stock read plus partial retry, initial heading reverse Tab, feedback bounds and interior feedback traversal.
- Focused run: new probes plus existing hook suite, 10 PASS.
- Broader run: `rtk proxy npm test -- --run src/app/features/admin src/app/features/projects src/app/components/SelectionTable.test.jsx src/app/hooks/useDialogFocus.test.jsx src/app/features/work-items/modal-expand.test.jsx` — 22 files, 147 tests PASS on the frozen fixes. Counts describe this run only and are not proof of exhaustive state coverage.
- `git diff --check` for the four changed product files and new test passed; only Git line-ending conversion advisories.
- Coverage was not remeasured in this second pass. No build, live browser, backend test or database mutation performed by this delegated review. Root owns final full-suite/build/browser validation. No commit, push or production data write.
