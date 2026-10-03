# Sprint 06 — Bug chuẩn hóa và một nguồn dữ liệu công việc

Trạng thái theo [STATUS.json](../STATUS.json). Kế hoạch lập 22/09/2026; triển khai bản nội bộ ngày 29/09/2026 theo [ADR-006](../../decisions/ADR-006-internal-work-items.md). Ước lượng ban đầu **7–10 ngày công** là ước lượng kế hoạch, không phải thời gian thực tế.

## Mục tiêu

Tạo bug đủ điều kiện tái hiện; Kanban, Danh sách và Quản lý lỗi dùng cùng ticket; ghi nhận xác nhận từ BrSE.

## Phụ thuộc và điều kiện vào

S03 rules + S05 execution; chốt status/transition/closure quyền và standalone bug policy.

Đọc [discovery](../01-discovery.md), [business rules](../02-business-rules.md), [API](../05-api-contract.md), [database](../04-database-and-migrations.md) và [quy trình thực hiện](../06-execution-guide.md). Kiểm tra điều kiện tiên quyết bằng code và kết quả kiểm thử thực tế; không tự làm các sprint tiền nhiệm nếu chưa hoàn thành.

## Ngoài phạm vi

Không tự gửi Slack; không tự đóng bug sau fix; chưa đồng bộ Redmine thật ở S09.

## Thứ tự task

### S06-T01 — Contract/domain/schema work item

- **Feature:** Contract/domain/schema work item
- **Objective:** Chốt canonical identity, BUG subtype và transition policy.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/api/openapi.yaml; docs/business/defect-lifecycle.md; Backend/**/workitem/; Backend/src/main/resources/db/migration/
- **Backend changes:** Service và domain policy cho WorkItem; chi tiết bug, truy vết và nội dung làm rõ; backend cung cấp các chuyển trạng thái được phép.
- **Frontend changes:** Mô tả mapping 10 status UI vào code; không tự thêm trạng thái giả.
- **Database changes:** work_items + bug_details + links + state/history/confirmation; tham chiếu tracker ngoài được nhập thủ công; FK bảo đảm cùng dự án. Chưa có FK tới cấu hình kết nối của S09.
- **API changes:** Workitem DTO, transitions, clarification contracts; API enum do server công bố.
- **Business rules:** Vòng đời bug tách khỏi kết quả thực thi; ticket ghi phiên bản bộ quy tắc áp dụng; không hợp nhất hai store chỉ bằng cách nối mảng.
- **Tests / bằng chứng cần có:** Ma trận chuyển trạng thái với actor, điều kiện, tác động và hành vi khi thất bại; tham chiếu sai dự án; migration.
- **Dependencies:** S03/S05 + status/business questions.
- **Risk:** Lấy enum từ ảnh mà chưa được khách xác nhận; tạo hai ID cho cùng một bug.
- **Definition of Done riêng:** Schema/API/state matrix thống nhất, có mapping draft được xác nhận cho scope triển khai.

### S06-T02 — Create/update/triage backend

- **Feature:** Create/update/triage backend
- **Objective:** Tạo bug từ NG hoặc liên kết NG với bug đã có; chuyển trạng thái có audit và lưu tham chiếu tracker ngoài khi nhập thủ công.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Backend/**/workitem/; Backend/**/rules/; Backend/**/execution/; Backend/src/test/
- **Backend changes:** Tạo ticket, chi tiết, liên kết execution và audit trong một transaction; hỗ trợ gắn bug đã có với NG có kiểm tra quyền/dự án và chống trùng liên kết; server sinh mã. Lưu provider, external ID/URL và trạng thái chưa đối soát của tham chiếu ngoài; quyết định của khách có nguồn rõ ràng; Dev ghi bản build đã sửa; có chính sách cập nhật hàng loạt.
- **Frontend changes:** N/A — UI T04.
- **Database changes:** Migration cho phần còn thiếu theo task, không sửa migration đã áp dụng.
- **API changes:** Tạo, xem, sửa ticket; gắn execution NG với bug đã có; thêm/sửa tham chiếu ngoài thủ công; truy vấn/chuyển trạng thái; cập nhật hàng loạt; ghi nhận nội dung làm rõ.
- **Business rules:** Mọi lối ghi dữ liệu phải áp dụng cùng rule; sửa trường status không được bỏ qua policy; chưa cho đóng với kết luận đã xác minh cho tới S07; kết luận không tái hiện cần chứng cứ và xác nhận riêng.
- **Tests / bằng chứng cần có:** Thiếu trường, trùng mã/cập nhật đồng thời, actor không hợp lệ, chuyển trạng thái bị cấm, rollback cập nhật hàng loạt; tạo/gắn bug đã có với NG, chống trùng và sai dự án; tham chiếu ngoài thủ công không bị hiển thị là đã đồng bộ.
- **Dependencies:** S06-T01.
- **Risk:** Kanban hoặc batch bỏ qua rule; phantom bug sau retry.
- **Definition of Done riêng:** Domain/API negative tests PASS; reason/history nhất quán mọi đường ghi.

