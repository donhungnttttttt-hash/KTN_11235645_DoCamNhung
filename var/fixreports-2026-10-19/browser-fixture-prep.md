# FR12 isolated browser fixture/runtime preparation

Prepared by admin/search agent. New files only: `Backend/src/test/java/vn/syp/tms/testcase/FixReportsBrowserFixtureTest.java`, `Seed-browser-runner.cjs`, `Start-Isolated.cjs`, `Frontend/scratch/fixreports-vite.config.mjs`. No Maven/fixture/runtime command was executed by this agent. Existing8080/5173 services, main database, local profile/vault and credentials are unchanged.

## Fixture shape

Dedicated opt-in `TMS_FR_BROWSER_FIXTURE=true` AND `TMS_TEST_FEATURE_MODE=integration`. Database registration reuses FeatureIntegrationTest.database for exact loopback3307/schema `tms_docstest_2060e04c986c`, actual DATABASE check, providers/bootstrap/Redmine disabled and cleanup crons off. Test additionally requires final Flyway33 and no existing project code SPIDER-PLUS.

Seven synthetic users cover four roles: Admin, main PM, Tester A/B, DEV, another project's PM and one standalone unassigned Tester for the global member picker. The second Tester makes1–40/41–60 ownership meaningful; the other PM makes the other project genuinely outside the main PM's membership for AI/read-scope checks. All use PasswordEncoder and the visibly synthetic known password constant `FIXTURE_PASSWORD` in test source only. Manifest stores usernames/IDs/roles, never passwords or hashes. No real account is adopted or modified.

Project/member/Feature/import/Issue/Status/Note/report setup uses public MockMvc APIs with session principal and CSRF. Identity repository is used only for these fresh synthetic identities; DB reads check isolation and retrieve membership IDs. Exact SPIDER-PLUS code is necessary for the approved overview content matcher. Admin creates this isolated project without membership; explicit project roster is PM/Tester A/Tester B/DEV. Other project belongs only to its own PM.

Feature A and B each receive byte-identical internal60 and customer60 workbooks with literal source IDs `1`…`60`; all remain Unexecuted and initially unassigned for browser testing. Feature C contains5 internal rows, assigned to Tester A, with2 Unexecuted/OK/P/NA and verified60%. Linked closed case Bug plus case QA are in A; own monkey in A and DEV-assigned monkey in B support badge, manual status, ownership and delete checks. Two AVAILABLE IPAD assets are created through the public Admin API without allocation; their IDs are in the manifest. One synthetic Note and saved Markdown report are included. Manifest contains project/Feature/document/Issue/Note/report IDs and ordered row/case/revision/source identities.

Manifest `browser-fixture.json` is reserved with CREATE_NEW **before any fixture writes**, then checkpointed. READY only appears after every step passes. Interrupted/failing seed leaves IN_PROGRESS/FAILED_NEEDS_RECONCILIATION and known identities/stages instead of silently rerunning. Runner refuses an existing manifest or seed log, and no automatic clean/delete/reseed is implemented.

## Prepared execution order — root grant still required

1. Core completes/reconciles exact schema206 V33; root grants a Maven slot.
2. `rtk proxy node var/fixreports-2026-10-19/Seed-browser-runner.cjs --seed-authorized`
3. Confirm seed Maven result and READY manifest. Seed verify produces the packaged application jar; runtime never builds or installs anything.
4. Root grants runtime start: `rtk proxy node var/fixreports-2026-10-19/Start-Isolated.cjs --start-authorized`
5. Root uses CUA on `http://127.0.0.1:5174`; backend is loopback8081. Login usernames are in browser-fixture.json; synthetic password is only the fixture source constant.

Both runners validate actual schema/version and failed-migration state before work. Start checks the packaged jar's maximum embedded Flyway migration equals33, refuses occupied8081/5174 and an existing runtime manifest, and uses only the existing packaged jar/Vite dependency. Child environment is an OS allowlist plus explicit isolated DB/provider settings; inherited SPRING/TMS/API keys/JAVA_TOOL_OPTIONS/local-profile variables are not forwarded. Spring config is explicitly the packaged classpath application.yml with distinct fr-browser-isolated profile, no local config import/vault. Java and Vite are spawned hidden and detached on Windows with stdout/stderr only in ignored logs. PIDs/ports/state are recorded without secrets. Startup failure stops only PIDs created by that invocation and retains the failed manifest for reconciliation. No existing process is automatically stopped or adopted.

## Checks and limits

Parent execution update: seed1 test PASS/BUILD SUCCESS02:08:17; READY main project156, other157, seven synthetic users and AVAILABLE assets1/2. Execution was by parent under its own Maven grant, not this agent. Parent also owns runtime/browser verification. An initial runtime held the shared target jar and blocked a later package rename; this preparation now copies a unique immutable jar into var and records backendJar before launch. The copy/start change passed node syntax check and has not been executed by this agent.

* `rtk proxy node --check` on both CJS runners and Vite config: PASS.
* Node import of the Vite config and assertions for loopback5174, strictPort and8081 proxy: PASS; this does not start a server.
* Prepared files trailing-whitespace check: PASS.
* browser-fixture.json and isolated-runtime.json both absent after preparation, confirming no seed/start by this agent.
* Root/core's shared testCompile caught two misplaced MockMvc builder parentheses (150/152); fixed together atomically, then notified both owners. This is a harness compile defect, not a product RED. Full Java testCompile confirmation pending root/core result.
* Maven, seed, runtime startup, endpoint health and browser journeys: NOT_RUN by this agent at this checkpoint. Exact V33 availability is deliberately enforced at future execution, not assumed from source.

Skills applied: api-design→public API/session/CSRF setup; security-review→exact schema, synthetic credentials, bounded env/process scope, no secret logs; deprecation-and-migration→final-version/refuse-reseed/data preservation; frontend-patterns→dedicated Vite config preserving5173; verification-loop→syntax/config checks separated from unrun fixture/runtime/browser evidence. Existing approved test seams and root's explicit fixture task authorize this preparation; no approval flow or new service was introduced into product UI.
