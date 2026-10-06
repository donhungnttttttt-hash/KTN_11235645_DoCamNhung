# Công việc theo file: contract F01–F05

Contract máy đọc đã đối chiếu controller/DTO: [file-work OpenAPI](file-work.openapi.json). Bộ checker là kiểm tra cấu trúc/source, không thay kiểm chứng API/MySQL thực tế.

Ngày 06/10/2026; F/Q đã được người dùng duyệt. Task2–5 đã có implementation/source review và các scoped test PASS; native/HTTP/UAT vẫn có gate riêng tại [báo cáo triển khai](../reviews/2026-10-06-fq-implementation.md). Prefix `P=/api/v1/projects/{projectId}`. Session, CSRF, error envelope và JSON UTC theo [execution](execution.md). GET yêu cầu enabled account/current session và active same-project membership; archive khóa writes theo policy. ADMIN chỉ có quyền nghiệp vụ nếu có membership tương ứng. Effective global DEV chỉ đọc, kể cả khi membership ghi PM/TESTER. PM commands yêu cầu current project_role=PM và global role không DEV; generic manager guard cho ADMIN member không đủ để cấp quyền PM. TESTER là assignee chính của nhóm file.

## Identity, giới hạn và authority

`documentId` là `import_batches.id` COMMITTED, không phải tên file. Một group là một document/cycle/configuration, chứa 1–500 run cụ thể; một run chỉ thuộc một group. Mỗi item ánh xạ chính xác `importRowId → testCaseId → revisionId → runItemId`. Nội dung thực thi dùng revision đã pin. Một request file chọn tối đa 500 revision khác nhau, tối đa 500 run trong cycle và 50 configuration; tạo scope nội bộ theo chunks ≤100 bằng `ExecutionService.addScope`, trong **một transaction**. Không tăng các giới hạn import hiện có.

Không lưu assignee hoặc verdict trên group. `run_items.assignee_membership_id` là authority; group có `assignmentState=CONSISTENT|MIXED`, `assigneeMembershipId` và `assigneeName` chỉ có giá trị khi mọi run cùng assignee. Legacy PM assignment từng run có thể tạo MIXED; start/resume/write bị chặn cho đến khi PM giao lại toàn group. Group version không thay thế run versions. Kết quả và NA dùng attempt/scope-decision hiện có; annotation không tham gia tiến độ.

Group `state` là projection: phiên mới nhất quyết định DOING/PAUSED/COMPLETED/CANCELLED; chưa có phiên là READY. Chỉ `file_work_sessions.state` lưu trạng thái phiên. Sau COMPLETED/CANCELLED có thể start phiên mới khi cycle ACTIVE và còn đúng assignment, chẳng hạn kiểm tiếp build mới. COMPLETED không đóng cycle, BUG hoặc release.

## Endpoints và DTO ghi

ID >0; version ≥0; `requestKey` là `[A-Za-z0-9_-]{8,64}`. Không nhận actor/time/asset snapshot do client gửi. Các field không ghi `?` là bắt buộc. `reason` trim, ≤1000 ký tự (assignment ≤500); reason của pause/cancel/assignment không được trống.

