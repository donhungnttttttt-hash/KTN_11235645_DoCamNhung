# Quyền nội bộ — Sprint 02

Người dùng xác nhận chỉ tài khoản nội bộ và chỉ Admin/PM được Admin cấp quyền mới tạo tài khoản. Backend thực thi; ẩn nút frontend không phải ranh giới bảo mật.

| Hành động | TESTER | PM chưa cấp | PM đã cấp | ADMIN |
| --- | --- | --- | --- | --- |
| Đăng nhập, hồ sơ bản thân, đăng xuất | Có | Có | Có | Có |
| Tạo TESTER | 403 | 403 | Có | Có |
| Tạo ADMIN hoặc PM | 403 | 403 | 403 | Có |
| Danh sách tài khoản | 403 | 403 | 403 | Có |
| Bật/tắt tài khoản | 403 | 403 | 403 | Có, không tự tắt mình |
| Cấp/thu hồi quyền tạo tài khoản của PM | 403 | 403 | 403 | Có |
| Quyền theo dự án | S03 | S03 | S03 | Không tự coi Admin là thành viên mọi dự án |

PM chỉ được tạo TESTER là giới hạn an toàn của quyền được cấp ở S02. PM không được cấp quyền tiếp. Admin tạo PM cũng chưa cấp quyền tạo tài khoản; phải PATCH `canCreateUsers: true` rõ ràng. Không có CUSTOMER trong sprint này.

Chưa đăng nhập trả 401; request ghi còn cần CSRF. Login sai/disabled/không tồn tại cùng 401 AUTHENTICATION_FAILED; quá tần suất 429. Phiên hết hạn/user bị khóa/đổi quyền trả 401 UNAUTHENTICATED. CSRF sai/thiếu trả 403 CSRF_INVALID trước kiểm tra quyền; đúng CSRF nhưng sai quyền trả 403 FORBIDDEN. Version cũ trả 409 VERSION_CONFLICT; tự khóa trả 409 SELF_DISABLE; trùng username trả 409 USERNAME_EXISTS cho người có quyền tạo; input sai trả 422.

Thay enabled/quyền PM thu hồi toàn bộ phiên. Ghi audit cho tạo tài khoản, bật/tắt, cấp/thu hồi quyền và login/logout; không ghi mật khẩu/token.

Các kịch bản S03 phải kiểm chứng khi có API dự án: thành viên A không đọc/sửa dự án B bằng đổi URL/ID; không liên kết case/bug khác dự án; role dự án không nâng quyền tạo tài khoản. S02 không khẳng định các API chưa triển khai đã được kiểm tra.

## Xác nhận S04 ngày 28/09/2026

- Chỉ membership đang hoạt động với `projectRole=PM` của chính dự án được duyệt revision. ADMIN hệ thống không tự có quyền duyệt; phải được giao PM trong dự án đó.
- Đọc case/suite cần membership đang hoạt động. ADMIN ngoài dự án cũng bị từ chối; gỡ thành viên chặn cả đọc và ghi ngay request tiếp theo.
- Tạo/sửa case, suite và nhập Excel: PM dự án hoặc ADMIN là thành viên dự án. Role dự án không cấp quyền tạo tài khoản mới.
- Dự án phải còn ít nhất một PM. Chặn gỡ/hạ quyền PM cuối cùng.
- Đã kiểm chứng phạm vi dự án, thành viên bị gỡ, admin ngoài dự án, duyệt PM-only, FK khác dự án và bản dựng khác dự án trong `TestCaseIntegrationTest`.

## Thực thi kiểm thử S05

| Hành động | Điều kiện tại backend |
| --- | --- |
| Đọc đợt, scope, lần chạy và lịch sử | Thành viên active của chính dự án; ADMIN ngoài dự án không được đọc |
| Tạo đợt, thêm cấu hình/case, kích hoạt, phân công | PM dự án hoặc ADMIN là thành viên dự án; dự án chưa archive |
| Ghi OK/NG/P | Chính người đang được phân công, membership PM/TESTER active, user enabled; đợt ACTIVE, dự án chưa archive |
| Duyệt revision trước khi đưa vào scope | Vẫn chỉ PM của dự án theo S04 |
| NA, loại scope, đóng đợt | Chưa có endpoint; chờ Q08 |

TESTER không được quản lý cycle/phân công. ADMIN muốn ghi kết quả phải được phân công với membership hợp lệ; không có quyền giả danh executor. Các điều kiện này được kiểm chứng trong `ExecutionIntegrationTest`, gồm người ngoài dự án, admin ngoài dự án, thành viên bị gỡ, CSRF, người không được phân công và actor lấy từ session.
