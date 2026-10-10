# Task 1 — AI provider implementation report

Date: 2026-10-10. Branch: system-design. Source baseline a3bb2af (original application 66eeaf0). Task scope: provider/backend/draft only; no frontend/chat tables/root planning changes. No runtime restart, live paid AI request, push or production database writes.

## Implemented

- Common `AiProviderGateway`: OPENAI_API (legacy default), CHATGPT, OLLAMA; normalized selection, server catalog validation, shared output type and sanitized failure codes. Current TMS identity checked independently of API-key configuration.
- Native Ollama `/api/tags` and nonstream `/api/chat` with server-owned JSON schema, installed model validation, literal loopback URL only, bounded transport, redirects disabled, no model downloads.
- Official ChatGPT dynamic registration with fresh PKCE/state/nonce, ephemeral 127.0.0.1 callback listener, 5-minute attempt expiry and owner binding. Issued client ID is used for exchange/reused for reauthorization. JWKS RSA signature, issuer, audience/authorized party, expiry, nonce and returning subject validation. No Codex credential reuse. Original TMS session reread from Spring Session repository at callback acceptance (a captured HttpSession object alone is insufficient after logout).
- AES-256-GCM runtime credential vault outside checkout, external 32-byte key, owner-only filesystem permissions, atomic replacement and exclusive process lock. Durable verified connection/model, monotonic version, probe request/result/date data and interrupted-probe recovery. Sequential refresh and rotating-token replacement; disconnect clears credentials first and reports whether remote revocation succeeded.
- ChatGPT Responses SSE rejects absent/failed/incomplete terminal events, refusals, oversized data and incomplete/malformed JSON. It uses store:false and stream:true and omits max_output_tokens. Probe uses synthetic fixed input with TMS draft schema, five per UTC day, persistent idempotency; READY only after schema validation and current-connection check.
- Authenticated metadata/connect/status/cancel/catalog/probe/disconnect endpoints under `/api/v1/ai/providers`.
- Draft integration preserves legacy calls, TMS role/source/TTL checks and short DB transactions. Provider and requested alias are part of request identity; model snapshot is stored separately. Connection monitor fences completion transaction against reconnect. V24 adds provider/requested-model/connection provenance; NativeAiDraftTest now expects V24 after checking V23 upgrade.
- One concurrent inference per owner, two process-wide, no waiting queue. New-provider catalog resolution has 5-second bound; refresh/inference shares 25-second bound. Legacy API maximum is 30 seconds. No automatic generation retry/provider switching.

## Exact contract and files

The full DTO payloads, endpoint routes, configuration examples, deadline/retry contract, vault/security decisions and official references are in `docs/api/ai-providers.md`.

Public gateway signatures:

```java
Selection(String provider, String model)
ResolvedSelection(String provider, String model, String connectionId, long connectionVersion)
Selection normalize(Selection requested)
ResolvedSelection resolve(String actor, Selection requested)
OpenAiResponsesClient.Output generate(String actor, ResolvedSelection selection,
    String instructions, JsonNode data, String schemaName, JsonNode schema)
void assertCurrent(String actor, ResolvedSelection selection)
<T> T withCurrent(String actor, ResolvedSelection selection, Supplier<T> save)
```

Callers authorize source/context, deduplicate stable input, reserve outside inference, validate output schema, and use `withCurrent` around the transactional completion store method. Output retains `value,responseId,model,inputTokens,outputTokens`. A browser must never supply a trusted ResolvedSelection.

New production classes (all `Backend/src/main/java/vn/syp/tms/ai/`): AiProviderController, AiProviderGateway, ChatGptConnectionService, ChatGptCredentialVault, ChatGptIdToken, ChatGptOAuthClient, ChatGptPlanClient, ChatGptSse, LocalAiAccess, LocalAiConfiguration, OllamaClient, ProviderHttp.

