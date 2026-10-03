# Hướng dẫn sử dụng nội bộ

Đăng nhập tại `http://127.0.0.1:5173/` bằng tài khoản đã được cấp, chọn **DEMO · Kiểm thử phát hành 1.2** để thực hành. Admin hoặc PM được Admin cấp riêng mới tạo tài khoản; Tester không có quyền. PM dự án phụ trách case/phân công/đóng lỗi; quyền PM dự án không nâng quyền hệ thống.

## Sáu mục điều hướng

| Menu | Dùng để làm gì |
| --- | --- |
| Tổng quan | Xem phạm vi, kết quả, công việc và các số liệu của dự án đã chọn |
| Bảng công việc | Mở Bảng Kanban hoặc Danh sách trong menu con; lọc, mở chi tiết, tạo công việc |
| Quản lý kiểm thử | Thư viện case, đợt kiểm thử, các lượt được phân công và hàng chờ retest |
| Quản lý lỗi | Các bug của cùng dự án/cùng mã công việc, không phải kho dữ liệu thứ hai |
| Quản lý tiến độ | Đối chiếu tiến độ theo phạm vi và người phụ trách |
| Tổng hợp & Phân tích | Lọc đợt/build, xem nguồn và xuất Excel báo cáo |

Cấu hình dự án ở `#/settings`: thành viên, danh mục, rule nội bộ có phiên bản và sổ tay. Chỉ người đủ quyền được sửa. Theo dõi backend/MySQL/Flyway bằng terminal, không có màn diagnostic cho người sử dụng.

## Luồng PM → Tester → PM

1. **PM chuẩn bị:** tạo nhóm case; khai báo môi trường, thiết bị và build trong danh mục. Tạo case hoặc nhập Excel theo mẫu nội bộ.
2. **Nhập Excel:** tải mẫu `.xlsx`, giữ tên sheet/cột và mã nhóm có sẵn. Chọn file, xem trước và sửa các dòng lỗi rồi mới xác nhận. Không tự ghi đè case trùng; tối đa 500 dòng/5 MiB. Phiên xem trước hết hạn sau 24 giờ. Nhập xong tải lại danh sách để đối chiếu.
3. **PM duyệt:** mở revision đúng nội dung và phê duyệt. Bản sửa nội dung tạo revision mới; các lượt đang chạy vẫn giữ revision đã được phân công.
4. **PM lập đợt:** chọn cấu hình build/môi trường/thiết bị, thêm các revision đã duyệt, phân công Tester, rồi kích hoạt. Phạm vi đã kích hoạt không đổi bằng cách sửa case gốc; cần đợt mới nếu mở rộng.
5. **Tester thực thi:** mở đúng đợt/lượt của mình, đọc bước và kết quả mong đợi; ghi OK, NG hoặc P. NG cần kết quả thực tế; P cần lý do. Kết quả cũ được giữ lại nếu ghi lần mới.
6. **Ghi bug:** từ lượt NG tạo bug, kiểm tra bước tái hiện, mong đợi/thực tế, build/môi trường/thiết bị và case/lần chạy. Tiêu đề demo bắt đầu `[DEMO]`. Tester thêm bình luận/chứng cứ; PM phân loại, phân công và chuyển trạng thái.
7. **Dev báo đã sửa:** PM đặt Đã xử lý và chọn build sửa. Bước này chưa đổi NG thành OK và chưa đóng bug.
8. **Retest:** PM xác định toàn bộ phạm vi, tạo yêu cầu và phân công. Tester ghi kết quả trên build sửa hiện hành. FAIL đưa bug về Đang xử lý. FULL_CASE cập nhật lần thực thi; BUG_ONLY chỉ xác minh bug.
9. **PM đóng/mở lại:** Hoàn thành chỉ khi đủ mọi mục đã đạt; Không tái hiện/Không xử lý cần lý do, chứng cứ và nguồn xác nhận. Mở lại cần lý do. Không dùng đổi cột để bỏ qua điều kiện đóng.
10. **Chốt đợt/báo cáo:** PM loại NA có lý do; chốt khi hết Chưa chạy/P, các NG có liên kết bug và đã ghi nhận tồn đọng. Lọc báo cáo theo đợt/build, xuất `.xlsx` để kiểm tra nguồn cùng công thức.

## Cách đọc kết quả và xử lý lỗi

Tiến độ thực thi = `(OK + NG) / phạm vi áp dụng`; tỷ lệ đạt = `OK / phạm vi áp dụng`. NA nằm ngoài mẫu số; P và chờ retest chưa tính đạt. Không có phạm vi thì hiển thị “Chưa có phạm vi áp dụng”, không suy thành 100%.

Phiên hết hạn: đăng nhập lại. Thiếu quyền hoặc ngoài dự án: kiểm tra membership với PM. Xung đột phiên bản 409: giữ nội dung đang nhập, tải bản mới và đối chiếu trước khi lưu lại; không bấm liên tục để ghi đè. API không phản hồi: xem thông báo lỗi và báo người vận hành; ứng dụng không chuyển sang số liệu giả.

Chứng cứ PNG/JPG/PDF/MP4 tối đa 20 MiB/tệp, chỉ thành viên dự án tải được. Không đưa mật khẩu hoặc dữ liệu cá nhân không cần thiết vào bình luận/tệp. Tệp demo là giả lập, không thay chứng cứ thực tế. Phần Redmine chỉ phản ánh binding/đối soát được cấu hình; demo S11 không tự đẩy 32 bug ra tracker.
