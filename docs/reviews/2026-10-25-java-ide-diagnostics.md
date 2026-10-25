# Sửa cảnh báo Java trong IDE — 25/10/2026

Yêu cầu: ưu tiên xử lý hết lỗi/cảnh báo trong ảnh Problems trước khi triển khai kế hoạch Arena. Phạm vi thực hiện: toàn bộ Java main/test của backend, không thay nghiệp vụ, không chạy database hoặc migration.

## Kết quả

| Kiểm tra | Trước | Sau |
| --- | --- | --- |
| Eclipse JDT, 321 source Java | 0 error, **411 warning** (26 main, 385 test) | **0 error, 0 warning**, exit 0 |
| Test hồi quy liên quan | Chưa chạy ở baseline lượt này | **103/103**, 13 suite, 0 failure/error/skip |
| Maven verify/package từ source mới | Lần đầu gặp bytecode build cũ Java25 trên runtime21 | **BUILD SUCCESS**, biên dịch mới và đóng gói bằng Java21 |
| Bytecode ở build workspace sau khi căn IDE | Có class version69 gây lỗi chạy test | 432 main +151 test class đều version65 (Java21) |
| File migration SQL/Java, frontend và `.arena` | Có sẵn | Không đổi |

JDT dùng compiler từ Java extension đang cài: `org.eclipse.jdt.core.compiler.batch_3.46.200.v20261008-1115.jar`. Đây là kiểm chứng compiler tái hiện các cảnh báo trong ảnh, không phải đã trực tiếp quan sát Problems panel của VS Code.

## Đã sửa gì

