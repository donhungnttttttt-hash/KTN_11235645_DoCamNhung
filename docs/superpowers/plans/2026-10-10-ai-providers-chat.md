# AI Providers and Floating Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Let TMS users explicitly select ChatGPT, API or Ollama and use a persistent, private floating AI chat.
**Architecture:** Keep existing permission-scoped AI contexts/drafts. Introduce owner-scoped provider selection and a local ChatGPT OAuth connection, then reuse these transports for database-backed chat. UI mounts a single chat per authenticated account and never silently changes providers.
**Tech Stack:** React JavaScript, Spring Boot/Java21, MySQL/Flyway, existing native PowerShell tooling.
**Spec:** `docs/superpowers/specs/2026-10-10-chatgpt-plan-connection-design.md`, especially approved extension section0.

## Global Constraints

- Work on system-design; do not overwrite existing docs/var or modify old migrations. Existing source baseline66eeaf0. All shell commands start with rtk.
- Task code may be committed only with its exact files, no push/merge/deploy by workers. Root keeps changes local. Latest user instruction revoked standing push authorization; push only after a new explicit request. No business test writes in tms; native integration uses isolated test schema.
- Credential tokens never enter browser storage, API responses, logs, git or ordinary DB fields. Explicit local enablement and loopback request checks for ChatGPT connect/probe/use; no remote multi-user token sharing.
- TMS identity/role/source ownership always enforced. Session version changes, project archive and ticket reassignment must be checked after inference and before every stored read.
- Never automatically switch provider/retry billable generation. Request key binds provider/model/scope/user input; same key reads prior result, altered intent returns409.
- New UI retains typography tokens, teal theme, 44px touch targets and mobile16px inputs. No generated HTML injection.
- Tests must reproduce behavior failures before implementation, then cover relevant changes. No paid/live calls in automated tests. Record coverage as measured or not measured.

## Review Focus

- Same user reconnects while inference is running: stale connection output must not be committed (Tasks1/2).
- SSE returns partial text then failure: no READY/save-as-success (Task1).
- User changes account/project while delayed fetch resolves: no stale chat or credential UI (Task3).
- Reassigned ticket remains in persisted chat history: recheck source on thread/list/turn reads (Task2).
- Ollama model text or provider errors contain markup/secrets: safe text plus sanitized errors only (Tasks1/3).

## Task1: Provider selection, local OAuth and draft integration

**Files:** Existing `Backend/src/main/java/vn/syp/tms/ai/{AiDraft*,AiAssistanceService,AiContextService,OpenAi*}.java`; create focused provider/ChatGPT OAuth/vault/controller classes in same package and corresponding tests. Add V24 for draft provider provenance (choose next unused version at execution), configuration examples/docs. Do not implement chat tables yet.
**Interfaces:** Provider codes `OPENAI_API`, `CHATGPT`, `OLLAMA`. Add `AiProviderGateway.Selection(String provider,String model)` and a server-validated/resolved selection. Preserve legacy draft calls without provider as OPENAI_API. Gateway generates normalized JSON Output using server instructions/data/schema and actor identity; exact signatures and endpoint response examples recorded in `docs/api/ai-providers.md` for Tasks2/3.
- [x] Test rejection of unauthorized selection, malformed model, quota vs rate errors, missing/failed terminal SSE, excessive response, unsafe Ollama URL, OAuth replay/state/nonce/PKCE and owner isolation before implementation. Use in-process fake HTTP servers.
- [x] Implement API adapter preservation; Ollama `/api/tags` and `/api/chat` nonstream structured JSON, loopback URL from server config only; ChatGPT official OAuth/PKCE/ID-token validation, protected runtime credential store, sequential refresh, model list and explicit probe. Use current official docs; no copied existing Codex session.
- [x] Expose authenticated `/api/v1/ai/providers` metadata and owner-scoped connect/attempt/models/probe/disconnect routes. No API key required for independent ChatGPT/Ollama enabled providers. Errors always sanitized; connection-ready only after completed schema-valid probe. Define DTO examples in contract.
- [x] Integrate selection/provenance/idempotency into current draft pipeline. Keep supported synchronous bounded transport or add bounded worker if necessary; clearly document chosen timeout contract so frontend never triggers duplicate inference. Preserve role and source checks.
- [x] Run meaningful provider/OAuth/draft tests, compile; write exact results and public interfaces to report. Commit task files.

## Task2: Persisted private chat API

