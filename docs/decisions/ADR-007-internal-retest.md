# ADR-007 — Kiểm thử lại và đóng lỗi nội bộ

Ngày 29/09/2026; người dùng xác nhận ba câu hỏi Sprint 7.

## Quyết định

- PM dự án xác định toàn bộ case/cấu hình cần retest; chỉ đóng đã sửa khi tất cả mục trong phạm vi hiện hành đạt trên build sửa hiện hành. Bug chưa có case phải được PM bổ sung phạm vi trước.
- Tester được phân công ghi kết quả. FAIL đưa bug về Đang xử lý. Chỉ PM đóng/mở lại có lý do; Không tái hiện/Không xử lý cần lý do, chứng cứ và nguồn xác nhận.
- TMS là nguồn trạng thái cho bản nội bộ. Redmine/Backlog vẫn tham chiếu thủ công đến S09; không tự gọi tracker hoặc đồng bộ trạng thái khách hàng.

## Bất biến

BUG_ONLY chỉ ghi xác minh bug; FULL_CASE ghi thêm execution attempt mới. Không sửa attempt cũ, không tự đóng bug khác liên quan, không tự đánh OK một case vì bug được đóng. PM xác nhận phạm vi bằng danh sách run item và lý do; UI đưa các liên kết nguồn để PM đối chiếu. Mỗi coverage revision bất biến; đổi scope/build, FAIL hoặc reopen làm kết quả vòng cũ mất hiệu lực cho việc đóng hiện tại.

Retest request thuộc một build/môi trường/thiết bị và một người được phân công. Người thực hiện phải còn active, là PM/TESTER và được gán trên run item, khớp quyền ghi execution S05. Nhiều request có thể tích lũy PASS của cùng coverage revision/vòng. Yêu cầu ghi kết quả rồi đóng nhưng không đủ điều kiện rollback toàn bộ; người dùng có thể gửi lại chỉ lưu kết quả.

Đóng ngoại lệ không tự coi case OK. Reopen giữ lịch sử quyết định cũ, đưa bug về Đang xử lý và yêu cầu bản sửa/vòng retest mới. Evidence đã được dùng trong verification hoặc quyết định đóng không được gỡ để làm mất căn cứ lịch sử.

## Phạm vi thực hiện

Nhánh `feature/sprint-07-retest`, base develop `3355cfc`, mang working tree trước chưa commit. Migration dự kiến V8, giữ V1–V7. API/quy trình chi tiết ở [retest-policy](../business/retest-policy.md). Q08 về NA/đóng đợt và KPI chính thức vẫn còn mở; không chặn retest bug đã chốt.

Người dùng đã cho phép tiếp tục tuần tự các sprint sau; vẫn kiểm chứng từng sprint, không tự commit/push/merge/deploy hoặc thay người dùng duyệt UAT/production.
