# Kiểm chứng và cập nhật database cho công việc theo file / QA

Cập nhật 10/10/2026: runner integration hiện yêu cầu **V28**. Đã kiểm chứng V27→V28 và database rỗng→V28 trên schema riêng, sau đó backup và cập nhật `tms`; [báo cáo Admin toàn quyền](../reviews/2026-10-10-admin-full-authority.md). V28 giữ FK cùng dự án và cho phép executor Admin khác người nhận máy/người khởi tạo phiên. Mốc V19 bên dưới là bằng chứng lịch sử.

Cập nhật 06/10/2026: đã tạo schema test, kiểm thử fresh/upgrade đến **V19**, integration/concurrency và HTTP đầy đủ; đã backup, cập nhật `tms` V19 và restart backend 8080. V19 sửa hai FK QA phát hiện khi chạy native. Xem [báo cáo hoàn tất](../reviews/2026-10-06-native-completion.md). Không dùng `tms` cho fixture, reset hoặc Flyway clean. Môi trường ứng dụng dùng MySQL native, không cần tạo Docker/server khác.

## 1. Chuẩn bị schema riêng trong Workbench

Người quản trị database cấp một schema **ban đầu rỗng**, chỉ dùng để kiểm thử. Tên phải là `tms_docstest_` nối với12 ký tự hex viết thường, ví dụ `tms_docstest_202610060001`. Tài khoản migration đã cấu hình cần quyền tạo/đọc/sửa/xóa các object trong chính schema này. Quyền trên `tms` không tự cấp quyền trên schema test. Không đổi mật khẩu, quyền runtime hoặc database đang dùng để thay việc cấp schema riêng.

Xác nhận đúng server `127.0.0.1:3307`, tên schema và không có bảng/view/routine/event trước kiểm thử fresh. Ví dụ tên trong hướng dẫn không khẳng định schema đã tồn tại. Các schema đã chạy kiểm thử có dữ liệu được giữ làm bằng chứng; lần fresh mới cần schema rỗng mới.

## 2. Kiểm tra runner không kết nối database

Mở PowerShell tại thư mục gốc repository:

```powershell
rtk proxy node --test scripts/Test-FileWorkQaNative.test.cjs
```

Bộ này kiểm tra guard của runner với I/O giả. PASS ở đây không là PASS MySQL hoặc Java pre-start guard.

## 3. Chạy migration trên schema ban đầu rỗng

Chỉ dùng tên schema rỗng đã được quản trị cấp; thay ví dụ bên dưới bằng tên thực tế:

```powershell
rtk proxy node scripts/Test-FileWorkQaNative.cjs tms_docstest_202610060001 fresh-migration NativeFileWorkQaMigrationTest
```

Scenario hiện kiểm tra upgrade V16→V19, dữ liệu nguồn/annotation/attempt/history, checksum/no-op, fresh V19 và các ràng buộc. Runner từ chối `tms`, host ngoài loopback, selector khác và schema không rỗng ở đầu fresh run. Credentials lấy từ cấu hình local, không truyền mật khẩu vào câu lệnh hoặc đưa vào log.

Sau run, schema có dữ liệu phục vụ kiểm chứng. Lần fresh thứ hai sẽ từ chối schema này; không xóa/đổi nhãn dữ liệu để vượt guard. Nếu lỗi, giữ schema và log để điều tra. Việc clean trong source test chỉ xảy ra sau khi đã xác nhận schema ban đầu rỗng, giữ ownership lock và đúng tập bảng do test tạo; không dùng như công cụ reset database bất kỳ.

## 4. Chạy workflow hiện tại trên schema riêng đã ở V26

Cập nhật 10/10/2026: source hiện tại có entity từ V26. Schema integration phải ở V26 hợp lệ; kết quả V19 ở bước 3 chỉ kiểm tra migration lịch sử, chưa đủ chạy ứng dụng hiện tại. Trên schema riêng đã cấp cho kiểm thử, chạy bộ import để Flyway migrate đến phiên bản hiện tại, sau đó chạy F/Q. Không dùng tên schema ứng dụng `tms`. Runner F/Q chỉ validate, không tự upgrade ở chế độ integration.

```powershell
rtk proxy node scripts/Test-AdminNative.cjs tms_docstest_202610060001 TestDocumentIntegrationTest
```

```powershell
rtk proxy node scripts/Test-FileWorkQaNative.cjs tms_docstest_202610060001 integration NativeFileWorkQaIntegrationTest
rtk proxy node scripts/Test-FileWorkQaNative.cjs tms_docstest_202610060001 integration NativeFileWorkQaConcurrencyTest
```

Suite integration có workflow dịch vụ file/BUG/retest/QA và một số MockMvc checks, dùng rollback fixture của từng test. Suite concurrency có 5 kịch bản giao dịch thật, commit độc lập, rollback khi batch lỗi, và cập nhật đồng thời; fixture mang mã riêng được giữ lại trong schema test. Kết quả lịch sử ngày 06/10 là 5/5 mỗi suite trên V19. Kiểm chứng lại ngày 10/10 trên V26: integration 10/10 và concurrency 5/5, thêm real Excel import → assignment → execution; xem [review mới](../reviews/2026-10-10-workflow-linkage-review.md). Xem phạm vi và giới hạn tại [báo cáo hoàn tất](../reviews/2026-10-06-native-completion.md). Không coi một lần integration PASS là toàn bộ concurrency/HTTP/UAT đã PASS.

## 5. Cập nhật database sử dụng sau kiểm chứng

Giữ backup native trước khi nâng cấp, dùng công cụ [Backup-Database](../../scripts/Backup-Database.cjs) và đối chiếu manifest/nguồn. Không import lại backup cũ lên database đang có dữ liệu. Sau khi sửa mọi lỗi kiểm chứng và hoàn thành bước nâng cấp đã lên kế hoạch, người vận hành dừng backend của mình rồi chạy lại bản source mới bằng `mvn spring-boot:run` trong `Backend`, theo [hướng dẫn Workbench](mysql-workbench.md). Local profile đã dùng Flyway: các migration mới được chạy theo thứ tự khi startup; không chạy từng file SQL bằng tay, không sửa checksum hoặc dùng repair để che lỗi.

Đọc log, Flyway history và API mới để xác nhận thực tế; lỗi migration/startup không được coi là cập nhật thành công. Chỉ tiếp tục frontend khi backend đã chạy. Máy hiện tại đã backup, áp V17–V19 và restart 8080 thành công ngày 06/10; frontend 5173 giữ nguyên, xem bằng chứng trong báo cáo.

Cuối cùng thực hành [38 kịch bản F/Q](../uat/file-work-qa.md) với PM/Tester/Dev và workbook/máy/build thực tế. Ghi expected/actual/log/artifact, không tự ký UAT từ unit test hoặc ảnh preview.
# Kiểm tra hiện tại sau V27

Runner `integration` hiện yêu cầu schema riêng **V27**, gồm bảng sửa ô và phân công test lần 2; mode migration/lifecycle cũ giữ mốc riêng. Ngày 10/10/2026 đã chạy TestDocumentIntegrationTest (11), NativeFileWorkQaIntegrationTest (10) và NativeFileWorkQaConcurrencyTest (5) trên `tms_docstest_202610100016`. Không tạo fixture vào `tms`.
