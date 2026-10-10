# 03/10/2026 — Sửa cảnh báo Java trong VS Code

Người dùng yêu cầu xử lý danh sách Problems (ảnh hiển thị 502). Tái hiện bằng Eclipse compiler đi kèm extension `redhat.java-1.56.0-win32-x64`: 124 tệp main/test, **485 warning, 0 error**. Sau sửa: 125 tệp, **0 warning, 0 error**. Không dùng javac build thành công để suy ra IDE không có warning.

**Bổ sung lúc 19:58:** người dùng gửi ảnh còn 17 Problems. Checker trước đó chưa bật `problem.potentialNullReference`, nên chưa phát hiện cảnh báo nullable auto-unboxing/session của IDE. Đã bổ sung `potentialNullReference=warning` và `nullReference=error`, tái hiện đúng **16 Java warnings** còn lại; mục thứ 17 là cấu hình Maven. Sau sửa và kiểm tra lại bằng cấu hình đầy đủ: **125 source / 0 error / 0 warning**, exit 0. Kết quả trước đó chỉ đúng với tập cảnh báo yếu hơn; không coi đó là bằng chứng đã xử lý đủ ảnh 502.

Sửa các kết quả `queryForObject` cần số nguyên bằng kiểm tra non-null trước khi unbox, gồm ExecutionService, WorkItemStore, LoginThrottle và fixture test. COUNT hoặc attempts/ID của hàng bắt buộc tồn tại không được mặc định thành 0 khi trả null; đặc biệt không mở quyền đăng nhập khi thiếu bộ đếm throttle. Làm rõ session bắt buộc có trong SessionAccountFilterTest. SQL, tham số và nghiệp vụ không đổi. Không thêm suppression.

Maven verify/package chạy lại sau sửa: **53 unit test / 0 fail / 0 error / 0 skip, BUILD SUCCESS**, không chạy test ghi/xóa trên database sử dụng. Diff tự review, S11 vẫn IN_REVIEW, không commit/push/deploy. Mục Maven trong IDE vẫn cần update cấu hình/clean language-server cache bằng các bước ở cuối tài liệu; không tuyên bố đã xác nhận UI Problems bằng 0.

## Các thay đổi

