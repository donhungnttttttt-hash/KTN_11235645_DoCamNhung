# ADR-001 — Foundation và theo dõi kỹ thuật nội bộ trong Sprint 01

Ngày: 22/09/2026. Trạng thái: đã triển khai, cập nhật theo chỉnh sửa của người dùng: **kiểm tra kỹ thuật chỉ theo dõi nội bộ, không đặt trên web**.

## Bối cảnh và phạm vi được bổ sung

Sau khi yêu cầu lập kế hoạch đầy đủ, người dùng yêu cầu chủ động tạo nhánh từ develop và thực hiện một sprint có FE, BE, MySQL và Flyway để xem thử. Ban đầu đã chọn thêm màn demo lưu bản ghi trên dashboard. Người dùng làm rõ phần kiểm tra hệ thống phải nằm ở công cụ theo dõi phía phát triển; màn web đã được gỡ.

`origin/develop` đã chứa giao diện từ feature/Fontend-design tại commit merge `3355cfc`; tạo `feature/sprint-01-foundation` trực tiếp từ develop đó. Giữ tài liệu kế hoạch đang có, không cherry-pick/merge lại frontend hoặc đụng nhánh feature cũ.

## Quyết định

- Thực hiện S01-T01/T02/T03; kiểm tra kết nối bằng scripts/Check-System.ps1, health endpoint, log backend/Flyway và integration test. Không thêm tab, trang hay form diagnostic trên web. Tổng quan chỉ có Tổng quan dự án và Tổng quan kiểm thử.
- Giữ API local `/api/v1/system/**` cho công cụ phát triển và kiểm thử. V1 đã được áp dụng nên giữ nguyên bảng `foundation_checks` và history; không sửa/xóa migration chỉ để gỡ UI. Không kéo CRUD nghiệp vụ S02–S06 vào sprint này.
- Giữ sáu menu và submenu Bảng Kanban/Danh sách. API client dùng origin hiện tại với Vite proxy, có lỗi rõ ràng và không fallback mock. Dữ liệu prototype khác vẫn giữ cho các sprint nghiệp vụ.
- Java 21, Boot 3.5.16, Maven 3.9.11, MySQL 8.4.8, dependency Flyway/driver/Testcontainers theo Boot BOM. Phiên bản và lệnh tái lập tại development.md.
- Flyway quản lý schema, Hibernate validate. Runtime và migrator dùng tài khoản riêng. Không chạy SQL tạo schema thủ công ngoài Flyway; Docker init chỉ tạo database/users/grants.
- API kiểm tra chỉ bật ở profile local và loopback; vẫn cần CSRF cho POST. Login, authorization nghiệp vụ và project scope thực hiện S02/S03. Dữ liệu kiểm tra không chứa khách hàng/actor/business audit.
- Nâng Vitest vừa thêm lên 4.1.11 sau khi audit phát hiện advisory ở bản 3.x. Bỏ dependency react-router-dom không có import trong source; ứng dụng tiếp tục dùng hash router hiện có. Không chuyển framework routing.
- Các câu hỏi Q01–Q14 chưa được tự chốt; chỉ câu hỏi thực sự liên quan mới chặn sprint tiếp theo. Không tiếp tục S02 khi xong S01.

## Hệ quả và giới hạn

Có thể kiểm chứng ghi/đọc dữ liệu thật bằng integration test và kiểm tra trạng thái bằng terminal. Đã xóa SystemCheckPage, CSS, service gọi API diagnostic và bộ test riêng của màn đó khỏi frontend; API client dùng chung vẫn giữ. Bảng diagnostic là dữ liệu kỹ thuật, có thể ngừng dùng bằng một migration sau này; không sửa V1 đã chạy. Người dùng chưa có login thật, business dashboard chưa dùng API; không gọi bản này là hệ thống nghiệp vụ hoàn chỉnh. Chưa commit/push/merge/deploy thay người dùng trong tác vụ này.