### S06-T03 — Evidence và bình luận

- **Feature:** Evidence và bình luận
- **Objective:** Upload/download thật, truy cập theo quyền, comment phân biệt internal/customer.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Backend/**/attachment/; Backend/**/workitem/; Backend/src/main/resources/db/migration/; Frontend/src/app/features/work-items/components.jsx
- **Backend changes:** Storage abstraction tối thiểu, metadata ownership, content checks, temp cleanup, sanitize comment.
- **Frontend changes:** RichEditor hiển thị upload state/error/remove/retry, tải file đúng quyền.
- **Database changes:** Attachment metadata/owner links; orphan reconciliation (blob không rollback như DB).
- **API changes:** Attachment/create/content; comments list/create; cap và media allowlist.
- **Business rules:** Không thể tải evidence chỉ vì đoán URL; không render HTML lạ; không ghi secret.
- **Tests / bằng chứng cần có:** Sai chủ sở hữu/sai dự án, tệp quá lớn hoặc MIME chứa nội dung thực thi, dọn tệp khi tạo liên kết thất bại, XSS và upload bị ngắt.
- **Dependencies:** S06-T01/T02.
- **Risk:** File nguy hiểm, lộ bằng chứng khách, storage lỗi.
- **Definition of Done riêng:** Evidence lưu bền, kiểm soát quyền và negative tests PASS.

### S06-T04 — Nối ba màn hình cùng API

- **Feature:** Nối ba màn hình cùng API
- **Objective:** Bỏ mock store cho phần đã nối và giữ giao diện/menu đã duyệt.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Frontend/src/app/features/work-items/ProjectData.jsx; Frontend/src/app/features/work-items/BoardPage.jsx; Frontend/src/app/features/work-items/IssuesPage.jsx; Frontend/src/app/features/work-items/IssueForm.jsx; Frontend/src/app/pages/IssuesPage.jsx; Frontend/src/app/services/api/
- **Backend changes:** Projection dùng cùng query/policy; không endpoint bug store riêng.
- **Frontend changes:** Tách hooks/components; board, list và bug view dùng cùng cache; form có trường bắt buộc và ngữ cảnh. Kéo thả thất bại phải khôi phục trạng thái; xử lý batch và lỗi. Từ NG chọn tạo bug mới hoặc gắn bug đã có; cho phép nhập external ID/URL thủ công và hiển thị rõ chưa đối soát.
- **Database changes:** N/A ngoài T01–T03.
- **API changes:** WorkItems API client, type=BUG cho Quản lý lỗi, page/filter request.
- **Business rules:** Frontend không tự đổi status/actor/key; persist via API; khách không thấy comment internal.
- **Tests / bằng chứng cần có:** E2E NG → tạo bug → xem ở cả ba màn → chuyển trạng thái → tải lại; phục hồi UI khi 409; bộ lọc chung; build.
- **Dependencies:** S06-T02/T03.
- **Risk:** UI đẹp nhưng vẫn dữ liệu giả, cache stale giữa view.
- **Definition of Done riêng:** Cùng một ID, trạng thái và backend cho cả ba view; kiểm thử truy vết và validation theo rule PASS.

