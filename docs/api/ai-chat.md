# Private AI chat API

Implemented on `system-design`, 2026-10-10. Uses the [provider gateway](ai-providers.md); no second credential or provider implementation. All endpoints require an active TMS session. POST requires the existing CSRF token. General chats contain no project snapshot. Project chats pin the project, role-specific purpose and target. Changing provider, model or scope requires a new thread.

## DTOs

`POST /api/v1/ai/chats` body:

```json
{"provider":"OPENAI_API","model":"gpt-4.1-mini","projectId":null,"purpose":null,"targetId":null}
```

Provider/model defaults follow the gateway. Project context uses the exact purpose/target options from the existing project AI metadata/targets endpoints. General context requires all three scope fields to be null/omitted. Thread creation validates TMS scope but does not call inference or require an active provider connection.

Returns **201**, Location header, and `Thread`:

```json
{"id":123,"projectId":null,"purpose":null,"targetId":null,"sourceReference":null,"provider":"OPENAI_API","model":"gpt-4.1-mini","createdAt":"2026-10-10T04:00:00Z","expiresAt":"2026-10-17T04:00:00Z"}
```

`GET /api/v1/ai/chats?before=0` returns `{"items":[Thread],"nextBefore":null}`. Threads are newest first. Pages scan at most 50 owner rows, excluding currently inaccessible sources. A non-null `nextBefore` continues the scan, including when `items` is empty due to revoked permissions.

`GET /api/v1/ai/chats/{id}?before=0` returns `{"thread":Thread,"turns":[Turn],"nextBefore":null}`. Latest 50 turns, ordered oldest to newest within the page; pass non-null `nextBefore` to fetch older turns. `0` means newest page. IDs and cursors are numeric. Dates are UTC ISO-8601.

`POST /api/v1/ai/chats/{id}/messages` body:

```json
{"text":"Giải thích cách viết test case","requestKey":"chat-random-unique-key"}
```

Returns a persisted `Turn`, **200** for READY/FAILED or **202** for an already pending duplicate:

```json
{"id":456,"threadId":123,"requestKey":"chat-random-unique-key","text":"Giải thích cách viết test case","state":"READY","content":{"text":"Câu trả lời dạng văn bản","sources":[]},"failureCode":null,"provider":"OPENAI_API","requestedModel":"gpt-4.1-mini","model":"gpt-4.1-mini-2025-04-14","connectionId":null,"connectionVersion":0,"contextTruncated":false,"createdAt":"2026-10-10T04:01:00Z","completedAt":"2026-10-10T04:01:02Z","expiresAt":"2026-10-17T04:00:00Z"}
```

Each source is `{ref,label,path,version}` from the authorized server snapshot. General chats have `sources:[]`. `content`, `model` and `completedAt` are null while GENERATING. FAILED has null `content` and `model`, a completed timestamp and a fixed `AI_*` failure code. User text remains unchanged, including whitespace, on READY and FAILED turns. Render both model and source labels as plain text; never inject HTML. Copy only `content.text` of a READY turn. No endpoint executes tools or changes business data.

## Persistence, authorization and limits

