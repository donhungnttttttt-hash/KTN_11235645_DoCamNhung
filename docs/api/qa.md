# QA và hàng chờ bàn giao: contract Q01–Q03

Ngày 06/10/2026; QA riêng đã được duyệt. Typed QA/policy/chứng cứ và UI/handoff đã qua source review cùng test liên quan; native/HTTP/UAT chưa được xác nhận. Contract máy đọc: [QA/handoff OpenAPI](qa.openapi.json), bằng chứng tại [báo cáo](../reviews/2026-10-06-fq-implementation.md). Prefix `P=/api/v1/projects/{projectId}`. Session/CSRF/error envelope theo [work-items](work-items.md); enabled account/current session và active same-project member đọc, TESTER hoặc PM tạo. Effective global DEV không được create/confirm/PM commands dù membership mang role khác; Dev commands đòi current project DEV và global DEV. PM commands đòi current project PM/global không DEV, không chỉ generic ADMIN-member manager guard. QA dùng `work_items.id/item_no/item_key` và project counter hiện có. `work_items.status_code`, assignee, creator và lock_version là authority duy nhất. `qa_details` không có status/assignee riêng. BUG/REQUEST/TASK/IMPROVEMENT giữ policy của chúng.

## Context và DTO

ID >0, version ≥0, requestKey `[A-Za-z0-9_-]{8,64}`, title trim 1–300, question/body 1–20000, reason/basisReference ≤1000. Source optional, nhưng nếu có phải thuộc cùng project và source document COMMITTED/case active. Revision được truyền phải tồn tại; QA không yêu cầu revision đã duyệt hoặc attempt NG. Nếu có run, pin case/revision từ run; nếu có group+run, run phải thuộc group; nếu group+document phải đúng document. Các identity được cung cấp phải nhất quán, service resolve/snapshot rõ, không bỏ qua field mâu thuẫn. QA không có actual result, fixed build, BUG policy hoặc coverage.

```text
Create = {title,question,priority?,categoryId?,milestoneId?,
          documentId?,groupId?,runItemId?,revisionId?,requestKey}
Assign = {assigneeMembershipId,reason,expectedVersion,requestKey}
Command = {reason,expectedVersion,requestKey}
ProvideInfo = {body,expectedVersion,requestKey}
Answer = {body,basisReference?,expectedVersion,requestKey}
Confirm = {answerId,answerVersion,body,expectedVersion,requestKey}
Close = {reason,exception:boolean,expectedVersion,requestKey}
```

Priority defaults MEDIUM, allowlist HIGH/MEDIUM/LOW. Creator/actor/time/status/type lấy từ server. Creator TESTER là người duy nhất được xác nhận answer; PM tạo QA có thể dùng PM close exception có reason, không giả Tester confirmation. Client không chọn Tester xác nhận hoặc Dev khi tạo; PM assign command riêng. Question/context bất biến trong scope này; bổ sung qua provide-info/comments, không viết lại nội dung lịch sử.

`basisReference` là tham chiếu văn bản/URL tối đa 1000 ký tự, không được server truy cập và không có giao thức `attachment:<UUID>` trong scope này. Không có attachment ID trong DTO Answer/Confirm hoặc FK từ câu trả lời tới tệp; không suy một chuỗi văn bản thành chứng cứ đã upload hoặc tham chiếu tệp được bảo vệ. Tệp QA vẫn qua policy upload/delete riêng. Nếu sau này bổ sung tham chiếu tệp có cấu trúc, phải kiểm tra cùng QA/dự án khi tạo và bảo vệ mọi tham chiếu trong lịch sử bất biến khi xóa.