## Demo và nghiệm thu sprint

Từ NG tạo bug hoặc gắn bug đã có; cùng ID xuất hiện ở danh sách/Kanban/Quản lý lỗi; thiếu trường bị backend từ chối. Tham chiếu tracker ngoài nhập thủ công được lưu nhưng chưa được coi là đồng bộ thành công.

- [x] Các task trong phạm vi nội bộ ADR-006 đạt DoD riêng và [DoD chung](../06-execution-guide.md).
- [x] Không task bị chặn hoặc kiểm tra chưa chạy bị ghi thành DONE; giới hạn browser upload và production được ghi trong review.
- [x] API/database/UI liên quan khớp nhau; migration kiểm tra fresh + upgrade.
- [x] Nhật ký, STATUS.json, docs và các quyết định được cập nhật.
- [x] Chưa tự triển khai sprint kế tiếp.

## Nhật ký thực hiện

### 29/09/2026 — S06-T01/T02/T03/T04: PLANNED → IN_PROGRESS → IN_REVIEW

Đã tạo nhánh `feature/sprint-06-work-items` từ develop `3355cfc`, giữ working tree tiền nhiệm chưa commit. Người dùng xác nhận bốn quyết định về status, trường bắt buộc, storage và quyền PM tại ADR-006. Phạm vi nội bộ dùng text comment, một category/milestone và policy INTERNAL_V1; chưa công bố rule khách S03.

- T01: V7 10 bảng/FK/index/reference; OpenAPI 19 operations, matrix quyền/chuyển trạng thái; inventory database cập nhật 43 + 1 bảng. V1–V6 giữ nguyên.
- T02: tạo/update/link NG, idempotency/counter, PM triage/batch/history, external reference UNRECONCILED và nội dung làm rõ; pending NG đọc từ liên kết thật.
- T03: chứng cứ máy chủ, 20 MiB, signature/cap, UUID, quyền tải/gỡ, rollback/orphan reconciliation; bình luận INTERNAL an toàn.
- T04: cùng API cho Kanban/List/Quản lý lỗi và tổng quan công việc; NG create/link, form/drawer/filter/page, retry/409 giữ draft; giữ giao diện/menu.

Kiểm tra và số liệu mới nhất tại [review S06](../../reviews/2026-09-29-sprint-06.md). Full backend 69 tests PASS, FE 101 tests PASS trước kiểm tra bổ sung cuối; FE S06 coverage gate PASS 39 tests. Browser Tester → tạo bug từ NG #3 → ba view cùng DEMO-S04-1; PM chuyển ready → reload giữ history PASS. Local MySQL 8.4.8/Flyway V7 UP; có backup logic trước migration. Đang kiểm tra thêm fixture V6 có lịch sử NG và cấp mã khi tạo đồng thời trước khi chốt DONE.

Skills: api-design, security-review, frontend-patterns, tdd-workflow, verification-loop và browser. Chưa commit/push/merge, chưa bắt đầu S07; Q08/closure/production tracker và backlog S03/S04 giữ riêng.

### 29/09/2026 12:44 — S06-T01/T02/T03/T04: IN_REVIEW → DONE

Full BE verify 69 tests PASS; kiểm tra bổ sung cuối 25 tests PASS gồm V6→V7 với NG/Unicode/latest pointer và concurrent create/idempotency. FE toàn bộ 102 tests/14 files PASS; build 1643 modules PASS; gate coverage S06 và S05 PASS. JaCoCo nhóm workitem+attachment: 94.81% instructions, 82.11% branches, 99.31% lines, 100% methods. Contract 47 operations S04–S06 và kiểm tra liên kết tài liệu PASS. Diff whitespace PASS; local Check-System xác nhận V7/7 migrations UP.

Demo: chọn **Demo thư viện kiểm thử**, mở `#/board/list` hoặc `#/issues`, bug **DEMO-S04-1** được tạo từ NG #3 bởi Tester; PM chuyển ready có lý do và lịch sử vẫn đúng sau reload. Dừng tại S06; S07 cần đọc kế hoạch/chốt retest/closure khi được yêu cầu. Không commit/push/merge.
