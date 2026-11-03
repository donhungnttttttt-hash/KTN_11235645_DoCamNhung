# Chuyển sang User thường và hai Admin tổng

Áp dụng V37, giữ nguyên V1–V36. Đây là hướng dẫn thao tác; trạng thái local thực tế ghi tại [báo cáo](../reviews/2026-11-02-unified-user-access.md). Không dùng Flyway repair hoặc reset database để bỏ qua sai lệch.

## Trước khi chuyển

1. Dừng ghi nghiệp vụ, chụp backup đầy đủ và thử restore vào schema riêng. Đối chiếu UUID, membership, phân công, kết quả/version/ngày, Issue, báo cáo và lịch sử.
2. Kiểm danh sách mọi ADMIN, tên đích và membership hiện hành. Mapping đã duyệt tại máy này: `admin.local` → `admin`, `syp.demo.admin` → `admin2`; khóa `handover.admin`, giữ UUID và lịch sử. Nếu có ADMIN khác, không tự chọn thay.
3. V37 kiểm mapping membership trước DDL. Nếu dữ liệu bất nhất, dừng để đối soát; không tự cấp quyền. V37 chỉ chuyển TESTER/DEV sang USER, ghi journal và thu hồi phiên. Registry ban đầu trống: web chưa được phép phục vụ trong khoảng này.
4. Đóng riêng backend HTTP/worker, chạy migration bằng profile/công cụ offline với đúng database và locations đã dùng. Không thêm demo locations vào database core hiện có. Java migration là phần của jar; không chỉ sao chép SQL.

**Trạng thái local đã diễn tập:** main V36 có lịch sử demo cũ nhưng chưa chạy V34. Bản sao được kiểm rằng migration ignored duy nhất là V34 rồi mới áp dụng V37; V34 vẫn không chạy. Khi cutover phải kiểm lại chính xác danh sách version/locations này. Không đặt `ignoreMigrationPatterns=*:ignored` toàn cục, không dùng out-of-order để nạp V34 và không dùng repair để che khác biệt. Nếu xuất hiện migration thiếu khác, dừng đối soát trước khi chuyển main.

## Thiết lập Admin riêng, không có endpoint web

Chuẩn bị file JSON **riêng, bị Git ignore**, không gửi qua chat/log. Cấu trúc:

```json
{
  "operationId": "<UUID mới>",
  "mappings": [
    {"slot":1,"sourceId":"<UUID admin.local>","expectedUsername":"admin.local","username":"admin","displayName":"admin"},
    {"slot":2,"sourceId":"<UUID syp.demo.admin>","expectedUsername":"syp.demo.admin","username":"admin2","displayName":"admin2"}
  ],
  "lockIds": ["<UUID handover.admin>"],
  "password": "<bí mật nhập riêng>"
}
```

Chạy `scripts/Provision-SystemAdmins.ps1 -PrivateRequestFile <file riêng> -JarPath <jar đã kiểm chứng>` để preflight. Sau khi đối chiếu fingerprint, chạy lại với `-Action apply -ExpectedFingerprint <fingerprint>`. Chỉ đường dẫn và fingerprint nằm trên argv; mật khẩu ở file riêng và biến môi trường tiến trình con. Cùng operation đã thành công không reset mật khẩu lần nữa. Mapping lệch, ID đích bị dùng hoặc ADMIN chưa khai báo sẽ dừng toàn bộ.

Script mặc định đọc `.env.mysql.local`, có `-DatabaseConfigFile` để diễn tập trên bản sao. Công cụ chạy profile `identity-provision`, không mở HTTP, không bật worker. Sau apply phải xác nhận registry đúng hai UUID, tài khoản thứ ba bị khóa, phiên cũ hết hiệu lực, ID mới đăng nhập được rồi mới mở lại dịch vụ.

Database **core trống** có thể bootstrap hai Admin từ `TMS_BOOTSTRAP_USERNAME/PASSWORD/DISPLAY_NAME` và `TMS_BOOTSTRAP_SECOND_USERNAME/PASSWORD/DISPLAY_NAME`. Mỗi mật khẩu bootstrap ít nhất 12 ký tự; không có giá trị mặc định. Database có demo/tài khoản phải dùng mapping riêng như trên; demo ADMIN không tự được cấp registry. Không bật bootstrap một tài khoản cũ rồi mong hệ thống tự chọn Admin thứ hai.

## Phục hồi

MySQL DDL không rollback toàn bộ. Nếu V37 thất bại sau DDL, giữ backend đóng, lưu log không bí mật và khôi phục **backup đã thử** vào schema khác để đối chiếu; không xóa dữ liệu đang dùng hoặc sửa checksum V1–V36. Chỉ chuyển connection sang bản phục hồi sau khi xác nhận đúng nguồn và quyền. Provision DML là transaction; nếu thất bại trước commit, dữ liệu tài khoản/registry/audit không được thay một phần. Nếu mất kết nối sau commit, chạy preflight cùng operation để xác định trạng thái trước khi làm lại.

Sau chuyển đổi, API tạo tài khoản chỉ nhận hai cờ `isProjectAdmin/isGuest`; ADMIN không được tạo qua web. ID đăng nhập là username, UUID nội bộ không đổi. Hội thoại AI thuộc phạm vi đã đổi được đọc lịch sử nếu quyền cũ vẫn đầy đủ; tạo hội thoại mới để tiếp tục suy luận bằng quyền hiện hành.

## Local sau chuyển03/11

Main đã qua V37/provision và V38 hồ sơ; xem [bằng chứng](../reviews/2026-11-03-self-profile-and-cutover.md). Local chỉ resolve core cùng hai demo SQL V20/V22 tại `var/mysql-native/legacy-demo-v20-v22`; các file này sao nguyên từ source, checksum được validate. `.env.mysql.local` dùng locations filesystem tương ứng và bootstrap=false, không dùng ignore-ignored. Giữ thư mục này cùng config/backup khi chuyển bản sao main; fresh demo vẫn có V34 trong source và không sử dụng override local này.