| Method / path sau P | Request / response | Quyền |
| --- | --- | --- |
| POST `/file-work-groups/preview` | `Scope` → `Preview`, không ghi DB | PM |
| POST `/file-work-groups` | `Create` → 201 `GroupDetail`, Location tới group | PM |
| GET `/file-work-groups` | Query dưới đây → `Page<GroupSummary>` | Member |
| GET `/file-work-groups/metadata` | `{canCreate,canViewMine,canReadAll,membershipId,archived}` | Member |
| GET `/file-work-groups/{groupId}` | `GroupDetail` | Member |
| PUT `/file-work-groups/{groupId}/assignment` | `Assignment` → `GroupDetail` | PM |
| GET `/file-work-groups/{groupId}/history?before=0` | `{items,nextBefore}`; ≤50 events, ID giảm dần | Member |
| GET `/file-work-groups/{groupId}/sessions?page=0&size=20` | `Page<Session>`, ID giảm dần, size 1–100 | Member |
| GET `/file-work-groups/{groupId}/eligible-allocations` | `EligibleAllocation[]`, chỉ máy actor hiện hành được phép dùng | Assigned TESTER |
| POST `/file-work-groups/{groupId}/sessions` | `Start` → 201 `Session`, Location tới session | Assigned TESTER |
| POST `/file-work-sessions/{sessionId}/pause` | `SessionCommand` → `Session` | Executor TESTER |
| POST `/file-work-sessions/{sessionId}/resume` | `SessionCommand` → `Session` | Executor TESTER |
| POST `/file-work-sessions/{sessionId}/complete` | `SessionCommand` → `Session` | Executor TESTER |
| POST `/file-work-sessions/{sessionId}/cancel` | `SessionCommand` → `Session` | PM |
| GET `/file-work-groups/{groupId}/execution?buildId={id}` | `ExecutionView` | Member |
| POST `/file-work-groups/{groupId}/run-items/{runItemId}/attempts` | `FileAttempt` → 201 canonical `Attempt` | Executor TESTER |
| GET `/file-work-groups/{groupId}/export?buildId={id}` | XLSX cùng `ExecutionView`, private/no-store | Member |

Metadata kiểm current identity/session/project/membership bằng guard hiện hành, kể cả danh sách chưa có group. `canCreate` chỉ current PM của dự án chưa archive, loại effective global DEV; `canViewMine` là current TESTER, `canReadAll=true` cho member đã được cho phép đọc theo policy hiện hữu. `membershipId` và `archived` lấy từ server. Quyền theo group/session vẫn dùng capabilities của resource, không suy từ metadata hoặc role lưu cũ ở frontend.

```text
Scope = {documentId,cycleId,configurationId,revisionIds:long[1..500],
         assigneeMembershipId,expectedCycleVersion}
Create = Scope + {requestKey}
Assignment = {assigneeMembershipId,reason,expectedVersion,
              runVersions:[{runItemId,expectedVersion}],requestKey}
Start = {allocationId,buildId,expectedVersion,requestKey}
SessionCommand = {expectedVersion,expectedGroupVersion,reason?,requestKey}
FileAttempt = {sessionId,expectedSessionVersion,resultCode,buildId,
               actualResult?,reason?,evidenceReference?,requestKey,expectedVersion}
```

`Create` chỉ thêm scope trong cycle DRAFT. Mọi revision phải được PM duyệt, case/suite active và đúng row của document; một source case không được chọn nhiều revision. Scope đã có run trong configuration hoặc group đã có là conflict; không âm thầm tái dùng hay thay pin. Preview kiểm cùng validation và trả errors cho scope thay vì ghi một phần. Commit kiểm lại current state/version, không tin kết quả preview.

Assignment gửi **đủ và duy nhất** tất cả runVersions của group; target là membership TESTER active/account enabled, global role không DEV. Khóa group và runs theo ID; ghi assignments qua authority hiện hành, bump run versions, group version, history/command trong cùng transaction. DOING/PAUSED phải được PM cancel có reason trước khi giao lại (`SESSION_OPEN`); không tự chuyển chủ phiên. Single-run PM assignment vẫn giữ lịch sử và được nhận diện là MIXED khi không đồng nhất.

Start `expectedVersion` là group version. `SessionCommand.expectedVersion` là session version; `expectedGroupVersion` là group version. Mọi transition bump cả session và group một lần. Assignment bump group một lần. Attempt `expectedVersion` là run version; `expectedSessionVersion` là session version, attempt không bump session/group. `buildId` phải bằng build pin của session. Field actual ≤8000, reason/evidenceReference ≤1000, NG cần actual, P cần reason, result chỉ OK/NG/P; NA dùng command PM hiện có.