| Method / path sau P | Body → response | Quyền |
| --- | --- | --- |
| POST `/qa` | Create → 201 `QaDetail`, Location tới `/qa/{id}` | TESTER/PM |
| GET `/qa` | page/size/mine/status/keyword → `Page<QaSummary>` | Member |
| GET `/qa/{id}` | QaDetail | Member |
| PUT `/qa/{id}/assignment` | Assign → QaDetail | PM |
| POST `/qa/{id}/start` | Command → QaDetail | Assigned DEV |
| POST `/qa/{id}/request-info` | Command → QaDetail | Assigned DEV |
| POST `/qa/{id}/provide-info` | ProvideInfo → QaDetail | Creator TESTER/PM |
| POST `/qa/{id}/answers` | Answer → QaDetail | Assigned DEV |
| POST `/qa/{id}/confirmations` | Confirm → QaDetail | Creator TESTER |
| POST `/qa/{id}/close` | Close → QaDetail | PM |
| POST `/qa/{id}/reopen` | Command → QaDetail | PM |
| GET `/qa/{id}/answers?page=0&size=20` | Page<QaAnswer>, answerVersion giảm dần | Member |
| GET `/qa/{id}/confirmations?page=0&size=20` | Page<QaConfirmation>, ID giảm dần | Member |
| GET `/work-items/{id}/history`, `/comments`, evidence routes | Existing resource identity, type-aware guards | Member/policy |
| GET `/handoff-queue?page=0&size=20&state=` | Page<HandoffRow> | PM |

List page ≥0/size 1–100; status allowlist phía dưới; keyword literal ≤255. `mine=true` uses current actor: DEV assigned items, TESTER created items, PM created/assigned items. No arbitrary userId impersonation. Work-item generic list/board/overview/type metadata must expose QA and QA-specific labels/capabilities without treating QA resolved as BUG awaiting verification. QA page envelope `{items,totalItems,page,size,totalPages}` consistent with work-items; sort updatedAt then ID descending.

```text
QaSummary = {id,projectId,itemNo,key,type:"QA",title,question,status,statusLabel,
             priority,categoryId?,milestoneId?,assigneeMembershipId?,assigneeName?,
             createdBy,creatorName,createdAt,updatedAt,version,generation,
             documentId?,groupId?,runItemId?,testCaseId?,revisionId?,
             currentAnswerId?,currentAnswerVersion?,currentConfirmationId?,capabilities}
QaDetail = {item:QaSummary,contextSnapshot,currentAnswer:QaAnswer?,
            currentConfirmation:QaConfirmation?}
QaAnswer = {id,workItemId,generation,answerVersion,body,basisReference,
            authorMembershipId,authorName,answeredAt}
QaConfirmation = {id,workItemId,generation,answerId,answerVersion,body,
                  confirmedBy,confirmerName,confirmedAt}
```

`createdBy` is membership ID (not user UUID). `contextSnapshot` carries only resolved source IDs and readable pinned labels/content; no BLOB/secret. Times ISO-8601 UTC. Null current pointers distinguish no current authoritative answer/confirmation from historical rows. Capabilities are booleans `canAssign,canStart,canRequestInfo,canProvideInfo,canAnswer,canConfirm,canClose,canCloseException,canReopen,canComment,canUploadEvidence`. `canClose` means ordinary confirmed closure; canCloseException exposes the already-approved explicit PM exception path for a nonclosed QA and requires an exception flag plus reason; it never fabricates Tester confirmation. Metadata type-specific labels: open=Câu hỏi mới; progress=Dev đang xác minh; clarify=Cần bổ sung thông tin; resolved=Đã trả lời; recheck=Tester đã xác nhận; closed=PM kết thúc. No new global statuses.

## Commands và vòng xử lý

