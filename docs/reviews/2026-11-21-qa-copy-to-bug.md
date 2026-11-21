# QA đóng và tạo Bug riêng

Yêu cầu ngày 21/11/2026 thay thế cách đổi loại Ticket tại chỗ: xác nhận QA là lỗi phải đóng QA gốc, sao chép thành Bug mới để giữ dữ liệu cũ.

- QA giữ mã, loại QA, nội dung, người phụ trách, bình luận, câu trả lời, tệp và lịch sử; đóng với lý do `CONVERTED_TO_BUG` (Đã chuyển thành Bug). Không cho mở lại hoặc chuyển lần nữa.
- Bug có ID/mã mới, bắt đầu `NEW` (Chưa xử lý), giao người được chọn theo quyền điều phối hiện có. Sao chép tiêu đề, mô tả, bước test, kết quả, ưu tiên, case/revision và thông tin môi trường/version lúc phát hiện; giữ người báo cáo ban đầu. Thay đổi ngày trong lần chuyển áp dụng cho Bug mới, không sửa ngày QA gốc.
- Liên kết hai chiều hiển thị trong chi tiết. Bình luận/tệp cũ và bình luận/tệp gửi cùng lần chuyển nằm tại QA; từ Bug mở liên kết QA để xem. Không nhân bản lịch sử thành hành động giả trên Bug.
- Tạo Bug, đóng QA, ghi liên kết/lịch sử/thông báo cùng transaction. Khóa dự án/QA, optimistic version và request key ngăn chuyển trùng; retry trả đúng Bug đã tạo.
- API actions trả chi tiết Bug mới; giao diện giữ ngữ cảnh QA gốc và tải lại QA. Kanban thêm cột QA đã chuyển; tổng quan tính đây là QA đã kết thúc. Luồng xử lý Bug và kết quả test case giữ nguyên.
- V47 thêm bảng liên kết, result ID cho idempotency và lý do đóng. Không sửa migration cũ. Các lần chuyển tại chỗ trước V47 được giữ nguyên, không tự dựng lại QA đã chuyển trong quá khứ.

## Kiểm chứng

Skill `addyosmani-test-driven-development`: regression RED trước khi sửa, GREEN sau sửa; agent phụ trách test backend, agent chính triển khai và kiểm frontend/runtime.

- Backend: 33/33 PASS, không skip (`TicketWorkflowNativeTest` 19, `TicketWorkflowTest` 7, `TicketComposerNativeTest` 7); Maven verify thành công trên schema MySQL riêng. Kiểm nội dung/nguồn, lịch sử/câu trả lời, file bytes và quyền URL tệp, retry, hai yêu cầu đồng thời chỉ một Bug, rollback toàn bộ khi thông báo lỗi. Migration V46 → V47 thành công.
- `NativeFeatureIssueIntegrationTest` cập nhật kỳ vọng và compile; chưa chạy trong runner riêng của suite này.
- Frontend toàn bộ 1456 test được thực thi; lần chạy cuối 4 test ngoài phạm vi gặp timeout khi tải cao. Chạy lại 5 file liên quan với 2 worker: 71/71 PASS. Lần chạy trước chỉ còn 2 kỳ vọng cũ về cột/nhãn chuyển đổi, đã cập nhật và kiểm lại.
- Chốt nhóm work-items: 170/170 PASS, gồm regression giữ ngày QA sau khi Bug có ngày khác (đã xác nhận RED rồi GREEN). Build frontend cuối PASS; còn cảnh báo bundle lớn hơn 500 kB, không chặn build. `git diff --check` PASS.
- Chrome thật: đăng nhập và đọc QA qua backend local, mô phỏng riêng phản hồi chuyển đổi để kiểm UI xác nhận, QA đóng và hai liên kết. Không chuyển QA nghiệp vụ thật trong quá trình nghiệm thu. Việc ghi thật được kiểm trên MySQL test cô lập.
- Không đo coverage mới; không suy ra coverage từ số test.

## Runtime

Đã backup local trước cập nhật: `var/mysql-native/backups/2026-11-21T07-56-26-812Z-tms.sql` (ignored, không xuất bản dữ liệu/credential). Runtime local dùng artifact đã verify, health UP; Flyway V47 success. Không có conversion mới được ghi vào database main khi kiểm chứng.

Bằng chứng ignored: `var/workspace-ui-browser/qa-copy-20261121/`, các JSON `qa-copy-*` cùng thư mục cha. Chưa commit/push trong tác vụ này.
