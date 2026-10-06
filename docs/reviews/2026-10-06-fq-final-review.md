# Final pending-branch review — ADMIN A1–A4 + F/Q

**Current source verdict: APPROVED after one fix wave/scoped re-review.** Native/release/UAT acceptance remains open. Initial findings and their resolution are preserved below.

Date: 2026-10-06. Branch: `system-design`. Review base: `b189f8e5867f5a96932f929208d7e4496bd7ae11` (HEAD). This reviews the supplied tracked HEAD changes plus new files, not the empty HEAD..HEAD comparison. Reviewer: `fq_final_review`. This is the single final broad pass; follow-up should be limited to the findings and their fixes.

**Ready to merge: With fixes.** Three Important source/product issues remain below. No Critical issue was identified. The overall architecture implements the approved ADMIN and F/Q direction, but the file monitoring screen is not yet fully compliant and two normal recovery interactions fail. This is a source review verdict, **not native, release or UAT acceptance**. Native V17/V18, transaction/concurrency, HTTP journeys, UAT and pilot remain unverified; S11 must remain IN_REVIEW.

## Scope and specification assessment

Used the requesting-code-review reviewer template and RTK instructions. Reviewed the authoritative four packages (50 backend, 52 frontend, 62 test/script and 41 documentation files). Production backend and frontend sections were read throughout. Test review combined assertion/method inventories with targeted complete bodies, especially native fixtures, security/current-read, routing, draft and contract cases; it was not a line-by-line reread of every repeated mock fixture. Documentation review covered the current PRD checkpoint 16, SRS section 14, plan, current contracts, F/Q data dictionary, user/native guides, UAT and final verification report. Historical reports and V16 baseline material were sampled/structurally inspected as historical evidence, not treated as current F/Q requirements. The V16 dictionary table tally agrees internally with its 59 tables/560 columns/139 FKs/269 indexes; the live database was not queried.

The production portions examined support the principal approved flow: ADMIN centrally creates projects and explicit memberships/resources; PM selects approved source revisions into canonical runs; assigned Tester uses an allocated compatible machine in a pinned session; attempts stay under ExecutionService; BUG and QA have distinct policies; PM retains retest/closure authority. Current source satisfies most of F01–F05/Q01–Q03, subject to the findings below. Earlier PRD/SRS statements that F/Q is missing are explicitly labeled baseline and were not mistaken for present implementation gaps.

The three Important findings are assessed against both explicit requirements and normal user expectations. A field-error action must not navigate away and discard the form. Archiving a build must not hide retained history or the PM's approved way to resolve a blocked session. A PM file dashboard must expose the approved operational filters and progress/context, not merely have those fields somewhere in a backend response.

## Strengths

- Canonical authorities remain clear: run assignment and ExecutionService own execution; document annotation remains separate; FULL_CASE retest has an internal guarded entry while public legacy recording rejects grouped runs. BUG_ONLY does not create an execution attempt.
- Current-account/session checks and project/member locking are explicit in the new file/QA command paths, including replay. Role and ownership checks do not rely on stale UI capabilities. Global DEV cannot borrow an old PM/Tester membership to write results.
- Session identity pins group, allocation, executor, asset and build; unique generated keys protect one DOING session per asset/group. Completion checks the correct build and exact NG attempt links. PM cancel is intentionally available when underlying resources become unusable.
- QA keeps canonical work-item identity/status/version, immutable answers and confirmations, generation changes, exact current-answer confirmation, and explicit PM exception closure. Generic mutations/Redmine/retest do not silently become a second QA command path. Shared comments/evidence have current typed policy boundaries.
- Export is based on pinned revision and selected-build canonical results; it authorizes before BLOB access, preserves source separately, carries provenance and handles unsafe workbook content deliberately.
- UI draft pins, explicit conflict acknowledgment, accepted-command GET recovery, stale-response suppression, and generic AND typed capabilities are substantial improvements over optimistic local success alone.
- V17/V18 are additive in the reviewed source and preserve nullable legacy session provenance. Composite FKs express the important same-project/pinned identities. Documentation is candid about unrun native gates and does not add scoped test counts into a fabricated full-suite result.

## Critical

None identified in the reviewed evidence. This does not certify unexecuted MySQL behavior.

## Important

### I1 — QA error links navigate the application away from the form

