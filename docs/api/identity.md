# Contract identity S02

API base `/api/v1`, cookie session cùng origin qua Vite proxy. POST/PATCH cần token từ GET `/auth/csrf`, gửi header trả về và cookie; sau login/logout phải lấy token mới. Nội dung JSON; lỗi theo ApiError ở openapi.yaml.

| Method/path | Input | Output / quyền |
| --- | --- | --- |
| GET /auth/csrf | Không | 200 `{token,headerName}`; public, không phải token đăng nhập |
| POST /auth/login | `{username,password}` | 200 Me; 401 chung cho sai/disabled/không tồn tại; 403 CSRF; 422 input; 429 Retry-After |
| POST /auth/logout | Không | 204; hủy phiên và cookie, không chỉ xóa user trên UI |
| GET /me | Session | 200 Me; 401 nếu không có phiên hợp lệ |
| GET /users?page=0&size=20 | page >= 0, size 1–100 | ADMIN; 200 `{items,page,size,totalElements}` sắp createdAt/id; 401/403/422 |
| POST /users | `{username,displayName,password,role}` | ADMIN tạo ADMIN/PM/TESTER; PM có quyền chỉ tạo TESTER; 201 User; 403, 409 trùng tên, 422 validation |
| PATCH /users/{id} | `{enabled?,canCreateUsers?,expectedVersion}` | ADMIN; ít nhất một field cần cập nhật; canCreateUsers chỉ dùng cho PM; 200 User, 404, 409 stale/self-disable; thu hồi phiên khi enabled/quyền thay đổi |

Me: `{id,username,displayName,roles,permissions,sessionExpiresAt}`. ADMIN permissions `profile:read`, `users:read`, `users:create`, `users:update`, `users:delegate`; PM được cấp có `profile:read`, `users:create`; PM chưa cấp và TESTER chỉ `profile:read`. Không có project membership giả. User: `{id,username,displayName,role,enabled,canCreateUsers,version,createdAt}`; không trả hash hoặc session ID. `canCreateUsers` là quyền cấp riêng cho PM, luôn false với ADMIN/TESTER; ADMIN có quyền mặc định từ role.

Validation: username ASCII theo ADR-002; password 12–128 cho create, login cho phép 1–128; displayName không trống/tối đa 100. expectedVersion không âm. Login trim/lowercase username; create từ chối khoảng trắng trong username rồi chuẩn hóa lowercase. Password giữ nguyên, displayName trim. Pagination sai kiểu trả 400; ID không tồn tại trả 404; dữ liệu vượt giới hạn trả 422. Lỗi DB không được thay bằng dữ liệu mẫu.

Người gọi lấy actor từ session; không nhận actorId/userId của người thao tác trong body. Create/update/audit là transaction. Session chính và user nằm trong MySQL; role không cập nhật qua PATCH S02. Chi tiết quyền: [permissions](../business/permissions.md).

## Thử cấp quyền bằng công cụ API nội bộ

1. Dùng cùng cookie jar: GET `/auth/csrf`, POST `/auth/login` bằng Admin và header CSRF vừa nhận. Lấy lại CSRF sau đăng nhập.
2. POST `/users` với `{username:"pm.demo",displayName:"PM nội bộ",password:"<mật khẩu riêng ít nhất 12 ký tự>",role:"PM"}`. Giữ `id` và `version` trả về. PM mới chưa được tạo tài khoản.
3. PATCH `/users/{id}` với `{canCreateUsers:true,expectedVersion:0}` (dùng version thực tế từ bước trước). PM đăng nhập lại, `/me` có `users:create`, được POST `/users` với `role:"TESTER"`.
4. Thu hồi: PATCH cùng ID `{canCreateUsers:false,expectedVersion:<version mới>}`. Phiên cũ của PM mất hiệu lực; sau đăng nhập lại, POST `/users` trả 403.

Tạo/quản trị dùng công cụ API trong S02; không có trang đăng ký công khai hoặc nút cho Tester. Ví dụ dùng tên dữ liệu thử, không seed vào DB. Không copy mật khẩu local vào file request được commit. Muốn bật/tắt tài khoản gửi `enabled` cùng version; không xóa actor/audit.