| Command | Source state | Target / guards |
| --- | --- | --- |
| create | none | open; initial assignee NULL, generation 0 |
| assign | open/progress/clarify/resolved/recheck | open; active enabled DEV membership/global DEV; reason required |
| start | open/clarify | progress; current assigned DEV, reason required |
| request-info | open/progress | clarify; current assigned DEV, specific nonblank question in reason |
| provide-info | clarify | progress; creator TESTER/PM; nonblank body recorded in history and INTERNAL comment |
| answer | open/progress/clarify/resolved/recheck | resolved; current assigned DEV, nonblank body; append answer, clear confirmation |
| confirm | resolved | recheck; creator still active TESTER, exact current answerId/answerVersion/generation |
| close | recheck | closed; PM, current confirmation belongs to current answer/current generation; reason required |
| close exception=true | any nonclosed QA state | closed; PM, explicit nonblank reason; history records exception, no synthetic confirmation |
| reopen | closed | open; PM reason required; next generation, clear current pointers |

Assignment to a different Dev increments generation, clears current answer/confirmation and keeps immutable history; assignment to same Dev is a recorded versioned no-op without invalidating current answer or changing status. Reopen also increments generation. Every answer gets monotonically increasing `answerVersion` across the QA lifetime and stores current generation; a replacement answer clears current confirmation, even when submitted by same Dev. `basisReference` may be blank; body is the authoritative response and optional attachments/comments are references only. Dev transition back to progress from clarify does not reinterpret comments as answers. Provide-info body goes to history/comment, never overwrites question. No PATCH/DELETE answers or confirmations. Old Dev/answer/generation cannot confirm or close after reassignment/reopen/re-answer. Normal confirmation is unique per answer, and command replay is the only successful repeat of that confirmation.

One transaction guards current locking account identity/session **before consistent reads**, then locks project, reads current active same-project actor membership/effective role, and locks work item/QA detail. Do not authorize replay from stale JPA repeatable-read identity/membership projections. PM assignment and source checks share project locks with membership/catalog/archive changes. Increment work-item version and updated actor/time for each accepted new command; record `work_item_history` (`QA_CREATE`, `QA_ASSIGN`, `QA_START`, `QA_REQUEST_INFO`, `QA_PROVIDE_INFO`, `QA_ANSWER`, `QA_CONFIRM`, `QA_CLOSE`, `QA_REOPEN`) plus immutable answer/confirmation or internal clarification comment where applicable. Request key/checksum/action/resource/actor and original response are inserted into `qa_commands`. Creation also retains `work_items.request_key/checksum` and uses the existing locked counter, not a second QA sequence.

Replay rechecks current account/session/project/member permission, current command role/ownership (assigned DEV or creator TESTER) and QA/source identity before returning original response. For historical commands, current context must remain usable; PM close/reopen are allowed to resolve existing QA even if source case was subsequently archived, but current project/membership authorization still applies. Exact same actor/key/body/action/item returns saved result, no added history or version; stale original expectedVersion is allowed only for exact replay, source-state transition guard applies to new commands. Changing assignee invalidates old Dev's replay authority. Key mismatch is 409; failed commands leave no key. Current answer/version check applies to a new confirm, so retry cannot confirm a replaced answer with a new key. Replay returns the historical saved response (possibly older than current read), so clients refresh when needed.

Generic `POST /work-items` must not accept QA creation without subtype transaction; either dispatch to QaService with exact QA DTO or return `QA_COMMAND_REQUIRED` and direct client to `/qa`. Generic PUT, transitions, batch-transitions, external-reference/clarification, retest/fixed-build/bug-closure and execution-link endpoints must reject QA mutations with `QA_COMMAND_REQUIRED` or `WRONG_ITEM_TYPE`; batch containing QA is rejected atomically, not partially processed. Existing INTERNAL comments/evidence may support QA via type-specific writer policy: PM, creator TESTER, assigned DEV for nonclosed QA. Generic read/history/evidence download remains project-scoped. Evidence protections must include authoritative answer/confirmation references before delete; scope does not add required answer attachment IDs. Redmine publishing QA is unsupported until a separate mapping is approved. QA never enters BugRetestLifecycle/coverage and does not grant DEV write rights over TASK/REQUEST/IMPROVEMENT.