- **Location:** `Frontend/src/app/features/qa/QaForm.jsx:25`; integrated behavior in `Frontend/src/App.jsx:32`–41. The shared `QaErrorSummary` is also used by QA command forms.
- **Trigger:** Submit a QA form/command with a field validation error, then activate its error-summary link by mouse or keyboard. The link is `href="#<field-id>"` with no prevention of default navigation.
- **Impact:** The application uses the hash as its route. The hashchange listener interprets the field ID as a new route, so the error action can unmount the QA form/detail and lose the unsaved draft instead of focusing its input. This contradicts the required error/draft/focus behavior even though merely focusing the summary passes existing tests.
- **Fix:** Use a non-navigation field-focus action (or prevent default and explicitly focus the matching element). Uneditable source-context errors without a field must remain readable without a bogus navigation target. Preserve keyboard accessibility and the application hash.
- **Regression needed:** Activate an actual error entry in a mounted hash-routed create/detail flow; assert the hash/route and draft stay intact and the intended input receives focus. Cover the shared command-form use, not only the summary's initial focus. `qa.test.jsx`'s existing “focuses one error summary…” test only checks the summary and presence of a link, not activation.

### I2 — Archiving the pinned build hides history and blocks PM session recovery

- **Location:** `Backend/src/main/java/vn/syp/tms/filework/FileWorkExecutionService.java:53`; `Frontend/src/app/features/file-work/FileWorkDetail.jsx:36`, 80–87. Related existing command: `Backend/src/main/java/vn/syp/tms/catalog/CatalogService.java:108`–113.
- **Trigger:** Start a file session on build B, then archive B through the existing catalog command. The execution read defaults to the latest session's build, but its build lookup requires `archived_at IS NULL`. This also affects completed-session history/export and a default build archived before a session.
- **Impact:** Execution GET/export returns not found for retained, same-project history. FileWorkDetail puts detail, execution and catalogs in one `Promise.all`; rejection removes the entire loaded data block. The PM cannot reach **Hủy phiên**, although cancel is explicitly designed to resolve unusable-resource sessions, and cannot reach the build selector to recover. A DOING session can therefore keep its asset/group reservation while the normal UI recovery path is unavailable. The backend cancel authority itself is present; this is an integrated read/UI failure.
- **Fix:** Permit authorized historical execution reads/exports for an existing archived build while preserving all current-resource guards on writes. Include the selected historical build in read-only display choices. Keep independently authorized group/session recovery controls available when the execution projection fails, rather than making PM cancel depend on a successful workbook/result read. Never infer cancel permission from the client role alone.
- **Regression needed:** Archived latest/default build remains readable/exportable with the correct pin; writes remain denied. PM can load and cancel a blocked DOING/PAUSED session, including when execution loading fails; non-PM cannot. The fixture suite currently tests revoked authority and many session transitions, but does not cover this archived-build read-to-cancel combination.

### I3 — Approved file monitoring filters and progress/context are missing from the UI

- **Location:** `Frontend/src/app/features/file-work/FileWorkPage.jsx:33`–42. Requirements: `docs/product/SYSTEM-SPECIFICATION.md:448` (14.3), `docs/product/PRD.md:145` (F02) and 159 (F04).
- **Trigger:** A PM needs to compare a particular Tester's work in a cycle/build, or see progress and when work started/was updated across the file list. Tester also expects the approved milestone deadline context in My work.
- **Impact:** The page only submits name/state/mine/document filters and shows counts/state/asset. There are no assignee, cycle or build controls, and no execution/pass rates or start/update timestamps. The backend already supports the three filter parameters and returns rates/start/update information, but users cannot use them from this screen. F02 milestone due context is absent from the supplied group read model as well. Thus API completeness and passing mocked list tests do not complete F02/F04/14.3.
- **Fix:** Expose the approved assignee/cycle/build filters with server-side filtering and page reset; display rates (including the null/no-applicable-scope case), start and clearly labeled update/activity context. Add the cycle milestone's deadline context to My work, with an honest missing-deadline state when no plan exists, rather than inventing a due date. Preserve My work's current-actor server restriction, current metadata permissions and stale-response protection.
- **Binding read-model scope:** Keep the existing selected-build `counts.executionRate/passRate` formula and nullable denominator behavior; expose `startedAt` from the latest session and format timestamps in the project timezone. Add nullable milestone identity/name/due-date from the group's cycle (same-project join), displaying missing plan/due date explicitly and treating the due date as a date, not a UTC timestamp. `FileWorkService.java:171`–177 currently selects no milestone fields, and its `updatedAt` is only `g.updated_at`. Canonical attempts update the run/attempt at `ExecutionService.java:236`–237, not the group timestamp. Therefore do not relabel `updatedAt` alone as “latest activity”: derive a read-only latest-activity value that includes relevant saved canonical attempts and session/group changes, or show group-updated and execution activity separately with accurate labels. No new persisted authority, auto-refresh promise, invented SLA or deadline inference from completion percentage is needed. Synchronize the GroupSummary contract and fixtures with added fields.
- **Regression needed:** Verify filter parameters, page resets, rapid context changes, multi-build rows and rate/null/time/deadline rendering. Keep selectors usable with paginated data and valid historical selections. Do not interpret the existing backend list tests as UI coverage of controls that are not rendered.

