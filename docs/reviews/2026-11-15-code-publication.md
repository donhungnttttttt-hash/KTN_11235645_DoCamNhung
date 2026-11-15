# Bản bàn giao code — 15/11/2026

Người dùng yêu cầu commit và push lên nhánh system-design.

Phạm vi gồm các cập nhật frontend/backend hiện tại: dashboard Khách Nhật–Việt và AI; tổng quan/quản trị dự án/thiết bị; import/export test case, môi trường/version/phân công; giao diện và tệp đính kèm Ticket; thống nhất thuật ngữ và form. Bỏ màn Monkey đã xóa theo yêu cầu cuối. Kèm migration mới V41–V46; không thay đổi migration cũ.

## Kiểm chứng trước khi bàn giao

- 1454 frontend tests PASS. Lượt đầu có 6 test QA còn tham chiếu nhãn Đầu mối tiếp nhận; cập nhật sang Người phụ trách và chạy lại toàn bộ.
- Backend biên dịch thành công, 52 unit tests PASS cho dashboard, ngôn ngữ AI, Excel, tổng quan Admin và Ticket.
- Frontend build PASS, còn cảnh báo kích thước bundle hiện có.
- Chrome đã xác nhận form/metadata, bỏ màn Monkey và mở danh sách Ticket; không ghi dữ liệu dự án.
- git diff --check PASS. Coverage chưa đo trong lượt bàn giao. Không chạy lại integration MySQL trong lượt này; xem các báo cáo chức năng cho bằng chứng trước đó.

## Phạm vi Git

Đưa source, test, cấu hình chia sẻ, migration và tài liệu vào Git. Giữ ngoài Git các credential cục bộ, bản sao runtime, ảnh/receipt kiểm tra và Excel/dữ liệu nguồn dưới var. Không xuất dữ liệu database hoặc đính kèm người dùng vào commit.