## Read models

List query: `page=0`, `size=20` (1–100), `mine=false`, `documentId?`, `cycleId?`, `assigneeMembershipId?`, `buildId?`, `state?` (READY/DOING/PAUSED/COMPLETED/CANCELLED), `keyword?` (≤255; file name literal). `mine=true` lấy actor từ server và chỉ group CONSISTENT giao actor; không nhận userId thay actor. Sort ID giảm dần. `buildId` lọc group có phiên/attempt trên build đó; summary counts phải cùng selected build (không pha latest build khác). Khi không chọn build, summary uses latest session build hoặc config default build nếu chưa có session. Page `{items,totalItems,page,pageSize,totalPages}`.

```text
Preview = {documentId,cycleId,configurationId,cycleVersion,
           valid:boolean,selectedCount,items:[PreviewItem],errors:[ScopeError]}
PreviewItem = {importRowId,rowNumber,testCaseId,revisionId,caseNo,approved,
               existingRunItemId?,existingRunVersion?}
ScopeError = {code,message,importRowId?,revisionId?}
GroupSummary = {id,projectId,documentId,fileName,cycleId,cycleName,cycleVersion,
                configurationId,environmentId,deviceId,defaultBuildId,selectedBuildId,
                version,assignmentState,assigneeMembershipId?,assigneeName?,
                state,currentSessionId?,assetId?,assetCode?,startedAt?,updatedAt,latestActivityAt,
                milestoneId?,milestoneName?,milestoneDueOn?,
                caseCount,counts,openBugCount,pendingRetestCount,capabilities}
counts = {total,notRun,ok,ng,p,na,executionRate?,passRate?}
GroupDetail = {group:GroupSummary,items:[GroupItem],sessions:[Session]}
GroupItem = {importRowId,rowNumber,runItemId,testCaseId,revisionId,caseNo,
             runVersion,assigneeMembershipId,assigneeName,excluded,scopeReason?}
Session = {id,projectId,groupId,executorMembershipId,executorName,allocationId,
           assetId,assetCode,buildId,state,version,groupVersion,contextSnapshot,
           startedAt,lastTransitionAt,endedAt?,capabilities}
EligibleAllocation = {allocationId,allocationVersion,assetId,assetCode,type,model,
                      osName,osVersion,recipientMembershipId,expectedReturnOn?}
HistoryEvent = {id,groupId,sessionId?,action,fromState?,toState?,groupVersion,
                sessionVersion?,reason,details,actorMembershipId,actorName,occurredAt}
```

`milestoneId`, `milestoneName`, `milestoneDueOn` come from the cycle's same-project milestone, including retained archived plans. All three are nullable; no milestone means no plan, and a milestone with null due date means no deadline. `milestoneDueOn` is a calendar date (`YYYY-MM-DD`), never a UTC instant. `startedAt` belongs to the latest session. `updatedAt` is only the group metadata timestamp; `latestActivityAt` is the maximum of group update, saved canonical attempts on any build, and session transitions for that group. These are read snapshots, not realtime status. The UI formats timestamps in the project timezone and labels group update separately. Existing selected-build rates remain nullable when their denominator is zero.

The list exposes assignee/cycle/build filters under current `canReadAll` metadata, resetting the group page when filters or document context change. Cycle choices are paginated while the selected choice remains visible. With My work enabled the server's current actor is authoritative; no alternate assignee is sent.

Execution GET/export accepts an existing same-project archived build for retained history, including latest-session/default selection, with the original pin/source/result semantics. Current-resource write guards are unchanged. The display selector retains archived builds as read-only context; start only offers active builds. Detail/session capabilities load independently of workbook/catalog reads, so an authorized current PM can cancel a DOING/PAUSED session with a reason even if execution loading fails. Client project role is never cancel authority.