If a question reveals a bug, create a separate BUG through existing validated creation/link flow, retain QA identity/history, and reference its key in QA discussion. Do not change QA type, auto-write NG/OK, create a retest/attempt on confirm, or close linked BUG on QA closure. A dedicated QA↔BUG relation is outside this narrow contract.

## PM handoff queue

Read-only projection from **BUG** current round/fixed build, confirmed coverage, current requests and verification attempts, reusing [retest](retest.md). No extra handoff status table or automatic request/closure. State precedence: `RETRY_REQUIRED` if current round invalidated or current verification has FAIL; `PREPARE_RETEST` if current confirmed coverage missing or applicable coverage items lack a current request; `READY_TO_CLOSE` if every applicable current coverage item has PASS and the authoritative retest closure projection passes; `VERIFYING` if some current coverage is PASS while others have pending requests, or all have PASS but that authority still vetoes closure and PM must compare details; otherwise `ASSIGNED` when all applicable items have current pending requests. Nonresolved BUG with FAIL may appear as RETRY_REQUIRED; it is not ready to create a request until Dev resolves with fixed build again. QA counts/statuses do not participate.

Read-model ruling: verification readiness and permission to mutate are separate. An archived project may retain a historical/current `READY_TO_CLOSE` verification state while `canClose` and `canPrepareRetest` are false. Clients use those booleans for affordances and never infer permission from a state label. All-pass authority veto stays `VERIFYING` for PM comparison, not automatic closure. Invalidating round alone is not evidence: the first resolved transition creates round1 before any coverage; absent prior retest history it is `PREPARE_RETEST`. Old FAIL does not invalidate a new valid current coverage. No customer rule, global work-item status or persisted handoff state is added.

`HandoffRow={workItemId,key,title,status,assigneeMembershipId?,fixedBuildId?,roundNo,coverageRevisionId?,coverageConfirmed,state,applicableCount,requestedCount,pendingCount,passCount,failCount,requestIds:long[],canPrepareRetest,canClose,updatedAt}`. Dedupe by coverage item/current round; multiple historical requests do not multiply counts. Filter state allowlist above; page envelope same as QA, stable workItemId descending. Links use workItemId/requestIds into existing coverage/retest detail; PM still selects candidates and calls existing confirm/request/close commands. The row must not infer Tester assignment merely from a resolved BUG count.

## Errors và persistence

Existing `{code,message,requestId,fieldErrors?}` envelope. 401 invalid session; 403 `FORBIDDEN`, `NOT_ASSIGNED`, `NOT_QA_CREATOR`; 404 `NOT_FOUND` for wrong project/item/source; 409 `VERSION_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `INVALID_QA_STATE`, `ANSWER_VERSION_CONFLICT`, `QA_CONFIRMATION_REQUIRED`, `QA_COMMAND_REQUIRED`, `ARCHIVED`; 422 `INVALID_QUESTION`, `INVALID_ANSWER`, `INVALID_CONFIRMATION`, `INVALID_QA_CONTEXT`, `INVALID_ASSIGNEE`, `REASON_REQUIRED`, `INVALID_PAGE`, `WRONG_ITEM_TYPE`. Bean Validation của DTO trả422 `VALIDATION_ERROR`; malformed JSON hoặc parameter type binding trả400 `INVALID_REQUEST`. Never expose SQL/source/credential in errors.

V18 widens the existing type CHECK additively to QA, limits QA canonical status subset, adds typed same-project `qa_details` plus append-only `qa_answers`, `qa_confirmations` and replay `qa_commands`. Current pointers include QA identity/generation/answer in composite FKs, so another QA's answer/confirmation cannot be selected. Existing work-item history/comments/evidence/counters remain shared. Service enforces immutable row policy, generation changes, source consistency and current role/state; FK/CHECK do not replace those guards. No old work-item rewrite or fake answer/confirmation backfill. Native fresh/upgrade/FK/check/race/preservation verification remains NOT_RUN until dedicated schema exists; existing V1–V16 are unchanged.
