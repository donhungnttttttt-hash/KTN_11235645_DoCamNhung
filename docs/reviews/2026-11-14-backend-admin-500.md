# Lỗi 500 ở danh sách và tổng quan Admin — 14/11/2026

## Kết quả

Đã xác định và sửa cấu hình biên dịch gây lỗi. API danh sách dự án và tổng quan Admin đã trả HTTP 200 trên backend `127.0.0.1:8080` và qua frontend `localhost:5173`; danh sách trả đủ 11 dự án. Nhánh `system-design`; chưa commit/push.

## Nguyên nhân và bằng chứng trước sửa

- Backend PID 30100 đang lắng nghe 8080; MySQL native hoạt động ở 3307. Health/readiness đều `UP`.
- Đăng nhập Admin, `/api/v1/me` và `/api/v1/projects` trả 200. Hai đường `/api/v1/admin/projects` và `/api/v1/admin/overview` trả 500 `INTERNAL_ERROR`, cả khi gọi trực tiếp và qua Vite proxy.
- Reflection trên `AdminController.class` cho thấy tham số chỉ còn `arg0`, `arg1`... với `isNamePresent=false`.
- MockMvc dùng chính controller đã biên dịch tái hiện lỗi Spring:

  ```text
  Name for argument of type [java.lang.Long] not specified,
  and parameter name information not available via reflection.
  Ensure that the compiler uses the '-parameters' flag.
  ```

- Controller có `@RequestParam(required=false) Long projectId` và các tham số khác không ghi tên tường minh. Spring cần tên tham số lưu trong bytecode để bind HTTP request.
- Truy vấn chẩn đoán dùng JDBC `readOnly=true` và rollback: Flyway V40, 11 dự án, 8 milestone; query dự án, tính metrics và deadline đều chạy được. Lỗi xảy ra ở bước binding request, trước khi thực hiện nghiệp vụ đọc dự án.
- Maven parent Spring Boot đã bật `<parameters>true</parameters>`, nhưng hai cấu hình JDT trong repository chưa bật sinh metadata tương ứng. Maven incremental báo `Nothing to compile` khi các class do IDE tạo đã mới hơn source, nên chỉ chạy lại `spring-boot:run` không bảo đảm sửa được output thiếu metadata.
- Không thu được log console của tiến trình ban đầu; kết luận exception dựa trên HTTP thật, reflection và tái hiện Spring MVC với cùng output class, không suy đoán từ ảnh lỗi.

## Thay đổi

1. Thêm `org.eclipse.jdt.core.compiler.codegen.methodParameters=generate` vào `.vscode/java.prefs` và `Backend/.settings/org.eclipse.jdt.core.prefs`. Giữ nguyên cấu hình null analysis và các annotation hiện có.
2. Khi chạy hồi quy, `AdminSecurityTest` gặp lỗi khởi tạo context do thiếu hai dependency hiện hành của `SecurityConfig`. Bổ sung mock `PlatformTransactionManager` và `CurrentSessionIdentity`, giống fixture ở `AdminManagementSecurityTest`. Không đổi kiểm tra quyền hoặc code nghiệp vụ để làm test qua.
3. Giữ các script/log/classpath chẩn đoán trong thư mục local đã ignore `var/backend-diagnosis-20261114/`.

Sau khi đổi preferences, output IDE đã có metadata. Trước lúc thực hiện restart có bảo vệ PID, backend đã được khởi động lại từ bên ngoài phiên chẩn đoán: PID 30100 chuyển thành 13108, bắt đầu 18:37:50. Script của lượt này phát hiện chủ cổng thay đổi và dừng trước `Stop-Process`; không tắt hoặc khởi động lại thêm tiến trình mới.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Trước sửa: HTTP có đăng nhập trực tiếp 8080 và qua 5173 | Tái hiện 500 ở projects/overview Admin, các API đối chiếu trả 200 |
| Sau sửa: quét metadata controller | 43 controller; 524 tham số cần suy ra tên; 0 tham số thiếu metadata |
| Lượt test đầu | 12 đạt; 3 lỗi context ở `AdminSecurityTest` do fixture thiếu dependency, đã sửa như mô tả trên |
| Lượt test cuối | 15/15 đạt, 0 failure/error/skip trong 4 suite |
| Maven package | BUILD SUCCESS |
| HTTP cuối trực tiếp 8080 | Login/me/projects thường/projects Admin/overview Admin trả 200; projects Admin trả 11/11 |
| HTTP cuối qua localhost:5173 | Các endpoint trên trả 200; projects Admin trả 11/11; logout phiên chẩn đoán 204 |
| Readiness sau cùng | UP |

Lệnh kiểm thử: trong `Backend`, chạy `rtk proxy .\mvnw.cmd -B -ntp "-Dtest=AdminSecurityTest,AdminOverviewServiceTest,AdminSearchTest,ProjectDeadlinesCurrentScopeTest" package` với `DEBUG=false`, `TRACE=false`.

Bằng chứng local: `http-8080-before.json`, `http-5173-before.json`, `http-8080.json`, `http-5173.json`, `backend-verification.log`, `ParameterMetadataCheck.java` trong `var/backend-diagnosis-20261114/`. HTTP receipts chỉ lưu status/count/requestId, không lưu cookie hoặc mật khẩu.

## Phạm vi và giới hạn

- Không sửa dữ liệu dự án/case/tài khoản, không chạy migration hay thay đổi schema. Các lần đăng nhập chẩn đoán phát sinh session/audit bình thường; đã logout các phiên đó.
- Không tuyên bố đã chạy toàn bộ backend/frontend suite hoặc kiểm tra mọi API. Không có phiên Chrome kiểm thử mới và chưa đo coverage trong lượt này.
- Thay đổi tài liệu tham chiếu UI của lượt trước được giữ nguyên.
- Skill `systematic-debugging`: tái hiện HTTP → đối chiếu database → xác định binding bytecode → sửa cấu hình đúng tầng.
- Skill `verification-before-completion`: kiểm tra metadata, package/test và HTTP thật trước khi báo API đã phục hồi.
