# Final whole-change review — AI providers and private chat

Date: 2026-10-10. Reviewed baseline `66eeaf02a147b1d913bbc4e8192ff3b92d2c2b61` through `90a07c9a9e8e55afe64c5390d7eb522d22c5af5b` on `system-design` using `final-review.diff`.

**Verdict: REQUEST CHANGES — ready to merge with fixes to FR1–FR3.** No Critical finding. Two lifecycle defects and one missing result-provenance feature remain. Live acceptance is a separate gate, not the reason for this verdict.

## Scope and method

Reviewed the packaged whole-change diff in chunks, the approved spec (section 0 and its local implementation decisions take precedence), implementation plan, planning state, handover and task reports/re-review evidence. Used the supplied `requesting-code-review/code-reviewer.md` rubric and `code-review-and-quality` skill. Focused unchanged-source inspection was limited to the real logout/account/session policy, Spring route/CSRF integration, and existing analysis-result rendering needed to confirm concrete findings. A few tool-truncated portions were recovered with smaller reads.

Static review only: no test suites, browser/runtime/network calls, secrets, database changes, source mutations, git mutations or subagents. The skill's mutation-testing suggestion was not performed because this review is explicitly read-only. Only this report is written. Findings below are source-supported; no new runtime reproduction is claimed.

## Spec alignment and strengths

- Three explicit providers are integrated with existing role-scoped analysis; omitted provider retains OPENAI_API. General chat constructs an empty project snapshot. Thread provider/model/scope and per-turn provenance are persisted; model output cannot execute business writes.
- V24 adds provenance without rewriting an applied migration. V25 adds private chat/FK/expiry/admission state. Owner and current role/source checks precede deduplication and stored reads; native evidence covers reassignment, account changes, archive/closed-cycle policy, concurrency and fresh/upgrade migration.
- Generation is outside database transactions. Short transactional reservation/completion, server-resolved provider selection, shared inference admission and same-key retrieval prevent routine double-click/retry duplication. Reconnect completion uses a connection fence.
- Local OAuth uses fresh state/nonce/PKCE, an issued registration, a loopback callback and fixed-issuer JWKS validation. Credentials are encrypted in an external vault with process/file protection. Callback and probe settlement explicitly reread the captured Spring Session. No Codex credential reuse or cross-owner token sharing was introduced.
- Partial/failed/incomplete streams cannot become READY. Response bodies and prompt envelopes are bounded. Errors are mapped to safe codes, and React renders model/output/source text as text.
- The frontend preserves unsent text, isolates account changes, pins existing chat provenance and guards late detail reads against newer POST outcomes. Setup/startup helpers preserve existing API and local identity settings, use app-specific binding and avoid global generic Spring persistence.
- The synchronous deadline, external metadata vault and archived/closed-source readonly-history decisions are reasonable for this local scope. Their costs and crash-before-vault-commit limitation are documented. None by itself warrants an async worker, extra connection tables or a broad rewrite.

## Critical

None found.

## Important

### FR1 — A received rotating refresh response can be discarded before settlement, allowing reuse of the consumed token

**Location:** `Backend/src/main/java/vn/syp/tms/ai/ChatGptConnectionService.java:402` (refresh/validation catch through line 410), `Backend/src/main/java/vn/syp/tms/ai/ChatGptOAuthClient.java:25`.

After `oauth.refresh` successfully returns replacement credentials, the same try block performs discovery/JWKS I/O to validate a returned ID token. A transient timeout or failure in that later validation is handled as a temporary *refresh* failure. `recordRefreshFailure(..., terminal=false)` retains the old refresh token and VERIFIED state, and the newly received rotating credentials never reach retained settlement. The next catalog/generation request sends the old refresh token again. A temporary identity-discovery outage can therefore force an avoidable reconnect or trigger refresh-token reuse rejection/revocation.

This is different from the explicitly accepted abrupt-process-loss window: the process is alive and has received the replacement. The previous settlement fix correctly protects already-validated tokens during lock/vault contention, but the boundary starts too late for this path.

**Existing evidence exposes the gap:** `Backend/src/test/java/vn/syp/tms/ai/ChatGptOAuthClientTest.java:62`, `refreshAndDiscoveryShareOuterCatalogDeadlineAndTransientTimeoutRetainsVerification`, returns a successful refresh with a rotated token before delaying discovery. It asserts timeout and preserved VERIFIED state, but never retries and checks which refresh token is used.

