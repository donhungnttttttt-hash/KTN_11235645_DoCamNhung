# Quản trị hệ thống TMS

Tài liệu đi kèm khu ADMIN trên nhánh `system-design`. Trạng thái triển khai và bằng chứng kiểm thử xem [báo cáo](reviews/2026-10-05-admin-implementation.md).

## Đăng nhập và phạm vi

Đăng nhập bằng tài khoản có vai trò hệ thống ADMIN, ví dụ `admin.local`, với mật khẩu hiện tại. Không tạo lại tài khoản hoặc thay mật khẩu khi cập nhật ứng dụng.

Khu quản trị có địa chỉ `#/admin`. ADMIN được xem toàn bộ dự án kể cả khi chưa là thành viên. PM và Tester tiếp tục dùng không gian dự án; nhập URL quản trị không cấp thêm quyền.

Dashboard ADMIN mặc định là tổng hệ thống. Bộ chọn dự án đặt trong tab **Dự án**, mặc định là **Tất cả dự án**; chọn một dự án để xem riêng. Header không có bộ chọn dự án. Các trang người dùng, thiết bị và nhật ký có bộ lọc tại nội dung của chính trang. Khi vào **Không gian dự án**, quyền thao tác vẫn theo membership của tài khoản; ADMIN không tự trở thành PM của mọi dự án.

## Đọc số liệu

- Tài khoản là số người duy nhất; số thành viên theo từng dự án có thể đếm cùng một người ở nhiều dự án.
- Tiến độ thực thi = (OK + NG) / số lượt áp dụng. Tỷ lệ đạt = OK / số lượt áp dụng. Số lượt áp dụng không gồm NA; đợt nháp không tính vào tiến độ thực thi. P và chưa chạy chưa tính là đã thực thi.
- Khi chưa có phạm vi, tỷ lệ không phải 0% mà là **Chưa có phạm vi áp dụng**.
- Kết quả cập nhật trên file test case là kết quả tài liệu, không tự thay kết quả của đợt kiểm thử.
- Mốc bị cảnh báo trễ khi đã qua ngày hạn theo múi giờ dự án và còn công việc/đợt chưa hoàn tất. Mốc thiếu hạn hoặc thiếu phạm vi có trạng thái chưa đủ dữ liệu. Không có cảnh báo trễ không có nghĩa dự án đã được đánh giá đúng tiến độ.
- Báo cáo của PM bổ sung nguyên nhân và kế hoạch xử lý; không xóa cảnh báo hoặc sửa số liệu tự động.

## Dự án và người dùng

Vào **Dự án → Tạo dự án mới**, nhập mã/tên/mô tả/múi giờ, tìm và chọn người, rồi chọn vai trò cho từng người. Phải có ít nhất một PM. Kiểm tra danh sách đã chọn trước khi bấm **Tạo dự án**. Người ADMIN tạo dự án chỉ trở thành thành viên khi được chọn rõ trong danh sách.

Danh sách dự án cho phép tìm kiếm, mở chi tiết, cập nhật thông tin và quản lý thành viên. Việc thay đổi có kiểm tra phiên bản để tránh ghi đè cập nhật của người khác; khi gặp xung đột, tải lại dữ liệu hiện hành rồi đối chiếu trước khi lưu tiếp. Không gỡ PM cuối của dự án.

ADMIN tạo dự án, chọn PM, Tester/Dev và máy ban đầu. Số lượng được tính từ danh sách chọn, không phải hạn mức tối đa; sau này ADMIN có thể thay đổi phân bổ. PM nhận dự án và điều hành công việc, không quản lý kho hoặc tự thêm/gỡ thành viên.

Dev xem case/kết quả, xử lý bug được giao và cập nhật lý do/build sửa. Tester thực thi/retest, PM phân công và đóng lỗi. Dev không ghi kết quả kiểm thử, kết quả tài liệu hoặc retest và không tự đóng/mở lại lỗi đã kết thúc.

Vào **Người dùng**, dùng bộ lọc **Dự án của người dùng** để chọn theo tên dự án; chọn **Tất cả dự án** để bỏ lọc. **Tạo tài khoản** mở form tên đăng nhập/tên hiển thị/mật khẩu/vai trò. Danh sách người dùng mặc định gồm cả người chưa tham gia dự án nào. Khi lọc một dự án, chỉ các membership đang hoạt động thuộc dự án đó được tính trong phạm vi. ADMIN tạo tài khoản, khóa/mở tài khoản và cấp/thu hồi quyền tạo Tester cho PM. Không tự khóa chính tài khoản đang sử dụng. PM được ủy quyền chỉ tạo Tester, không tạo ADMIN/PM hoặc cấp quyền tiếp.

## Thiết bị

ADMIN mở tab **Thiết bị** để quản lý kho. Trong dự án, phần **Cài đặt dự án → Thành viên** có danh sách máy được bàn giao để PM và thành viên tra cứu.

Kho quản lý từng máy vật lý, nhận diện bằng mã tài sản. Serial có thể bỏ trống khi chưa có; nếu nhập phải duy nhất. Bảng cấu hình thiết bị của đợt kiểm thử vẫn là nghiệp vụ riêng, không phải số máy trong kho.

1. Nhập mã tài sản, loại máy, model, hệ điều hành và tình trạng.
2. Khi bàn giao, chọn dự án và người nhận đang hoạt động trong dự án. Có thể ghi hạn trả và ghi chú.
3. Một máy chỉ có một lượt bàn giao đang mở. Muốn chuyển dự án phải thu hồi trước rồi bàn giao lại.
4. Thu hồi ghi người thực hiện, thời điểm thực tế, tình trạng nhận và ghi chú; lịch sử bàn giao cũ được giữ.
5. Máy đang bàn giao không được đưa sang bảo trì/ngừng sử dụng trước khi thu hồi. PM chỉ xem các máy dự án đang được giao.

