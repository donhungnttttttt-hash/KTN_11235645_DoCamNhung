# Read-only offline unit harness review

Final status: confirmed five context failures fixed by exact test-only mocks; bounded18 PASS, approved test-only OAuth deadline fixture3 PASS, full74 classes/645 tests PASS/package02:38:45, zero skips. Earlier review/preparation/RED checkpoints are retained below as evidence. No production guard or OAuth behavior change; Maven FREE to parent.

Reviewed after Admin native13/focused24 GREEN. No Java/test source edits and no Maven execution for this review. Existing unrelated legacy lifecycle assumptions were not used to classify product behavior.

## Confirmed harness root cause

`LegacyTestingWrites.java:16-19` is a component-scanned @Configuration implementing WebMvcConfigurer, with required ProjectService and JdbcTemplate constructor arguments. Spring includes MVC configuration in @WebMvcTest even when only a different controller is selected. The retirement slice actually failed during context construction with `UnsatisfiedDependencyException: legacyTestingWrites ... No qualifying bean of type ProjectService`; no request behavior was executed. Replacing this unrelated configuration with a test-only @MockitoBean made the context load and exposed the three real report HTTP RED failures. After production fixes, the same slice passed3 tests and the preexisting report security slice passed2.

Adding only ProjectService would merely expose the next missing JdbcTemplate dependency. Neither dependency belongs in these controller slice scopes. Do not alter production guards or make them conditional just to load an unrelated test context.

## All @WebMvcTest slices in current source

| Slice | Source annotation | Tests | LegacyTestingWrites status |
|---|---|---:|---|
| DefaultProfileSecurityTest | config/DefaultProfileSecurityTest.java:19 |1|Unbounded; neither required dependency nor configuration mock/exclusion supplied |
| InventorySecurityTest | admin/InventorySecurityTest.java:19 |2|Unbounded; same constructor failure expected |
| AdminSecurityTest | admin/AdminSecurityTest.java:21 |3|Unbounded; imports real Overview but only mocks IdentityService/WorkItemStore |
| AdminManagementSecurityTest | admin/AdminManagementSecurityTest.java:20 |3|Unbounded; only business service/identity mocks |
| ProjectNotesSecurityTest | notes/ProjectNotesSecurityTest.java:23 |4|Unbounded; only Note service/identity mocks |
| ProjectStatusReportRetirementTest | admin/ProjectStatusReportRetirementTest.java:26 |3|Already bounded by @MockitoBean LegacyTestingWrites; actual report service and filters remain real; GREEN |
| ProjectStatusReportSecurityTest | admin/ProjectStatusReportSecurityTest.java:19 |2|Already bounded by same test-only mock; GREEN |

Five unbounded slices total13 test methods. This is a source-based prediction from the confirmed matching context failure, not a claim those five were executed. ApiExceptionHandlerTest uses standaloneSetup and is unaffected by component scanning. Full SpringBoot/native/container contexts supply real dependencies and must retain actual guards.

`FeatureIssueLegacyWrites.java:12-20` is also MVC configuration but has no dependencies, so it does not cause this construction error. Its interceptor paths are only project work-items/qa; none of the seven selected controllers maps these paths. It can remain real in all seven slices. There is no evidence requiring a mock or exclusion for it here.

## Bounded proposed fix, not applied

Add exactly `@MockitoBean vn.syp.tms.feature.LegacyTestingWrites legacyTestingWrites;` in each of the five unbounded slices, matching the two observed GREEN slices. Alternatively add an ASSIGNABLE_TYPE excludeFilter for LegacyTestingWrites to those @WebMvcTest annotations. Keep SecurityConfig, SessionAccountFilter/identity, CSRF, RequestIdFilter, advice, selected controllers and each test's existing real/mock service seams unchanged. Do not disable all filters, broaden component scanning or add fake database/project services. Do not exclude either guard from native retirement tests or broad application context.

After parent grants a Maven slot, run the five slices to observe the predicted context RED, apply the chosen bounded test-only change, then rerun them with the two passing report slices. A context-construction RED is a harness defect, not evidence of changed API status/permission behavior. Broad unit selector may then run normally, preserving separate explicit native coverage.

## Offline selector caveat

Run-Backend-Units.cjs currently checks only each leaf source for SpringBoot/native/environment markers. FeatureAiIntegrationTest and FeatureLegacyRetirementIntegrationTest inherit FeatureIntegrationTest's @SpringBootTest and integration environment condition but do not repeat those leaf markers. The source selector therefore lists them as offline units although their inherited gate will skip under its sanitized environment. Resolve the superclass chain or explicitly inventory these two as native to avoid counting inherited gated tests as offline coverage. This is an inventory accuracy issue; no claim that they contacted a DB offline. The runner supplies no DB credentials and strips inherited provider/runtime environment.

