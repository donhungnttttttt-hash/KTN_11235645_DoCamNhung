# Tổng quan Admin và loại Tablet — 15/11/2026

## Kết quả

- Bỏ giới hạn `limit(10)` tại `AdminOverviewService`. API trả toàn bộ dự án trong phạm vi; giao diện hiển thị các dự án đang hoạt động. Local có 12 dự án, 1 lưu trữ, nên tiến độ hiển thị đúng **11/11**. Bản backend cũ trả 10 dự án, khi frontend mới loại dự án lưu trữ thì chỉ còn 9/11; đã thay backend đang chạy.
- Bỏ KPI Tiến độ kiểm thử và nút Tải lại ở đầu trang. Thêm biểu đồ tròn nhỏ trong Status test case; giữ các thanh trạng thái và số liệu.
- Đổi Nhóm thành Tên dự án trong bảng Membership.
- Kho thiết bị có bốn dòng Android, Tablet, iPhone, iPad; mỗi thanh xếp chồng bốn trạng thái màu riêng. Popup hiển thị số lượng và tỷ lệ khi hover, focus hoặc bấm; Escape đóng. Loại không thuộc bốn dòng vẫn được giữ trong kho, kèm ghi chú tổng nếu có.
- Thêm TABLET vào validation/API và form thiết bị. V46 mở rộng check constraint, không tự chuyển OTHER hoặc Android sang Tablet.

## Kiểm chứng

- Hai kiểm thử giao diện mới đã thất bại trước triển khai, sau sửa đạt. Full frontend: **1.439/1.439 test, 160 file**; build PASS (còn cảnh báo bundle trên 500 kB).
- Backend trên MySQL kiểm thử riêng: AdminOverviewServiceTest **9/9**, AdminOverviewTabletNativeTest **3/3**, không skip. Kiểm tra trả toàn bộ dự án, tạo Tablet, đổi loại có chủ đích, giữ OTHER và từ chối loại không hợp lệ.
- Migration riêng: fresh V46 và nâng V45 → V46 đều PASS; bốn loại cũ giữ nguyên, tạo Tablet được, chạy lại không phát sinh migration.
- Backup trước cập nhật: `var/mysql-native/backups/2026-11-15T08-39-32-861Z-tms.sql`. Local backend8080 đã nâng V46 và health UP; hash toàn bộ 124 dòng device_assets trước/sau không đổi.
- Chrome thật riêng: xác nhận 11 liên kết trong tiến độ và nhãn 11/11, KPI/nút đầu trang đã bỏ, donut hiện đúng, bốn dòng kho, popup đủ bốn trạng thái, click ghim/đóng, focus/Escape. Tablet đang 0 máy hiển thị Chưa có thiết bị. Desktop1440×1000 và mobile390×844 không lỗi JavaScript; mobile không tràn ngang.
- Ảnh và script kiểm chứng local (ignored): `var/workspace-ui-browser/overview-runtime/overview-top.png`, `overview-inventory.png`, `overview-mobile.png`, `admin-overview-live.cjs`.
- `git diff --check` PASS. Chưa đo coverage riêng cho thay đổi này.

Skill: frontend-patterns; áp dụng quy trình kiểm thử hành vi của repository. Không commit/push trong tác vụ này.

## Bổ sung: bỏ hai khối danh sách

Theo yêu cầu tiếp theo, đã bỏ toàn bộ khối **Cần chú ý** ở Tổng quan Admin và **Bug đã xử lý, chờ xác minh** ở chi tiết dự án. Chỉ bỏ phần hiển thị, không xóa ticket hoặc dữ liệu trạng thái.

Cập nhật hai kiểm thử hiện có: red trước sửa, green sau sửa. Bộ Admin **229/229 test ở 29 file**, build PASS. Chrome thật xác nhận hai khối không còn và hai màn vẫn tải thành công. Không đổi backend hoặc V46; không commit/push.

## Bổ sung: bỏ ô Múi giờ

Đã bỏ trường nhập/chọn Múi giờ ở form tạo/sửa dự án Admin, dialog tạo dự án và cài đặt dự án. Tạo mới vẫn gửi Asia/Ho_Chi_Minh; chỉnh sửa giữ múi giờ đã lưu, không tự đổi dữ liệu cũ. 54 kiểm thử form/quản lý/khôi phục/cài đặt dự án PASS; build PASS. Không đổi backend hoặc migration.
