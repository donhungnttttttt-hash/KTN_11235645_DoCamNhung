# Final AI provider/chat lifecycle fixes — 2026-10-10

Scope: retained ChatGPT/API/Ollama and private chat on `system-design`, following final review at `90a07c9`. The brief rollback request was cancelled before source rollback. This batch fixes FR1–FR3 and FM1 only. No push, merge, deployment, live AI, browser operation, operational-secret inspection or business-database writes.

## Finding disposition

- **FR1 fixed:** refresh transport failure before a successful token response retains the existing transient-error behavior. After a successful response, any identity/token validation failure instead schedules fenced, durable `RECONNECT_REQUIRED` invalidation. Old refresh/access/identity tokens and verification are removed; a vault failure keeps admission closed while only local persistence retries. Disconnect/reconnect fencing remains effective. Unvalidated replacement identity is never activated.
- **FM1 fixed:** callback and refresh capture absolute token expiry immediately after receipt. The same expiry is used through validation and every retained persistence attempt. A package-private clock seam permits deterministic delayed-validation/settlement regression tests.
- **FR2 fixed:** routed draft and chat generation capture immutable initiating session ID/principal. The actual Spring Session repository is checked at capture, before inference, and immediately before accepting the result under the existing completion fence. Logout/session rotation with unchanged account version produces a sanitized failed reservation, HTTP 401 and no stored READY content. Existing account/role/source checks and provider connection fences remain in place.
- **FR3 fixed:** analysis result and every history entry display their own persisted provider and actual model. Missing legacy provider defaults to `OPENAI_API`; missing model is described explicitly. Current selector changes do not relabel saved results.
- **FM2 deferred (nonblocking):** expand dense chat/connection action blocks and extract focused controls in a separate maintainability change, retaining race regression tests. No broad UI/state rewrite in this batch.
- **FM3 deferred (nonblocking):** measure route-splitting/performance separately. Current build is 619.11 kB JavaScript / 176.06 kB gzip, above Vite's 500 kB advisory. Historical whole-FE function coverage 79.45% and historical AI-package coverage limitations are not replaced by passing counts.

## RED → GREEN evidence

- Refresh regression initially failed: expected `AI_RECONNECT_REQUIRED`, received `AI_UNAVAILABLE` after a successful rotating refresh and validation outage. Tests cover next request/restart without reuse, vault retry/admission closure, and the disconnect fence. The HTTP discovery timeout fixture also checks only one refresh transmission and explicit reconnect after settlement.
- Two deterministic expiry cases initially failed: receipt-based expected `1791594000` was replaced by `1791594120` after delayed validation and `1791601200` after local retry. Both callback and refresh retain the receipt-based value after the fix.
- Native session RED: all four chat/draft × delete/rotate cases failed **expected HTTP 401, actual 200**, with original persisted session absent and identity `lock_version=0`. The other 18 native chat cases passed. Correct RED run took 51.930 seconds. Early fixture iterations had inaccessible JDBC implementation types/wrong cookie setup; those are harness failures, not lifecycle RED evidence. The final fixture uses the application's `TMS_SESSION` cookie and actual JDBC session repository.
- Native session GREEN: **22/22**, zero failures/errors/skips, including ordinary valid completion, source/account changes, reservation concurrency and all four session invalidations. Each invalidation also checks FAILED state and null content. Package/verify passed. Schema exclusively `127.0.0.1:3307/tms_docstest_202610100012`; resets were constrained to that exact schema. Existing fresh V25 / upgrade V24→V25 preservation checks passed; no migration file changed.
- Native draft regression: **18/18 PASS**, zero failures/errors/skips, 43.101 seconds total including verify/package and existing migration checks. The test authentication helper now persists the actual session used by routed generation.
- Final backend selection: **82 distinct tests passed across the final affected runs**. Clean compile succeeded (158 main / 95 test sources). Six suites passed **55/55**: chat service 25, draft service 8, provider authorization 4, provider integration 8, provider safety 7, OAuth HTTP 3. The connection suite initially had one Mockito restubbing error in its new fence test; after correcting the fixture with `doAnswer`, only that affected suite was rerun: **27/27 PASS**, verify/package PASS, 18.477 seconds. No production change was needed for that harness correction.
- Frontend provenance RED failed because persisted labels were absent. GREEN focused `AiAssistantPage.test.jsx`: **11/11**. Mixed Ollama/API legacy history survives selecting ChatGPT, reloading history and reopening either result.
- Final full frontend: **64 files / 721 tests PASS**, 35.93 seconds. Final production build PASS, 1716 modules, 5.01 seconds. No repeated full frontend run after this unchanged source.

## Commands and boundaries

From repository root (frontend commands from `Frontend/`):

```text
rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests ChatGptConnectionServiceTest
rtk proxy node scripts/Test-FileWorkQaNative.cjs tms_docstest_202610100012 fresh-migration NativeAiChatTest
rtk proxy node scripts/Test-FileWorkQaNative.cjs tms_docstest_202610100012 fresh-migration NativeAiDraftTest
rtk proxy npm test -- --run src/app/features/ai/AiAssistantPage.test.jsx
rtk proxy npm test
rtk proxy npm run build
rtk git diff --check
```

Clean scoped backend command from `Backend/`:

```text
rtk proxy .\mvnw.cmd -B -ntp clean verify "-Dtest=ChatGptConnectionServiceTest,ChatGptOAuthClientTest,AiProviderAuthorizationTest,AiProviderIntegrationTest,AiProviderSafetyTest,AiDraftServiceTest,AiChatServiceTest"
```

The final affected-suite rerun used the `Test-Backend.ps1 -Tests ChatGptConnectionServiceTest` command above. `git diff --check` PASS. Retained terminal/Surefire evidence is under `var/ai-providers-chat/` (untracked); the controller may restart main only after the successful package.

Coverage measured by JaCoCo on the **last 27-test connection-suite run only**: `ChatGptConnectionService` lines **378/413 (91.53%)**, branches **209/300 (69.67%)**. That same narrow run covers the entire AI package at **463/1467 lines (31.56%) / 265/1358 branches (19.51%)**; other service/session classes are deliberately absent from that last execution file. These figures are neither the combined 82-test coverage nor whole-product coverage and do not meet an 80% branch gate. Combined batch coverage NOT_MEASURED; no test-count inference or coverage expansion was performed. Earlier whole/package measurements remain separately scoped historical evidence.

Skills applied: `tdd-workflow` for behavior-first regressions; `security-review` for session identity, fail-closed credentials, sanitized failure and source authorization; `verification-loop` for targeted/native tests, builds and diff review. Self-review only in this report; the controller owns the subsequent scoped independent re-review.

No new FE coverage measurement; standalone frontend lint/typecheck NOT_CONFIGURED. No Docker or unrelated backend suite. MySQL 9.7/Flyway support and Mockito future-JDK advisories remain. Test fixtures do not establish official OAuth entitlement, live provider quality, Ollama acceptance, S11 UAT or production readiness. Operational restart and root-owned planning/handover updates are owned by the controller.