Nếu hai ADMIN cùng chọn một máy, chỉ một lượt bàn giao được chấp nhận. Khi có thông báo dữ liệu đã thay đổi, tải lại tình trạng máy rồi chọn lại; không bấm gửi lặp để ghi đè. Thiết bị đang giữ ở dự án lưu trữ vẫn cần thu hồi đúng lượt bàn giao để giữ lịch sử.

## Báo cáo tiến độ PM

PM mở **Quản lý tiến độ**, nhập nội dung cập nhật, khó khăn/nguyên nhân, kế hoạch xử lý và ngày dự kiến hoàn thành, rồi bấm **Gửi báo cáo**. Khi hệ thống đang cảnh báo quá hạn, lý do và kế hoạch xử lý là bắt buộc. Báo cáo là lịch sử bổ sung: đính chính bằng bản mới, không sửa/xóa bản cũ. ADMIN xem báo cáo mới nhất và lịch sử trong chi tiết dự án; gửi báo cáo vẫn yêu cầu vai trò PM trong dự án đó.

Tab **Nhật ký quản trị** cho phép lọc dự án, loại đối tượng và khoảng ngày. Chọn múi giờ trước khi đối chiếu thời gian. Khi lọc riêng một dự án, các thay đổi tài khoản hoặc tài sản chưa thuộc dự án không nằm trong kết quả; chọn **Tất cả dự án** để xem những sự kiện toàn hệ thống.

## Vai trò trong dự án

| Người dùng | Thao tác chính |
| --- | --- |
| ADMIN tổng | Tạo dự án; chọn PM/thành viên; quản lý tài khoản và kho; bàn giao/thu hồi; xem tổng hợp và nhật ký |
| PM dự án | Điều hành, phân công, duyệt case, quản lý đợt và đóng lỗi; gửi báo cáo tiến độ; xem thiết bị được giao |
| Tester | Thực thi/retest theo phân công, ghi kết quả và chứng cứ |
| Dev | Xem case/kết quả; xử lý bug đang được giao; ghi lý do và build sửa |

Vai trò trong dự án được ADMIN chọn rõ cho từng người. Tài khoản Dev không được nâng thành PM/Tester qua việc gán membership; việc còn lưu phân công kiểm thử cũ cũng không cấp lại quyền ghi kết quả. Các thao tác được kiểm tra ở backend, không chỉ ẩn nút trên giao diện.

## Kiểm thử bằng MySQL native

Không chạy integration fixture lên schema `tms`. Trong Workbench, tài khoản quản trị MySQL chuẩn bị một lần:

```sql
CREATE DATABASE IF NOT EXISTS tms_docstest_202610030001 CHARACTER SET utf8mb4;
GRANT ALL PRIVILEGES ON tms_docstest_202610030001.* TO 'tms_migrator'@'127.0.0.1';
```

Tại thư mục gốc repository:

```powershell
rtk proxy node scripts/Test-AdminNative.cjs tms_docstest_202610030001
```

Lệnh dùng cấu hình cục bộ `.env.mysql.local`, kiểm tra schema riêng trước khi chạy Maven, không in mật khẩu. Nếu MySQL báo thiếu quyền, cấp quyền trên schema test bằng tài khoản quản trị; không đổi tên schema thành `tms` để vượt qua kiểm tra.

Để kiểm tra migration từ đầu và nâng cấp V14 lên V16, chuẩn bị **một schema test khác hoàn toàn trống**, ví dụ `tms_docstest_202610050002`, cấp quyền tương tự rồi chạy riêng:

```powershell
rtk proxy node scripts/Test-AdminNative.cjs tms_docstest_202610050002 --fresh-migration
```

Lệnh này từ chối schema có sẵn bảng. Không chạy cùng các test khác trên schema đó; sau khi chạy, schema chứa kết quả kiểm thử và không còn là schema trống. Tại lần triển khai này, tài khoản cấu hình chưa có quyền tạo schema riêng nên các kiểm thử native có ghi dữ liệu chưa được chạy.

Khi khởi động bản backend mới, Flyway áp dụng các migration chưa chạy. Không sửa migration cũ hoặc xóa lịch sử Flyway. Sao lưu dữ liệu trước khi áp dụng migration trên database đang sử dụng; xem [hướng dẫn MySQL Workbench](database/mysql-workbench.md).

Phần quản trị bổ sung ba bảng nghiệp vụ: `device_assets` lưu từng máy, `device_allocations` lưu từng lượt bàn giao, và `project_status_reports` lưu từng báo cáo PM. Dashboard đọc các bảng hiện có, không thêm bảng để lưu số liệu trùng. Nhật ký dùng lại hệ thống audit; bản ghi lịch sử chỉ có thời điểm/người tạo vì được giữ nguyên, còn tài sản có cả người và thời điểm cập nhật.

## Cập nhật ứng dụng đang chạy

Ở terminal backend đang chạy, bấm **Ctrl+C**, rồi chạy lại từ thư mục gốc:

```powershell
cd D:\DCN\KTN_11235645_DoCamNhung\Backend
mvn spring-boot:run
```

Frontend chạy ở terminal khác:

```powershell
cd D:\DCN\KTN_11235645_DoCamNhung\Frontend
npm run dev
```

Sau khi backend khởi động thành công, tải lại trang và đăng nhập bằng tài khoản ADMIN hiện có. Mã frontend mới không thể bổ sung API cho tiến trình backend cũ nếu chưa khởi động lại.
