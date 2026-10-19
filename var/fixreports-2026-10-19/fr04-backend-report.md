# FR-04 backend / FR-11 legacy command retirement — 19/10/2026

Owner: admin/search agent, reassigned by root after FR-06/07. Sources: FixReports clarification C06/C07/C13, FR-04/11 task text, `docs/api/fixreports-contract.md`, actual V31/V32 DDL and existing identity/project/work-item services. Shared baseline and other owners' source were preserved. No commit, migration edit, application service restart, main/live database write or external integration call was performed.

## Implemented public behavior

`/api/v1/projects/{projectId}/issues` now owns Feature Bug/QA creation, listing, detail, update, manual status, soft delete, history and comments. DTOs accept only BUG/QA; monkey is BUG only. Creation requires Feature and a UUID request key. Document/row are an optional complete pair validated against the same project, Feature, document and owning case. Context reads current document revision/overlays through TestDocumentService, including file, case number, title, steps and expected result. Imported copies keep distinct full identities.

List returns `items,totalItems,page,size,totalPages`, with Feature/document/row/type/status filters and shared AND-token accent/case/order-insensitive search. One predicate serves data/count before stable paging. Closed Issues remain included unless explicitly filtered. Detail returns the agreed UI content/identity/version/capability keys, with `allowedStatuses` entries `{id,label}`. Root owns form, detail, board and badge integration.

Identity author and history actor are recorded in V31's context/history tables. Existing work-item membership author columns may be null for an outside Admin; no fake project membership is created. PM authority follows current active project role; DEV must have the matching DEV project membership. Every write locks current identity, project, membership and target as applicable; project serialization protects counter/idempotency. Expected version is checked for update, transition, comment and deletion, and content/status optimistic updates also check affected-row count.

Tester may create case Issues and monkey Bugs, edit/delete own monkey Bugs and add notes. Case whole-content editing stays PM/Admin. Deletion is monkey-only for all roles; PM/Admin may delete monkey Bugs and Tester only their own. No case deletion workflow was inferred from Admin authority. DEV may comment/transition only assigned Issues and is limited to progress/resolved. PM/Admin can assign only an active enabled project DEV. Status changes are manual and use existing vocabulary without an NG, run, device, build, retest or legacy QA-answer prerequisite. No Issue mutation changes test-case Status. Archived project/Feature/document returns read-only capability flags and writes still reject archived context.

Comments GET returns a plain array; POST returns an entry with `id,body,actorId,actorName,createdAt,version`. It appends identity-authored COMMENT history, bumps Issue version and stores request-key/checksum in private history JSON. Replay returns the original entry; another author or changed payload conflicts. Public history removes those private idempotency fields and exposes event/body/reason/actor/time. Unassigned DEV cannot read comments through either comments or history. History remains readable after soft deletion.

Legacy `/work-items/**` and `/qa/**` mutation HTTP methods return 410 `USE_FEATURE_ISSUES`; GET/HEAD/OPTIONS and stored historical records remain. This interceptor runs behind the existing authentication/CSRF filters. Existing legacy Create DTO/service additionally reject removed types rather than converting historical rows. No hard delete or external delete was added.

## File ownership

New production: `workitem/FeatureIssueController.java`, `FeatureIssueDtos.java`, `FeatureIssueService.java`, `FeatureIssueLegacyWrites.java`. Narrow existing changes: WorkItemDtos Create type pattern and WorkItemService initial type guard (root authorized this seam). New tests: `workitem/FeatureIssueServiceTest.java`, `testcase/NativeFeatureIssueIntegrationTest.java`. Root owns WorkItemTypeContractTest. No Issue frontend, Feature/TestDocument service, ProjectData, router, AI, Note or migration edits in this slice.

## RED → GREEN and verification

