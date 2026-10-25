# Sửa thông tin tài khoản quản trị — 25/10/2026

Người dùng đã chốt ba trường: tên hiển thị, tên đăng nhập, đặt lại mật khẩu. Giữ nguyên vai trò hệ thống và việc chỉ hiển thị vai trò dự án. Nhánh `system-design`, baseline `dcb46cc`; không tự commit/push/merge/deploy.

## Thiết kế

- Admin mở form Sửa thông tin từ danh sách Người dùng: chỉ tên hiển thị/tên đăng nhập, có phản hồi lưu và xung đột phiên bản/tên trùng.
- Đặt lại mật khẩu dùng form riêng, nhập mới và xác nhận; không tải/lưu nháp mật khẩu vào storage hoặc trả mật khẩu/hash trong API.
- PATCH `/users/{id}` mở rộng additive, PUT `/users/{id}/password` dành riêng cho mật khẩu; cả hai chỉ ADMIN + CSRF + `expectedVersion`.
- Quy tắc validation giữ như tạo tài khoản. Username chuẩn hóa chữ thường, unique; mật khẩu 12–128 ký tự, không trim, hash bằng encoder hiện tại.
- Giữ ID, vai trò, membership/lịch sử. Mọi thay đổi thực sự thu hồi phiên của người được sửa, kể cả sửa tên hiển thị, vì session đang kiểm tra `lock_version`. No-op sau chuẩn hóa không tăng version hoặc thu hồi phiên. Admin tự sửa nhận thông báo rồi đăng nhập lại.
- Không cần migration cho chức năng này. Kiểm thử HTTP/session trên schema MySQL riêng với tài khoản chỉ có quyền ở schema đó; không sửa tài khoản thật.

## Checklist

- [x] Đối chiếu code/quyền, chốt phạm vi và cập nhật contract.
- [x] Backend và test RED/GREEN cho validation, quyền, xung đột, audit/phiên.
- [x] Frontend và test RED/GREEN cho form, lưu, lỗi, nháp, tự sửa tài khoản.
- [x] Native HTTP thực tế: tên mới đăng nhập được, mật khẩu cũ hết hiệu lực, phiên cũ bị thu hồi, giữ phân công, trùng tên đồng thời rollback.
- [x] Review độc lập, frontend regression/build và backend kiểm chứng phù hợp.
- [x] Kiểm tra Chrome, cập nhật báo cáo/bằng chứng/giới hạn.

## Phân công skill

| Skill | Mục đích |
| --- | --- |
| `api-design` | Contract PATCH/PUT, validation và lỗi 401/403/404/409/422 |
| `frontend-patterns` | Form riêng tái sử dụng dialog và luồng auth hiện có |
| `tdd-workflow` | Test hành vi trước implementation; đo coverage trong phạm vi có thể |
| `security-review` | Quyền, CSRF, hash/redaction, phiên và cạnh tranh cập nhật |
| `verification-loop` | Test/build, native cô lập, Chrome và diff cuối |

Không thay trạng thái tổng S11/FR-12 IN_REVIEW hoặc tự bắt đầu Arena. Kết quả và giới hạn sẽ ghi trong báo cáo riêng của tác vụ.

Hoàn tất phạm vi: [báo cáo kiểm chứng](../reviews/2026-10-25-admin-user-profile.md). Frontend 1.218/1.218; backend 47 test liên quan không trùng qua các lượt, gồm 8 native HTTP/MySQL; build và review đạt. Backend local 8080 đã chạy bản mới với Flyway target 33 ở phạm vi process, dữ liệu tài khoản/membership/lịch sử migration đối chiếu nguyên vẹn. Chưa commit/push.
