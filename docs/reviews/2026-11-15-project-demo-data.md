# Dữ liệu mẫu — Test tháng 11 ngày 15

Người dùng yêu cầu tạo dữ liệu mẫu cho dự án đã tạo sẵn, dùng bốn Excel được chỉ định. Đã thực hiện trên dự án **T11-15 / ID 13**, qua các API nghiệp vụ đang chạy; không thêm migration, không sửa source sản phẩm, không đổi mật khẩu hay loại tài khoản cũ.

## Dữ liệu đã tạo

| Feature | File nguồn | Case | OK | NG | P | NA | Chưa chạy |
|---|---|---:|---:|---:|---:|---:|---:|
| Đăng nhập đồng thời | 重複ログイン | 13 | 9 | 1 | 1 | 0 | 2 |
| Chỉnh sửa ghi chú bảng đen | 黒板メモ内編集機能 | 193 | 110 | 12 | 8 | 3 | 60 |
| Danh sách bảng đen | 黒板一覧 | 107 | 70 | 6 | 4 | 2 | 25 |
| Tạo bảng đen | 黒板作成 | 168 | 90 | 10 | 8 | 4 | 56 |
| **Tổng** | **4 Excel** | **481** | **279** | **29** | **21** | **9** | **143** |

- 338/481 case đã test trong kịch bản mẫu, tương ứng 70,27%; không phải bằng chứng kiểm thử thực tế hoặc nghiệm thu.
- Giữ 21 thành viên có sẵn; thêm một tài khoản Khách mẫu chỉ thuộc dự án 13. Ba USER demo hiện có tự nhận vùng case; mỗi file có hai người phụ trách. Không thay đổi loại tài khoản theo vai trò thực hiện Ticket.
- Mỗi Feature có hai version DEMO 1.4.1/1.4.2 và hai môi trường QA/UAT. Kết quả đã ghi đều có version/môi trường/ngày thực hiện 15/11/2026.
- Hai môi trường danh mục, hai build, ba thiết bị logic giả lập, ba nhóm chức năng và ba mốc kế hoạch 16/18/20 tháng 11.
- 39 Ticket: 35 Bug và 4 QA, phủ đủ chín cột. Mỗi case NG có Bug; liên kết nguồn, điều kiện, bước, kỳ vọng, tần suất, môi trường, thiết bị, version và phân công được lưu.
- Một hướng dẫn nội bộ, một ghi chú kế hoạch và một báo cáo Markdown đã công bố cho Khách (report ID 2).

| Cột Ticket | Số lượng |
|---|---:|
| Xác nhận spec | 3 |
| Chưa xử lý | 10 |
| Đang xử lý | 9 |
| Chờ xác nhận | 6 |
| Đóng — Đã xử lý | 4 |
| Đóng — Đã sửa | 3 |
| Đóng — Không thể tái hiện | 2 |
| Đóng — Không xử lý | 1 |
| QA — Đóng — Không được hỗ trợ | 1 |

32 Ticket còn nghĩa vụ, trong đó 10 chờ xác nhận; 7 đã kết thúc. Các chuyển trạng thái và bình luận đều ghi rõ là mẫu. Không gọi các kết quả này là lỗi thật của ứng dụng nguồn.

## Điều chỉnh file nhập

File `黒板作成` bị từ chối vì **A165 chỉ chứa khoảng trắng**, trong khi B165/No là 164 và dãy lân cận là 163, 165. Đã tạo bản sao trong `var/nov15-demo/prepared`, bổ sung ID 164 ở A165 và nhập đủ 168 case. Không sửa file gốc trên ổ D. Ghi chú điều chỉnh hiện có trong Feature, handbook và báo cáo.

Chỉ lấy chín cột nội dung đã thống nhất. Các cột Status, ghi chú thực thi, Redmine và người test cũ không được nhập; trường trên web là dữ liệu mới của bộ mẫu.

## Kiểm chứng

Áp dụng skill **verification-loop** vào kiểm tra dữ liệu sau thao tác. Không có thay đổi code cần build/unit regression mới; không đo hoặc suy ra coverage.

- Backup trước thao tác: `var/mysql-native/backups/2026-11-15T05-59-24-844Z-tms.sql`.
- Hash cả bốn file nguồn không thay đổi. Đối chiếu từng dòng/cột của 481 case với nội dung bản nhập, bao gồm ngoại lệ A165 đã ghi nhận.
- Bốn lượt tải file gốc qua API khớp byte với file đã nhập; ba file đầu là nguyên bản, file thứ tư là bản sao đã sửa A165.
- Kiểm tra tất cả case có người test ban đầu; file có hai owner; kết quả đã ghi có môi trường và version.
- 39 Ticket khớp cột dự kiến, có nguồn case, version, môi trường, người nhận và comment.
- Đăng nhập bằng tài khoản Khách mới: chỉ thấy một dự án; GET dashboard/report thành công; truy cập dự án 1 và API Ticket nội bộ bị từ chối.
- Dashboard: 481 case, 338 đã test, 39 Ticket, 32 còn nghĩa vụ, 10 chờ xác nhận. 20 USER + 1 quản lý → 12.500 đơn vị/ngày làm việc theo mô hình đã duyệt. Khách không tính chi phí.
- Đề xuất chất lượng AI đạt READY tại thời điểm kiểm tra. Chi phí/tiến độ chưa đủ mốc so sánh nên không kết luận trễ; không tạo lịch sử giả trước ngày dự án tồn tại. Hiện có một ngày quan sát, ngày 15/11 là Chủ nhật nên chi phí lũy kế theo lịch thứ Hai–thứ Sáu chưa phát sinh.
- Bằng chứng và nhật ký thao tác có thể tiếp tục an toàn nằm trong `var/nov15-demo/verification.json` và `state.json` (được Git ignore). Credential Khách ở `accounts-private.md`, không đưa vào tài liệu Git hoặc handbook.

Không commit/push. Không sửa hoặc xóa dữ liệu của các dự án khác. Kiểm chứng thông qua API và dữ liệu tải về, không tuyên bố đã kiểm tra hình ảnh bằng Chrome.
