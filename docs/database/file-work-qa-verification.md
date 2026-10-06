# Kiểm chứng và cập nhật database cho công việc theo file / QA

Cập nhật06/10/2026. V17/V18 có trong source; database sử dụng được quan sát read-only lúc2026-10-05T20:49:35Z vẫn ở V16. Compile, unit test và việc người dùng duyệt thiết kế không chứng minh migration đã chạy. Không dùng `tms` cho fixture, reset hoặc Flyway clean. Môi trường ứng dụng dùng MySQL native, không cần tạo Docker/server khác.

## 1. Chuẩn bị schema riêng trong Workbench

Người quản trị database cấp một schema **ban đầu rỗng**, chỉ dùng để kiểm thử. Tên phải là `tms_docstest_` nối với12 ký tự hex viết thường, ví dụ `tms_docstest_202610060001`. Tài khoản migration đã cấu hình cần quyền tạo/đọc/sửa/xóa các object trong chính schema này. Quyền trên `tms` không tự cấp quyền trên schema test. Không đổi mật khẩu, quyền runtime hoặc database đang dùng để thay việc cấp schema riêng.

Xác nhận đúng server `127.0.0.1:3307`, tên schema và không có bảng/view/routine/event trước kiểm thử fresh. Ví dụ tên trong hướng dẫn không khẳng định schema đã tồn tại. Lần provision bằng tài khoản hiện tại đã thất bại; chưa thử lại hoặc tạo fixture trên `tms`.

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

Scenario kiểm tra upgradeV16→V18, dữ liệu nguồn/annotation/attempt/history, checksum/no-op, phase freshV18 và các ràng buộc. Runner từ chối `tms`, host ngoài loopback, selector khác và schema không rỗng ở đầu fresh run. Credentials lấy từ cấu hình local, không truyền mật khẩu vào câu lệnh hoặc đưa vào log.

Sau run, schema có dữ liệu phục vụ kiểm chứng. Lần fresh thứ hai sẽ từ chối schema này; không xóa/đổi nhãn dữ liệu để vượt guard. Nếu lỗi, giữ schema và log để điều tra. Việc clean trong source test chỉ xảy ra sau khi đã xác nhận schema ban đầu rỗng, giữ ownership lock và đúng tập bảng do test tạo; không dùng như công cụ reset database bất kỳ.

## 4. Chạy workflow trên schema riêng đã ở V18

Một schema riêng khác phải được chuẩn bị V18 hợp lệ trước khi gọi integration; runner không tự nâng cấp schema V16 ở chế độ này:

```powershell
rtk proxy node scripts/Test-FileWorkQaNative.cjs tms_docstest_202610060002 integration NativeFileWorkQaIntegrationTest
```

Source có workflow dịch vụ file/BUG/retest/QA và một số MockMvc checks, dùng rollback fixture của từng test. Chưa có kết quả chạy native. Outer transaction chưa chứng minh commit độc lập/isolation của command thất bại; ba lịch chạy đồng thời riêng được liệt kê trong [báo cáo](../reviews/2026-10-06-fq-implementation.md) còn chưa viết. Không coi một lần integration PASS là toàn bộ concurrency/HTTP/UAT đã PASS.

## 5. Cập nhật database sử dụng sau kiểm chứng

Giữ backup native trước khi nâng cấp, dùng công cụ [Backup-Database](../../scripts/Backup-Database.cjs) và đối chiếu manifest/nguồn. Không import lại backup cũ lên database đang có dữ liệu. Sau khi sửa mọi lỗi kiểm chứng và hoàn thành bước nâng cấp đã lên kế hoạch, người vận hành dừng backend của mình rồi chạy lại bản source mới bằng `mvn spring-boot:run` trong `Backend`, theo [hướng dẫn Workbench](mysql-workbench.md). Local profile đã dùng Flyway: các migration mới được chạy theo thứ tự khi startup; không chạy từng file SQL bằng tay, không sửa checksum hoặc dùng repair để che lỗi.

Đọc log, Flyway history và API mới để xác nhận thực tế; lỗi migration/startup không được coi là cập nhật thành công. Chỉ tiếp tục frontend khi backend đã chạy. Hướng dẫn này không khẳng định đã backup, áp V17/V18 hoặc restart listener8080/5173; các thao tác đó chưa được thực hiện trong tác vụ F/Q.

Cuối cùng thực hành [38 kịch bản F/Q](../uat/file-work-qa.md) với PM/Tester/Dev và workbook/máy/build thực tế. Ghi expected/actual/log/artifact, không tự ký UAT từ unit test hoặc ảnh preview.