## Minor

### M1 — Nullable enum schemas still reject legitimate null values

- **Location:** `docs/api/file-work.openapi.json:3615` and 3626 (`HistoryEvent.fromState/toState`); `docs/api/qa.openapi.json:1918` (`Create.priority`).
- **Trigger/impact:** CREATE/ASSIGN history inserts omit session state (`FileWorkService.java:300`), so the history response legitimately contains null states. The schemas set nullable but their enums exclude null. The repository's own focused schema evaluator rejects null for both fields and for explicit nullable QA priority. Generated/validating consumers therefore have a contract inconsistent with actual values, despite the earlier fix for nullable object composition.
- **Fix:** Include null in these nullable enums or use a strict value branch plus explicit null branch. Add focused legitimate-null and invalid-non-null assertions. Do not loosen the entire response schema.
- **Evidence:** A single named, offline evaluator check returned `false` for all three null cases; no test suite was rerun. The first shell invocation failed to parse because of quoting and did not execute the check; the corrected invocation produced the three results.

### M2 — ADMIN authentication documentation uses conflicting names

- **Location:** `docs/api/device-inventory.openapi.yaml:108` declares cookie `SESSION`; `docs/api/admin-management.openapi.yaml:6` says `X-XSRF-TOKEN`.
- **Trigger/impact:** A consumer implementing those standalone contracts can send the wrong cookie or CSRF header. `SecurityConfig.java:34` explicitly sets `TMS_SESSION`, and the main API contract declares `X-CSRF-TOKEN`; the frontend obtains the actual header name from the CSRF response, so this is not a demonstrated frontend authorization bypass.
- **Fix:** Align standalone contract names with the configured session cookie and the CSRF token endpoint's returned header name; keep one consistent convention. A small contract consistency assertion is sufficient.

### Parked Minor follow-ups, retained without inflating them into runtime claims

- File/group/session projections and handoff derive full populations before paging and can amplify reads (including roughly 13 queries per ready candidate). `HandoffService`/`FileWorkService` should be profiled on representative native data, then optimized without changing filter-before-page semantics or authoritative closure checks. Performance is **NOT_MEASURED**; no SLA is claimed or failed solely from query count.
- Several new JSX/service/test sections compress substantial state handling into long lines. This increases review/maintenance cost; subsequent localized formatting/extraction can help, but no broad refactor is required to settle this review.
- Reported frontend chunk 530.01 kB and inherited Mockito runtime-agent/debug warnings remain documented warnings, not proof of functional failure. Do not describe Maven runtime output as entirely warning-free merely because JDT is clean.

## Verification report assessment and limits

Read `docs/reviews/2026-10-06-fq-implementation.md`, including its final checkpoint, against the implementation and tests. The source supports the described separation of canonical recording, typed QA, current replay guards, preserved source/export behavior, and native opt-in fixtures. The claimed **598 FE tests / 390 offline BE tests / JDT 191 sources with zero errors and warnings / package and contract checks** are existing execution evidence recorded by the root workflow, not new results from this review. I did not rerun them, reconstruct Surefire totals, rebuild, inspect credentials, or launch the JAR. Their reported scope is plausible and clearly distinguishes offline from native work; they do not cover I1–I3 merely by being green.

The native runner is explicit about schema/mode/selector, loopback, dedicated schema naming and prechecks; Java guards also validate before Spring startup. Native migration source includes isolated fresh/upgrade and preservation checks, negative FKs/current pointers and a DOING uniqueness race. Source review/compilation does not demonstrate that this SQL executes successfully on the target MySQL. The integration class's outer rollback transaction does not demonstrate separate committed service transactions or prove rollback isolation after a caught failed command. The report correctly acknowledges this limitation. Direct offline regression of the Java pre-start guard is absent; runner mock tests do not replace it.

