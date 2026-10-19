# FR09 independent backend source review — 2026-10-19

Reviewer: `fr_ui_audit` (frontend implementer; not the AI backend implementer). Bounded review of final working-tree source against R08, C10/C11 and A14–A17. No production source changed. No Maven, target checks, DB access, provider calls or browser execution in this review. Findings below are source conclusions, not fresh runtime test results.

## Findings

### Medium F09-BE-01 — New worker chat omits permitted progress and actual case history

Affected: `Backend/src/main/java/vn/syp/tms/ai/FeatureFacts.java:18`–35, 45–56; `AiPortfolioContext.java:134`–137. R08 explicitly permits Tester/DEV to ask who tested a readable case and about their work; C10 and plan line269 explicitly preserve readable file progress.

`snapshot(...)` retrieves experience only inside `if(management)`. Worker `sourceFiles` deliberately removes all counts, and worker cases contain Status/current revision/overrides but no audit actor. For a real member, it adds only the first five `myWorkSample` and `myCaseSample` items. It does not call `personal(...)`, which holds assigned/tested totals. `personal(...)` is reachable only from the older typed `TESTER_WORK_REPORT` context, not the new `MY_PROJECTS`/`PROJECT_CHAT` send path. DEV also has no equivalent typed own-work purpose.

Counterexample: Tester A has twelve assigned rows in an active document, seven tested; Tester B and PM have recorded Status changes on case TC1. A opens normal project/Feature chat and asks “Tiến độ file này và phần việc của tôi thế nào, ai đã từng test TC1?”. The snapshot supplies at most five case examples, no per-file/personal denominator or tested count, and no actual actors. The provider cannot answer the permitted question accurately from these facts. This is missing allowed functionality; it is not a request to grant worker management aggregates.

Recommendation: add separate restricted projections for the actor's current assignment progress and the requested readable document/case's progress and bounded actual audit history. Keep project-wide execution/workload/management tables absent for workers. Scope any requested document/case to an already authorized project/Feature before retrieving; do not infer actors from imported tester cells or current assignment. Include explicit bounds and unavailable-history limitations.

Test gap: `FeatureAiIntegrationTest.memberCanReadRelevantCasesOwnedByAnotherTesterWithoutManagementTotals` positively proves other-owner case/Issue text and negatively checks management totals, but does not assert worker file progress, personal counts with more than five assignments, or actual actor history. `experienceCountsRecordedActualActorsIncludingPreviousActorsAndResets` exercises Admin only. Add positive Tester and DEV fixtures and a negative foreign-project fixture for these specific facts.

### Medium F09-BE-02 — Analysis-equivalent request misses explicit capability denial

Affected: `Backend/src/main/java/vn/syp/tms/ai/AiPortfolioContext.java:147`–152. C10 requires a backend refusal, with permission feedback, for whole-project management analysis as well as management reports/bulk extraction.

The current guard requires `bao cao|report` before its management terms, or `xuat|tai|export|download` before a bulk term. The unequivocal request “Phân tích tổng hợp toàn dự án như màn Tổng hợp & Phân tích” normalizes successfully but matches neither branch. It proceeds to the provider with `capabilities.managementReport=false`; the actual refusal is then left to instructions/model behavior.

No management-total leak is established: worker retrieval still omits those totals. The defect is that this explicitly prohibited capability does not deterministically return `403 AI_CAPABILITY_DENIED` before provider use, as the confirmed contract requires.

Recommendation: distinguish the explicit management-analysis/bulk capability from allowed case/Issue/file-progress questions before provider admission, and reject the stated Analysis-equivalent intent. Preserve positive readable progress questions. A free-text deny-list alone is not a general proof of semantic intent recognition; retain the restricted data projection regardless of request wording.

Test gap: `AiPortfolioContextTest.restrictedUsersCannotRequestManagementReportsOrBulkExportsButCanAskOwnProgress` covers two canned negative strings and one positive string. Add the exact Analysis-equivalent counterexample, an English equivalent, and an assertion that provider admission is never reached on denial, alongside permitted per-file/personal progress.

## Source checks with no new defect established

