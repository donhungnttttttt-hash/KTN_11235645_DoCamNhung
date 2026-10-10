# ADR-006 — Công việc và bug nội bộ

Ngày: 29/09/2026. Người dùng yêu cầu duyệt và tiếp tục các sprint theo thứ tự, đồng thời trả lời bốn câu hỏi nghiệp vụ của Sprint 6.

## Quyết định đã xác nhận

- Dùng 10 trạng thái tiếng Việt đang có, một mã công việc/bug duy nhất. Kanban, Danh sách và Quản lý lỗi cùng truy vấn nguồn dữ liệu này.
- Bug bắt buộc tiêu đề, bước tái hiện, kết quả mong đợi/thực tế, build, môi trường, thiết bị và liên kết case/lần chạy. Nếu không có case, chỉ PM dự án được tạo và phải ghi lý do.
- Thành viên dự án được tạo bug, thêm bình luận và chứng cứ. Chỉ PM dự án phân công, sửa phân loại và chuyển giữa 7 trạng thái chưa kết thúc. Global ADMIN không tự có quyền PM trong dự án.
- `resolved` (Đã xử lý) cần build đã sửa, vẫn chờ Tester kiểm thử lại; không thay kết quả thực thi thành OK. Ba trạng thái kết thúc tạm khóa đến Sprint 7.
- Chứng cứ lưu trên máy chủ nội bộ; chỉ thành viên dự án truy cập. PNG/JPG/PDF/MP4, tối đa 20 MiB mỗi tệp. Chưa mở tài khoản khách hàng.

## Giới hạn và triển khai

Đây là bộ quy tắc **nội bộ đã được người dùng chấp thuận**, không phải rule khách hàng đã xác nhận. Lưu mã phiên bản `INTERNAL_V1` bất biến trên bug, với reference data được seed trong Flyway V7. Ruleset khách hàng của S03 vẫn IN_REVIEW; không tự xuất bản rule khách hàng, không coi yêu cầu Redmine đã được nghiệm thu.

Các trạng thái: `open`, `progress`, `recheck`, `clarify`, `ready`, `planning`, `resolved`, `unreproducible`, `wontfix`, `closed`. PM được chuyển giữa bảy trạng thái đầu, có lý do và lịch sử. Mọi lối ghi (form, Kanban, batch) gọi cùng policy. Ba trạng thái cuối chỉ công bố trong danh mục, không có chuyển vào trong S06.

Mã hiển thị do server sinh từ project code và counter có khóa; retry tạo bug dùng request key và checksum. Liên kết NG lưu attempt cụ thể, không sửa attempt cũ; một attempt có thể liên kết nhiều bug, cặp attempt/bug không trùng. Tạo từ NG lấy đúng revision/build/environment/device của attempt, chống trộn ngữ cảnh từ client.

Tham chiếu tracker nhập tay luôn `UNRECONCILED`, không gọi hệ thống ngoài. Nội dung làm rõ lưu nguồn, người xác nhận, thời gian do người nhập khai báo và người ghi thực tế từ session; không giả danh xác nhận của khách hàng.

Các phần đóng lỗi/retest/NA/đóng đợt và tính tỷ lệ chính thức chưa được suy diễn thêm. Quyết định về NA và đóng đợt vẫn Q08, không làm phát sinh kết quả giả.

## Phân nhánh và nghiệm thu

Đã tạo nhánh S06 `feature/sprint-06-work-items`, base develop `3355cfc`, mang working tree S01–S05 chưa commit. Không coi các nhánh tiền nhiệm đã được merge; không commit/push/deploy nếu chưa được yêu cầu trong tác vụ này.

Schema V7 dùng enum/check cố định cho loại và ưu tiên; lookup cho trạng thái/chính sách. Một danh mục và một milestone trên work item ở bản nội bộ hiện tại; quan hệ nhiều milestone/danh mục trong blueprint chưa thành yêu cầu. Chứng cứ S06 có một owner work item có FK; không tạo owner đa hình không kiểm soát. Retest S07 có thể mở rộng link theo chủ thể thực tế. Comment dùng text an toàn thay vì HTML tự do.

Tiếp tục áp dụng api-design, security-review, frontend-patterns, tdd-workflow và verification-loop. Ghi bằng chứng test/migration/browser vào STATUS và review; chỉ DONE phần đã kiểm chứng.
