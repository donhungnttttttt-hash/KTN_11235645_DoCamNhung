# Sửa cắt chữ và căn hàng biểu mẫu công việc

## Yêu cầu và nguyên nhân

Ảnh người dùng ngày 05/10/2026 chỉ ra ô chọn bị cắt chữ tại bộ lọc Kanban/danh sách và chuyển trạng thái; nút tải chứng cứ lệch hàng. Phạm vi sửa là CSS chung của các màn công việc hiện có, giữ luồng thao tác và nghiệp vụ.

Tái hiện trên Chrome native trước khi sửa: ô Loại có height 28px, clientHeight 26px nhưng padding trên/dưới đều 8px, chỉ còn 10px cho chữ 11px. Nguyên nhân là theme work-board ép chiều cao thấp trong khi wi-field vẫn dùng padding của biểu mẫu. Hàng có label/input dùng align-items:center nên nút căn giữa cả nhãn và ô nhập.

## Thay đổi

- Theme dùng height:auto, min-height 34px, padding 6px và chữ 12px cho input/select/button. Loại checkbox/radio khỏi quy tắc kích thước ô văn bản.
- Màn nhỏ ≤640px: min-height 44px cho nút và trường nhập liên quan.
- Chỉ hàng wi-actions chứa wi-field mới căn đáy; trường được co xuống theo chiều rộng khung. Các hàng lịch sử/badge giữ căn giữa.
- Grid con cho phép co chiều rộng, input file không vượt khung; nút có tên tệp dài có thể xuống dòng.
- Chỉ hai file CSS sản phẩm thay đổi, không thêm dependency, không đổi API/BE/migration.

## Kiểm chứng

- Browser trước sửa: tái hiện chữ bị cắt và đo 28px/8px+8px. Sau sửa: ô chọn desktop cao 34px, vùng nội dung 20px; ảnh hiển thị đầy đủ chữ.
- Browser native, dữ liệu demo: bộ lọc thường/nâng cao, drawer chi tiết bug, phần sửa thông tin mở/đóng, chuyển trạng thái, chứng cứ và retest ở 1440×900, 390×844, 320×740. Tab focus hoạt động; không gửi chỉnh sửa nghiệp vụ hay tải chứng cứ thử lên DB.
- 320px: các ô chọn trong form sửa và input file cao 44px. Drawer clientWidth=scrollWidth=285px; main danh sách clientWidth=scrollWidth=314px. Bảng rộng cuộn trong khung riêng.
- Console: không có error được ghi nhận trong lượt kiểm tra.
- `npm test`: 36 files, 290/290 PASS. `npm run build`: PASS. `git diff --check`: PASS. Không đo lại coverage cho thay đổi CSS; test JS không thay thế kiểm tra bố cục trên browser.
- Ảnh local: `output/playwright/2026-10-05-work-item-ui.png`, `output/playwright/2026-10-05-work-filters.png`.

Skills: brainstorming (phạm vi sửa giới hạn, giữ thiết kế đã thống nhất); ponytail (sửa nguyên nhân chung trong CSS); ui-ux-pro-max (text clipping, responsive, touch target từ quick-reference). Search script không chạy được vì Python/py không có trong PATH, nên dùng hướng dẫn có sẵn trong skill, không coi đó là kết quả truy vấn. Đã đọc prompt-master; skill tự giới hạn cho tác vụ viết prompt nên không kích hoạt quy trình sinh prompt ở đây.

Đây là kiểm chứng các màn bị ảnh hưởng bởi CSS, không phải xác nhận toàn bộ hệ thống không còn lỗi. S11 giữ IN_REVIEW cho các gate integration riêng/UAT/pilot. Chưa commit/push trong tác vụ UI này.