**Files:** Create `AiChatController`, `AiChatService`, `AiChatStore`, focused tests, next unused migration and `docs/api/ai-chat.md`. Reuse provider contract from Task1 and context/access services, avoid a second OAuth or provider implementation.
**Interfaces:** `GET/POST /api/v1/ai/chats`, `GET /api/v1/ai/chats/{id}`, `POST /api/v1/ai/chats/{id}/messages`. Thread creation pins provider/model plus nullable projectId, purpose and targetId; general thread has no project data. Send body `{text,requestKey}`. Return persisted thread/turn state with safe error codes, original user message and validated assistant content; exact DTOs documented before Task3.
- [x] Write failing ownership/scope/expiry/idempotency tests: no cross-user read, ticket reassignment denies old thread, same key does not repeat provider call, changed text key conflicts, interrupted provider never stores success, account/project changes during call deny completion.
- [x] Implement own tables for threads/turns and TTL7days cleanup, owner and source checked on each list/read/write. General chat requires active authenticated identity. Project context uses existing role/purpose/target preparation; history input only recent10 successful turns, maximum2000chars/user message and bounded total prompt. No arbitrary SQL/tools/provider endpoints.
- [x] Persist pending intent before provider call, outside long transaction; bounded pending lifetime and concurrency, per-user/day limit and explicit retry with new key. Store immutable model/provider provenance and sources, preserve failed user message. Safe no-content failure rows and follow-on context excludes failed output.
- [x] Run unit and isolated native MySQL fresh/upgrade/race tests appropriate to migration. Record unavailable conditions honestly. Commit task files and report.

## Task3: Provider chooser and Messenger-style floating chat

**Files:** `Frontend/src/app/features/ai/*`, `Frontend/src/app/services/api/ai.js`, authenticated app/layout mount points only; add focused behavior tests. Consume actual contracts from Tasks1/2.
**Interfaces:** Shared owner-scoped selection/connection UI for analysis and chat. Existing AiWorkspace gets explicit provider/model payload. One global authenticated chat drawer; project context explicit and pinned to each thread. No frontend token storage.
- [x] Write RED tests for provider selection sent to analysis; not-ready provider action; late result after account/project switch; minimize preserves unsent text; Enter/Shift+Enter; poll/retry same request id and source-expired denial.
- [x] Add source selector above task selector exactly where screenshot requests, with clear billing/source text and link panel. ChatGPT opens official authorization window through server flow; guarded fallback link if popup blocked. Probe and disconnect distinguish identity/grant/readiness. Ollama shows installed models/reachable status and actionable setup note.
- [x] Add teal floating launcher and responsive chat panel, transcript scroll, focus return/Escape, readable status/errors, new thread/history/copy, no busy full-page overlay. Avoid conflict with existing modal/chat widgets; authenticated mount resets memory on logout/user change. All data renders text.
- [x] Verify targeted and full FE tests/build; Chrome desktop and375px UI, keyboard and no page overflow. Do not send paid AI requests for visual checks. Commit task files and report.

## Task4: Integration, live local setup and handover

**Files:** Configuration examples/scripts if needed, AI product/API/review docs and planning STATUS.
**Interfaces:** Completed Tasks1–3, existing8080/5173 runtime and native3307.
- [x] Whole-change security/quality review; resolve concrete defects with focused tests.
- [x] Verify isolated migration then update authorized local backend and frontend. Check provider metadata/chat persistence through real HTTP with fixture provider or local Ollama where available, not fabricated model success.
- [ ] Present working local ChatGPT connect action for user-owned authentication; no password/credit purchase. User completing OAuth is required for live ChatGPT acceptance, not for code/test completion.
- [x] Run final relevant test/build checks, update API/usage documentation and exact live limitations. Keep local commits on system-design; push cancelled under latest user instruction, no merge.

## Execution record

Detailed progress/review evidence is in `var/ai-providers-chat/progress.md` during execution, then summarized in tracked review docs. Tasks execute sequentially with independent reviews; no parallel implementation workers. Expanded user instruction authorizes implementation, including Ollama/chat originally deferred by design. No new general approval requested.

Final code gate: f51a753 fixes FR1–FR3/FM1; scoped independent re-review approved. Main8080 V25 healthUP, preservation69tables/6060rows; frontend721PASS, native22+18PASS, affected backend82distinctPASS. Main browser confirms source chooser/chat/provenance; no live generation. Remaining unchecked connection step requires owner admin.local login, official consent and model-specific probe. Rollback request was cancelled before source changes; all three sources and chat remain. Do not push without a new explicit user request.