* Root observed WorkItemTypeContractTest RED for TASK accepted, then GREEN after BUG|QA pattern/service guard.
* Root grouped Maven 01:26:59 observed FeatureIssueServiceTest **3 RED** against a compilable no-op boundary stub. Full candidate implementation was applied afterward.
* Focused `scripts/Test-Backend.ps1 -Tests FeatureIssueServiceTest,WorkItemTypeContractTest,AdminFixReportsTest,AdminSearchTest,AdminAuditServiceTest,DeviceInventoryServiceTest,AdminProjectServiceTest`: **27 PASS**, no failures/errors/skips, BUILD SUCCESS 01:28:38. A prior attempt only failed testCompile because copying a candidate preserved its old mtime; touching the real source made Maven rebuild it. That attempt is not a behavioral RED.
* Guarded native `run-issues-native.cjs`: first native suite **5 PASS**, no skip, BUILD SUCCESS 01:29:42. Real MockMvc/session/CSRF/Spring/MySQL paths prove current imported context/copy isolation, closed-row counts/no Status synchronization, monkey ownership/version/soft history/outside Admin identity, QA manual closure, comment replay/conflict, AND search/count/paging, legacy 410/type rejection and concurrent same-key creation producing one Issue/history.
* Native environment is exactly loopback:3307 `tms_docstest_2060e04c986c`, mode `integration`, schema V32. Runner checks actual DATABASE/version before Maven and does not provision, clean or migrate. Flyway validated 30 migrations and reported schema32 up to date. UUID-owned projects/users are created only in this explicitly authorized test schema. AI/Redmine/bootstrap/cleanup schedules are disabled.
* Final self-review added public regression for case-delete prohibition. Native run 01:32:03 observed **RED: 204 instead of403** for PM deleting a case Issue. Root confirmed C13 permits only monkey deletion. Fix plus archived-context capability regression: **6 PASS**, no failures/errors/skips, BUILD SUCCESS; evidence `fr04-native.log` and `fr04-native-delete-red.log`.
* JaCoCo measured FeatureIssueService only for the final six native cases: instructions2510/2735 (**91.77%**), branches194/268 (**72.39%**), lines112/112 (**100%**, compact statements mean this is not branch coverage), methods36/37 (**97.30%**). XML preserved at `fr04-native-coverage.xml`. Branch coverage remains below80%; no whole-backend coverage or complete authorization-matrix claim.
* Scoped `git diff --check` passed. No browser proof is implied by these tests.
* Final `scripts/Test-Backend.ps1 -Tests AdminOverviewServiceTest,MultiWordSearchTest,FeatureIssueServiceTest,WorkItemTypeContractTest`: **13 PASS**, zero failures/errors/skips, BUILD SUCCESS 01:34:34. AdminOverview7 confirms root's intentional R03/C05 denominator/zero behavior; Maven exclusive slot was explicitly returned to root afterward.

## Skills → use → evidence

| Skill | Actual application | Evidence |
| --- | --- | --- |
| codebase-design | Keep public HTTP seam and existing store/identity/document responsibilities; reuse work-item identity plus V31 scoped context/history instead of parallel issue database | Production files above; native imported current-context and exact-copy tests |
| api-design | Bounded DTOs, BUG/QA validation, stable page envelope, explicit version/request UUID, scoped context and consistent status/history/comment responses | Unit validation RED/GREEN; native API tests |
| security-review | Recheck enabled identity/project membership under write locks, project-scoped FKs/lookups, null-membership Admin author, DEV assignment, permission flags, bound search and private request metadata | Native outside-PM/DEV/other-Tester denials, Admin-no-membership and idempotency tests; source self-review |
| tdd | Compilable boundary stub, root-observed behavior RED, implementation GREEN; native conformance at public HTTP seam | Root 01:26:59 RED3 → focused PASS3; real native results above |
| implement | Complete source and test slice inside approved ownership while other agents change shared source; explicit exclusive Maven slot | This report and coordinated runner; no automatic commit because task forbids it |
| deprecation-and-migration | Retire legacy commands while preserving read-only history/data, add guard against removed new types, use existing V31/V32 only | Native old API410/new TASK422; no row conversion or migration |
| coding-standards | Existing Java21/Spring/JDBC/session conventions, source-owned expressions, no dependency/framework additions | Compile and focused/native tests |
| code-review / code-simplification | Self-review task/clarification against exact DDL, remove unsupported workflow gates and share token predicate | Permission follow-up below; independent review remains root-owned |
| verification-loop | Separate behavior RED from compile failure, run focused checks and guarded native integration, disclose unmeasured/browser limits | Exact commands/results/logs, no test-count coverage inference |

## Remaining integration and limits

Root owns combined FR-12 validation, browser scenarios and active navigation, shared ledger/API documentation, final peer review and broader old-route regression expectations. Core owns Feature/document lifecycle and schema. The native runner's MySQL9.7/Flyway warning says this Flyway version was tested through8.1; validation and the actual tests succeeded, and no toolchain upgrade was attempted here.
