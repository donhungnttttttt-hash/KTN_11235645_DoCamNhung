# Review bổ sung quyền tạo Tester của PM — 19/10/2026

Review độc lập do reviewer Testing/Issue thực hiện theo yêu cầu root ở lượt đối chiếu cuối; root lưu biên bản từ kết quả review. **SOURCE_CONFIRMED_UI_GAP / BROWSER_NOT_RUN**. Không sửa ứng dụng, gọi API/browser, tạo/cấp tài khoản hoặc ghi database.

Kết luận: chấp nhận UX-014/P2 với phạm vi PM **đã được Admin cấp** `users:create` không có điểm mở form tạo Tester. Không gọi là lỗi backend hoặc hồi quy đã xác định thời điểm.

Chuỗi bằng chứng đã đối chiếu:

- AGENTS hiện hành và `docs/business/permissions.md:75,86–93` giữ quyền PM được cấp tạo TESTER; đây không phải quyền quản lý membership.
- `Backend/src/main/java/vn/syp/tms/identity/IdentityService.java:26–29,59–63` cấp capability và enforce PM chỉ tạo TESTER.
- `Backend/src/main/java/vn/syp/tms/config/SecurityConfig.java:53–55` phân biệt POST được ủy quyền với GET/PATCH chỉ ADMIN. Executor kiểm lại vị trí/package file trước khi sửa vì mốc dòng có thể thay đổi.
- `Frontend/src/app/features/auth/AccountMenu.jsx:21` chỉ hiển thị thông báo có quyền.
- Full search `Frontend/src` cho `users:create|createUser|CreateUser|createTester` chỉ thấy lời gọi tạo tài khoản trong `Frontend/src/app/features/admin/AdminUsers.jsx:21`; `AdminApp.jsx:19` chặn PM, router/sidebar không có lối thay thế.
- C09 mới thay membership/device assignment, không hủy quyền tạo Tester được cấp từ S02.

Tái hiện browser dự kiến: đăng nhập PM có capability, đọc thông báo tài khoản, tìm action không có, vào Admin users bị từ chối. **Chưa thực thi scenario đó trong audit**, không cần cấp quyền mới để ghi finding nguồn.

Hướng sửa được chấp nhận: action/form theo capability, chỉ TESTER; không mở khu Admin hoặc GET danh sách users, không cho chọn ADMIN/PM/DEV và không tự thêm membership. PM chưa được cấp và worker không thấy action. Lưu lỗi/validation/duplicate/thu hồi quyền giữ nháp và phản hồi đúng, backend tiếp tục enforce. Test tương ứng trên fixture cô lập sau khi được giao triển khai.
