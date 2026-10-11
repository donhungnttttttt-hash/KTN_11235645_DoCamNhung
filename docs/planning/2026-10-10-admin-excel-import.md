# Admin nhập Excel và nhập nhiều file — 10/10/2026

Yêu cầu: Admin tổng được nhập test case từ Excel khi chưa là thành viên dự án; chọn nhiều file trong một lần. Không mở thêm quyền phê duyệt, phân công hay thực thi test. Không push.

Thiết kế: thêm quyền import riêng tại backend/frontend. Giữ API preview/commit theo từng file, kiểm tra nội dung và quyền trên mỗi request. Giao diện chọn nhiều file, xem trước từng file, xác nhận các file hợp lệ, ghi rõ thành công/lỗi và chỉ thử lại phần chưa thành công. Không tự nhập trước khi xác nhận. Giữ giới hạn mỗi file .xlsx 5 MiB/500 dòng/64 cột; tối đa 20 file mỗi lần để giới hạn tải trình duyệt. File trùng dùng cơ chế checksum hiện có.

Không tạo membership giả cho Admin: migration V26 cho phép revision lưu người tạo theo identity, giữ quan hệ membership cũ và nhật ký import. API revision bổ sung danh tính người tạo; phê duyệt vẫn chỉ PM dự án. Các file trong một lượt độc lập về transaction, không cam kết tất cả cùng rollback.

Kiểm chứng: test quyền Admin/PM/Tester/Dev, dự án lưu trữ, chủ sở hữu preview; test nhiều file, lỗi một phần, trùng, retry, đổi dự án/unmount; migration V25→V26 và fresh trên schema riêng; build, regression và kiểm tra trình duyệt ở nhiều độ rộng. Không chạy test ghi dữ liệu lên tms.

Skills: api-design, frontend-patterns, tdd-workflow, security-review, verification-loop. Implementation hoàn tất local; trạng thái IN_REVIEW vì Chrome chưa cấp quyền chọn file tự động. [Bằng chứng kiểm tra, migration và bàn giao](../reviews/2026-10-10-admin-excel-import.md). Backend chính 8080 đã lên V26; dữ liệu cũ của 7 bảng liên quan giữ nguyên. Không commit/push.