1. **Contract null của ứng dụng:** bổ sung `@NonNull` cho tham số hai interceptor kế thừa Spring, RowMapper và các ranh giới thư viện. Làm rõ nhánh kết thúc bằng exception ở AI và kiểm document/row nullable; giữ nguyên status/code/message và điều kiện nghiệp vụ.
2. **Code không dùng:** bỏ import, field/dependency `ProjectDeadlines` và private helper không còn dùng trong `AiContextService`. Không có callsite khởi tạo trực tiếp bị mất; Spring vẫn dùng constructor duy nhất.
3. **Test helpers:** khai báo rõ helper actor/path/encode trả giá trị không-null, kiểm tại ranh giới Spring/Jackson/JDBC, sửa method reference mà JDT không suy được contract. Giữ assertions, fixture, schema guards và tập kịch bản. Matcher Mockito được giữ đúng cơ chế đăng ký matcher; không gọi `requireNonNull(eq(Long.class))` vì matcher đó trả null.
4. **Giữ nguyên V32/V33 đã áp dụng:** thêm đúng hai external annotation cho giá trị trả về của `Context.getConnection()` và `Connection.prepareStatement(String,int)`. Không sửa SQL, Java migration, checksum hoặc chạy lại migration. [Eclipse hỗ trợ khai báo null contract ngoài thư viện](https://help.eclipse.org/latest/rtopic/org.eclipse.jdt.doc.user/tasks/task-using_external_null_annotations.htm); contract được đối chiếu với [Flyway Context](https://raw.githubusercontent.com/flyway/flyway/main/flyway-core/src/main/java/org/flywaydb/core/api/migration/Context.java) và [JDBC Connection](https://docs.oracle.com/en/java/javase/21/docs/api/java.sql/java/sql/Connection.html#prepareStatement(java.lang.String,int)).
5. **Cấu hình compiler nhất quán:** `Backend/.settings/org.eclipse.jdt.core.prefs` cho JDT đọc external annotations trên build path, đồng thời source/compliance/target/release là Java21 đúng `pom.xml`. `scripts/Check-JavaDiagnostics.cjs` đọc cùng annotation tree. Không thêm suppression, không hạ severity hoặc tắt null analysis.

Các external annotations chỉ annotate RETURN của hai phương thức, không đánh dấu toàn bộ API là non-null. Ban đầu đặt trong `src/main/resources`; sau phát hiện khác biệt editor bên dưới, vị trí cuối là `Backend/src/main/java/org/flywaydb/core/api/migration/Context.eea` và `Backend/src/main/java/java/sql/Connection.eea`.

## Kiểm chứng đã thực hiện

### 1. Tái hiện và quét lại toàn bộ Java

```powershell
rtk proxy node scripts/Check-JavaDiagnostics.cjs
```

Trình tự thực đo: **411 → 10 → 0 warning**; không có compilation error trong ba lượt. Lượt trung gian còn cả các file test chưa hoàn tất sửa trong lúc compiler đọc source; kết luận dựa trên lượt cuối sau khi mọi chỉnh sửa đã xong.

Artifact local:

- `Backend/target/java-diagnostics-before-2026-10-25.json` — baseline đầy đủ.
- `Backend/target/java-diagnostics/diagnostics.json`, `diagnostics.txt`, `diagnostics.xml` — lượt cuối.

### 2. Chứng minh không che kiểm tra null

Probe compiler độc lập trong `Backend/target/java-diagnostics/null-contract-probe/`:

- Không EEA: hai boundary thư viện tạo **2 warning**.
- EEA explicit path: **0 warning/error**.
- EEA qua `CLASSPATH` như IDE: **0 warning/error**.
- Cố ý return null trái `@NonNull` và dereference `@Nullable`: compiler vẫn báo **1 error +1 warning**, exit khác0 như kỳ vọng.

Kết quả: `null-contract-probe/results.json`. Đây là kiểm tra compiler, không kết nối database.

### 3. Maven và hồi quy

Lần gọi `scripts/Test-Backend.ps1` đầu tiên không chạy được test vì build output có class Java25 nhưng Maven/runtime21. Không báo lần đó PASS: `Tests run:0` và BUILD FAILURE.

Để tránh dùng output IDE cũ, tạo bản sao **358 file src/resources/pom**, đối chiếu SHA-256 từng file, chạy Maven `verify` bằng wrapper hiện có với `-f` trỏ vào POM bản sao. Manifest sau chạy xác nhận source gốc vẫn khớp toàn bộ bản đã kiểm chứng. Không sửa POM để bỏ test, không nâng Java hay dependency.

Selector đã chạy:

```text
FeatureIssueServiceTest,AiAccessTest,AiContextBudgetTest,DeviceInventoryServiceTest,
ProjectNotesServiceTest,ProjectNotesSecurityTest,ProjectNotesPolicyTest,
ManagementReportServiceTest,AdminAuditServiceTest,ProjectStatusReportRetirementTest,
AiDraftServiceTest,AiPortfolioContextTest,OpenAiResponsesClientTest
```

Kết quả: **103 test /13 suite**, không skip/failure/error; compile main/test, jar, repackage và verify thành công. Bytecode mẫu của bản build mới là65. Sau cập nhật cấu hình, kiểm tất cả class tại `Backend/target/classes` và `Backend/target/test-classes` cũng đều65.

Bằng chứng local:

- `Backend/target/java-diagnostics/fresh-verification.json`.
- `Backend/target/java-verification-2026-10-25-xTyC9X/source-manifest.json`, `result.json`, `verify.log`.
- Thư mục `target/surefire-reports` và `target/site/jacoco` bên trong bản build riêng.

JaCoCo tạo báo cáo cho tập test được chọn; **chưa đánh giá coverage toàn backend**. Maven còn thông báo runtime của Mockito về dynamic agent trong phiên bản JDK tương lai; không đồng nhất thông báo này với warning Java source của JDT và không tắt nó để báo log sạch.

## Bảo toàn, review và giới hạn

- `git diff --check` đạt. Đối chiếu diff các migration SQL/Java, Frontend và `.arena` không có thay đổi.
- Bốn tài liệu kế hoạch Arena giữ nguyên; README/STATUS được bổ sung kết quả sửa Java trong mục riêng. Không đánh dấu AR-00–AR-11 đã triển khai.
- Không sửa database/config credential, không chạy native integration/seed/migration, không restart8080/5173, không gọi AI provider thật; native test sources chỉ được compile.
- Không commit/push/merge/deploy. S11/FR-12 giữ IN_REVIEW; đây không phải nghiệm thu UI/UAT toàn hệ thống.
- `code-review-and-quality`: review theo owner production/test, kiểm predicate nullable, matcher Mockito và contract thư viện; review độc lập không phát hiện blocker trong phạm vi.
- `verification-loop`: baseline JDT trước sửa → quét cuối321file → probe dương/âm → fresh Maven103test/package → kiểm preservation/diff. Không tạo test giả cho việc bỏ import hoặc thêm annotation; các test hành vi sẵn có đã được chạy lại.

## Theo dõi lại 4 cảnh báo trong VS Code

Người dùng đã Reload Window nhưng vẫn thấy đúng hai cảnh báo ở mỗi migration V32/V33. Vì vậy kết quả batch JDT ở trên chưa đủ để kết luận Problems của IDE đã sạch; không quy nguyên nhân đơn thuần cho danh sách cũ.

Đối chiếu tiến trình Java extension 1.58.0 đang chạy cho thấy `java.import.generatesMetadataFilesAtProjectRoot=false`. Project metadata thực tế được lưu trong cache workspace; file preferences ở đó không có `org.eclipse.jdt.core.builder.annotationPath.allLocations`, mặc dù file `.settings` trong repository đã có. Batch compiler trước đó nhận `-annotationpath` trực tiếp nên vẫn đạt 0 warning.

Sửa tại `.vscode/settings.json`: trỏ `java.settings.url` đến `.vscode/java.prefs`. File này chỉ bật đọc external annotations; không đặt lại mức lỗi/cảnh báo, không tắt null analysis. Đây là cơ chế [workspace preferences chính thức của Java extension](https://github.com/redhat-developer/vscode-java/wiki/Settings-Global-Preferences). [JDT LS đọc các tùy chọn, theo dõi thay đổi và rebuild](https://raw.githubusercontent.com/eclipse-jdtls/eclipse.jdt.ls/main/org.eclipse.jdt.ls.core/src/org/eclipse/jdt/ls/core/internal/managers/StandardProjectsManager.java).

Đã xác nhận preferences của language server đang chạy tự nhận `allLocations=enabled`, trong khi project không có override; không sửa trực tiếp cache IDE hoặc restart ứng dụng. Bằng chứng: `Backend/target/java-ide-followup/running-ide-settings.json`. Quét lại 321 source Java vẫn đạt **0 error, 0 warning**. Nội dung Java, migration và EEA giữ nguyên trong lượt sửa cấu hình này.

Kiểm tra JDT LS riêng sau đó tái hiện **đúng 4 warning code16778128** tại V32 dòng20/67 và V33 dòng20/68 khi mở file. Chỉ thêm shared preference vẫn còn4; người dùng cũng xác nhận bằng ảnh mới. Nguyên nhân thứ hai: Maven resources được đánh dấu `excluding="**"` trong Java build path. Editor reconcile tìm `.eea` qua package fragments/non-Java resources, khác đường tìm annotations của batch compiler. Không lấy batch PASS để đóng lỗi này.

Sửa bổ sung: chuyển đúng hai `.eea` sang các package tương ứng trong `src/main/java` để editor tìm được như non-Java resources; bỏ bản cũ trong resources, giữ một nguồn duy nhất. Cập nhật đường annotationpath của script batch theo vị trí mới. Không tạo `.java` hay định nghĩa class `java.sql`; Maven javac bỏ qua `.eea`, ứng dụng không cần chúng khi chạy. Review độc lập xác nhận không cần sửa migration hoặc thêm dependency/configurator Maven.

Kiểm chứng editor thật bằng JDT LS của extension đang cài, chạy qua LSP trong workspace tạm có bản sao source/POM (không copy cấu hình credential, không chạy app/database):

- Baseline mở V32/V33: **4 warning**, khớp chính xác ảnh người dùng. Chỉ thêm shared preference vẫn4 (`lsp-gl5HhI`).
- Sau chuyển EEA và bật shared preference, import Maven mới, full build rồi mở V32/V33: cả hai trả `textDocument/publishDiagnostics` với **`diagnostics: []`**, không phải thiếu notification (`lsp-yK3QYf`).
- Đóng/mở lại và full build lần nữa: cả hai vẫn0; SHA-256 hai migration và hai EEA trong bản kiểm chứng khớp repository. Receipt tổng hợp: `Backend/target/java-ide-followup/final-lsp-verification.json`. Các tiến trình Java riêng của probe đã thoát.
- Quét batch source cuối: **321 file, 0 error, 0 warning**, exit0.
- Test hành vi103/103 ở lượt trước không chạy lại vì lượt này chỉ đổi vị trí metadata và cấu hình IDE, không sửa Java ứng dụng/test. Không suy coverage hoặc kết quả browser từ kiểm tra này.

Artifacts dưới `Backend/target/java-ide-followup/`: `lsp-probe.cjs`, các thư mục `lsp-gl5HhI`/`lsp-yK3QYf` chứa protocol và result; `running-ide-settings.json` chứng minh IDE người dùng đã nhận tùy chọn. Lần thử harness đầu `lsp-y0FlaE` bị mẫu loại `**/target/**` loại nhầm project tạm, không dùng làm bằng chứng PASS; đã sửa riêng cấu hình harness và chạy lại. Không thay import exclusions trong workspace người dùng.

Giới hạn: đã quan sát diagnostic protocol của language server riêng và preferences của IDE đang chạy, chưa trực tiếp đọc lại Problems panel của người dùng sau bản sửa cuối. Nếu tab đang mở còn giữ diagnostic cũ, đóng/mở lại V32/V33 hoặc chạy **Java: Clean Java Language Server Workspace**; không tắt kiểm tra null.