Named identity SHARE/project-wait, overlapping BUG stale-command and exact same QA-comment replay races remain **NOT_WRITTEN/NOT_RUN**, separately from the written session unique-key race. These are native acceptance work still to complete, not tests silently credited as passing. The database last observed at V16 is not assumed to have received V17/V18.

Coverage remains scoped: the reported frontend core and QA samples and Task2 backend figures do not establish whole-application coverage. No coverage was measured in this review.

Some initial aggregate reads were truncated. Core production gaps were recovered with bounded reads. Remaining evidence intentionally inspected as inventories/samples rather than complete bodies includes repeated offline test fixture setup, historical review narratives, and the full generated V16 column/index listings. This is the evidence limit of the broad review; no claim of exhaustive line-by-line validation of every test or historical metadata row is made.

## Named outside-package checks

Only concrete integration risks were followed outside the supplied packages; no broad repository recrawl or diff rederivation occurred:

1. **QA field-link versus hash router:** read the existing `Frontend/src/App.jsx` hashchange listener. An initially guessed `src/app/App.jsx` path did not exist; the authoritative known App path was then used.
2. **Archived build recovery:** locate the existing CatalogService file and inspect only its archiveBuild path, confirming it can archive a referenced build and does not itself provide the missing read/UI recovery. No catalog mutation was called.
3. **Contract authentication names:** inspect `SecurityConfig.java` session/CSRF setup and the known application configuration, without reading any environment/credential file.
4. **Nullable enum contract risk:** call the repository's existing pure schema evaluator on the three named schema properties. This was a focused deterministic check, not Check-Contracts or a test-suite rerun.

Package-local structural extraction/tallies were used to read large JSON contracts and the generated dictionary without dumping duplicate boilerplate. No native/server/process/database operations, source/index/branch edits or commits were performed. This report is the only written artifact.

## Behaviors declined to judge, and why

This list separates unverified behavior from source defects; none of these is silently counted as passed:

1. **Actual V17/V18 fresh install, V16→18 upgrade, live FK/CHECK/generated uniqueness, Flyway checksums and preservation of real records/blobs/history:** no permitted isolated native execution in this review. Static DDL/fixture inspection is insufficient.
2. **Real transaction commits, failed-command rollback isolation, deadlocks and concurrent stale authorization/replay outcomes:** offline mocks/outer rollback fixture do not prove these properties; named missing races are recorded above.
3. **Actual running listener version, Spring startup mapping, session/CSRF HTTP behavior, XLSX HTTP headers/bytes and complete ADMIN→Tester→Dev→PM round trip:** no server/listener/browser-write/native operations were authorized for this review. MockMvc and reported offline results are bounded evidence.
4. **Complete browser keyboard/mobile/scroll behavior and real user UAT/pilot:** existing previews sampled isolated read-only fixtures and reported behavior. I1 is a source-proven integration problem; the remainder is not certified from JSX or unit tests.
5. **Native scale/latency/throughput, memory use, large workbook response time, chunk load-time impact or suitability for production SLA:** representative measurements and agreed scale/SLA do not exist here. Query amplification is retained as a risk rather than invented measured failure.
6. **Whole-frontend/backend coverage and every legacy feature's runtime correctness:** only scoped coverage and pending-branch evidence are available; this review does not rerun or recrawl the entire baseline.
7. **Project archive/unarchive command behavior:** there is no application endpoint for that action. Read/write handling for archived fixtures can be reviewed, but the future rule to block archive during DOING/PAUSED cannot be credited as an implemented command. This does not excuse I2, which uses an existing build-archive command.
8. **Customer-specific rules/import mappings, production Redmine QA mapping/customer acknowledgment, customer accounts, notifications, quotas, shared-machine/multiple-Tester group workflows:** these are outside the approved MVP or still unapproved, so no behavior was invented to complete them.
9. **Generic non-QA TASK/REQUEST/IMPROVEMENT closure:** a separate business policy remains unapproved; the QA implementation must not be used as accidental authority for those types.
10. **Structured attachment-reference integrity inside QA answer/confirmation text:** current `basisReference` is plain text, not an attachment ID protocol. Existing shared evidence policy was reviewed, but a future structured linkage/delete-protection design is not claimed present.
11. **Backup/restore completeness, production retention/data residency/RPO/RTO and operational deployment readiness:** no restore/native operation or agreed production policy was within this review. Source/package availability is not deployment acceptance.

## Follow-up boundary