`contextSnapshot` includes `groupId,documentId,cycleId,configurationId,revisionIds`, existing `environment,device,build,executor` snapshots plus `physicalAsset:{id,assetCode,type,model,serial,osName,osVersion}`, `allocation:{id,recipientMembershipId,assignedAt}`. JSON returned parsed, times ISO-8601 UTC. Lists do not load workbook BLOB. `sessions` detail may be latest 100 with dedicated paginated session history for older entries. Capabilities are explicit booleans `canAssign,canStart,canPause,canResume,canComplete,canCancel,canRecord,canExport`; server recomputes them from current actor/context, including completion guards. They are UI hints and cannot authorize a write.

## Session guards, concurrency và replay

State graph: start → DOING; DOING → PAUSED/COMPLETED/CANCELLED; PAUSED → DOING/CANCELLED. No auto-pause on inactivity or return. Pause releases DOING uniqueness. One physical asset globally and one group/project can be DOING; one user may DOING on different groups using different assets. A PAUSED session blocks a new start until resumed/cancelled. Group/project lock serializes open-session checks; generated unique keys defend DOING races.

Before any consistent project/group/run read, perform current locking account identity/session guard, then lock project and check archive plus current same-project active membership/effective role. Do not reuse stale JPA identity/membership projections from a repeatable-read snapshot for authorization or replay. For writes lock group, canonical runs, session, physical asset and allocation in deterministic order; inventory changes take the same project/asset locks. Check cycle ACTIVE, config/env/logical device/build usable, assignment CONSISTENT/current actor, allocation `returned_at IS NULL` with matching project/recipient/asset and asset AVAILABLE. Source pinned revision remains unchanged; case/suite archive blocks writes. Revocation, return, incompatible catalog changes or reassignment block new execution/pause/resume/complete. PM cancel remains possible to resolve a blocked session: requires current PM/project authorization and valid session identity, but does not require executor/allocation/cycle to still be usable. Historical snapshots never grant current authority.

Compatibility uses explicit fields after trim/case normalization, never display name/code. Logical `osName=iPadOS` permits IPAD, `iOS` permits IPAD/IPHONE, `Android` permits ANDROID. Physical osName must be the same OS family (`iOS` and `iPadOS` are one family), and build.platform must be that family; supported platform strings are iOS/iPadOS/Android. Catalog platform is currently free text; this guard does not change catalog validation. If logical model or osVersion is nonblank, physical value must match after trim/case normalization; unspecified values impose no match. OTHER/unknown/missing OS or unsupported build platform produces a configuration error with guidance to set supported OS/platform values. No automatic inference or rewrite of old catalogs.

Allocation/build/executor/context of an existing session are immutable. Resume validates the same pin; switching allocation/build requires PM cancel and new start. Complete uses latest attempt **on session build** for every applicable group run: no NOT_RUN or P, every current NG has BUG link to that exact attempt. NA comes from latest PM scope decision. Empty applicable scope can complete with explicit NA decisions, without fake attempts. Counters/rates reuse ReportMetrics; D=0 returns null rates. NG linked to BUG may complete execution while PM still manages backlog/closure.

Successful commands persist checksum (typed body + action + resource identity), actor, response JSON and history atomically. Uniqueness is project-wide within file-work commands; execution attempts use the existing execution request-key namespace. Replay requires current authorization and resource guards **before** lookup/return; exact actor/key/body/resource returns original response, no extra version/history. Original expectedVersion may be stale for this exact replay; source-state and version checks apply to new commands only. For session replay, verify pinned resource usability for non-cancel actions, but do not require the old source state (e.g. completed action can replay after completion). PM cancellation replay uses cancellation guards. A returned allocation/revoked actor cannot replay a successful execution through its old key. Different actor/body/action/resource with reused key → 409; failed commands consume no key. Group/session/run versions remain separately scoped. Report native race/replay verification separately from DDL inspection.

## Execution view và export

