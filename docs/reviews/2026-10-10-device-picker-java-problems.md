# Chọn thiết bị và 39 cảnh báo Java — 10/10/2026

Phạm vi theo ảnh người dùng: chỉnh phần cuối danh sách máy trong popup Tạo dự án; xử lý 39 Problems Java. Nhánh `system-design`, không commit/push/merge/deploy. Giữ nguyên các thay đổi của những vòng làm trước.

## Kết quả

- Gom Tải lại danh sách, số trang và Máy trước/Máy sau vào nhóm điều khiển riêng có khoảng cách với bảng. Rút gọn hướng dẫn, cho phép xuống dòng, giữ nội dung trong chiều rộng cột. Bỏ thông báo rỗng trùng với trạng thái rỗng của bảng.
- Giữ các nút phân trang hiện diện khi tải lại và khóa chúng trong lúc yêu cầu đang chờ; không mất lựa chọn hoặc bản nháp bàn giao. Trên màn hình hẹp các nút tự xuống hàng và cao tối thiểu 44 px.
- Tái hiện đúng 39 cảnh báo bằng Eclipse compiler của Java extension: 0 error, 39 warning trên 256 file main/test. Sau sửa: **0 error, 0 warning**, không hạ mức kiểm tra và không thêm suppression.
- Sửa null contract tại ranh giới URI/repository/JDBC/MockMvc/JSON; dùng helper CSRF có sẵn; đổi method reference sang lambda tương đương để tránh cảnh báo receiver thiếu null annotation. Đọc response JSON từ byte array; loại null không cần thiết trong fixture callback. Bỏ 2 import thừa và nhánh kiểm tra SSE trùng đã được chặn trước đó. Không đổi quyền, API, schema hay rule nghiệp vụ.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `node scripts/Check-JavaDiagnostics.cjs` | PASS — 256 file, 0 lỗi/0 cảnh báo; trước sửa 39 cảnh báo |
| Frontend admin-dialog/admin-routing/SelectionTable | PASS — 20 test/3 file; test nhóm điều khiển và khóa khi refresh đã RED trước sửa, GREEN sau sửa |
| Frontend build | PASS — Vite vẫn có khuyến nghị bundle >500 KB đã có trước |
| AiProviderIntegrationTest, AiProviderSafetyTest, ChatGptConnectionServiceTest | PASS — 42 test, không gọi dịch vụ AI thật |
| AdminWorkspaceNativeTest, AdminWorkspaceFileReadNativeTest, NativeFileWorkQaIntegrationTest, TestDocumentIntegrationTest | PASS — 27 test, không skip; Maven verify PASS |
| `git diff --check` | PASS |

Native regression dùng schema đã có `tms_docstest_202610100016`, xác nhận đúng database và V27 trước chạy. Không ghi fixture lên `tms`, không thêm migration hoặc tạo server/container.

Chrome thật: popup Tạo dự án ở 1366×768 và 390×844. Laptop: cả ba nút có cùng tọa độ top; trên mobile toàn trang rộng đúng 390 px, nội dung dialog 360/360 px, controls và hướng dẫn 328/328 px (client/scroll width), không tràn ngang. Đóng popup bằng Escape và reset viewport sau kiểm tra, không tạo dự án thử. Ảnh: `var/ui-audit/device-picker-fixed.png`.

Bằng chứng: `var/ui-audit/java-diagnostics-before-39.json`, `var/ui-audit/java-diagnostics-after-0.json`, `var/ui-audit/problems-native.log`, `Backend/target/java-diagnostics/diagnostics.json` và Surefire reports.

Skills: `ui-ux-pro-max` (wrap, khoảng cách, responsive, cỡ nút), `code-review-and-quality` (tự review diff/null contract, giữ nguyên các guard), `verification-loop` (compiler, test, build, browser). Máy không có Python/python3/py nên dùng hướng dẫn mặc định và quick-reference của skill UI, không ghi rằng đã có kết quả search database của skill.

Giới hạn: chưa đo coverage trong vòng này; không chạy lại toàn bộ FE/BE hoặc fresh-migration NativeAiChatTest cho thay đổi helper đọc JSON. Toàn bộ file vẫn được compile qua chẩn đoán Java. Cảnh báo runtime Mockito/Byte Buddy khi chạy test không phải 39 Java Problems, không sửa cấu hình để giấu chúng. Số Problems trong cửa sổ VS Code chưa đọc trực tiếp; số 0 được xác minh bằng cùng Eclipse compiler. Safari/thiết bị cảm ứng thật chưa kiểm tra. S11 vẫn IN_REVIEW.
