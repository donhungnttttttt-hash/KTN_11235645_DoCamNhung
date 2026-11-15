# Sửa xuất Excel theo bảng Feature hiện tại

## Lỗi đã tái hiện

File người dùng cung cấp `(タブレット)(#標準)テスト仕様書(選択機能)_VI-cap-nhat.xlsx` có **55 case nhưng 22 cột**. Export giữ khung nguồn với iPad, Ghi chú thực thi, ID Redmine, Người test và cột trống, rồi nối Status ở R, Người test đầu tiên ở S, người test lại, Version/ngày ở cuối. Vì vậy các cột thực thi cũ trống dù kết quả web có dữ liệu.

SHA-256 file đối chiếu: `0684c3e36dd5284e45c31e9dbc74b4d4d642eca821ef0bcf2c2fe5ddf3d084db`.

## Thay đổi

- Xuất Feature tạo workbook mới có đúng **13 cột theo thứ tự trên web**: ID, No, Đối tượng test, Điều kiện tiên quyết, Các bước test, Quan điểm test, Hạng mục xác nhận, Kết quả mong đợi, Ghi chú thiết kế, Version test, Status, Issue, Người test.
- Lấy nội dung hiện tại theo mapping nguồn, bao gồm chỉnh sửa; không giả định vị trí cột của file nhập. Mẫu nội bộ cũ vẫn ánh xạ theo tên trường, không đưa suiteCode vào No.
- Status lấy từ kết quả hiện tại; Người test là người đầu tiên, không thay bằng người xác nhận sau cùng.
- Version lấy đúng bản đã ghi của từng case; ngày thực hiện nằm ở dòng thứ hai trong cùng ô Version test. Không thêm lại cột thực thi dư.
- Issue chứa số lượng và mã/tiêu đề ticket gắn đúng case; gồm ticket đã đóng, bỏ ticket đã xóa và dữ liệu ngoài phạm vi file/dự án.
- Xuất tất cả case, không cắt theo trang/từ khóa của bảng. Chuẩn hóa dòng xuất liên tiếp, giữ ID/No dạng text, Unicode/xuống dòng/ô trống; nội dung bắt đầu bằng `=` vẫn là text. Workbook có wrap text, độ rộng cột phù hợp, hàng tiêu đề, bộ lọc và freeze pane.
- **Tải file gốc** giữ nguyên byte. Không sửa file người dùng trong Downloads, không đổi schema/database hay frontend.

## Kiểm chứng

- RED: test header 13 cột thất bại với exporter cũ (28 test, 1 fail).
- **38/38 unit test workbook** ở 6 suite PASS, gồm bảo toàn text và từ chối dòng xuất sai số lượng cột.
- **28/28 FeatureIntegrationTest** trên MySQL cô lập PASS, Maven verify/package PASS. Kiểm tra mapping đổi thứ tự, Status mới nhất, người test ban đầu, Version/ngày, Issue mở/đóng/đã xóa, xuất đủ dòng và tải nguyên bản.
- File người dùng được đọc, nhập vào fixture cô lập, ghi lại Status qua API kiểm thử rồi xuất bằng service mới: **55 dòng, 13 cột, 20 OK, 35 Unexecuted**. Dữ liệu chín cột được đối chiếu khi nhập/đọc. Không nhập fixture hoặc sửa kết quả trên main.
- Bằng chứng: `var/file-owners-20261114/export-final/receipt.json`, `export-acceptance.json`, `export-acceptance.xlsx`; file XLSX này thuộc database kiểm thử, không phải bản mới của dữ liệu main.
- JaCoCo riêng `FeatureWorkbookExport` trong native run: line **29/30 (96,67%)**, branch **18/20 (90%)**. Không phải coverage toàn hệ thống.
- JDT trên source cuối: 394 source, **0 error, 7 warning cũ** ở SystemAdminStartupTest; không có warning mới. `git diff --check` PASS.
- Hai kỳ vọng export trong TestVersionsNativeTest được cập nhật theo contract mới; suite sandbox riêng đó không chạy trong lượt này. Hành vi Version/ngày thực tế được kiểm tra trong FeatureIntegrationTest.

## Runtime và bàn giao

Đã khởi động lại đúng backend local bằng artifact verified SHA-256 `2daaf6becc826265e22b5f95ad40fae8331783998a969fe04110ed0a7500e486`; PID 26152, health qua 5173 → 8080 **UP**, giữ V41. Không migration hoặc đổi mật khẩu/cấu hình. Chưa nghiệm thu thao tác xuất qua Chrome vì kết nối browser chưa có; API có đăng nhập trên main cũng chưa được xác minh do credential bootstrap không còn phù hợp, không tự đổi credential.

Người dùng cần bấm **Xuất Excel** lại để nhận bản cấu trúc mới; file cũ đã tải không tự thay đổi. Chưa commit/push. Skills tiếp tục áp dụng: tdd-workflow, api-design, verification-before-completion.
