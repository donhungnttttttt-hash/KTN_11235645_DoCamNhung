# AI provider contract

Implemented on `system-design`, 2026-10-10. All endpoints require the current authenticated TMS session; mutations retain the application's CSRF protection. Provider errors expose fixed `AI_*` codes, never remote messages or tokens.

## Configuration

Legacy API settings stay unchanged. Local alternatives do not require an API key.

```dotenv
TMS_OLLAMA_ENABLED=false
TMS_OLLAMA_URL=http://127.0.0.1:11434
TMS_CHATGPT_LOCAL_ENABLED=false
# Required when ChatGPT is enabled: bind the application directly to loopback.
SERVER_ADDRESS=127.0.0.1
# Exact identity_users.id, NOT username. One TMS owner per local installation.
TMS_CHATGPT_OWNER_ID=
# Persist this installation UUID across runs, e.g. urn:uuid:<random UUID>.
TMS_CHATGPT_HOST_ID=
# Absolute directory outside the source checkout, e.g. C:/Users/admin/.tms-ai
TMS_CHATGPT_VAULT_PATH=
# Base64 of 32 cryptographically random bytes, supplied outside source control.
TMS_CHATGPT_VAULT_KEY=
```

The vault enforces owner-only Windows ACL/POSIX permissions, AES-256-GCM authenticated encryption, atomic replacement and a process lock. Keep the encryption key outside the vault/DB backups. Startup fails closed on invalid vault configuration. It contains credentials, verified registration metadata and durable probe history; MySQL contains only draft provenance. Only the configured TMS ID, using a direct `127.0.0.1` request without forwarding headers, can connect/probe/use ChatGPT. A second TMS user cannot share the registration, including an Admin. Disconnect keeps the issued client/subject mapping for reauthorization and removes tokens. `newAccount:true` explicitly starts a new registration.

Install Ollama natively and install a model through its official tools before enabling. TMS does not download models or create a server. Only literal `http://127.0.0.1:<port>` is accepted; credentials, arbitrary paths, queries, redirects, DNS hosts and browser-provided URLs are rejected.

## HTTP DTOs

`GET /api/v1/ai/providers`:

```json
{"providers":[
  {"code":"OPENAI_API","label":"API của hệ thống","enabled":false,"available":false,"reason":"AI_NOT_CONFIGURED","models":[{"id":"gpt-4.1-mini","label":"gpt-4.1-mini"}],"connection":null},
  {"code":"CHATGPT","label":"ChatGPT cá nhân","enabled":true,"available":false,"reason":"AI_CONNECT_REQUIRED","models":[],"connection":{"id":"UUID","version":1,"state":"UNVERIFIED","planPermission":true,"accountLabel":"n***@example.com","verifiedModel":null,"verifiedAt":null,"failureCode":null}},
  {"code":"OLLAMA","label":"Ollama local","enabled":true,"available":true,"reason":null,"models":[],"connection":null}
],"defaultProvider":"OPENAI_API","timeoutSeconds":30}
```

Ollama `available` here means enabled in server settings; a successful model-list fetch still must find an installed model. ChatGPT states: `DISCONNECTED`, `MISSING_PERMISSION`, `UNVERIFIED`, `VERIFIED`, `RECONNECT_REQUIRED`; verification is only evidence for the displayed model and connection version. No balances or entitlement are inferred. Temporary refresh failures retain the last verification and expose a sanitized `failureCode`/provider `reason`; terminal unusable-refresh errors clear tokens, increment the connection version and require reconnect. The issued client/subject mapping remains available for reauthorization.

`GET /api/v1/ai/providers/{OPENAI_API|OLLAMA|CHATGPT}/models?connectionId=UUID` returns `[{"id":"model-slug","label":"Display name"}]`. `connectionId` is required only for ChatGPT. Fetch ChatGPT models after authorization/restart before selecting/probing/generating: the cache is deliberately invalidated when connections change. Model labels and output are plain text, never HTML.

`POST /api/v1/ai/providers/CHATGPT/authorizations`, body `{"newAccount":false,"enablePlanPermission":false}` (body optional):

```json
{"attemptId":"UUID","authorizationUrl":"https://auth.openai.com/api/accounts/authorize?...","state":"PENDING","expiresAt":"2026-10-10T10:05:00Z"}
```

Open `authorizationUrl` on the same local machine. It contains state/nonce/PKCE challenge but no tokens. The callback is a separate ephemeral listener bound to `127.0.0.1`, with the exact `/auth/callback` path. Do not proxy it or add a browser callback endpoint. Fresh state, nonce, verifier and listener per attempt; 5-minute expiry, one active attempt, replay rejection. The original TMS session and account version must still be valid when callback credentials are accepted. Polling and scheduled cleanup also cancel attempts after logout/session changes.

For `MISSING_PERMISSION`, offer an explicit **Enable ChatGPT plan usage** action with `enablePlanPermission:true,newAccount:false`. This reuses the validated registration's issued client ID, requests the complete scopes and adds `prompt=consent`. Ordinary reconnect does not force consent. Combining consent recovery with `newAccount:true`, or requesting it without a validated registration, returns 422. Scope validation still gates all inference after consent.

An initial callback's issued client ID is persisted as owner-bound pending registration metadata before token exchange. If exchange fails or its response is lost, the next ordinary authorization reuses that pending issued client with fresh state/nonce/PKCE, including after restart. Pending metadata is separate from active verified identity/tokens and cannot enable inference. Explicit `newAccount:true` starts another registration; explicit plan-permission recovery targets the active verified registration.

