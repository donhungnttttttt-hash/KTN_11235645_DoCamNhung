# Private AI chat API

## FixReports update — 2026-10-19

This dated section supersedes the project-only target/background and run-based metric descriptions below. It preserves the10/18 October owner-private history, provider gateway, local pending composer, request-key, retention and connection/session rules except where explicitly changed here. [FixReports contract](fixreports-contract.md), [permissions](../business/permissions.md), [Feature metrics](../business/metrics.md), [management reports](reporting.md). Source documentation does not assert main-database migration/cutover or UAT.

`GET /api/v1/ai/projects` returns the server-authorized selector list `{id,code,name,archived,myRole}[]`: global PM/ADMIN may read all projects for AI; Tester/DEV only authorized memberships. `GET /api/v1/ai/projects/{projectId}/features` returns `{id,name,archived}[]` under the same read policy. The frontend must not substitute the normal project CRUD catalog to infer broader AI grants. Broader PM AI reads do **not** grant Feature/Issue/Note/report/project writes outside ordinary project authority.

Selected-project thread creation is now:

```json
{"provider":"OPENAI_API","model":"gpt-4.1-mini","projectId":123,"purpose":"PROJECT_CHAT","targetId":456}
```

`targetId` is an optional **Feature ID** belonging to selected project123; null means the whole project. The client cannot send group/run/document IDs as a Feature mapping. MY_PROJECTS keeps projectId=null,targetId=null; the server determines its project set. Changing project/Feature/provider/model starts a fresh future thread while retaining a newer unsent composer draft. Existing thread/in-flight provider/model/scope remain pinned. Server source references/permission fingerprints remain authoritative and are not browser-supplied grants.

The chosen project/Feature is the target; background context is independently server-policy controlled. PM/ADMIN can receive authorized cross-project management facts. Tester/DEV can ask about case/Issue details in their authorized scope and personal file/case/Issue work; management totals/reports and bulk export remain denied by API/retrieval/output policy. Outside their scope, only whitelisted anonymized experience may be returned, without project/person IDs, names, raw documents or exact private counts. Private chat, provider credentials and other users' connections are never facts. Model output cannot change assignment, Status, Issue or report records.

Current facts use Feature-owned case identity and Status: tested=OK+NG+P+NA, total includes NA, empty total gives0 progress; 2Unexecuted+OK+P+NA is3/5. Do not reconstruct reset history or infer actual testers from old workbook labels; record-based experience must identify its limitations. The old cycle/run/NA-exclusion portfolio formula below is historical for retained data, not current Feature reporting.

The old workspace/Admin AI menu is retired. The existing Chat toolbar **Cấu hình AI** reuses the shared source/model/connection selector; no second provider implementation or credential store. Scope/config/settings/history controls respect pending/thread locks, project/Feature catalog responses are canceled or ignored after scope changes, and source configuration errors open the in-chat panel. `/ai` and `/admin/ai` explain the move and open the existing launcher.

Legacy file-group threads retain authorized owner-private history; new generation through retired file scope returns410 `AI_LEGACY_SCOPE`. Saved management reports are separate durable text records, not chat/draft rows, and are not removed by seven-day chat cleanup. Live provider/output behavior and actual isolated HTTP/browser evidence remain separate from frontend API mocks and source inspection.

## Original10/18 October contract and verification history

Implemented on `system-design`, 2026-10-10 and extended18/10. Uses the [provider gateway](ai-providers.md); no second credential or provider implementation. All endpoints require an active TMS session. POST requires the existing CSRF token. General chats contain no project snapshot. Selected-project chats pin PROJECT_CHAT with no target; legacy role-purpose chats retain their task/target. Changing provider, model or scope requires a new thread.

## DTOs

Follow-up18/10: chat selection is scope-only. New selected-project conversations use `projectId=<authorized id>,purpose="PROJECT_CHAT",targetId=null`; server constructs a `project-chat-v1:<SHA256>` reference for that project's active membership/global authority. No file/ticket/task selection is needed. Missing project selection in the UI maps to existing MY_PROJECTS. Old General and role-purpose conversations retain their original contract. The selected-project context is checked at read/reserve/complete, does not include other projects, and is invalidated when that project's permission/version changes; an unrelated project's membership change does not invalidate it. Archived project conversations are readonly. V30's project constraint already permits this combination, so no migration is introduced.

`POST /api/v1/ai/chats` body:

```json
{"provider":"OPENAI_API","model":"gpt-4.1-mini","projectId":null,"purpose":null,"targetId":null}
```

Provider/model defaults follow the gateway. Legacy role-purpose project context uses the exact purpose/target options from the existing project AI metadata/targets endpoints. PROJECT_CHAT needs only its project ID. General context requires all three scope fields to be null/omitted. Thread creation validates TMS scope but does not call inference or require an active provider connection.

From 2026-10-18, multi-project context accepts `{"provider":"OPENAI_API","model":"gpt-5.6-luna","projectId":null,"purpose":"MY_PROJECTS","targetId":null}`. The server selects active memberships; global ADMIN includes all projects. `sourceReference` is generated server-side as `portfolio-v1:<SHA256>` over the ordered project/role/membership-version grants and global role. A browser cannot supply a project list or reference to grant access. Existing General/Project threads keep their original scope.

Portfolio scope is fixed to the permission set at creation. List/detail/history/reservation/completion recheck it; any addition/removal/role or membership-version change requires a new thread. Old portfolio threads are omitted from lists and return404, including same-key replay, while the current scope differs. This deliberately prevents reading an answer or feeding model history from a project the user no longer may access. Each chat is still owner-private; ADMIN's project authority does not grant access to someone else's chat.

Portfolio snapshots disclose `asOf`, `totalProjects`, `includedProjects`, and `truncated`; at most30 projects enter the initial snapshot, with further reduction to the existing16000-byte provider budget. Metrics reuse ReportMetrics, counting run items from non-DRAFT cycles, latest result, NA scope exclusions and pending P. Own-case metrics use ACTIVE cycles; own-case and own-work samples contain up to5 records per project and are filtered by the actor's membership ID. General project KPI aggregates remain within the same member reporting permission already used by ReportingService. Archived projects contribute identifying metadata only. Model output cannot change business records.

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

UI update 2026-10-18: submitting clears the composer and shows a local pending question immediately, before thread creation/inference completes. This preview is not evidence of persistence or a READY result. Replace it with the returned turn without duplication; preserve a newer composer draft. After an unknown transport/server outcome, inspect using the original key. A persisted FAILED turn can be explicitly resent with a new key. The provider instructions now name the required single `text` field as well as the JSON schema; malformed `answer` objects remain rejected. See [live chat verification](../reviews/2026-10-18-caheo-chat-send.md).

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
