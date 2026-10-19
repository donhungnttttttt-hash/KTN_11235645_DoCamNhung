# 18/10/2026 — Lỗi khởi động backend do quyền file kho AI

## Hiện tượng và nguyên nhân

Người dùng chạy `mvn spring-boot:run` trong `Backend` và nhận exit code 1. Đã tái hiện lúc 15:06 giờ Việt Nam bằng đúng goal Maven; lỗi gốc là `OpenAiResponsesClient$Failure: AI_CREDENTIAL_STORE_FAILED`.

Chuỗi lỗi: `AiAssistanceService` → `AiContextService` → `AiProviderGateway` → constructor `ChatGptConnectionService` → `ChatGptCredentialVault.read()`.

- [ChatGptConnectionService:76](../../Backend/src/main/java/vn/syp/tms/ai/ChatGptConnectionService.java#L76) đọc kho ngay khi khởi tạo bean.
- [ChatGptCredentialVault:64–67](../../Backend/src/main/java/vn/syp/tms/ai/ChatGptCredentialVault.java#L64) từ chối file có ACL cấp quyền ALLOW cho đối tượng ngoài chủ sở hữu.
- File `C:\Users\admin\.tms-ai\chatgpt.enc` thuộc đúng người dùng nhưng còn 3 mục ALLOW ngoài owner và chưa chặn kế thừa. Thư mục cha đã đúng quyền. Vì vậy kiểm tra bảo mật dừng trước bước giải mã.

Không có bằng chứng xác định thao tác nào trước đây làm ACL của file khác yêu cầu; không quy nguyên nhân cho việc đổi khóa hoặc dữ liệu mã hóa hỏng. Key có độ dài hợp lệ; cấu hình Process và Windows User trùng nhau.

## Khắc phục

Chỉ sửa ACL của đúng file đã chẩn đoán: giữ nguyên owner, tắt kế thừa và chỉ cấp FullControl cho owner. SDDL trước sửa được lưu cục bộ để có thể hoàn nguyên. Không xóa/tạo lại file, không đổi khóa hoặc cấu hình tài khoản. SHA-256 và dung lượng 146 byte của file giữ nguyên trước sửa, sau sửa và sau khởi động.

Không đổi source nghiệp vụ, migration, dữ liệu tài khoản hoặc database credentials. Không tắt tính năng ChatGPT hoặc bỏ qua kiểm tra bảo mật để che lỗi.

## Kiểm chứng

- Java 21.0.9 và Maven 3.9.11.
- Kết nối app và migrator tới MySQL native `127.0.0.1:3307/tms` thành công; kiểm tra SQL chỉ đọc.
- Database có 76 bảng gồm Flyway history, version 29, không có migration ghi nhận thất bại.
- Sau sửa ACL, chạy lại `mvn spring-boot:run`: profile `local`; Flyway validate 29 migration; `Schema is up to date. No migration necessary.`
- `Started TmsApplication in 9.061 seconds`; Tomcat 8080; bootstrap bỏ qua vì đã có tài khoản.
- Readiness và liveness đều HTTP 200, `status=UP`.
- Dừng bản Maven/JVM do lượt chẩn đoán tạo và xác nhận 8080 đã được giải phóng để người dùng chạy trong terminal riêng. Không dừng MySQL hoặc tiến trình người dùng.

Không chạy unit/integration suite hoặc đo coverage: đây là sửa quyền file cục bộ, không thay đổi hành vi code. Không thực hiện OAuth, gọi model hay xác nhận toàn bộ chức năng AI hoạt động. Flyway vẫn cảnh báo MySQL 9.7 mới hơn phiên bản được thư viện kiểm chứng; cảnh báo này không gây lỗi startup đã tái hiện.

Artifact: `var/startup-diagnosis-2026-10-18/` gồm metadata trước/sau, hash, SDDL trước sửa và log startup. Không lưu plaintext credential/key trong báo cáo. Skill `debugging-and-error-recovery`: tái hiện → đọc stack trace → kiểm tra ACL → sửa đúng quyền → chạy lại và kiểm tra health.

Giữ S11 IN_REVIEW; chưa commit/push/merge/deploy. Người dùng có thể chạy lại `mvn spring-boot:run` từ `Backend`.
