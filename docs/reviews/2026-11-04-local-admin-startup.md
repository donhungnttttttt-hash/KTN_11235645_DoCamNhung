# Thiết lập Admin tổng khi khởi động local — 04/11/2026

## Yêu cầu và nguyên nhân

Người dùng yêu cầu chạy `mvn spring-boot:run` phải hoàn tất thiết lập tài khoản trên máy hiện tại. Trước sửa, source ở `abaf9d8`, Flyway đã áp dụng đủ 40 migration nhưng `system_admin_registry` và `system_admin_provision_receipts` đều rỗng. Hai tài khoản ADMIN vẫn là `syp.demo.admin` và `syp.demo34.admin`. Bằng chứng cutover ở máy khác không phản ánh database này.

V37 tạo schema quyền mới; chuyển tài khoản hiện hữu trước đây là lệnh provisioning riêng. Không sửa hoặc chạy lại migration cũ.

## Thay đổi

- `SystemAdminStartupProvisioning`: chỉ hoạt động với profile `local` và cờ bật rõ ràng. Đọc mapping riêng sau khởi tạo database, trước khi các lifecycle service nhận yêu cầu.
- `SystemAdminProvisioner.initializeOnce`: giữ application lock trong một giao dịch bao phủ preflight và apply hiện có. Phải khai báo UUID/tên cũ cho mọi ADMIN, không tự đoán tài khoản. Registry đã thiết lập bằng operation khác bị chặn.
- Receipt đã tồn tại thì không ghi lại tài khoản, không kiểm lại tên hiển thị cũ hoặc đặt lại mật khẩu. Người dùng có thể đổi hồ sơ/mật khẩu sau thiết lập mà không bị khởi động sau ghi đè.
- File thiếu/sai/quá lớn, xung đột tài khoản hoặc bật đồng thời fresh bootstrap làm startup thất bại; không in nội dung private input hay exception cause có thể chứa bí mật.
- Cơ chế bootstrap database trống và CLI provisioning hiện có được giữ nguyên. Production không tự chạy luồng local này.

## Cấu hình riêng trên máy này

Trong `.env.mysql.local` (Git bỏ qua):

```properties
TMS_BOOTSTRAP_ENABLED=false
TMS_ADMIN_PROVISION_ON_STARTUP=true
TMS_ADMIN_PROVISION_FILE=../var/mysql-native/admin-startup/request.json
```

Đường dẫn tương đối tính từ `Backend`. File JSON dùng contract `SystemAdminProvisioner.ProvisionRequest`: `operationId` là UUID cố định cho lần thiết lập, hai `mappings` chứa `slot`, `sourceId`, `expectedUsername`, `username`, `displayName`; `lockIds` khai báo rõ tài khoản ADMIN còn lại cần khóa; `password` do chủ hệ thống cung cấp riêng. Không đưa mật khẩu hoặc file này vào Git. Không thay operation ID khi chỉ khởi động lại.

Máy này đã có mapping đúng UUID: `syp.demo.admin` → `admin`, `syp.demo34.admin` → `admin2`; giữ tên hiển thị, không có ADMIN thứ ba cần khóa. Mật khẩu theo yêu cầu người dùng chỉ lưu cục bộ. Không sao chép mapping UUID này sang database khác.

Sau khi thiết lập thành công có thể đặt `TMS_ADMIN_PROVISION_ON_STARTUP=false` rồi xóa file mapping riêng nếu không muốn giữ mật khẩu khởi tạo. Không xóa receipt để ép chạy lại. Muốn thay đổi tài khoản sau đó dùng chức năng quản trị hoặc quy trình provisioning có kiểm tra riêng.

## Kiểm chứng đã thực hiện

- RED: test mới thất bại biên dịch do chưa có `initializeOnce`; sau triển khai, sửa fixture mock để phản ánh giá trị COUNT và đúng request cần kiểm tra.
- `mvn -B -ntp -Dtest=SystemAdminStartupTest,SystemAdminStartupContextTest,IdentityPolicyTest,AccountPolicyTest,SessionAccountFilterTest package`: **17 tests, 0 failures/errors/skipped; BUILD SUCCESS**. Gồm 10 test mới về opt-in/profile, thứ tự startup, receipt, xung đột và lỗi không lộ bí mật. Các test này không kết nối database sử dụng.
- Sao lưu database trước khi thiết lập tại `var/mysql-native/admin-startup/before-setup-data.sql` (Git bỏ qua, ACL giới hạn người dùng Windows hiện tại và SYSTEM). MySQL26.7 cần `--skip-masking-policies` để dump dữ liệu ứng dụng với tài khoản local; lần backup cuối không có stderr. Chưa thử restore bản sao này vào schema riêng.
- Chạy backend bình thường với cấu hình mới: log `Local administrator setup completed`; readiness **UP**; đăng nhập HTTP thực tế bằng `admin` và `admin2`, `/me` trả ADMIN; đăng xuất sau xác minh.
- Database vẫn **111 tài khoản**, registry **2 slot**, **1 receipt**. Đối chiếu trước/sau bằng truy vấn chỉ đọc: toàn bộ UUID/created_at người dùng, các trường đã chọn của 109 tài khoản khác (password hash/version/username/display name), toàn bộ membership, số dự án và lịch sử Flyway không đổi.
- Khởi động lại lần hai: log `already completed; accounts and passwords unchanged`, readiness **UP**. Đối chiếu ID/username/password hash/version/display name của hai ADMIN không đổi; registry và receipt không tăng thêm. Backend đang nghe `127.0.0.1:8080`, PID27100 tại thời điểm kiểm tra.
- Log build/runtime ở `Backend/target/admin-startup-verification.log`, `admin-startup-run.log`, `admin-startup-restart.log` (cục bộ, không commit).

Giới hạn: chưa chạy full backend suite hoặc native integration test trên schema riêng do chưa có credential/schema test được chuẩn bị; không chạy test ghi/xóa lên database sử dụng. Startup thực tế chỉ thực hiện thiết lập người dùng đã yêu cầu; không tạo dữ liệu nghiệp vụ thử. Chưa đo coverage, chưa kiểm giao diện trình duyệt. Không commit/push trong tác vụ này.

Skills áp dụng: `systematic-debugging`, `tdd-workflow`; rà soát credential/transaction theo `security-and-hardening`, Git theo `git-workflow-and-versioning`, tự review theo `code-review-and-quality`, kiểm chứng theo `verification-before-completion`. Thiết kế giới hạn theo `brainstorming`, thực hiện theo yêu cầu thiết lập tự động đã được người dùng đưa ra.