`ExecutionView={group:GroupSummary,buildId,asOf,headers,columns,rows:[ExecutionRow]}`. `ExecutionRow={...GroupItem,sourceId,sourceCells,cells,revisionNo,titleVi,preconditionsVi,stepsVi,expectedVi,resultCode,latestAttemptId?,attemptVersion?,executorMembershipId?,executorName?,executedAt?,physicalAsset?,fileWorkSessionId?,provenance,pendingBugLink}`. `attemptVersion` is attemptNo. Result is latest attempt on selected build, NOT_RUN if absent, NA when PM excluded. `provenance=FILE_SESSION|RETEST_FULL_CASE|LEGACY|NONE`; old attempts have no physical machine claim. `cells` overlays **pinned** revision content and selected-build execution status/actor; extra source fields remain preserved. Never overlay library current revision or annotation as execution.

Public legacy `POST P/run-items/{id}/attempts` must reject group-bound runs with `FILE_SESSION_REQUIRED`; grouped endpoint validates session/run/group/build and calls canonical ExecutionService. Attempt replay also requires the same session currently DOING and valid before returning an old attempt; lifecycle transition replay rules do not waive the active-session execution guard. Task 4 adds internal `recordRetest` for authorized FULL_CASE retest: it retains canonical validation and explicit retest provenance, may leave session link NULL, and cannot be selected by public clients. BUG_ONLY still creates no attempt. Attempt snapshot includes actual asset/session context on file writes; nullable FK also enforces executor identity. FK does not enforce run membership/build/state, so FileWorkGuard checks these in the transaction.

Export reads one consistent pinned/build snapshot with server `asOf`, after current read authorization and before loading BLOB. Metadata sheet includes project/document/group/cycle/config/environment/logical device/build/asOf and source mode EXECUTION; rows preserve original order/style/Unicode/unmapped cells where safe, use string cells for changed content, and remove unsafe links/formulas. Source/annotation exports remain existing [document routes](test-documents.md), with distinct UI labels. Historical rows outside selected group retain source content and are marked OUT_OF_SCOPE in metadata, never presented as group execution results. Response UTF-8 Content-Disposition, XLSX MIME, `Cache-Control: private, no-store`.

## Errors và persistence

Existing envelope `{code,message,requestId,fieldErrors?}` remains unchanged. 401 session invalid; 403 `FORBIDDEN`/`NOT_ASSIGNED`/`NOT_SESSION_EXECUTOR`; 404 `NOT_FOUND` for wrong project/document/group/session/source. 409 `VERSION_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `DUPLICATE_SCOPE`, `FILE_GROUP_EXISTS`, `ASSIGNMENT_MIXED`, `SESSION_OPEN`, `SESSION_NOT_DOING`, `INVALID_SESSION_STATE`, `ASSET_BUSY`, `ALLOCATION_INACTIVE`, `CYCLE_NOT_ACTIVE`, `RUN_EXCLUDED`, `ARCHIVED`, `FILE_SESSION_REQUIRED`, `SESSION_CONTEXT_MISMATCH`, `COMPLETION_BLOCKED`; 422 `SCOPE_LIMIT`, `REVISION_NOT_APPROVED`, `INVALID_SCOPE`, `INVALID_PAGE`, `DEVICE_COMPATIBILITY_UNKNOWN`, `DEVICE_INCOMPATIBLE`, `INVALID_RESULT`, `ACTUAL_REQUIRED`, `REASON_REQUIRED`. Return safe actionable messages, not SQL/secret/source content. Duplicate active generated key races translate to ASSET_BUSY/SESSION_OPEN.

V17 defines groups/items/sessions/commands/history and adds nullable `execution_attempts.file_work_session_id` with same-project/executor FK. Exact source row/case, run pin and allocation/recipient composite keys prevent cross-project/context substitution. Current-active/role/state/rule guards are service responsibilities. No backfill, delete cascade, historical verdict modification or migration on database in use. Native fresh/upgrade/FK/concurrency/preservation checks remain NOT_RUN until a dedicated schema is available.
