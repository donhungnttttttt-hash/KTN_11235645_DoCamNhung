# Kiểm tra đầu vào dự án/danh mục — S10

Đây là phần bổ sung validation cho endpoint hiện có, không thêm quyền hoặc domain.

- `POST /api/v1/projects`: timezone bắt buộc là ZoneId hợp lệ được Java hỗ trợ, tối đa 50 ký tự theo schema, ví dụ `Asia/Ho_Chi_Minh`, `UTC`; rỗng/null/sai trả 422 `INVALID_TIMEZONE` trước khi lưu. Cùng bộ timezone được dùng để tính ngày báo cáo.
- `PATCH /api/v1/projects/{id}`: không gửi timezone/null giữ nguyên; nếu gửi chuỗi thì áp dụng cùng quy tắc. Validation thất bại rollback toàn bộ thay đổi, không tăng version.
- `POST/PATCH /api/v1/projects/{id}/catalogs/{kind}`: chuyển JSON thành DTO rồi chạy Bean Validation; các `NotBlank` trên DTO tạo mới được enforce. Kiểu dữ liệu không chuyển được hoặc thiếu trường bắt buộc trả 422 `INVALID_CATALOG_INPUT`, không trả giá trị nhạy cảm hay exception gốc.

Review bổ sung ngày 30/09: catalog có optimistic lock và validation chiều dài theo schema; PATCH/DELETE cần phiên bản đã đọc, stale trả 409. Ngày kết thúc không trước ngày bắt đầu; để xóa ngày đã đặt, PATCH gửi `clearDates: ["releasedAt"]` cho build hoặc `clearDates: ["startsOn", "dueOn"]` cho milestone. Bỏ trường/null giữ nguyên. Chi tiết trong [contract cài đặt](project-settings.md). Quyền và chặn cross-project ở service không thay đổi. V11 bổ sung version, giữ V1–V10 bất biến; dữ liệu cũ có timezone sai cần người quản lý sửa qua API.