Apply one coherent fix wave for I1–I3 and the small contract corrections, with behavioral RED→GREEN checks scoped to those changes. Re-review only the changed paths, their immediate integrations and evidence. Preserve the recorded native/UAT/performance limits and update the source-gate report/checklist/STATUS accordingly. After the Important findings are resolved, source readiness can be approved independently; native/release acceptance still requires the isolated database, missing concurrency/transaction checks, HTTP journey and UAT gates. No commit, push, merge or deployment is authorized by this report.

## Current follow-up state

One combined fix wave and its single scoped re-review are complete: all I1–I3/M1–M2 ADDRESSED, source readiness APPROVED, no new breakage identified. The initial With fixes verdict above is retained as history. Native/HTTP/UAT/pilot acceptance remains open; no merge, deployment, migration or user listener restart was performed.

## Accepted scoped follow-up


Date: 2026-10-06. Reviewer: `fq_final_review`. Base is the captured pre-fix working tree; HEAD remains `b189f8e5867f5a96932f929208d7e4496bd7ae11`. This is the authorized single follow-up to `final-whole-review-report.md`, **not another broad review**.

**Scoped verdict: APPROVED. I1, I2, I3, M1 and M2 are ADDRESSED.** No new Critical, Important or Minor breakage was identified in the fix delta and its immediate integrations. The original source-review merge verdict can move from **With fixes** to **Yes for source readiness**. Native/release/UAT acceptance remains open; this approval does not authorize a merge, commit, push, deployment or migration.

## Per-finding verdicts

| Finding | Verdict | Source and covering evidence |
| --- | --- | --- |
| I1 — QA validation link changes hash route | **ADDRESSED** | `Frontend/src/app/features/qa/QaForm.jsx:23` resolves editable targets inside the current form; line30 uses `type="button"` focus actions, not hash links. Context-only errors remain text. `qa.test.jsx:40` covers create and shared answer-command forms under a mounted hashchange harness, mouse and Enter activation, unchanged route, input focus and retained drafts. The two actual call sites pass stable field-error state; the changed helper does not alter command/retry behavior. |
| I2 — archived build hides history and PM recovery | **ADDRESSED** | `Backend/src/main/java/vn/syp/tms/filework/FileWorkExecutionService.java:54` requires an existing same-project build without rejecting its archived flag on reads. Write guards are unchanged. `Frontend/src/app/features/file-work/FileWorkDetail.jsx:35`–39 separates detail/session capability loading from execution, catalog, allocation and member reads; scope tagging remains. Lines46/85–88 preserve the selected archived build or fallback identity in the display selector; start options and the start handler still require an active build. Line92 uses current session capabilities for cancel. Added FE tests cover both DOING/PAUSED recovery with failed projection/catalogs and deny client-role-only cancellation. Added BE tests cover archived latest/default historical reads/export and real FileWorkGuard rejection of start/resume/record, with cancellation exclusive to current PM. |
| I3 — missing file monitoring controls/context | **ADDRESSED** | `Frontend/src/app/features/file-work/FileWorkPage.jsx:40`–56 gates controls with current read metadata, sends existing server assignee/cycle/build filters, resets group paging, preserves paginated selections, and omits alternate assignee in My work. The row shows existing selected-build rates/nulls, session start, separately labeled group update and saved activity, formatted in project timezone. Line64 handles date-only milestone display and distinct no-plan/no-deadline states. `Backend/src/main/java/vn/syp/tms/filework/FileWorkService.java:175`–184 adds nullable milestone context using a same-project join and date-only formatting, and a read-only maximum of group update, same-project group-run canonical attempts and session transitions. It does not create another persisted authority or alter selected-build count formulas. GroupSummary/API/user guide and fixtures are synchronized. Tests cover paging/filter/context/My-work behavior and rendering; the BE projection assertion verifies query shape/propagation, not native SQL execution. |
| M1 — nullable enum contract rejects legitimate null | **ADDRESSED** | `docs/api/file-work.openapi.json:3641` and 3653 retain strict history-state enums with an explicit null value; `docs/api/qa.openapi.json:1918` does the same for optional priority. `scripts/Check-FqContracts.test.cjs:35` adds legitimate-null/valid-value/invalid-value cases. `scripts/Check-Contracts.cjs:90` excludes null from DTO pattern comparison only for nullable properties without a required Bean Validation annotation. Mutation tests still reject extra non-null alternatives and null added to a required result enum. Existing strict nullable-object branches remain intact; the extra JSON delta there is formatting. |
| M2 — standalone ADMIN authentication names disagree | **ADDRESSED** | `docs/api/device-inventory.openapi.yaml:108` now declares `TMS_SESSION`; `docs/api/admin-management.openapi.yaml:6` instructs callers to use the CSRF response's `headerName` and names `X-CSRF-TOKEN`. The added source/contract consistency assertion checks configured cookie, standalone declarations, the main CSRF convention and absence of the old `X-XSRF-TOKEN` text. |

