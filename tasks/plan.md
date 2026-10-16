# Implementation Plan: F/Q — công việc theo file và QA

## Tinh chỉnh UI/UX — 17/10/2026

Nguồn bàn giao: audit16/10; baseline là working tree đã có sửa chữa, HEAD vẫn `c42e3f0`, snapshot tại `var/uiux-2026-10-17/baseline.json` và `baseline.patch`. Giữ mọi thay đổi trước đó; không backend/API/schema/commit/push. Đây là bounded refinement của TMS tiếng Việt, giữ teal/density/navigation, không redesign/discovery lại nghiệp vụ. User đã cho trình bày phương án nhỏ rồi triển khai, không yêu cầu duyệt chung lại.

| Task | Màn/component và cải tiến | Rủi ro / acceptance |
| --- | --- | --- |
| UI-R1 | Shared SelectionTable: local clear/filter scope, ngoài phần hiển thị, empty reason; useDialogFocus: bỏ hidden/inert/closed-details và giữ summary/valid initial focus | Phạm vi callers đã tìm bằng rg. RED hành vi trước sửa; clear không submit/xóa selection ngoài trang; Tab/Shift+Tab/Escape/return-focus và audit regressions giữ nguyên. |
| UI-R2 | ScopeSetup + CoverageEditor: request lỗi kết thúc loading, error/retry rõ | Không đổi dữ liệu/permission; retry busy→data, giữ selection/reason/draft. Targeted RED→GREEN. |
| UI-R3 | AdminProjectDetail success feedback/focus sau awaited role-save/remove; MemberPicker pagination context và tên nút bỏ chọn | Giữ roleDraft cleanup/partial/error semantics, không báo success trước API; page selection không đổi; targeted RED→GREEN. |
| UI-R4 | Đo contrast control thay đổi và KPI với đầy đủ scoped CSS | Browser xác nhận ReportsPage đã override palette global bằng cặp màu đọc được; loại false positive từ fixture thiếu context, giữ nguyên global.css. Target>=4.5:1 cho text được kiểm, không WCAG toàn hệ thống. |
| UI-R5 | Bounded review, browser/viewport/keyboard, full frontend/coverage/build, handoff | Source component fixture dùng fake data/API bị chặn, khác integrated app.375/768/1440 và zoom200% khi tool cho phép; không tự start backend/ghi DB/UAT. |

Root giữ shared CSS/hooks/browser và tài liệu. Hai owner phạm vi riêng Admin và read-state, tối đa2Vitestworker cùng lúc; review chéo sau freeze. Không chạy backend/native suite không liên quan. Báo cáo duy nhất: `docs/reviews/2026-10-17-uiux-refinement.md`.

Checkpoint cuối: UI-R1–R4 đã triển khai/đo trong phạm vi trên; UI-R5 có review độc lập, full FE **884/82 files**, coverage thực đo và build PASS. Chrome component fixture đã kiểm selection/filter, modal keyboard, retest lỗi/retry và member feedback;375/768/1440 không tràn ngang trong fixture shared picker. Đây là dữ liệu mô phỏng/API bị chặn. Zoom200% **NOT_VERIFIED** vì shortcut không đổi viewport/DPR; tích hợp backend, cảm ứng/AT và UAT còn mở. Không đổi KPI palette theo nhận định từ fixture thiếu CSS. [Báo cáo/bằng chứng](../docs/reviews/2026-10-17-uiux-refinement.md); S11 IN_REVIEW.

## Đợt rà soát luồng hiện hữu 16–17/10/2026

Yêu cầu mới giới hạn ở kiểm tra và sửa lỗi hiện có, trên `system-design`, baseline `c42e3f0ab87403cf39122c85fe63bc267368b7ad`. Checklist duy nhất: [todo.md](todo.md); kết quả/ma trận/bằng chứng: [review](../docs/reviews/2026-10-16-workflow-audit.md). Các quyền commit/push/restart lịch sử bên dưới không áp dụng cho đợt này.