- Xóa import và biến cục bộ không dùng. Giữ lời gọi tra cứu/tạo dữ liệu có tác dụng phụ; chỉ bỏ tên biến thừa.
- Thay các method reference bị cảnh báo null của Spring/JDK bằng lambda tương đương, bao gồm cấu hình vô hiệu hóa form login/httpBasic/logout/requestCache. Không thay chính sách phân quyền, session hay CSRF.
- Khai báo `@NonNull` cho SQL ở các helper JDBC và tham số servlet filter theo contract kế thừa. Kiểm tra non-null tại ranh giới repository ID/PreparedStatement/media type; không khai báo toàn bộ entity là non-null vì một số ID/revision có thể chưa tồn tại.
- Làm rõ contract của helper test: người đăng nhập, URL, CSRF, JSON bytes và multipart. `MockMvcContracts` chỉ nằm trong test source; factory thư viện được kiểm tra non-null trước khi chuyển cho MockMvc.
- Tách khởi tạo Testcontainers khỏi chuỗi cấu hình để compiler thấy đối tượng được quản lý. Field `@Container` vẫn do JUnit đóng; các container trong bài nâng cấp/khôi phục vẫn dùng try-with-resources. Không suppress cảnh báo resource hoặc bỏ đóng tài nguyên.
- Đổi POI `getExternalLinksTable()` đã deprecated thành `getExternalLinksTables()`; vẫn từ chối workbook có liên kết ngoài. Phương thức cũ được Apache chỉ định thay bằng phương thức mới trong [mã nguồn chính thức](https://apache.googlesource.com/poi/+/trunk/poi-ooxml/src/main/java/org/apache/poi/xssf/usermodel/XSSFWorkbook.java).
- VS Code vẫn bật `java.compile.nullAnalysis.mode=automatic`; thêm `java.configuration.updateBuildConfiguration=automatic` để cập nhật Maven khi pom thay đổi. Đã phát tín hiệu file change bằng cập nhật thời gian `pom.xml`, không thay nội dung POM.
- Thêm `scripts/Check-JavaDiagnostics.cjs` để kiểm tra lại main/test bằng Eclipse, resolve classpath từ POM hiện hành và trả exit 1 nếu có warning/error. Không chạy ứng dụng, migration hoặc test database.

## Bằng chứng

Chạy từ thư mục gốc trên máy này:

```powershell
rtk proxy node scripts/Check-JavaDiagnostics.cjs --java-home "C:\Program Files\Java\jdk-21"
```

PASS: 125 sources / 0 error / 0 warning / compiler exit 0. JAR `org.eclipse.jdt.core.compiler.batch_3.46.100.v20260826-1225.jar`. Log, XML, JSON nằm trong `Backend/target/java-diagnostics/`, được Git ignore. Negative check với đường dẫn compiler không tồn tại trả exit 1, không ghi kết quả PASS.

```powershell
rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests EvidenceContentTest,CatalogInputTest,DefaultProfileSecurityTest,SessionAccountFilterTest,RedmineClientTest,RedmineConfigurationTest,RedmineSchedulerTest,ProjectTimezoneTest,ReportingLimitTest,InternalRulePolicyTest,TestCaseWorkbookTest,WorkItemHistoryTest,ApiExceptionHandlerTest
rtk proxy powershell -NoProfile -File scripts/Check-System.ps1
```

- Maven verify/package: **53 test / 0 fail / 0 error / 0 skip, BUILD SUCCESS**. Các test security, filter, Excel parser và UPDATE history đạt. Compile toàn bộ test source, chỉ thực thi 13 lớp test không cần MySQL/Testcontainers.
- Check-System read-only: backend UP / MySQL 9.7.0 / Flyway V11, 11 migration / PASS. Không chạy migration mới hoặc ghi/xóa trên schema đang sử dụng.
- JaCoCo của **lần chạy unit có chọn lọc**: 435/2659 line (16,36%), 333/1606 branch (20,73%). Không phải coverage của full suite; không suy ra đạt gate 80% toàn backend. Maven có cảnh báo JVM về Mockito tự attach agent; đây không phải compiler/IDE warning và không làm test thất bại.
- Không chạy lại frontend vì không sửa FE. Không chạy integration database hoặc browser nghiệp vụ trong tác vụ này.

## Giới hạn và làm mới IDE

Chưa đọc trực tiếp danh sách Problems đang mở trong VS Code; **502 trên ảnh và 485 compiler warning tái hiện là hai số đo khác nhau**. Kết quả 0 nói về toàn bộ mã Java qua Eclipse với null analysis bật, không phải ảnh chụp xác nhận UI Problems đã về 0. Cảnh báo Maven có thể còn lưu trong cache của language server.

Nếu VS Code vẫn hiện dữ liệu cũ:

1. Lưu tất cả tệp.
2. `Ctrl+Shift+P` → **Java: Update Project Configuration**, chọn Backend nếu được hỏi.
3. Chờ Java cập nhật dự án. Nếu danh sách vẫn chưa đổi: **Java: Clean Java Language Server Workspace** → chọn khởi động lại. Thao tác này làm mới cache IDE, không xóa schema MySQL.

Review tự thực hiện, không gọi là review độc lập. Skill `systematic-debugging` dùng để tái hiện lỗi và phân nhóm nguyên nhân; `coding-standards` dùng để giữ contract nullable có chủ đích và quyền sở hữu tài nguyên; `verification-loop`/`verification-before-completion` dùng để kiểm chứng compiler, test, build, kiểm tra read-only và báo giới hạn. Không có chức năng nghiệp vụ mới, không tạo V12, commit/push/merge/deploy. S11 vẫn IN_REVIEW theo gate nghiệm thu đã có.
