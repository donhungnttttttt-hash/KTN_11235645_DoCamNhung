# ADR-005 — Thiết kế dữ liệu và triển khai Sprint 5

Ngày 28/09/2026. Người dùng yêu cầu rà soát toàn bộ database, bổ sung các bảng còn thiếu trong S05 rồi tiếp tục theo sprint. Nhánh `feature/sprint-05-execution` kế thừa working tree S01–S04 chưa commit trên nền develop `3355cfc`; không coi các sprint trước đã merge.

## Phạm vi thực hiện

Thiết kế toàn hệ thống được cập nhật trước; migration V6 chỉ tạo nền thực thi có API/UI và kiểm thử tương ứng. S03/S04 còn mục IN_REVIEW, nhưng thư viện revision đã duyệt, membership và catalog cần cho execution đã có integration test. Người dùng mở rộng phạm vi sang S05; không âm thầm đánh dấu các mục review cũ DONE. Các bảng bug/evidence/retest/report/integration triển khai lần lượt S06–S09, không tạo schema chưa chốt rule khách.

## Quyết định kỹ thuật

- Đợt có các cấu hình môi trường + thiết bị và build mặc định. Một case trong một cấu hình là một run item. Build của lần chạy có thể thay đổi khi kiểm thử lại; không tạo thêm run item chỉ vì build đổi.
- Run item giữ đúng revision đã chọn và được PM duyệt. ACTIVE khóa phạm vi; không tự chuyển sang revision mới khi thư viện được cập nhật. Bản nháp bổ sung scope với expectedVersion; S05 chưa có thao tác loại scope/đóng đợt trước quyết định Q08.
- Phân công hiện tại nằm trên run item; `run_item_assignments` giữ lịch sử từng lần gán, người gán và lý do. Không thêm bảng assignment theo suite trùng nguồn; thao tác chọn nhiều revision vẫn tạo từng run item và từng lịch sử.
- Attempt append-only, server lấy actor/thời gian, lưu build + snapshot catalog và người chạy. Revision truy theo run item bất biến. Latest pointer có FK ghép xác nhận attempt thuộc chính run item; không có kết quả tự gán ở phía React.
- Các endpoint ghi khóa project trước rồi mới đọc membership/cycle/run, cùng thứ tự với các thao tác thay đổi case/member/catalog; expectedVersion chặn bản nháp cũ. Khóa request + checksum nội dung chống ghi lặp; đổi nội dung nhưng dùng lại key nhận 409. Project lock là lựa chọn ban đầu để bảo đảm nhất quán; S10 đo contention trước khi thu hẹp khóa.
- PM hoặc ADMIN là thành viên dự án được quản lý đợt/phân công, phù hợp quyền cấu hình hiện tại. Người được phân công và còn active mới được ghi lần chạy; không suy quyền dự án từ vai trò PM toàn hệ thống. PM muốn chạy phải được phân công. Quyền phê duyệt revision vẫn **chỉ PM dự án**.
- `OK`, `NG`, `P` là kết quả lần chạy. Chưa chạy suy từ không có attempt. Fix không nằm trong bảng kết quả; báo đã sửa thuộc bug/retest S06–S07. NG lưu được trước S06 và hiển thị chờ liên kết bug, không giả vờ đã tạo ticket ngoài.
- NA/phê duyệt scope và đóng cycle phụ thuộc Q08; câu hỏi NA được gửi riêng, không âm thầm đặt bằng OK hoặc loại mẫu số.

FK ghép dùng khóa unique tường minh để bảo vệ phạm vi dự án, theo [MySQL 8.4 foreign keys](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html). Các cập nhật phụ thuộc cùng scope dùng transaction và [locking reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html). Cột thời gian UTC microsecond, UUID identity giữ nguyên, BIGINT domain giữ nguyên. V1–V5 đã áp dụng không sửa.