`GET /api/v1/ai/providers/CHATGPT/authorizations/{attemptId}` returns `{"attemptId":"UUID","state":"AUTHORIZED","expiresAt":"...","failureCode":null}`. Other states: `PENDING`, `PROCESSING`, `FAILED`, `EXPIRED`, `CANCELLED`. `AUTHORIZED` does not mean inference works. `DELETE` at this URL cancels the attempt. Refresh provider metadata, then list models.

`POST /api/v1/ai/providers/CHATGPT/connections/{id}/probes`, body `{"model":"model-slug","requestKey":"probe-random-key"}`:

```json
{"requestKey":"probe-random-key","model":"model-slug","state":"READY","failureCode":null,"completedAt":"2026-10-10T10:01:00Z"}
```

This is an explicit inference request using only synthetic fixed data and the TMS draft schema. At most five new probes per UTC day; counters/results persist across restart in the protected vault. Same key returns the saved outcome; changed connection/model yields 409. `GENERATING` from an interrupted process becomes `FAILED`, never automatically retried. Retain the same key after timeout. Success verifies exactly that connection version/model. A partial SSE body, absent/failed terminal event, invalid schema or reconnect during inference produces failure.

`DELETE /api/v1/ai/providers/CHATGPT/connections/{id}?expectedVersion=1`:

```json
{"disconnected":true,"remoteRevoked":true,"message":"Disconnected."}
```

When `remoteRevoked:false`, show the supplied static message and direct the user to [ChatGPT usage/settings](https://chatgpt.com/#settings). Local credentials are removed and new use is blocked even if remote revocation fails.

Draft generation adds optional top-level `provider` and `model` to the existing `{purpose,targetId,requestKey}` body. Omitted provider keeps `OPENAI_API`; its omitted model resolves to the configured API model. ChatGPT and Ollama require an explicit model from their catalogs. Draft responses add `provider`, `connectionId`, `connectionVersion`, `requestedModel` alongside existing returned `model`. Requested aliases remain distinct from provider-returned model snapshots for retries. V23 records have a null requested alias; omitted-model legacy retries retain their original behavior. Provider/model/source/owner intent is checked before a key can be reused. Reading an existing draft does not require an active AI connection, but all existing TMS role/source/TTL checks apply.

Synchronous provider operations are bounded: public catalogs (Ollama and ChatGPT) share a 5-second deadline, including refresh/discovery/JWKS/catalog transport. New-provider refresh plus inference shares 25 seconds. Nested deadlines can shorten but never extend their caller's deadline. Coordination never waits indefinitely: concurrent refresh or a busy short state/completion fence returns `AI_BUSY` immediately, without a second refresh/inference call. Provider network I/O holds neither the state fence nor a DB transaction; disconnect can clear/fence credentials during an in-flight refresh, whose stale result is discarded. API transport retains its configured maximum 30 seconds. Frontend timeout remains above 30 seconds (existing 35 seconds); after uncertainty query/reuse the SAME key, never automatically issue a new key or switch provider. An `AI_BUSY` disconnect has made no local change; keep the connection shown and allow an explicit later retry. Database/filesystem work remains subject to its existing infrastructure limits; the advertised transport bound is not a hard real-time promise for stalled infrastructure.

Stable error actions: `AI_QUOTA_EXHAUSTED` includes an app-specific ChatGPT plan usage limit, so link to ChatGPT Usage without claiming the whole plan is empty or inventing reset times. HTTP and failed SSE events map the same allowlisted provider codes. `AI_UNAVAILABLE`/`AI_RATE_LIMITED` are temporary; preserve credentials and offer a later explicit retry. `AI_PERMISSION_DENIED` needs grant/account/route review. `AI_OAUTH_INVALID_CLIENT` needs configuration correction. `AI_RECONNECT_REQUIRED` means confirmed unusable credentials were cleared. Unknown diagnostic strings stay sanitized. A failed SSE event always fails the request, including after text deltas.

## Java boundary for chat/task handlers

```java
public record AiProviderGateway.Selection(String provider, String model) {}
public record AiProviderGateway.ResolvedSelection(
    String provider, String model, String connectionId, long connectionVersion) {}
Selection normalize(Selection requested); // Stable intent, no provider network call
ResolvedSelection resolve(String actor, Selection requested); // Current actor, allowed model/readiness
OpenAiResponsesClient.Output generate(String actor, ResolvedSelection selection,
    String instructions, JsonNode data, String schemaName, JsonNode schema);
void assertCurrent(String actor, ResolvedSelection selection);
<T> T withCurrent(String actor, ResolvedSelection selection, Supplier<T> save);
```

Authorize context/source first, deduplicate stable user intent before resolving, reserve in a short transaction, generate outside it, validate domain JSON, then call `withCurrent(..., () -> store.complete(...))`. That callback must enter the proxied short transactional store method, recheck session/role/project/source and persist only while the connection remains current. Do not serialize a resolved selection supplied by the browser or trust arbitrary `connectionId`/version values. `Output` fields are `value,responseId,model,inputTokens,outputTokens`; failures use existing `OpenAiResponsesClient.Failure.code()`. Callers own schema validation and sanitized persisted failure handling.

Official contracts consulted: [registration/PKCE/JWKS](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), [refresh/revocation](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions), [models and terminal SSE](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference). ChatGPT uses the public Responses endpoint, `store:false`, `stream:true`, and omits `max_output_tokens`; byte acceptance caps do not promise a provider cost limit. Actual user authorization/probe and native Ollama model acceptance remain separate operational checks.
