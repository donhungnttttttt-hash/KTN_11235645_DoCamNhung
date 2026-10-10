# Sửa 13 cảnh báo Java trước khi push system-design

Yêu cầu 05/10/2026: sửa Problems trong TestDocumentService (2), DocumentResultServiceTest (8), TestDocumentIntegrationTest (3), rồi push code hiện có.

## Tái hiện và sửa

Eclipse compiler của Java extension, bật nguyên null-analysis, tái hiện đúng **0 errors / 13 warnings** trên 137 source main + test. Đây là null-type-safety warnings, không phải lỗi Maven compile.

- TestDocumentService: thay method reference `Long::sum` bằng lambda cộng rõ tham số, giống phép đếm nguồn đang dùng. Map.merge chỉ gọi remapping khi giá trị cũ/mới khác null; không đổi logic đếm.
- DocumentResultServiceTest: dùng requireNonNull cho các String matcher trả chuỗi rỗng; thêm matcher RowMapper có kiểu và placeholder non-null. Mockito vẫn đăng ký matcher nhưng không cần đưa giá trị giả null vào hợp đồng JdbcTemplate. Bỏ suppression unchecked không còn cần thiết; không tắt null-analysis hoặc suppress cảnh báo null.
- TestDocumentIntegrationTest: xác nhận non-null tại biên Jackson tạo JSON payload và payload thay trạng thái cho MockMvc.

## Kiểm chứng

- `Check-JavaDiagnostics.cjs --java-home "C:/Program Files/Android/Android Studio/jbr"`: **137 source, 0 errors, 0 warnings**, cùng compiler/preferences trước và sau.
- `Test-Backend.ps1 -Tests DocumentResultServiceTest,DocumentWorkbookTest,CustomerWorkbookTest,TestCaseWorkbookTest`: **29/29 PASS**, Maven verify/package PASS.
- Mutation PASS: đảo điều kiện version làm test staleVersionCannotOverwriteAnotherResult thất bại; đã khôi phục source và chạy lại 29/29 tests PASS trước commit. Không chạy ứng dụng với source mutation.
- Frontend không đổi trong tác vụ sửa warnings. Bằng chứng phần chờ push: full290 tests/build và kiểm chứng native/Excel đã ghi trong [báo cáo trước](2026-10-04-document-results-and-wiring.md).
- Không chạy suite integration ghi dữ liệu lên tms. Gate schema test riêng/UAT vẫn giữ; không tạo migration mới cho sửa warnings.
- Skills: code-review-and-quality và verification-loop; tái hiện warning trước, sửa đúng null contracts, kiểm tra diff và remote trước push.

Người dùng đã cho phép commit/push `system-design`, bao gồm phần tự lưu/xuất Excel và các sửa kết nối đã hoàn thành ở lượt trước. Không merge develop hoặc triển khai production.
