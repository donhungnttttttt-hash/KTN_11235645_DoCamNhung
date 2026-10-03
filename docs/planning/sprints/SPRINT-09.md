# Sprint 09 — Redmine và đối chiếu dữ liệu ngoài hệ thống

Trạng thái theo [STATUS.json](../STATUS.json). **IN_PROGRESS ngày 30/09/2026** trên `feature/sprint-09-redmine`, base develop 3355cfc, giữ working tree S01–S08 chưa commit. Người dùng chọn Redmine và giao chọn cách thử tốt nhất; [ADR-009](../../decisions/ADR-009-redmine-sandbox.md) dùng sandbox local riêng/mapping nội bộ. Ước lượng ban đầu: **5–10 ngày công sau khi có sandbox và mapping**, chưa phải lịch cam kết.

## Mục tiêu

Gửi bug chuẩn hóa có trạng thái delivery rõ, chống tạo trùng và phát hiện lệch local/external.

## Phụ thuộc và điều kiện vào

S07/S08; quyết định Redmine hay Backlog, nguồn dữ liệu có thẩm quyền cho từng field, quyền API và quy tắc khách hàng. Nếu Redmine bắt buộc thì đây là điều kiện phát hành, không được coi là tùy chọn rồi đưa hệ thống vào sử dụng thật.

Đọc [discovery](../01-discovery.md), [business rules](../02-business-rules.md), [API](../05-api-contract.md), [database](../04-database-and-migrations.md) và [quy trình thực hiện](../06-execution-guide.md). Kiểm tra điều kiện tiên quyết bằng code và kết quả kiểm thử thực tế; không tự làm các sprint tiền nhiệm nếu chưa hoàn thành.

## Ngoài phạm vi

Không tích hợp cả Redmine và Backlog cùng lúc; không gửi Slack/email/Notion; không sync hai chiều tất cả field.

## Thứ tự task

### S09-T01 — Chốt provider và mapping

- **Feature:** Chốt provider và mapping
- **Objective:** Xác định tích hợp thật hay link/export hỗ trợ; phân quyền và ownership từng field.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/integrations/redmine-mapping.md; docs/planning/decisions/; docs/api/openapi.yaml
- **Backend changes:** Adapter contract và credential config policy; khảo sát REST của server đích trước implement.
- **Frontend changes:** UI trạng thái chờ/đã đồng bộ/thất bại/xung đột; hiển thị nguồn và trạng thái quan sát gần nhất.
- **Database changes:** Thiết kế liên kết ngoài duy nhất theo provider, dự án và ID phía ngoài; gắn đúng dự án nội bộ.
- **API changes:** Integration config/delivery/status/reconciliation contracts.
- **Business rules:** Không giả định UI Backlog có nghĩa provider là Backlog; phân biệt trạng thái nội bộ và trạng thái hệ thống ngoài.
- **Tests / bằng chứng cần có:** Rà mapping bằng fixture sandbox, lỗi 401/403/429 và timeout; không gửi ticket thật của khách.
- **Dependencies:** S07/S08 + quyền test sandbox và template external.
- **Risk:** Khách không cấp API; trạng thái hoặc custom fields khác tài liệu.
- **Definition of Done riêng:** Có mapping, quyền sở hữu dữ liệu và quy tắc được xác nhận; không có secret trong git; ghi BLOCKED nếu thiếu điều kiện bắt buộc.

### S09-T02 — Outbox và adapter có retry

- **Feature:** Outbox và adapter có retry
- **Objective:** Gửi sau khi dữ liệu nội bộ đã commit; đối chiếu trường hợp trùng hoặc timeout chưa biết phía ngoài đã nhận hay chưa.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Backend/**/integration/; Backend/src/main/resources/db/migration/; Backend/src/test/; docs/operations/integration.md
- **Backend changes:** Outbox worker, retry có giới hạn và khoảng chờ tăng dần, sổ theo dõi idempotency, correlation ID và lỗi đã lọc thông tin nhạy cảm; đối chiếu việc tạo ticket phía ngoài trước khi thử lại.
- **Frontend changes:** N/A — T03 nối.
- **Database changes:** Liên kết ngoài, outbox và lịch sử lần gửi; ràng buộc duy nhất và khóa khi worker nhận việc.
- **API changes:** Gửi trả 202, truy vấn trạng thái và thử lại; gọi REST của provider qua adapter.
- **Business rules:** Không giữ transaction DB trong lúc gọi Redmine; nếu phía ngoài không hỗ trợ idempotency thì cần đối chiếu và marker duy nhất; không gửi lại lệnh tạo khi chưa xác minh lần trước.
- **Tests / bằng chứng cần có:** Timeout sau khi ticket ngoài đã được tạo, job trùng, worker chạy đồng thời, token bị thu hồi, thiếu mapping; kiểm thử MySQL/outbox.
- **Dependencies:** S09-T01.
- **Risk:** Ghi hai hệ thống không nhất quán, trùng ticket phía ngoài, secret bị ghi vào log.
- **Definition of Done riêng:** Các kịch bản lỗi PASS; hệ thống ngoài ngừng hoạt động không làm mất ticket nội bộ hoặc báo đã đồng bộ sai.