**Fix:** Distinguish failure before a successful refresh response from failure after consuming it. Retain the received replacement in a fenced, non-admissible validation state and retry only the remaining validation/local persistence, or fail closed to an explicit reconnect state. Do not admit a new refresh with the consumed old credential. Do not accept an unvalidated ID token as active identity.

**Focused regression:** Return a rotating response, fail discovery/JWKS transiently, then perform a second catalog/token request. Assert the old refresh token is never transmitted again; readiness is not exposed until validated settlement, or the connection explicitly requires reconnect. Also retain the stale-connection fence.

### FR2 — Chat/draft completion does not revalidate the actual session after logout or session rotation

**Location:** `Backend/src/main/java/vn/syp/tms/ai/LocalAiAccess.java:18`, `Backend/src/main/java/vn/syp/tms/ai/AiProviderGateway.java:45`, `Backend/src/main/java/vn/syp/tms/ai/AiChatStore.java:38` and `:129`.

`current(actor)` checks the request thread's SecurityContext principal and the identity account version. Chat completion adds a fresh identity-row lock/version check. Neither verifies that the originating Spring Session still exists and still belongs to that principal. The actual logout route (`Backend/src/main/java/vn/syp/tms/identity/AuthController.java:65`) invalidates the session without incrementing `identity_users.lock_version`; login rotates the session ID at line 51. An already-running inference request retains its original request context and can therefore commit/return READY after the originating session was logged out or replaced. All three provider paths use this completion boundary; ChatGPT's `requireLocal` checks a captured request session but does not call `verifySession` either.

OAuth callback/probe already solve precisely this stale-wrapper problem with `verifySession`; their safety does not carry over to ordinary chat/draft inference. Frontend account guards reduce accidental display but cannot enforce the backend lifecycle contract. This is not a claim of general cross-owner reads: normal subsequent requests still go through authentication and ownership checks.

**Test gap:** `NativeAiChatTest.changesDuringInferenceCannotPersistAnswer` models `SESSION` by incrementing the account version. It does not exercise real logout/session deletion or session-ID rotation with the same unchanged account version.

**Fix:** Capture the initiating session identity and principal for generation, then reread that exact session from the repository before provider admission and before final result acceptance, in addition to existing account/role/source checks. Apply consistently to chat and routed drafts. Reject the result and settle the reserved row as a sanitized failure when the originating session has been invalidated or changed.

**Focused regression:** Block a provider response, invalidate/delete or rotate the original persisted Spring Session while leaving the account version unchanged, then release it. Assert no READY content is persisted or returned. Keep a separate test proving that ordinary valid-session completion still succeeds.

### FR3 — Saved analysis results and history omit their persisted AI provider/model

**Location:** `Frontend/src/app/features/ai/AiAssistantPage.jsx:136` and `:155`.

The new selector controls the next analysis request, but the result panel only labels creation/expiry and state, while history labels title/date/state. Neither renders `draft.provider`/`draft.model` or their history equivalents. After generating with Ollama and selecting ChatGPT, or reopening a result produced by a different source, the only visible source/model belongs to the current selector. Users cannot establish which provider/model produced the saved analysis. The approved design explicitly requires source/model labels on results/history; the backend already supplies this provenance, and chat correctly displays it.

**Fix:** Add persisted provider and actual returned model to the analysis result and history entries, with sensible legacy/default handling. Keep them bound to each saved DTO independently of the current selection. Requested-model alias can be shown separately if useful.

**Focused regression:** Open a READY draft from provider A while provider B is selected; assert result/history still identify provider A and its stored model, including after changing the selector and after reload.

## Minor and explicit deferred-item triage

### FM1 — Receipt-time token expiry shifts during delayed persistence retries

**Location:** `Backend/src/main/java/vn/syp/tms/ai/ChatGptConnectionService.java:414` and `:443` (also callback token acceptance at `:270`).

Confirmed Task1 M1. `updateTokens` derives absolute expiry from `Instant.now()` each time a retained action retries. A long filesystem outage can make an already-expired token appear locally usable, causing a subsequent avoidable provider authentication failure. This does not extend the token's real provider validity or grant extra access. **Nonblocking minor; defer with a tracked follow-up, or fix alongside FR1 while touching that boundary.** Capture the response receipt time/absolute expiry once and reuse it through validation and settlement. A deterministic delayed-settlement test should assert expiry is unchanged.

### FM2 — Dense production UI obscures lifecycle reasoning

