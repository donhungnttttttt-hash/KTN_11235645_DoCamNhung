# Truy vết màn test case cũ

Theo yêu cầu người dùng: hoàn tất import trước, sau đó tìm code cũ để hiểu hành vi trước khi sửa giao diện.

## Nguồn Git đã xác minh

`develop:Frontend/src/app/pages/TestRunnerGridPage.jsx` và `feature/Fontend-design` có cùng blob `58eafda88d3e8c1b923e86a98a3adc3fb392b3cf` (1141 dòng). Lịch sử theo file: `b63cdd6` chuyển vào monorepo; `c10129c` thêm frontend ban đầu. Không checkout/reset các nhánh này; chỉ đọc Git để bảo toàn working tree.

## Hành vi cũ

| Vị trí trong bản Git | Hành vi |
| --- | --- |
| dòng 6–7, 91–98, 745–762 | Bấm ô iPad xoay vòng Unexecuted → OK → NG → P → Fix → NA → Unexecuted. Đổi màu nền/viền theo kết quả. Dưới ô có Tập tin và Báo cáo. |
| dòng 600–655 | Nút ba gạch dưới ID mở Hiển thị chi tiết, Hiển thị lịch sử, Sao chép URL. |
| dòng 895–975 | Chi tiết dạng bảng nhãn xanh và giá trị, có Trước/Tiếp để đổi case. |
| dòng 979–1080 | Lịch sử dạng bảng: revision, thời gian, người sửa, cột thay đổi, giá trị trước/sau, ghi chú. Giá trị cũ đỏ/gạch ngang; mới nền vàng. |
| dòng 69–89 | Kéo cạnh tiêu đề đổi độ rộng cột. |
| handleCellTextChange / applyFormatToSelectedCell | Sửa văn bản trực tiếp, định dạng ô, tạo bản ghi lịch sử trong state. |

## Giới hạn của bản cũ và nguyên nhân màn hiện tại khác

Bản cũ khởi tạo bốn case mẫu trong `useState`, dữ liệu lịch sử/người/build viết sẵn. `toggleStatus` chỉ cập nhật `rowStatuses`, không gọi API và không ghi thêm audit; tải lại trang sẽ mất trạng thái mới. Nút Tập tin chỉ gọi alert. Một số toolbar và phân trang cũng là prototype. Đây là bằng chứng implementation, không phủ nhận thiết kế tương tác mà người dùng đã chọn.

Working tree hiện tại biến TestRunnerGridPage thành adapter cho ExecutionRunnerPage (lượt chạy từ server). Màn tài liệu Excel được tạo riêng tại TestDocumentPage, render kết quả nguồn bằng span và bỏ menu ba gạch, nên ô iPad không có click handler. Việc thay màn và thiếu các thao tác này giải thích đúng phản ánh của người dùng.

## Phần tiếp tục

Khôi phục thiết kế và vị trí thao tác từ nguồn Git trên. Nối chi tiết/revision/attempt history với API thật, giữ quy tắc đã chốt về người được phân công, PM/NA và Fix/retest; không sao chép dữ liệu mẫu hoặc thông báo đã lưu khi chỉ đổi state. Mẫu nguồn Excel và kết quả thực thi là hai dữ liệu khác nhau; cần đối chiếu tiếp cách gắn ngữ cảnh đợt/build vào tương tác cũ. Chưa triển khai hoặc nghiệm thu việc khôi phục màn trong bước truy vết này. Import đã kiểm chứng riêng tại `2026-10-03-header-based-import.md`.


## Cập nhật sau truy vết

Đã triển khai khôi phục menu/chi tiết/lịch sử và nối ô kết quả vào API thực thi trên `system-design`. Phần “chưa triển khai” ở trên là trạng thái tại thời điểm truy vết. Xem [báo cáo khôi phục và kiểm chứng](2026-10-03-restored-test-grid.md).