### S09-T03 — Nối UI đối chiếu và nghiệm thu sandbox

- **Feature:** Nối UI đối chiếu và nghiệm thu sandbox
- **Objective:** BrSE thấy mapping, lỗi đồng bộ và thao tác xử lý trong quyền được cấp.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Frontend/src/app/features/integrations/; Frontend/src/app/features/work-items/IssueForm.jsx; Backend/**/integration/; docs/uat/
- **Backend changes:** Truy vấn đối chiếu; xử lý xung đột theo quyền sở hữu dữ liệu và có audit.
- **Frontend changes:** Liên kết ticket ngoài, trạng thái đồng bộ/lần gửi gần nhất/thử lại và danh sách sai lệch; kiểm tra quyền riêng cho từng thao tác.
- **Database changes:** Không migration nếu schema T02 đủ.
- **API changes:** Integration client; ticket đóng ở hệ thống ngoài không tự tạo kết quả test case OK.
- **Business rules:** Khách chỉ đọc theo contract; gửi ticket thật cần phạm vi ủy quyền cụ thể.
- **Tests / bằng chứng cần có:** E2E tạo/cập nhật/thử lại/xung đột trên sandbox; báo rõ khi thiếu credential; không tự đóng bug hoặc đổi kết quả test trái policy.
- **Dependencies:** S09-T02.
- **Risk:** Nhầm sandbox/production, quyền publish chưa rõ.
- **Definition of Done riêng:** Checklist integration PASS hoặc ghi BLOCKED rõ; nếu bắt buộc thì release S11 bị chặn.

## Demo và nghiệm thu sprint

Sandbox gửi thành công; timeout→retry chỉ một ticket; external conflict hiển thị để BrSE xử lý.

- [x] Các task trong phạm vi đạt DoD riêng và [DoD chung](../06-execution-guide.md).
- [x] Không task bị chặn hoặc kiểm tra chưa chạy bị ghi thành DONE.
- [x] API/database/UI liên quan khớp nhau; migration kiểm tra fresh + upgrade nếu có.
- [x] Nhật ký, STATUS.json, docs và các quyết định được cập nhật.
- [x] Chỉ tiếp tục tuần tự theo ủy quyền 29/09/2026 sau kiểm chứng.

## Nhật ký thực hiện



30/09/2026 — S08 DONE theo review ECC. Bắt đầu S09-T01: khảo sát tài liệu API Redmine, ghi ADR-009/mapping nội bộ và chuẩn bị sandbox. Chỉ PM công bố snapshot; TMS giữ authority, không tự công bố chứng cứ/comment nội bộ. Thông tin tracker khách vẫn chưa có; sandbox là phạm vi nghiệm thu nội bộ, không tự miễn release gate khách.

30/09/2026 — T02/T03 IN_PROGRESS: V10 thêm redmine_bindings/redmine_outbox/redmine_delivery_attempts; payload bất biến, stable marker/create fence, claim/HTTP/finalize tách transaction, lease fencing, PM version/idempotency/audit. 55 targeted BE tests PASS, gồm migration fresh/restart/upgrade V9; local đã áp dụng V10 sau backup. FE 147 tests/build PASS, gate Redmine 13 tests PASS. Bộ full BE đang chạy. Browser phát hiện Redmine bỏ cờ riêng tư khi thiếu set_own_issues_private: đã thêm quyền tối thiểu, bổ sung smoke RED/GREEN, công bố lại cùng #2 DELIVERED. Kết luận smoke cũ được đính chính trong runbook. Chưa DONE/commit/push.

30/09/2026 — T01/T02/T03 DONE nội bộ theo ADR-009. Final targeted 71 PASS, coverage BE integration 81.10% branches; FE 147 tests/build và gate 13 tests PASS. Runtime restart V10, công bố #2 có tên build sửa, cả #2/#3 private/unique. Review: [ECC S09](../../reviews/2026-09-30-sprint-09.md). Không commit/push/merge/deploy; tracker khách vẫn là gate trước pilot.