Modified existing classes: AiAssistanceService, AiContextService, AiDraftController, AiDraftService, AiDraftStore, OpenAiResponsesClient. Added V24__ai_provider_provenance.sql; modified AiDraftServiceTest and NativeAiDraftTest. Added AiProviderAuthorizationTest, AiProviderIntegrationTest, AiProviderSafetyTest, ChatGptConnectionServiceTest, ChatGptCredentialVaultTest, ChatGptIdentityTest. Contract/report are task documentation.

## Verification

Skills applied: api-design (DTO/server contract), tdd-workflow (tests first), security-review (credential/OAuth/permission review). Read repository planning/AGENTS and RTK instructions. All shell calls prefixed with rtk; only native Windows tools used.

RED evidence: `rtk proxy mvn -f Backend/pom.xml -Dtest=AiProviderSafetyTest test -q` failed before implementation with missing LocalAiConfiguration/AiProviderGateway/ChatGptSse/ProviderHttp symbols, after writing rejection expectations. Initial identity test run also failed while implementation classes were absent. Subsequent behavior tests exercised new components and regressions without external inference.

Final command:

```text
rtk proxy mvn -f Backend/pom.xml '-Dtest=AiProvider*Test,ChatGpt*Test,AiDraftServiceTest,AiAssistanceServiceTest,OpenAiResponsesClientTest,OpenAiConfigurationTest,AiAccessTest,AiDraftContentTest,AiContextBudgetTest' verify -q
```

75 tests pass, no errors/failures/skips. This includes compilation/package/JaCoCo report. Fake HTTP tests cover Ollama catalog/request/output, ChatGPT completed SSE payload, partial-then-failed stream, oversized response, missing usage rejection and redirects. RSA fixtures cover signature forgery, nonce/audience/issuer/expiry/subject mismatches. Connection tests cover state/PKCE, replay/cancel/owner/session rejection, missing issued ID, duplicate callback params, probe readiness/dedupe/restart/daily limit/interruption, remote revocation failure and reconnect during probe. Vault tests run owner-only encryption, restart roundtrip, concurrent-process lock and authenticated tamper rejection on the current Windows filesystem. Draft regression rejects stale-connection completion and preserves legacy API tests. Repository-backed session test proves logout invalidates callback even while the captured wrapper still has its old authentication attributes.

Coverage was measured by JaCoCo, not inferred from test count. The AI package is below the skill's 80% target in this focused unit run (approximately 63% lines / 47% branches); untouched context/store paths and controller/native integration are not comprehensively covered here. Do not describe this as full-system coverage. `var/ai-providers-chat/task-1-coverage.ps1` prints exact package counters from the generated report. `rtk git diff --check` passed.

## Explicit handoff/limitations

- Native V24 fresh/upgrade and Spring full-application/MockMvc tests are handed to Task2/root's isolated-schema runner. NativeAiDraftTest was updated but NOT executed here; no claim that V24 has run on the user's database.
- Actual user OAuth/plan entitlement/probe needs interactive authorization; no such live acceptance performed. Ollama is not installed on this machine, so actual native model quality/performance is unverified.
- Callback token-exchange service is mocked in connection lifecycle tests; HTTP adapter tests and RSA verification tests cover transport and signature validation separately. Expiry uses production wall clock; no 5-minute sleep-based expiry test. Refresh sequencing is synchronized in code; no real provider rotation test.
- One local owner and one active registration are deliberate initial scope. Reauthorization retains issued registration metadata; choosing a new account replaces the active registration only after validation. The local vault key/path must remain private and stable; key loss requires reconnect rather than plaintext fallback.
- OAuth uses RS256 signing keys only and fails closed on unsupported algorithms; provider schema/protocol changes need explicit adaptation. Byte limits bound acceptance, not provider billing.
- Usage policy: adapters reject missing/nonintegral/negative/out-of-range token counts as AI_INVALID_RESPONSE; no default zero or estimated counts are saved. A provider whose current route omits usage therefore fails explicitly until nullable-usage support is added. Probe day counters/idempotency persist in the vault; project daily generation limits remain in MySQL, so restart does not reset them. API's pre-existing per-minute process rate limiter is unchanged.
- No full native controller run, paid API call, end-to-end user OAuth, or business quality acceptance claimed. Root will perform independent review and the later task integration.
