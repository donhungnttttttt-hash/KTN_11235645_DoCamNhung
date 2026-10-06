# Đối chiếu luồng Tester → Dev → Tester → PM — 05/10/2026

**Cập nhật 06/10:** tác vụ chính đã sửa D-01/D-02 (canonical progress, overview canCreate và read-only history gate/copy), có test RED → GREEN; full FE344/344, BE scoped26/26. Phần dưới lưu bằng chứng lúc audit để truy vết, không mô tả các defect này như còn chưa sửa. Xem [review cuối](2026-10-06-system-workflow-review.md).

## Phạm vi và kết luận

Audit tĩnh trên working tree `system-design`, React JavaScript + Spring Boot + MySQL/Flyway. Giữ nguyên toàn bộ code ADMIN đang sửa. Chỉ thêm báo cáo này; không sửa sản phẩm, chạy test/build, gọi API ghi, truy cập database, khởi động/dừng dịch vụ, migration, commit/push/merge/deploy. V16 là mốc môi trường được ghi trong [review ADMIN](2026-10-05-admin-implementation.md), không phải kết quả truy vấn database trong lượt audit này. `STATUS.json` vẫn S11 / IN_REVIEW.

Luồng bug có phần lớn nền tảng cần thiết: Tester log bug từ lần NG, PM phân công, Dev ghi thông tin sửa và fixed build, PM chọn phạm vi/phân công retest, Tester xác minh, PM đóng. Chưa thể gọi là luồng tự động hoàn chỉnh. Lỗi mã trạng thái DEV phát hiện trong audit đã được tác vụ chính sửa thành canonical `progress`; QA/câu hỏi, giao thẳng Tester → Dev, tự tạo retest và đồng bộ kết quả file là các phần cần mở rộng hoặc chốt thêm nghiệp vụ.