## New breakage

- Critical: none identified.
- Important: none identified.
- Minor: none identified requiring another fix.

The independent reads in I2 retain project/group/build/reload scope checks before using detail or execution responses. A projection failure no longer removes PM recovery, but it does prevent result rendering/recording and export without an available view. Current server capabilities remain the authority for recovery controls; unchanged backend commands still recheck permission and resource state. Existing exact command retries and pinned attempt drafts were not replaced with automatic resubmission under newer versions.

I3's saved activity intentionally includes attempts on any build, while percentages remain selected-build-specific. The new contract and guide explicitly distinguish these meanings. A SQL DATE is rendered as a calendar date; timestamps still use the project timezone. Archived milestone plans are retained and documented rather than silently changed into an invented active deadline.

## Evidence inspected

- Read `final-fix-rereview-brief.md`, binding `final-fix-brief.md`, `final-fix-report.md`, and all sections of the supplied `final-fix-delta.md` in bounded passes (lines 1–909). No diff was rederived and untouched broad packages were not reread.
- Used only the current QaForm body from `final-fix-context.md` (lines 119–233) where the delta cut surrounding state/call-site context. A narrow `QaErrorSummary` reference lookup checked its two immediate callers. Selected line-location reads on the changed files supplied accurate report references. No broader repository review was started.
- The implementer records behavioral RED→GREEN for the field-focus, archived-build/recovery, monitoring and contract defects. Source inspection confirms the tests exercise the named failures rather than deleting the old protections. The backend projection test remains a mock/SQL-shape assertion; it cannot establish native query behavior.
- Read root's `final-fix-frontend-test-result.json`, `final-fix-frontend-build-result.json`, `final-fix-offline-backend-result.json`, `final-fix-javac-result.json` and `final-fix-jdt-result.json`. They record **612/612 FE tests in 49 files**, **394/394 BE tests in 38 explicitly selected offline suites, zero failures/errors/skips**, fresh javac **127 main/64 test**, fresh JDT **191 sources/zero errors/zero warnings**, and frontend build exit 0 with the chunk-size warning retained.
- Root reports the initial parallel FE run as 611 pass/one existing-test timeout and the serial retry passing with the original 5000 ms timeout. This history is preserved; the successful retry is not described as an uninterrupted first-run pass or as proof the test can never be timing-sensitive.
- Root separately reports package and structural contracts PASS. This reviewer did not rerun those commands or independently inspect the newly built JAR. The contract source changes and new assertion coverage were inspected directly.
- No suites, native SQL, server/listener/browser operations, credential access, source/index/branch changes or subagents were used. Only this report was written. Coverage was not measured in this re-review.

## Out-of-scope observations and unchanged acceptance limits

The parked query-amplification/performance, compressed-code maintainability, frontend chunk-size and Mockito runtime-agent warning observations remain as recorded in the broad report. I3 adds read-only aggregate subqueries, so representative native profiling still matters; no latency/SLA conclusion follows from the passing mock tests or build.

Native V17/V18 fresh/upgrade/FK/preservation, actual execution of the new SQL projection, real transaction commits/failed-command rollback isolation, current-authorization races, HTTP end-to-end behavior and UAT/pilot remain **unverified**. The three named identity SHARE/project-wait, overlapping BUG stale-command and exact QA-comment replay races remain **NOT_WRITTEN/NOT_RUN**. The Java pre-start guard lacks its direct offline regression as previously recorded. None is credited as passed by compile, mocked tests or this source approval.

The absence of an application project archive/unarchive command, unapproved customer mappings/policies and generic non-QA closure remain outside this fix scope. All other declined judgments in the broad report continue to apply. Root's concurrent read-only fixture browser proof is a separate bounded evidence source and was not assumed complete here.

**Final scoped decision:** all five concrete findings are resolved with appropriate focused regression coverage; source readiness is approved. Preserve S11 IN_REVIEW and the independent native/HTTP/UAT/pilot gates during final documentation bookkeeping. No second broad pass or additional fix wave is requested.