| Task | Phạm vi và phụ thuộc | Tiêu chí chấp nhận / kiểm chứng |
| --- | --- | --- |
| R1 — baseline và trace | Planning/product/permissions, router/API, ba nhóm module độc lập | Phân biệt source, test, runtime và UAT; quyền ADMIN 10/10 và đồng bộ kết quả 11/10 là quyết định hiện hành. Không thực thi script cũ trong `var/`. |
| R2 — nhân sự/vòng đời | R1; AdminProjectDetail + test UI | Gỡ thất bại giữ mọi nháp; gỡ thành công xóa đúng nháp người vừa gỡ; nháp khác tiếp tục chặn lưu trữ. RED→GREEN. |
| R3 — sửa ô và test lần 2 | R1; hai dialog, callsite + regression | Sau409 giữ nháp, đọc lại đúng document/row/case và token hiện hành, không tự gửi lại. Mất quyền/nguồn khác chặn ghi. Phân công mới gặp revision đổi phải mở lại để đối chiếu trước duyệt. RED→GREEN. |
| R4 — chi tiết công việc | R1; detail/fieldset/CSS + test | Khi reload chờ/lỗi, giữ nháp nhưng khóa mọi lệnh ghi; nút tải lại vẫn dùng được, đọc thành công mới mở lại. RED→GREEN. |
| R5 — tìm người dùng Unicode | R1; AdminProjectService + guarded native HTTP regression | SELECT cũ lỗi3854, biểu thức cuối chạy được; giữ tìm username phân biệt hoa/thường và `%_` literal. HTTP regression cần schema test V29, không ghi lên `tms`. |
| R6 — review/bàn giao | R2–R5; shared scripts/docs | Review chéo Spec/Standards; FE coverage, build, offline BE unit, contract, DB SELECT; ghi rõ native/browser/UAT chưa chạy. S11 giữ IN_REVIEW. |

Không đổi schema, stack, tracker hay giao diện tổng thể. `implement` triển khai các task đã rõ; không chạy thêm cơ chế `implement-spec` cạnh tranh. Root giữ shared files và Maven; ba agent chỉ sửa các nhóm file riêng. Kết thúc ở bounded source/unit/read-only verification và bàn giao blocker runtime/UAT cụ thể, không tự ký nghiệm thu.

> Checkpoint hiện hành 07/10/2026: native V19/V20 và quyền commit/push `system-design` đã được người dùng cho phép, hoàn tất theo các báo cáo native/V20. Các giới hạn và ghi chú thiếu native trong phần kế hoạch gốc bên dưới là lịch sử. Công việc responsive mở rộng theo yêu cầu mới được ghi ở cuối tài liệu; UAT/pilot vẫn riêng.

Spec: `docs/product/SYSTEM-SPECIFICATION.md` mục14, `docs/product/PRD.md` F01–F05/Q01–Q03. Người dùng duyệt toàn bộ ngày06/10/2026: “mình duyệt hết”. Nhánh `system-design`. Task list `tasks/todo.md`; ledger riêng `.superpowers/sdd/plan/progress.md`. Các phần ADMIN/UI đang chờ commit giữ nguyên.

## Global Constraints

React JavaScript/Spring Boot Java21/MySQL native/Flyway. Không commit/push/merge/deploy hoặc stop listener8080/5173. Không fixture trên tms. Migration V17/V18 additive, original workbook/annotation/attempts giữ nguyên. Verdict execution từ ExecutionService; annotation riêng. Scope limits500runs/50configs/100revisions/request giữ; imported max500. DEV không test/retest/NA/close. PM điều phối/coverage/closure. Current actor/session/permission và project lock trước consistentreads, version/idempotency/history là bắt buộc. Security action trong phạm vi user đã duyệt, không hỏi lại quyền chung; không tự mở customer/tracker mapping.

## Quyết định thực hiện theo phần đã duyệt

- D-F1: My work/file được giao mở execution mặc định, annotation/source là chế độ riêng.
- D-F2: Một nhóm file/cycle/config có một Tester chính. Group không lưu assignee cạnh tranh run. Mixed assignee do PM đổi run được báo và chặn start group; group reassignment atomic.
- D-F3: Máy active allocation đúng người nhận/project, một máy mộtDOING. Một user có thể mở nhiều file nếu dùng máy khác; pause giải phóng active machine, resume kiểm lại toàn context. Không tính giờ công/effort.
- D-F4: Complete không còn NOT_RUN/P, NG hiện hành có linkBUG. COMPLETED chỉ kết thúc thực thi; PM vẫn chốt tồn đọng/closure riêng.
- D-F5: Pin revision, revoke/return chặn writes; PM cancel với reason, không auto suy user ngừng việc hoặc xóa attempts.
- D-Q1: QA riêng cùng work-item identity/counter; canonicalstatusauthority duy nhất, labels theo type. D-Q2: PMtriage/assign. D-Q3: PMcoverage/request, thêm handoffqueue derived.
- Closure TASK/REQUEST/IMPROVEMENT không tự suy từ QA; giữ backlog riêng. ProductionNFR/pilot còn đo, không SLA mới.