Skills: code-review -> compare exact controller slice annotations, configuration constructors and prior failure; security-review -> preserve real security filters and native guards; codebase-design -> distinguish slice dependency boundaries from application composition; verification-loop -> distinguish confirmed failure, observed GREEN, source prediction and unexecuted proposal.

## Staged updater, not applied

`Stage-WebMvc-GuardMocks.cjs` is outside Backend. Its fixed allowlist contains exactly the five unbounded slices above. It inserts only a fully qualified MockitoBean annotation/type field for LegacyTestingWrites immediately inside each class, preserving all existing imports, assertions and line endings. All five source files are preflighted before mutation; each replacement uses a sibling temporary file and atomic rename. An unexpected class shape or ambiguous existing reference refuses the update; failed partial execution rolls back only the updater's exact replacements without overwriting collaborator changes. Reapplication is byte-idempotent. Filesystem atomicity is per file, with all-file preflight and bounded rollback; no multi-file filesystem transaction is claimed.

Preparation checks: Node syntax PASS; in-memory --self-test PASS for all5, including second-application equality and exact reversal of the single inserted field; --check reports PREPARED_NOT_APPLIED/wouldChange5. Neither check writes Backend. No Maven or apply mode was run. Parent must first confirm broad-unit actual context RED, then explicitly coordinate `rtk proxy node var/fixreports-2026-10-19/Stage-WebMvc-GuardMocks.cjs --apply-confirmed-harness-red` under its source/Maven mutex.

Parent has separately updated the offline selector to walk inherited base classes, resolving the two inherited-native inventory caveats noted above; no selector source change was made by this agent.

## Actual RED and bounded GREEN after parent grant

Broad offline run74 classes/645 tests at02:29:21 confirmed precisely the predicted five context failures:13 errors with the LegacyTestingWrites→missing ProjectService constructor cause. This was context startup, not failed role/status assertions. Separate FileWorkServiceTest line109 failed its old empty-count null expectation against the explicitly approved R03/C05 zero contract; no other failure existed in that first run. Original evidence: backend-full-units-red.log, backend-unit-first-red-inventory.json.

The updater was applied once after this observed RED. Exact five fields were added, with no security/test assertion changes. The five slices plus both preexisting bounded report slices passed18/18, zero skips, BUILD SUCCESS02:31:02; seven XML reports copied under harness-green/. Actual filters/controller/service seams stayed as documented. Parent then explicitly approved changing only the two FileWork executionRate/passRate null assertions to0d with an R03/C05 comment; all milestone, saved activity and build-query checks remain intact.

Second full offline run645 tests: zero context errors and zero FileWork failures, but one distinct ChatGptOAuthClientTest.refreshAndDiscoveryShareOuterCatalogDeadlineAndValidationTimeoutRequiresReconnect assertion expected AI_UNAVAILABLE and received AI_RECONNECT_REQUIRED at02:32:51. Evidence preserved as backend-full-units-second-red.log, chatgpt-oauth-second-full-red.xml/.txt and backend-unit-second-red-inventory.json. No OAuth code/assertion changed by this agent. Parent paused new Maven runs for bounded owner diagnosis; no blind retry or whole-suite GREEN claim at this checkpoint.

## Final completion

Parent and independent core review approved a test-only latch fixture for the identified deadline/settlement race. No production OAuth code or expected error code was changed. Token response is immediate, discovery is held explicitly, and only a terminal reconnectRequired vault write is blocked through originating caller expiry. terminalWriteEntered must be observed (early refresh failure cannot falsely pass), AI_BUSY is asserted while admission is fenced, and both latches release in finally before close. Original1s/<2s bound and settled reconnect/one-refresh/no-Plan-client checks remain. See oauth-latch-candidate/README.md for exact call-chain reasoning and approved candidate provenance.

Bounded OAuth3/3 GREEN at02:37:17; oauth-latch-bounded-green.xml and scoped coverage copied. Final entire offline selector74 classes/645 tests GREEN at02:38:45, zero failures/errors/skips, verify/package BUILD SUCCESS. No blind rerun: this final run followed the explicit approved test fixture correction. Final log backend-full-units-final-green.log; backend-full-units-jacoco.xml and backend-full-units-coverage-summary.json retained. Native/container/live53 classes are independently inventoried, not counted as skipped unit tests.

Measured whole instrumented production bundle from offline units only: instruction46.04%, branch45.57%, line49.60%, method42.93%. These figures do not merge separately executed native/browser checks and are not claimed as overall application coverage or80%. Critical audit vocabulary scoped instruction/branch/line100% is separately measured in audit-vocabulary-unit-coverage.xml. Maven explicitly returned to parent after evidence copy; source frozen. Parent owns subsequent main snapshot/native/browser gates and shared ledger.
