# Pilot và biên bản nghiệm thu nội bộ

Trạng thái: **chuẩn bị kỹ thuật**, chưa có biên bản người dùng nghiệm thu. Bộ dữ liệu [DEMO-PILOT](demo-data.md) phục vụ thực hành. Chạy kỹ thuật do agent không thay chữ ký PM/Tester. Khách hàng/BrSE chưa có tài khoản chuyên biệt; không giả lập quyền khách để ghi PASS.

## Thông tin buổi thử

| Trường | Giá trị cần ghi khi thực hiện |
| --- | --- |
| Người PM / Tester / người quan sát | Chưa chỉ định |
| Thời điểm, timezone | Chưa lên lịch; dự án demo Asia/Ho_Chi_Minh |
| Artifact / SHA-256 / schema | Ghi từ manifest của gói dùng trong buổi thử; schema V11 |
| Trình duyệt / viewport | Ghi phiên bản và kích thước thật |
| Phạm vi dữ liệu | Tổng hợp nội bộ; không tạo ticket tracker khách |

## Kịch bản người dùng cần xác nhận

| ID | Thao tác / kỳ vọng | Kết quả người dùng |
| --- | --- | --- |
| U01 | PM/Tester đăng nhập, chỉ thấy dự án được tham gia; Tester không tạo tài khoản | Chưa chạy UAT |
| U02 | PM tải mẫu Excel → chọn file → preview → commit → reload; đối chiếu VI/JP và xuống dòng | Chưa chạy UAT |
| U03 | File lỗi/case trùng/công thức bị từ chối; không ghi một phần dữ liệu | Chưa chạy UAT |
| U04 | PM duyệt case, cấu hình đợt, phân công; Tester chỉ ghi lượt được giao | Chưa chạy UAT |
| U05 | NG → bug đủ trường/context → bình luận/chứng cứ → xuất hiện cùng mã ở Kanban/danh sách/lỗi | Chưa chạy UAT |
| U06 | Đã xử lý không tự đạt; retest FAIL mở lại xử lý, PASS đủ phạm vi mới cho PM đóng | Chưa chạy UAT |
| U07 | PM quyết định NA/chốt đợt; tổng quan, tiến độ và Excel cùng mẫu số | Chưa chạy UAT |
| U08 | Session hết hạn/409/mất kết nối: thông báo rõ, không ghi đè hoặc thay bằng mock | Chưa chạy UAT |
| U09 | Tab/Shift+Tab/Enter/Escape, focus sau đóng dialog; không mắc kẹt bàn phím | Chưa chạy UAT |
| U10 | Màn 390px và desktop: mở menu, lọc, nhập form, cuộn bảng/board và đọc lỗi | Chưa chạy UAT |

Mỗi kịch bản ghi PASS/FAIL, bước tái hiện, ID dữ liệu, ảnh/log không có credential và người xác nhận. Thực hành tạo mã case mới như `PILOT-UAT-001`; không đổi các con số mẫu rồi xem đó là lỗi seed. Kịch bản Redmine chỉ thêm sau khi chốt môi trường/binding/quyền, ghi rõ sandbox hay tracker thật.

## Bằng chứng kỹ thuật đã có

- [Review tổng hợp](../reviews/2026-09-30-sprint-11.md): unit/integration/HTTP, fresh migration, recovery, dữ liệu demo và các giới hạn.
- [Kiểm tra trình duyệt S10](sprint-10-internal.md): hướng dẫn upload/keyboard/mobile còn phải hoàn tất. S11 đã phục hồi liên kết tab và kiểm tra desktop với dữ liệu demo; không tính việc xem màn hình là đã chạy đủ các kịch bản còn lại.
- [Đánh giá](../evaluation.md): cách đo baseline/pilot, không điền số đo người dùng chưa thực hiện.

Quyết định nghiệm thu: **chờ PM/người dùng**. Lỗi critical phải sửa và kiểm tra lại; các hạn chế được PM chấp nhận cần ghi rõ phạm vi và thời hạn, không tự bỏ qua gate.