## Dependency graph / order

Schema/contracts → Fgroup → Fsession → attempt integration → executionprojection/export → FUI → QAbackend → QAUI/handoff → regression/native/UAT/review. Các writes migration tuần tự. Một implementer agent mỗi task, review trước chuyển task. Controller chuẩn bị schema/contracts/ledger/environment; không sửa đồng thời file agent sở hữu.

## Task 1: Contract và persistence nền F/Q

Scope M: `V17__file_work_groups_and_sessions.sql`, `V18__qa_work_items.sql`, docs/api/file-work.md, docs/api/qa.md, approval docs/ledger. Native migration test nằm gatecuối, không gọi DONE native từ đọcDDL.
Acceptance: Fgroup/items/session/attemptnullableFK; QAtypedsubtype/history/check work-itemQA; compositeprojectFK; no destructive/backfillverdicthistory. Contract payload/readmodels/errors/capabilities cụ thể trước implementation.
Verify: metadata V16 đối chiếu FK/index, DDL static contract, migration native guarded khi schema test có.

## Task 2: PM giao file và đọc công việc của tôi

Dependency1. Files: filework/FileWorkDtos.java, FileWorkService.java, FileWorkController.java, FileWorkServiceTest.java. BackendprefixP/file-work-groups. Preview/commit exactapprovedrun scopes; create chunks≤100 through existing ExecutionService.addScope, atomic bounded500. List/details context and canonicalassignee, minepagination; reassignmentversions/history. No session/export implementation ở tasknày.
Acceptance: selecteddocumentCOMMITTED/project/case valid; unapproved/conflict/limit clearlyblocked; groupitems exactrow/run IDs, duplicatekey/body409; PM create/assign, memberread, mineactorserver. Tests behavior RED/GREEN no DBfixturelive.
Verify: focused Maven tests + compile; reviewer spec/quality.

## Task 3: Tester bắt đầu/tạm dừng/kết thúc trên máy vật lý

Dependency2. Files: FileWorkSessionService.java, FileWorkGuard.java, FileWorkSessionController.java, FileWorkSessionTest.java, FileWorkDtos.java minimal extension.
Acceptance: correctactor/assignment/activecycle/allocationrecipient/asset, uniqueDOINGmachine/group; start/pause/resume/complete/PMcancel version/key/reason/audit; completionNOT_RUN/P/unlinkedNG blocked; no fakeverdict. FileWorkGuard JDBC-only avoids ExecutionService↔sessionservice circular injection.
Verify: negative+state+replay tests, compile, taskreview.

## Task 4: Execution theo session, pinned view và export

Dependency3. Files: ExecutionService.java, FileWorkExecutionService.java, FileWorkExecutionController.java, FileWorkExecutionTest.java, DocumentWorkbook.java only if minimal helper needed.
Minimal RetestService.java internal-record call-site integration belongs to this task as ruled in ledger. Canonical RUN projection adds fileWorkGroupId for UI routing; public legacy grouped attempt writes reject FILE_SESSION_REQUIRED, not a client-controlled origin bypass.
Acceptance: FileWorkGuard validates session/run/context, appendnullable link+actualassetsnapshot through ExecutionService.record; group-bound run cannot bypass via legacyendpoint; retest internal record remains canonical and provenance explicit. Fileview pinnedcontent/result chosenbuild/actor/context, source untouched; exportoriginal/annotationexisting separate, executionmetadata/asOf and stringsafe. Read/auth beforeblob; no lẫn build/revision.
Verify: focused regression+workbook test; Task4 review includes retest compatibility.

## Checkpoint F backend

Task2–4 reviews accepted, scoped tests/compile; native schema unavailable markedNOT_RUN, no live migration without preservation gate. Contracts aligned actual readmodels.

## Task 5: UI công việc theo file