Nguồn quyết định chính: [ADR-006](../decisions/ADR-006-internal-work-items.md), [ADR-007](../decisions/ADR-007-internal-retest.md), [quyền DEV ngày 05/10](../business/permissions.md#cập-nhật-quản-trị-tập-trung-và-dev--05102026), [chính sách retest](../business/retest-policy.md). Bảng transition trong `02-business-rules.md` có phần **đề xuất**; không thay quyết định nội bộ đã chốt. `Fix` là Dev báo đã sửa, vẫn cần Tester kiểm thử lại; không tự trở thành OK.

Skill áp dụng: `code-review-and-quality` tại `C:/Users/admin/.codex/skills/code-review-and-quality/SKILL.md`, đối chiếu correctness/quyền và phân biệt defect với mở rộng kiến trúc. Đọc test hiện hữu để hiểu ý định; không chạy mutation/test vì phạm vi audit chỉ đọc. Coverage **chưa đo**; không suy coverage hoặc runtime PASS từ số test/báo cáo cũ.

## Bảng đối chiếu

`Implemented` nghĩa là thấy đủ đường code/API cho hành vi trong phạm vi đã chốt; không có nghĩa audit này đã chạy E2E. `Partial` có nền tảng nhưng còn bước thủ công/gap. `Missing` chưa có mô hình/hành vi theo yêu cầu mới.

| Bước/hành vi | Đánh giá | Bằng chứng và giới hạn |
| --- | --- | --- |
| Tester tạo bug từ execution NG | **Implemented** | `AttemptDialog.jsx:73` mở `NgBugActions.jsx:9`; API source lấy revision/build/environment/device ở `WorkItemService.java:63`. Tạo kiểm tra đúng ngữ cảnh và NG tại `WorkItemService.java:120–142,239`. Có request key/checksum và mã canonical. |
| Tester tạo bug từ case, không cần có lần NG | **Implemented** | `WorkItemForm.jsx:62–67`, `WorkItemService.java:129–131`. Có revision thì Tester được tạo; bug không có case chỉ PM với lý do. Không tự suy kết quả NG từ ô Excel. |
| Ticket có đủ nội dung tái hiện và context | **Implemented** | Steps/expected/actual bắt buộc cho BUG; context snapshot giữ build/env/device của lần chạy. Xem `WorkItemService.java:120–142`, `WorkItemDetail.jsx:37–53`. Chứng cứ là upload riêng, chưa bắt buộc khi tạo theo rule nội bộ. Evidence reference của execution không tự được copy thành blob bug. |
| Tester gửi trực tiếp/chọn Dev nhận ticket | **Partial** | Tester được tạo, nhưng `WorkItemService.java:117` yêu cầu PM khi gửi assignee/category/milestone/priority khác MEDIUM; `update` chỉ PM (`:147`). Form tạo hiện không có trường chọn Dev. Luồng hiện là **Tester tạo → PM triage/phân công → Dev**, phù hợp quyền cũ. |
| QA/câu hỏi có loại riêng và được Dev xử lý | **Missing** | DTO `WorkItemDtos.java:11`, CHECK V7 `:56`, metadata `WorkItemService.java:77`, UI `ProjectData.jsx:7` chỉ có BUG/REQUEST/TASK/IMPROVEMENT. Có thể tạo REQUEST và bình luận, nhưng không có loại QA/câu hỏi, trạng thái câu trả lời, quyền Dev nhận/trả lời hoặc liên kết câu hỏi → bug/case chính thức. Không tự coi REQUEST đã là QA. |
| Nội dung làm rõ đặc tả | **Partial** | PM có thể ghi source/confirmedBy/confirmedAt/conclusion qua `WorkItemService.java:233`; `ReferenceForms` ở `WorkItemDetail.jsx`. Bình luận là nội bộ. Đây là ghi nhận căn cứ, chưa phải quy trình hỏi/đáp của Dev hoặc xác nhận khách tự động. |
| Dev tái hiện/xử lý bug được giao | **Partial** | Own nonterminal BUG + session role được enforce ở `WorkItemService.java:49–54,160–165`; có bình luận và chứng cứ riêng ở `:210–218`, `EvidenceService.java:32,68`. D-01 đã sửa `in_progress` → `progress` trong tác vụ chính. Dev chưa có thao tác có cấu trúc “không tái hiện / yêu cầu Tester kiểm tra lại”; có thể ghi lý do/bình luận và PM chuyển `recheck` theo quyền hiện tại. |
| Dev báo đã sửa và fixed build | **Implemented** | `WorkItemService.java:170–178` bắt build active cùng project và lưu fixed_build_id; reason/version bắt buộc. `TransitionDialog.jsx:29–30` có chọn build sửa. DEV không sửa execution, document result, retest hoặc terminal. Resolve không đổi case thành OK. |
| Resolve → giao lại Tester/retest | **Partial** | Resolve chỉ invalidate scope/request vòng cũ, ghi fixed build và status (`WorkItemService.java:170–179`, `BugRetestLifecycle.java:16–23`). **Không** tự tạo coverage/request, không đổi assignee thành Tester. PM phải gọi coverage rồi createRequest (`RetestService.java:121,133`, `RetestPanel.jsx:28–30`). Queue chỉ chứa request đã tạo (`RetestQueuePage.jsx:15–23`); resolved bug chưa được PM chuẩn bị chưa xuất hiện như một request của Tester. |
| Tester retest đúng actor/build/configuration | **Implemented** | `RetestService.java:64–85,141–153,178–212` kiểm tra resolved + fixed build, current coverage/round, cùng assignee/env/device và run item active. `canSubmit` ở `:175`, form `RetestResult.jsx:38`. FAIL về canonical `progress`, hủy request và vô hiệu vòng cũ. |
| BUG_ONLY và FULL_CASE | **Implemented** | `RetestService.java:200–205`: BUG_ONLY chỉ verification; FULL_CASE tạo execution OK/NG mới qua `ExecutionService.record`, FAIL tự link attempt NG mới vào bug. Cả hai giữ lịch sử. UI chọn scope ở `RetestPanel.jsx:49` và giải thích tại `RetestResult.jsx:35`. BUG_ONLY PASS không đổi execution NG thành OK. |
| Tester cập nhật file/tài liệu và xuất bản cập nhật | **Implemented riêng / Partial về linkage** | `TestDocumentService.java:59–85` lưu status/version/actor/audit trên import_rows; `:105–116,195` export bản cập nhật và giữ file gốc. `TestDocumentPage.jsx:148,163` dùng ô đổi trạng thái và tự lưu. **Không có FK/command nối kết quả ô tài liệu với attempt/verification**; FULL_CASE không cập nhật ô file, sửa ô NG/FIXED/OK không tự log bug/tạo retest/cho phép closure. V13 dòng 1 ghi rõ đây là annotation, không phải execution attempt. |
| Case từ tài liệu đi đến lần chạy/bug | **Partial** | `DocumentExecution.jsx:44–49,90` ánh xạ caseId → run theo đợt/cấu hình đã chọn, mở AttemptDialog. Từ **execution NG** có nút tạo/gắn bug. Từ **ô NG của file** chưa có ngữ cảnh build/env/device/attempt, nên không thể tự log bug đầy đủ theo rule cũ. |
| PM theo dõi kết quả và đóng/mở lại bug | **Implemented** | `RetestService.java:99,218–237`: PM-only; FIXED chỉ đóng khi tất cả coverage hiện hành PASS. Ngoại lệ cần evidence của bug và nguồn xác nhận; reopen giữ quyết định cũ và invalidate. UI `RetestPanel.jsx:25,34–35`. Không đóng ngầm sau PASS, không auto-pass/đóng bug khác. |
| PM dashboard theo dõi cả luồng giao việc/QA/retest | **Partial** | ProjectOverview → overview work items/status/milestone (`ProjectOverview.jsx:18,31`, `WorkItemService.java:56–61`). TestingOverview → ReportsPage; report lấy run/latest attempt, byCycle/byAssignee, open bugs và resolved count (`ReportingService.java:48–68`). Chưa có queue riêng “chờ PM phân công”, “Dev đã sửa nhưng chưa chuẩn bị retest”, “đủ PASS chờ đóng”, QA chờ phản hồi hay linkage file ↔ ticket. Quality report chỉ tính BUG có execution link/current coverage, không phải mọi ticket của dự án (`ReportingService.java:112–123`). |
| PM đóng REQUEST/TASK/IMPROVEMENT hoặc QA mới | **Missing lifecycle kết thúc** | Generic transition từ chối mọi terminal (`WorkItemService.java:167`), chỉ trả allowedTransitions nonterminal (`:100`). Endpoint closure gọi `bug()` và từ chối non-BUG (`RetestService.java:56–59,219`); UI chỉ render RetestPanel cho BUG (`WorkItemDetail.jsx:61`). Cần policy kết thúc riêng cho ticket không phải bug, không áp guard retest bug lên QA. |

## Defect của implementation hiện tại

### D-01 — Required, đã sửa source: mã trạng thái xử lý của DEV không tồn tại trong danh mục

- **Nguồn lỗi lúc bắt đầu audit:** [WorkItemService.java:100](../../Backend/src/main/java/vn/syp/tms/workitem/WorkItemService.java#L100) từng query `IN ('in_progress','resolved')`; [WorkItemService.java:163](../../Backend/src/main/java/vn/syp/tms/workitem/WorkItemService.java#L163) từng chỉ cho hai mã đó. [V7:10](../../Backend/src/main/resources/db/migration/V7__create_work_items.sql#L10) seed `progress`; [V14](../../Backend/src/main/resources/db/migration/V14__developer_role.sql) chỉ thêm role DEV, không thêm/đổi status. Không thấy migration khác seed `in_progress`. [RetestService.java:209](../../Backend/src/main/java/vn/syp/tms/retest/RetestService.java#L209) và `:236` cũng dùng `progress`.
- **Hệ quả suy từ code/schema:** Dev mở own BUG ở `open` chỉ được trả lựa chọn `resolved`, thiếu “Đang xử lý”. Gửi `progress` bị 403; gửi `in_progress` qua API đi đến lookup status rỗng và `WorkItemStore.java:29` trả 404 NOT_FOUND. Sau khi resolve, Dev cũng không quay về xử lý bằng lựa chọn hiện tại. Đây là lỗi trong phạm vi quyền BUG đã được duyệt, không cần thiết kế workflow mới để sửa.
- **Khắc phục đã đọc lại trong source:** tác vụ chính đổi permission/query của DEV thành canonical `progress`, sửa `permissions.md` và fixtures FE/BE tương ứng. Không đổi V7 đã áp dụng, không thêm trạng thái thứ 11, không rewrite dữ liệu cũ.
- **Test gap ban đầu và cập nhật:** [DeveloperPermissionsTest.java](../../Backend/src/test/java/vn/syp/tms/workitem/DeveloperPermissionsTest.java) ban đầu chỉ test nhánh từ chối, fixture resolve dùng `in_progress` và mock lookup; [WorkItemDetail.test.jsx:12](../../Frontend/src/app/features/work-items/WorkItemDetail.test.jsx#L12) cũng mock `in_progress`. Tác vụ chính báo đã tái hiện RED (3 failures + 1 error), bổ sung positive `open → progress` và GET destination regression (`DeveloperPermissionsTest.java:42–55`), đang chạy GREEN tại thời điểm nhận cập nhật. Auditor chỉ xác nhận lại source; kết quả GREEN cuối cùng thuộc báo cáo tác vụ chính. Integration với danh mục thật và luồng FAIL → Dev xử lý tiếp vẫn cần schema cô lập được phép.

### D-02 — Required UX: một số màn còn gợi hành động DEV bị backend từ chối

- [ProjectOverview.jsx:14,29](../../Frontend/src/app/modules/ProjectOverview.jsx#L14) dùng `writable` (chỉ phản ánh project chưa archive), không dùng `metadata.canCreate`; nút “Thêm công việc” vẫn enabled cho Dev. Đích WorkBoardPage đã chặn bằng metadata (`WorkBoardPage.jsx:57`), backend `create` cũng 403. Đây là bất nhất UI, không phải bypass quyền.
- Tại lịch sử từ tài liệu, [DocumentExecution.jsx:90](../../Frontend/src/app/features/test-cases/DocumentExecution.jsx#L90) đặt `readOnly={dev...}` nhưng vẫn đặt `active=true` nếu cycle ACTIVE. [AttemptDialog.jsx:73](../../Frontend/src/app/features/test-execution/AttemptDialog.jsx#L73) chỉ xét `active && NG` để render `NgBugActions`; component đó không có quyền/role gate (`NgBugActions.jsx:8–11`). Dev vẫn thấy “Tạo bug” và “Gắn bug đã có”. Tạo bị chặn tại đích; link gọi backend bị 403 (`WorkItemService.java:190`). ExecutionRunnerPage đã truyền active=false cho DEV, nên defect này là đường mở lịch sử từ tài liệu.
- Nhánh readOnly còn hiện lời nhắc “Đóng phần này để chọn và lưu kết quả trực tiếp trên dòng test case” (`AttemptDialog.jsx:64`) trong khi Dev bị khóa ghi kết quả. Đề xuất phân biệt quyền đọc lịch sử với quyền sửa result và quyền tạo/link bug bằng capabilities đã có; giữ enforce server.

## Gap và mở rộng nghiệp vụ — không gắn nhãn kiến trúc sai

1. **QA/câu hỏi cho Dev là thay đổi so với quyền đã duyệt 05/10.** Hiện Dev chỉ own nonterminal BUG; own REQUEST cũng không được comment/attach/transition. Việc PM gán REQUEST/TASK cho DEV vẫn qua `classification` chỉ kiểm tra membership active (`WorkItemService.java:249–252`), nhưng không làm Dev có quyền xử lý. Cần quyết định loại ticket và policy; trong thời gian giữ policy cũ, UI nên giải thích/filter assignee để tránh giao việc không thể xử lý. Không tự nới `ownBug` cho mọi item type.
2. **Giao Tester → Dev và Dev → Tester chưa tự động.** Quyền phân công và retest coverage đang ở PM theo ADR-006/007. Có thể cải thiện handoff bằng queue/nút báo sẵn sàng; không tự suy toàn scope ảnh hưởng từ một NG hoặc tự cho Dev tạo coverage.
3. **Không tái hiện / thiếu thông tin của Dev chưa có action chuyên biệt.** Bình luận và reason lưu được thông tin đã thử, nhưng Dev không được chuyển `recheck`/`clarify`; PM đang làm bước chuyển đó. Chỉ thêm action nếu người dùng quyết định mở quyền và trường bắt buộc; terminal ngoại lệ vẫn PM.
4. **Tài liệu và execution là hai nguồn có chủ đích từ yêu cầu 04/10.** Annotation không mang build/env/device/run/actor verification. Sự thiếu đồng bộ tự động với retest là gap của yêu cầu mới, chưa đủ bằng chứng để gọi là regression. Khi liên kết phải chỉ rõ tài liệu/dòng/phiên bản; cùng case có thể có nhiều lần import/cấu hình/build. Không lấy một PASS ghi OK toàn bộ file/case.
5. **Ticket không phải BUG chưa có closure sau S07.** Đây là lifecycle chưa hoàn thiện so với luồng PM đóng mọi ticket mới; S07 đã chốt closure bug, chưa chốt QA/REQUEST acceptance. Không dùng closure bug để giả lập câu trả lời QA hoặc yêu cầu fixed build cho mọi câu hỏi.
6. **PM theo dõi có dữ liệu nhưng chưa có màn handoff đủ chi tiết.** Chỉ `resolved` count chưa phân biệt chưa có scope, đang chờ Tester, đủ PASS hoặc request hết hiệu lực. Sử dụng current coverage/round và request status để bổ sung queue; không thêm hệ thống giám sát kỹ thuật lên UI nghiệp vụ.

## Phương án tối thiểu tương thích

### A. Hoàn thiện BUG theo quyền hiện có

Sửa D-01/D-02, giữ canonical work item và subtype bug_details; giữ PM phân công/coverage/closure, Tester thực thi, Dev chỉ own BUG. Thêm dữ liệu tổng quan và đường dẫn tới các danh sách:

- Chưa phân công: BUG nonterminal assignee null, PM xử lý.
- Dev đang xử lý: own BUG `progress`.
- Chờ PM chuẩn bị retest: `resolved + fixedBuild` nhưng current coverage null hoặc chưa có OPEN request cần thiết.
- Chờ Tester: request OPEN thuộc coverage/round/build hiện hành.
- Đủ xác minh, chờ PM đóng: current scope không rỗng và toàn PASS, status resolved.

Các queue phải dùng cùng policy/service hiện có, không đếm cả vòng cũ. Có thể thêm action “Báo đã sửa / chờ retest” như cách trình bày của resolved; PM vẫn xác nhận scope trước khi tạo yêu cầu. Không cần service mới hay database bug thứ hai.

### B. Bổ sung QA trong cùng nền ticket sau khi chốt nghĩa

Hai lựa chọn khả thi:

| Lựa chọn | Phạm vi tối thiểu | Giới hạn |
| --- | --- | --- |
| REQUEST có phân loại câu hỏi được chốt rõ | Dùng work_items/comment/clarification/history; thêm policy riêng cho Dev trả lời own REQUEST câu hỏi, Tester/PM review, PM kết thúc | Đỡ thay type CHECK/contract; phải tránh đánh đồng mọi REQUEST thành QA. Category hiện là danh mục tùy dự án, chưa đủ làm security discriminator nếu chưa chốt. |
| Type QA/QUESTION riêng | Migration additive cho CHECK/type, DTO/API/labels/filter; response/acceptance action và quyền riêng; có thể link case/bug bằng FK cùng project | Rõ nghĩa, nhưng cần nhiều thay đổi hơn. Không bắt steps/fixed build/retest BUG cho QA thuần hỏi đáp. |

Giữ Dev không được ghi execution/document/retest/terminal; câu trả lời QA lưu actor/time/evidence qua nền hiện có. Nếu QA cần khách/BrSE/SHIFT xác nhận, PM ghi nguồn xác nhận thật; không giả lập external acknowledgment hoặc gửi Slack/email.

### C. File sau retest

Phương án ít thay đổi nhất: Tester retest qua request, sau đó mở đúng tài liệu/dòng để cập nhật annotation; UI cung cấp link và hiện kết quả execution/verification riêng. Đây vẫn là hai thao tác, cần nói rõ.

Nếu cần một lần lưu retest cập nhật file: chỉ FULL_CASE trên row mapping được chọn rõ mới có thể ghi annotation OK/NG và audit cùng provenance attempt/request; dùng expected row version để không đè annotation người khác. Cần chốt duplicate import, case revision thay đổi, cấu hình/build nhiều kết quả và rollback. BUG_ONLY không tự đổi toàn case/file OK. Dev resolve có thể hiển thị “chờ retest” nhưng không tự ghi kết quả file thay Tester.

## Quyết định thực sự còn cần cho phần mở rộng

| ID | Quyết định | Vì sao chặn phần phụ thuộc |
| --- | --- | --- |
| WF-Q1 | QA là loại câu hỏi riêng hay REQUEST được phân loại; ai trả lời/duyệt/xác nhận đã giải quyết; có cần Dev gửi trả Tester không? | Chặn type/schema/policy QA, không chặn sửa D-01/D-02 hoặc hoàn thiện queue BUG. |
| WF-Q2 | Tester được chọn/giao thẳng Dev hay PM vẫn phải triage; Dev được gửi lại Tester bằng action nào, có được chuyển recheck/clarify? | Thay quyền đã chốt PM-only assignment và Dev BUG-only destinations. Không suy từ “tạo cho Dev” rằng Tester có toàn quyền triage. |
| WF-Q3 | “Dev gửi Tester retest” là thông báo sẵn sàng để PM chuẩn bị hay tự tạo yêu cầu từ coverage PM đã duyệt? Ai chịu trách nhiệm scope khi fixed build/context đổi? | Scope hiện bị invalidate lúc resolve; tự tạo request từ scope cũ có thể làm closure thiếu ảnh hưởng. PM coverage vẫn là invariant hiện tại. |
| WF-Q4 | “Cập nhật file/case” là Tester sửa annotation thủ công hay tự đồng bộ khi FULL_CASE; chọn tài liệu/dòng nào nếu cùng case xuất hiện nhiều file; xử lý nhiều cấu hình/build ra sao? | Chặn atomic document linkage và nguồn kết quả; không chặn export bản cập nhật đã có. |
| WF-Q5 | QA/REQUEST/TASK kết thúc sau Dev trả lời, Tester chấp nhận hay PM quyết định; các trạng thái terminal và reopen nào áp dụng? | Chặn closure non-BUG, không cần đổi guard closure BUG đã chốt. |

Không hỏi lại PM-only đóng/reopen BUG, Fix không phải OK, hay toàn coverage hiện hành PASS: những phần đó đã chốt tại ADR-007. Rule/mapping/acknowledgment của khách/Redmine vẫn là gate riêng trong `02-business-rules.md` (Q02/Q03/Q10/Q13), không tự thay trong audit này.

## Bằng chứng và bước tiếp theo

- Đã đọc planning README/STATUS/execution-guide, quyết định nghiệp vụ, source FE/BE/Flyway, quyền DEV và test hiện hữu; tìm lại references bằng `rtk rg` và đọc source có số dòng.
- Kiểm tra branch/working tree bằng `rtk git status --short --branch`; chỉ thêm file báo cáo này. Phạm vi review không phải full security/performance audit hoặc approval merge toàn bộ ADMIN.
- Tests/build/browser/API/runtime/database trong **subtask audit này**: **NOT_RUN**. Coverage: **NOT_MEASURED**. D-01 đã được tác vụ chính sửa source và báo RED; GREEN cuối cùng chưa được auditor xác nhận tại thời điểm cập nhật. D-02 là kết luận từ source, cần test hành vi khi sửa. Không dùng test cũ mocked/native report cũ để khẳng định đoạn DEV đã chạy đúng.
- Trình tự đề xuất: hoàn tất kiểm chứng D-01 và sửa D-02 → chốt WF-Q1–Q5 theo phần phụ thuộc → cập nhật business/API contract → triển khai từng lát QA/handoff/document linkage → regression và integration trên schema cô lập → ghi lại bằng chứng. S11/UAT/production gate giữ nguyên.