- Threads and their turns expire exactly seven days after thread creation. Expired rows are inaccessible before hourly cleanup (`TMS_AI_CHAT_CLEANUP_CRON`, default `0 10 * * * *`, UTC; `-` disables scheduling). Cleanup deletes at most 500 expired threads and cascades only their chat turns.
- Owner, account enabled/version, current project role/membership, archive status and ticket assignment/source access are checked on every list/detail/turn/history read, reservation and final save. Admin has no override for another owner's chat. Archived projects retain read-only access to existing chats, matching existing AI draft behavior; new creation/generation and completion require an active project. File-group chats also retain saved history and same-key retrieval after their cycle closes; the group must still belong to the project, and new generation/completion requires a non-CLOSED cycle. A reassigned ticket makes its old chat inaccessible. Provider disconnect does not erase accessible old results.
- Request keys are 8–64 ASCII letters/digits/underscore/hyphen, unique per owner across threads during retention. Same key and exact text returns the existing result, without new inference. Reusing a key for different text, thread, provider/model or scope returns **409 AI_REQUEST_CONFLICT**. After a timeout, poll GET or repeat the same key. Retry a failed request only on explicit user action with a new key. No automatic provider fallback or billable retry.
- Input is 1–2000 Java UTF-16 code units (matches browser `maxlength`); blank input is rejected. Context includes at most ten previous READY turns, excludes failed/pending output, and preserves the newest message. The full UTF-8 encoded provider request is bounded to 16000 bytes using escaped input/schema/instructions/model plus a conservative 1024-byte fixed-envelope reserve. Oldest history is discarded first, then snapshot text is compacted deterministically and trailing sources removed if necessary. `contextTruncated` discloses compaction; primary authorized snapshot and newest user message remain. An input which cannot fit safely is rejected.
- `TMS_AI_CHAT_USER_DAILY_LIMIT` defaults to **20**, range 1–100: separate limits of 20 new turns and 20 new threads per user per UTC day. This is a configurable operational cost/storage cap, not a customer business rule. Pending/failed attempts count; duplicate keys do not. **429 AI_DAILY_LIMIT** signals the cap.
- Database admission allows one pending chat per user and two globally across app instances. Owner and admission rows are locked in short READ COMMITTED transactions, so a waiter sees the latest committed request and quota counts. **429 AI_BUSY** means no new turn was admitted. Provider gateway also enforces its existing process concurrency. Pending turns older than two minutes become FAILED/AI_INTERRUPTED on reads or new admission and cannot complete late. No database transaction spans provider network I/O.
- Each reserved turn records immutable requested provider/model, connection ID/version and authorized sources. Actual returned model is separate. Only complete, schema-valid output can become READY, and save runs inside the gateway's connection fence and a fresh authorization transaction. Account/project/source or connection changes during inference discard the output; the failed original question remains private in the database.
- Provider readiness failures after valid context preparation are persisted as FAILED turns. Validation, access and admission errors return the existing application error envelope. Missing/expired/foreign thread is 404; invalid scope/input 422; archived scope 409; changed session 401. Provider failure codes follow [AI providers](ai-providers.md), with AI_CONTEXT_CHANGED, AI_INTERRUPTED and AI_INVALID_RESPONSE for local lifecycle validation. Raw provider diagnostics, prompts, credentials and partial answers are never stored as errors.

## Verification on 2026-10-10

Skills applied: api-design, security-review, tdd-workflow. Native chat migration/authorization/race suite passed17 tests; existing native draft suite passed18, including legacy V23 provider provenance and fresh V25. AI/provider regression passed109 tests, followed by27 focused chat tests including14 additional invalid-output cases. Native tests used only owned schemas `tms_docstest_202610100008` and `tms_docstest_202610100010`. The native runner guards passed12 tests. No live provider inference or business database writes.

Initial implementation (`2515d62`) merged JaCoCo coverage for the four new `AiChat*.java` production sources: instructions94.32%, branches83.10%, lines91.94%, methods98.04%. This is measured scoped coverage, not whole-application coverage. Production classes were frozen during all final test runs. The earlier real-filter-chain403 regression also verified the necessary explicit authenticated provider/chat route matchers; CSRF, anonymous denial, local-owner restriction and future-route denial remain tested. Live model/user acceptance and frontend integration remain separate gates.

Review fix: closed file-group cycles initially made saved chat detail return404 (native RED17 pass/1 fail). Restricting non-CLOSED eligibility to writes restored readonly list/detail/same-key retrieval; the affected native suite then passed18/18, including completion-after-close denial and owner/membership checks. Fresh/upgrade verification remained on owned schema `tms_docstest_202610100008`; unchanged broad suites were not rerun. That final native run measured the changed `AiChatStore.java` at88/95 lines (92.63%) and44/56 branches (78.57%); this narrower native-only measurement does not replace the initial combined four-file coverage above.
