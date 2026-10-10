# AI providers — Task 1 review fixes

Date: 2026-10-10. Base: `5bafacf`. Scope: findings R1–R5 in the Task 1 independent review. No paid inference, live OAuth account access, runtime restart, schema changes or push.

## Changes

- **R1 — operation deadlines and coordination.** Public catalogs now share a five-second deadline across refresh, discovery/JWKS and catalog transport. Nested deadlines only shorten the caller's deadline. Refresh uses a separate fail-fast lock; state and database completion use a short fail-fast fence. Provider network calls hold neither that fence nor a database transaction. A concurrent generation returns `AI_BUSY` without sending a second refresh or inference; disconnect can clear/version-fence the connection while refresh is in flight. A refresh result cannot restore disconnected credentials. Busy state/completion coordination returns immediately rather than queuing behind database work. The existing 25-second refresh/inference and maximum 30-second API transport bounds remain; database/filesystem stalls follow their existing infrastructure limits rather than a hard real-time promise.
- **R2 — explicit plan consent.** Authorization body now supports `enablePlanPermission:true` with `newAccount:false`. It requires an existing verified registration, reuses its issued client ID and requests complete scopes with `prompt=consent`. Ordinary reconnect does not force consent; `force_reconsent` is not used. Missing permission continues to block inference.
- **R3 — refresh recovery.** OAuth error parsing is separate from inference parsing and accepts only known machine codes. Unusable refresh errors clear tokens/verification/scopes, increment the connection version and persist `RECONNECT_REQUIRED`, while retaining the issued client/subject mapping. Subsequent use fails without another refresh request. Temporary failures retain credentials and last verification and expose a sanitized temporary failure. Rotating refresh success atomically persists replacement credentials and clears the temporary error. `invalid_client` remains a distinct configuration error.
- **R4 — structured errors before/after streaming.** HTTP and failed SSE events use the same allowlisted mapping, including ChatGPT plan usage-limit, usage-unavailable, eligibility, authorization, unsupported-capability and rate errors. Failed SSE remains failed after text deltas. Unknown messages are never forwarded. A usage-limit error does not imply the whole plan balance or a reset time.
- **R5 — recover issued registrations.** A state/session-validated callback persists owner-bound pending issued-client metadata before exchange. This is separate from active verified identity/tokens. Failed or lost exchange can be followed by fresh authorization with that client ID after restart; fresh state, nonce and PKCE are generated. Unvalidated registration metadata cannot authorize inference.

The connection service's security-sensitive methods were expanded into readable blocks. The mistakenly tracked scratch report was removed with `git rm --cached`; its local file is retained. Tracked review evidence is this document. Root-owned planning files were not changed.

## Verification

Applied skills: `api-design`, `tdd-workflow`, `security-review` as in the initial task. All shell commands used RTK; external requests in tests target in-process loopback fixtures only.

Before fixes, the following command reproduced **four behavioral failures** in 17 tests: plan limit mapped as rate limit, SSE temporary failure mapped as incomplete, lost issued-client metadata, and verification lost on transient refresh failure.

```text
rtk proxy mvn -f Backend/pom.xml '-Dtest=AiProviderSafetyTest,ChatGptConnectionServiceTest' test -q
```

Final verification passed **87 tests, zero failures/errors/skips**, including compilation/package and JaCoCo report:

```text
rtk proxy mvn -f Backend/pom.xml '-Dtest=AiProvider*Test,ChatGpt*Test,AiDraftServiceTest,AiAssistanceServiceTest,OpenAiResponsesClientTest,OpenAiConfigurationTest,AiAccessTest,AiDraftContentTest,AiContextBudgetTest' verify -q
rtk git diff --check
```

New regression evidence includes:

- Latch-controlled model refresh concurrent with gateway generation and disconnect: generation fails promptly without provider inference; disconnect finishes before the refresh latch is released; stale rotated credentials are discarded.
- Latch-held database completion fence: competing disconnect fails promptly with `AI_BUSY` and makes no change.
- Public Ollama catalog with a stalled fake HTTP response: fails under the five-second budget (asserted below six seconds).
- Delayed OAuth refresh followed by discovery under a one-second caller budget: nested catalog/refresh wrappers do not extend it; no model request occurs and prior verification remains intact.
- Real in-process OAuth HTTP exchange/refresh/discovery/JWKS fixtures with generated RSA ID token: verifies PKCE/redirect form parameters, audience/nonce/subject, rotating refresh response and terminal versus temporary errors.
- Explicit consent parameters versus ordinary reauthorization; pending issued-client persistence across restart; terminal invalidation prevents a second refresh; successful rotation prevents unnecessary subsequent refresh.
- Existing owner/session isolation, encrypted vault/tamper/process-lock, partial SSE, usage counts, draft reconnect fencing and legacy API tests continue to pass.

Measured AI-package JaCoCo coverage from this focused run: **799/1162 lines (68.8%)**, **596/1184 branches (50.3%)**. This remains below the skill's 80% target; it is not full-system coverage. Root previously reported **18/18 native V24 migration/Spring/MockMvc tests**; unchanged schema tests were not rerun in this fix wave. Flyway MySQL-version and Mockito future-JDK warnings remain environment follow-ups.

## Frontend handoff and remaining gates

See [provider API contract](../api/ai-providers.md). New UI-facing elements are `enablePlanPermission`, `RECONNECT_REQUIRED`, `AI_RECONNECT_REQUIRED`, `AI_OAUTH_INVALID_CLIENT`, and the documented `AI_BUSY` retry behavior. A temporary refresh error can accompany `VERIFIED`; that timestamp remains historical verification evidence, not a promise of present availability. Keep the same request key after uncertain inference and never switch providers automatically.

Live user OAuth consent, actual plan entitlement/schema capability, native Ollama model quality/performance and UAT remain operational gates. These tests do not spend credits or establish user-account acceptance. No balance/reset estimates are supplied.