**Location:** `Frontend/src/app/features/ai/AiChat.jsx:113` and `:144`; `Frontend/src/app/features/ai/AiConnections.jsx:61` and `:89`.

Confirmed Task3 R3. Multi-statement async operations and very long JSX lines make owner/request/provenance changes unnecessarily difficult to review. The existing generation/revision guards are meaningful; rewriting the state architecture solely for style is not required. **Nonblocking maintainability follow-up:** expand action blocks and extract focused transcript/provenance/connection controls where that removes duplicated reasoning. Preserve the existing behavioral race tests; do not combine a wholesale state rewrite with the lifecycle fixes.

### FM3 — Build-size and coverage advisories remain evidence limitations

Confirmed Task3 R4: production JS was reported at 618.84 kB (175.98 kB gzip), above Vite's 500 kB advisory. Historical whole-FE function coverage is 79.45%; scoped AI coverage is separately measured and above 80% in its four reported metrics. Task1 focused AI-package coverage is 70.1% lines/50.7% branches. **Nonblocking for this feature; retain explicit technical debt.** Do not infer whole-product acceptance or coverage from passing test counts. Route splitting should follow a separate measured performance assessment, not an arbitrary threshold-only rewrite.

Task4's RTK no-hook message is tooling noise, not a product finding; no test rerun is justified by it.

## Verification evidence and exact limits

- Inherited provider fix round 2: 96 selected Maven tests, no failures/errors/skips; compile/package PASS. Native provider/draft evidence includes 18 passing cases on an isolated schema.
- Inherited chat evidence: 18 final native chat tests after the closed-cycle fix, 18 native draft tests, fresh/upgrade migration and source/account/concurrency coverage. Scoped chat coverage and changed-store-only coverage are correctly distinguished in the handover.
- Root reported the final full frontend regression at the reviewed HEAD: **64 files / 720 tests PASS, 32.90 seconds**, log `var/ai-providers-chat/frontend-final.log`. Production build remains the previously passing `7c4ec0` build; no subsequent frontend source change was reported. No new whole-FE coverage measurement accompanies this run.
- Inherited helper checks: 27 PowerShell cases and 4 Node cases PASS; helper coverage NOT_MEASURED. Structural contract/diff checks PASS; frontend standalone lint/typecheck NOT_CONFIGURED.
- Controller fixture HTTP/browser evidence covers authenticated roles, source selection, private history/replay/CSRF, general/project chat, copy/minimize/drafts and measured desktop/mobile bounds. Its 10 synthetic provider calls, 7 READY plus 2 FAILED turns and 2961-byte maximum sampled request are fixture evidence only.
- Controller reports local helper setup for `admin.local`, backend 8080 health UP at V25 and preservation of 66 old tables/6055 old rows. This review did not independently inspect operational secrets, connect to the database or repeat runtime checks.
- Main owner login remains PENDING_USER_LOGIN; official OAuth/consent/probe and actual ChatGPT entitlement/schema/content quality have not passed live acceptance. Native Ollama is not installed/accepted. Historical API quota failure does not establish today's balance. MySQL 9.7/Flyway support advisory and Mockito future-JDK advisory remain disclosed.

## Declined to judge

- Real ChatGPT account eligibility, consent, route/model entitlement and business output quality: requires the user's official authorization and a separately authorized live probe/UAT; excluded from this read-only review.
- Native Ollama performance/quality and hardware suitability: no installed runtime/model and no authorized model installation or inference in this review.
- Hosted/shared-account deployment or distributed credential settlement: explicitly outside the personal-local implementation; the documented process-loss/reconnect limitation is accepted for this scope.
- Whether archive/cycle closure should revoke already-authorized history: the explicit implementation ruling preserves readonly history; changing that business policy requires a separate decision.
- Whole-product UAT/pilot readiness, unrelated earlier sprint defects, repository integration/PR/merge state and remote publication: outside the supplied baseline-to-HEAD code review; no inference from these feature tests.
- Full dependency vulnerability inventory and infrastructure fault/load benchmarking: no dependency changes in this package and no runtime/network auditing was authorized; this is not a security-certification or capacity result.

## Readiness

**Ready to merge: With fixes (FR1–FR3).** Retain FM1–FM3 explicitly in the minor ledger. The architecture and existing regression evidence support completing this change with focused fixes, rather than broad reimplementation. Re-review the changed paths and their focused behavioral evidence; do not repeat unrelated passing suites. Closing the code-review gate must remain separate from user login/live-AI acceptance and S11 UAT.