Dependency4. Files≤5per slice: APIfileWork.js, FileWorkPage.jsx, FileWorkDetail.jsx, file-work.css, file-work.test.jsx; route/sidebar/TestDocumentsPage wiring separate smallsame-shape followup if needed.
Acceptance: PMgiao file/pinnedscope; Myfiles Tester; chooseeligiblemachine/start/pause/finish; directcaseexecution correctNG/P forms/history/NApolicy, sessioncontext, retries/stale/draft; executionexport/source modes clear. Integration route/nav/PMdashboard hyperlinks, responsive/focus/scroll/noUIhealthtabs.
Verify: FE RED/GREEN focused, build; review UI/APIdatawire.

## Task 6: QA lifecycle backend

Dependency1 (execute after F review). Files: qa/QaDtos.java, QaService.java, QaController.java, QaServiceTest.java; WorkItemService/EvidenceService/DTO integration nextsmalltask if needed.
Acceptance: QAcontextcase/run/document validatedsameproject withoutNG; workitemcounter/key/history; PMassign, Devownprogress/clarify/answer, Testercreatorconfirmcurrentanswerversion, PMclose/reopen; immutableanswers/currentpointer, version/key/audit; no generictransition bypass, noBUGclosure/retest/FixedbuildforQA. ExistingBUGpolicy unchanged.
Verify: permission/state/context/stale/replay behavior tests+compile, review.

## Task 7: QA UI và hàng chờ PM

Dependency6 andFUI. Files≤5per slice: services/api/qa.js, features/qa/QaPanel.jsx, QaForm.jsx, qa.test.jsx, WorkItemDetail/WorkItemForm glue separate. WorkItemmetadata/type rendering coherent; QAlinks in file/run actions preservecontext; PMhandoff derived currentcoverage/request/round not justresolvedcount.
Acceptance: questioncreate/form/read/capabilities/answer/confirm/close/reopen wired+saved, notfakechange; DEVownonly, Tester noassignment; bugretetest stillPMcoverage. Dashboard linktargetrequest/workitem correctproject, pagination/retry/loading.
Verify: FE regressions and sourcecontract; taskreview.

Task7 is split into sequential implementation/review slices: 7A PM handoff backend (HandoffService, HandoffController, HandoffServiceTest; read-only derived current BUG coverage/round/request/verification, existing closure guards) then 7B QA UI and ticket/dashboard glue. Each gets a fresh implementer, no parallel implementation. No extra handoff state table. Service contracts are reviewed before UI consumes them. 7B core/7C typed ticket glue/7D dashboard, board and filework QA capability affordance remain sequential; 7D owns at most five files including FileWorkDetail and its behavioral tests. Current canCreateQa metadata, archive/loading/error and raw-source guards control creation links.

## Task 8: Native guards, full regression và bàn giao

Dependencyall. Nativeintegration fixture/source upgradeV16→18+fresh/history/races/export/roles; runner refuse tms. If test schema unavailable finish independent tests/docs, do not invent nativePASS. FullFE, selectedBE meaningful tests, build/package/JDT/contracts, browserread/forms when safe preview available. Finalwholebranch review one broadpass, fixrequiredfindings and scopedrereview. Update productstatus/currentAPI/guide/taskledger/STATUS preservingS11IN_REVIEW gates.
Integration risk checked in source: current ADMIN/ProjectService has no project archive/unarchive mutation endpoint (UpdateProject has no archived field; setArchivedAt has no service caller). Do not invent this feature solely for a guard. Archive-command regression is N/A now; before exposing a future archive command it must reject DOING/PAUSED sessions until PM cancels/completes them. Existing archived read-only/replay policy remains tested.

## Risks

Task8 diagnostics follow-ups8C1/8C2/8C3: fulloffline390PASS but currentJDT191sources0errors/232warnings, mostlyMockito and fiveproduction URI/import warnings. Three sequential at-most-five-file slices preservebehavior/strictcompilerconfig, narrow syntheticmatcher suppression only atmethod scope, compile/JDT+appropriatecoveringsuites, independentreviews. 7F additionally fixes stalehash test assertion and typedQAcurrentactivitylabel from actualUIpreview. These are review/verification fixes, not newbusiness scope.

