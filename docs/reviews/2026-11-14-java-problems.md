# Xử lý 79 Problems Java — 14/11/2026

Người dùng yêu cầu xử lý 79 Problems trước khi commit và push nhánh `system-design`. Baseline `abaf9d8`, working tree sạch. Phạm vi là cảnh báo Java hiện tại; không mở lại các task Arena đã DONE.

## Nguyên nhân và cách sửa

- `ProjectLifecycleService`: JDT không suy luận được helper `fail(...)` luôn ném exception. Dùng `throw new BusinessException(...)` ngay ở nhánh kiểm tra đầu vào. Giữ nguyên điều kiện, HTTP 422, mã `INVALID_COMMAND` và thông báo; không thay quy tắc lưu trữ.
- Test JDBC: kiểm tra giá trị trả về không-null trước khi unbox số; kiểm tra dependency Spring và ID tài khoản lấy từ registry tại ranh giới sử dụng. Fixture sai sẽ thất bại rõ ràng, không dùng giá trị mặc định để vượt test.
- Test MockMvc/Jackson: khai báo `@NonNull` cho helper/đầu vào tương ứng và kiểm tra giá trị do thư viện trả về. Giữ nội dung request, authentication, CSRF và assertions.
- Mockito: dùng matcher `startsWith` cho cùng điều kiện tiền tố SQL và `requireNonNull(anyString())` cho token chuỗi. Không bọc `argThat` bằng `requireNonNull` vì token của matcher đó là null. Bỏ một import thừa.
- Đổi một method reference thành lambda tương đương để JDT suy được contract receiver.

Không thêm suppression, hạ severity hay tắt null analysis. Không sửa Java preferences, POM, migration, frontend, quyền hoặc trạng thái nghiệp vụ. Các suppression Mockito đã có trước đây không nằm trong thay đổi này.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| JDT toàn bộ 388 source main/test | Trước: 79 warning, 0 error. Sau: **0 warning, 0 error**, exit 0 |
| JDT Language Server của Java extension 1.58.0 | Cả 11 file từng có cảnh báo nhận `diagnostics: []`; đóng/mở và build lại vẫn 0 |
| Maven verify, 5 suite không cần database | **51/51 PASS**, 0 failure/error/skip; đóng gói thành công |
| Native hồi quy 9 suite có thay đổi | **108/108 PASS**, 0 failure/error/skip; Maven verify/package thành công |
| Kiểm tra cấu trúc contract | PASS; không thay cho kiểm thử HTTP đầy đủ |
| Review diff | Tự review các kiểm tra null, matcher và tính tương đương của validation; không phải review độc lập |

Lệnh JDT có thể chạy lại từ gốc repo:

```powershell
rtk proxy node scripts/Check-JavaDiagnostics.cjs --java-home "C:/Program Files/Java/jdk-21"
```

Năm suite offline: `QaEvidenceTest`, `LegacyArchiveSnapshotTest`, `ProjectArchiveLegacyExceptionTest`, `AdminProjectServiceTest`, `AdminManagementSecurityTest`. Test hiện có kiểm tra cả command null và exception payload không hợp lệ; lỗi tái hiện của task này là cảnh báo compiler, không phải thay đổi kết quả nghiệp vụ.

Chín suite native: `NativeCurrentProjectLifecycleConcurrencyTest` (7), `NativeCurrentProjectLifecycleIntegrationTest` (13), `NativeHandbookRevisionIntegrationTest` (5), `NativeDelegatedIdentityIntegrationTest` (6), `FeatureIntegrationTest` (21), `FeatureLegacyRetirementIntegrationTest` (27), `ManagementReportIntegrationTest` (5), `NativeFeatureIssueIntegrationTest` (19), `NativeProjectNotesIntegrationTest` (5). Tổng 159 lượt test trong 14 suite, bao gồm các test kế thừa; không coi là 159 kịch bản duy nhất hoặc toàn bộ backend.

Lượt LSP đầu chờ cố định quá ngắn nên thiếu notification; không tính là PASS. Harness cuối đợi server sẵn sàng và đủ thông báo từng file, xác nhận hai lần. Đây là language server riêng dùng bản sao source, không phải đọc trực tiếp Problems panel của cửa sổ VS Code đang mở.

## Bằng chứng và giới hạn

Bằng chứng local trong `var/java-problems-20261114/` (không đưa logs, database config hoặc build artifacts lên Git):

- `before.json`: đủ 79 warning, phân bố trong 11 file.
- `after.json`: kết quả quét cuối 388 source.
- `lsp-sBGopv/result.json` và `protocol.jsonl`: thông báo diagnostic của language server.
- `offline-receipt.json`, `offline.log`, `offline-build/target/surefire-reports/`: 51 test.
- `native/receipt.json`, `native/maven.log`, `native/build/target/surefire-reports/`: native verification.
- `before-native-rows.json`, `after-native-preservation.json`: đối chiếu dữ liệu test trước/sau.
- `source-correspondence.json`: 435 mục của manifest backend và 11 file LSP khớp source hiện tại; không có mismatch.

Database kiểm thử giữ nguyên 94 bảng ngoài `identity_login_buckets`, cùng hai tài khoản trong registry Admin. Receipt toàn bộ 95 bảng giữ kết quả thô **FAIL**, với 18 digest cũ biến mất/thay đổi riêng trong bảng giới hạn đăng nhập: các test đăng nhập HTTP thực gọi `LoginThrottle.allow()`, dọn bucket hết hạn và cập nhật bộ đếm trong transaction riêng. Không sửa hoặc bỏ qua cơ chế này để đạt preservation PASS. 29.678 row trước → 33.225 row sau, fixture mới giữ lại trong schema riêng; không tuyên bố mọi row của cả 95 bảng bất biến.

Các build dùng bản sao source và Java 21, không dùng lại class do IDE sinh. Native runner kiểm manifest, server/schema, migration checksum và storage trước khi chạy. Không migration hoặc restart ứng dụng chính; không chạy test trên main `tms`. Không kiểm UI/browser vì không thay frontend. JaCoCo tạo báo cáo cho tập test được chọn; không đánh giá coverage toàn backend hoặc tuyên bố đạt 80% toàn hệ thống. Cảnh báo runtime Mockito/dynamic agent và tương thích Flyway/MySQL được giữ trong log, tách biệt với 79 Problems Java đã sửa.

## Skill đã áp dụng

| Skill | Áp dụng | Bằng chứng |
| --- | --- | --- |
| `systematic-debugging` | Tái hiện đúng 79 warning, đối chiếu từng boundary và nhánh kết thúc | JDT 79 → 1 → 0; diff 1 file production và 10 file test |
| `verification-loop` | Build riêng, test đúng phần sửa, review diff và dữ liệu | Maven/Surefire, native guard, preservation receipt |
| `verification-before-completion` | Chỉ kết luận từ kết quả mới; không lấy thiếu notification làm PASS | JDT cuối và LSP hai lượt đủ 11 file |

Người dùng đã yêu cầu commit/push trong tác vụ hiện tại. Kết quả Git được ghi khi thao tác thực sự hoàn tất; yêu cầu không bao gồm merge/deploy hoặc main cutover. S11/FR-12 và các gate UAT giữ trạng thái riêng.