| Requirement | Observed implementation | Limits of this review |
| --- | --- | --- |
| A14 AI global PM/Admin read, no extra CRUD | `AiPortfolioContext.current` global-role branch reads projects through a left membership join; `AiAccess.authorize` expands AI policy only. Feature integration fixture asserts an outside PM reads AI features but gets404 on ordinary Feature creation. No ordinary project service policy was changed by these classes. | Source/test inspection; did not rerun HTTP. |
| Private chats and drafts | `AiChatStore` thread/turn/list/request/complete queries use `created_by`; owner verifies current session/account version. `AiDraftStore` also reads and mutates owned rows only. Global AI scope does not enumerate other owners' chat/draft text. | Existing native test source covers general owner isolation; see stale fixture limitation below. |
| Secrets and provider context | New Feature projection queries business tables with explicit columns; it does not retrieve provider vault/config secrets, credentials, Notes or private chat tables. Outsider experience is reduced before JSON serialization to fixed boolean-derived patterns and fixed limitations; raw project names, IDs, actors and counts do not leave that query. | No live provider or secret-bearing data used. |
| Worker positive ordinary read | `FeatureFacts.caseSample/issueSample` are project-scoped and independent of assignment; current integration test covers Tester and DEV reading another owner's case/Issue. Management execution, team workload and exact file totals are excluded. | F09-BE-01 describes allowed facts that were excluded too broadly. |
| Actual actor provenance | `FeatureFacts.experience` joins `project_audit.actor_id` to identity; uses distinct audit IDs to avoid multiplying changes through migration clones. Resets remain recorded changes, not physical executions. Imported tester names are not the experience source. | Worker history omission remains F09-BE-01. |
| Selected target with authorized background | `prepareProject` checks selected project/Feature, sorts target project first, includes scoped Feature facts plus bounded same-project background and other authorized projects. Full role/grant/version fingerprint fences history, including background grant changes. | Bounds disclose total/included/truncated; not exhaustive retrieval of the database. |
| Archived and foreign scope | Feature lookup requires matching project; archived Feature retains read identity but rejects new inference. Archived project facts are not freshly retrieved. Membership/fingerprint is checked by thread/read/reserve/complete. | Did not run concurrency/HTTP tests. |
| Citation/output validation | Service and store validate recognized typed references against persisted server sources; JSON output schema/field/length/model/response provenance checks remain. Sources are reduced with prompt facts when byte budget truncates projects. | Only recognized typed citation syntax is mechanically checked; this does not prove truthfulness of arbitrary natural-language output. |
| Typed document scope | New assignment source is `document:<id>` validated against committed Feature-owned batch; old `file:<group>` history is read-only. New sends reject legacy scope410 before resolving provider/context and do not reinterpret colliding old IDs as new document IDs. | Legacy test fixture updates remain below. |
| Pinned conversation/provider behavior | Provider/model remain thread fields; reservation checks selection equality; history includes READY only; request hash/idempotency, failure text retention, provider/session completion fencing and TTL ownership code remain. Scope/provider selection is not silently rewritten. | FE/provider/runtime evidence is separate from this source review. |
| SecurityConfig | Only authenticated GET AI project-list/Feature-list routes were added. Existing project business guards, admin matcher, CSRF and deny-all fallback remain. | No standalone security suite executed here. |

## Baseline and tests reviewed

FR00 baseline is `var/fixreports-2026-10-19/baseline.json`, captured2026-10-18T18:01:40.843Z at `caf075af7231f207259b6a62808bff5c8445f6af`. `baseline.patch` already contains the portfolio/chat injection, scope/instructions and output-field-contract changes. `AiPortfolioContext.java` was already an untracked12109-byte file with SHA256 `11497ea458520c309fb585e523f16e1497132f49fc094502536be161e2b09ca5`; therefore these preexisting changes are not described as newly authored FR09 regressions. Current untracked `FeatureFacts`, read-scope controller and integration tests were read explicitly rather than relying on `git diff` alone. Findings are gaps against the current confirmed FixReports contract.

Read production source: AiAccess, AiPortfolioContext, FeatureFacts, AiContextService, AiReadScopeController, AiChatStore, AiChatService, AiDraftStore, LocalAiAccess and SecurityConfig. Read new/current tests: AiAccessTest, AiPortfolioContextTest, AiChatServiceTest, FeatureAiIntegrationTest; inspected older NativeAiPortfolioTest, NativeAiChatTest and NativeAiDraftTest for regression-test applicability.

Important test limitation: older native AI suites are pinned to historical V25/V30 fixture modes and still assert old cycle/run/assignment-only portfolio behavior. For example `NativeAiPortfolioTest.selectedProjectNeedsNoTargetAndNeverIncludesAnotherAuthorizedProject` expects `testCycles` and no authorized background; `NativeAiChatTest.closedFileGroupCycleAndArchivedProjectKeepSavedChatReadonly` creates a new assignment request using an old group ID. Those sources cannot be presented as current FR09 native PASS without updating/replacing their active-contract scenarios while preserving explicit historical read-only checks. New Feature integration tests currently inspect prepared tasks and some HTTP scope/CRUD rights; provider-bound full chat owner/fingerprint/citation/draft integration on the new schema needs distinct evidence. This review does not claim those tests ran or failed.

## Skills → use → evidence

| Skill | Use | Evidence |
| --- | --- | --- |
| code-review; requesting-code-review; receiving-code-review | Independent bounded source review; distinguish defect, counterexample and test gap; send actionable findings to owner without editing their source. | F09-BE-01/02, source matrix and root messages. No reviewer subagent spawned under parent restriction. |
| security-review | Check least privilege before retrieval/provider, explicit output projection, owner/session checks, no AI-to-CRUD privilege propagation. | A14/A15 rows and retained restricted-data requirement in both recommendations. |
| tdd-workflow | Specify behavior tests for observed contract gaps without claiming unexecuted RED/GREEN. | Positive worker history/progress and explicit denied Analysis-equivalent scenarios above. |
| verification-loop; verification-before-completion | Separate source inspection and existing test content from fresh integration/native/live-provider verification. | No commands against Backend target or DB; limitations stated throughout. |

Disposition: no Critical/High issue established in the reviewed scope; two Medium contract gaps need owner triage and behavior tests. Runtime acceptance remains with root's isolated validation queue.