| Risk | Mitigation |
| --- | --- |
| Schema test privilege unavailable | Guarded source/tests + independentunits; neverfixtureonlive, reportunverified |
| Auth stale after lock/race | Currentlocks and sameproject boundaries; negative/concurrencytests |
| New session guard blocks retest | Separate canonical fullcase record path with explicit provenance and role/scopeguards, review compatibility |
| Group view mixes current vs pinned | Explicit pinned query overlay/export and source-mode separate |
| QA widens Dev/terminal access | Type-specificcommands/capabilities, genericguard/block, negativeexistingBUGregressions |
| Long pendingworkingtree | Taskownership/snapshot/reviewpackages; noreset/automaticcommit |

## Verification not yet complete

Cập nhật sau nghiệm thu native ngày 06/10/2026: người dùng cung cấp credential native và yêu cầu tự tạo schema, hoàn tất kiểm thử/cập nhật backend. Native migration 1/1, integration 5/5, concurrency 5/5 và hành trình HTTP 37 bước đã PASS trên V19; V19 bổ sung sửa hai FK QA sau lỗi native được tái hiện. Đã backup và áp V17–V19 trên `tms`, restart 8080, kiểm tra 23 HTTP và browser PM. Phần native/HTTP và quyền commit/push/local restart đã được giải quyết; UAT do người dùng ký/pilot vẫn riêng. Xem `docs/reviews/2026-10-06-native-completion.md`; đoạn checkpoint dưới giữ lịch sử, không còn là blocker hiện tại.

Native test/UAT/pilot/productionNFR remain separate gates. Latest user approval settles business F/Q scope, not proof of workingimplementation or permission to publish/push.

06/10/2026 final source checkpoint: all Task1–7 and Task8 independent source/regression/fixture/UI-preview/docs gates APPROVED after one broad review, one combined fix wave and one scoped re-review. Final612FE/394offlineBE tests PASS; javac/JDT/build/package/contracts PASS. Native acceptance remains open exactly as above, including the three named unwritten races and independent command commit/rollback checks; checklist separates source gate from native/HTTP/UAT/pilot. Do not re-dispatch completed implementation or repeat the broad review from this checkpoint. Next meaningful work is the unresolved isolated native/HTTP/UAT gate once environment rights exist; no runtime or publication operation implied.

## Mở rộng theo yêu cầu 07/10/2026 — responsive và đánh giá khách hàng

- [x] Đối chiếu ảnh, code UI chung/module, PRD và luồng Admin → PM → Tester → Dev; đọc skill liên quan trước khi áp dụng.
- [x] Sửa khoảng cách/control/form/phân trang, bộ lọc nhiều chiều rộng và vùng đọc tài liệu trên mobile. Giữ các quy tắc dữ liệu/quyền đang dùng.
- [x] Cải thiện nhãn trạng thái, hướng dẫn nguồn dữ liệu/bắt đầu phiên và Hủy giao file; hai test hành vi RED trước sửa → PASS.
- [x] Kiểm tra 21 route dự án + 6 route Admin trên sáu viewport; thêm form và các vai trò, lưu số đo/ảnh.
- [x] Frontend 614/614, file-work 91/91, build và diff check PASS; coverage chưa đo. Không chạy lại BE vì không đổi API/schema.
- [x] Cập nhật PRD/spec hiện hành V20; ghi đánh giá khách hàng và backlog có acceptance tại `docs/reviews/2026-10-07-responsive-product-review.md`.
- [ ] UAT/pilot có người dùng ký, Safari/Firefox/thiết bị thật và NFR vận hành vẫn là phần tiếp theo; không suy ra hoàn tất từ kiểm tra bố cục.

### Follow-up cùng ngày: Phạm vi dự án và thao tác khách hàng

- [x] Tái hiện nhãn lệch đáy; thay bộ chọn riêng bằng bộ chọn dùng chung, label trên/select44px/tên đầy đủ; rà cả các control cạnh nhau.
- [x] RED→GREEN cho tên dự án khi phân trang, đổi ID lúc lookup chờ và Xóa bộ lọc (PM/Tester) giữ document/My work.
- [x] Admin/File-work141/141, frontend618/618, build PASS; Chrome23 trạng thái bộ chọn + 4 viewport file-work; không có mutation dữ liệu nghiệp vụ.
- [x] Báo cáo khách hàng và backlog có tiêu chí: `docs/reviews/2026-10-07-project-scope-customer-followup.md`. Không suy đã làm notification/checklist/closure mới từ yêu cầu đánh giá.
