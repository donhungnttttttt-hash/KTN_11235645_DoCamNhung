# ADR-002 — Đăng nhập nội bộ và quyền tài khoản

Ngày 22/09/2026. Sprint S02. Người dùng xác nhận: **chưa mở cho khách hàng; làm tài khoản nội bộ trước**. Dùng tài khoản/mật khẩu nội bộ như phương án đã trao đổi.

- Ba vai trò tài khoản: ADMIN, PM, TESTER. Theo yêu cầu bổ sung của người dùng, **chỉ Admin hoặc PM được Admin cấp quyền mới được tạo tài khoản; Tester không được tạo tài khoản**. Vai trò tài khoản không tự cấp membership hoặc quyền nghiệp vụ theo dự án; phần đó thuộc S03.
- ADMIN gọi GET/POST/PATCH users, tạo cả ba vai trò, cấp/thu hồi `canCreateUsers` cho PM. PM mặc định không có quyền tạo; PM được cấp chỉ tạo TESTER để không nâng quyền hoặc cấp tiếp quyền. Đây là giới hạn phạm vi quyền PM được công bố khi triển khai; mở rộng quyền PM cần quyết định riêng.
- Không có đăng ký công khai, tự nâng quyền hay tài khoản khách. S02 chưa có màn quản trị users riêng; API quản trị được tài liệu hóa cho công cụ nội bộ.
- Username chuẩn hóa chữ thường, 3–64 ký tự ASCII chữ/số/dấu chấm/gạch nối/gạch dưới. Display name 1–100 ký tự. Mật khẩu 12–128 ký tự, không trim hoặc log, lưu PBKDF2 với salt riêng và định danh thuật toán. Thông báo đăng nhập sai/tài khoản vô hiệu hóa/không tồn tại giống nhau.
- Session do Spring Security + Spring Session JDBC quản lý trong MySQL, cookie HttpOnly/SameSite Strict, secure theo HTTPS. Hết hạn sau 30 phút không hoạt động (cấu hình được). Đổi session ID khi đăng nhập, xóa CSRF cũ, logout hủy session. Không đặt token/mật khẩu vào localStorage/sessionStorage.
- Kiểm tra user enabled và phiên bản xác thực ở mọi request đã đăng nhập; vô hiệu hóa tài khoản hoặc đổi quyền PM thu hồi tất cả session của người đó. Update yêu cầu expectedVersion, không cho tự vô hiệu hóa mình. S02 PATCH enabled/canCreateUsers; không thay role/password qua PATCH. Chỉ chấp nhận canCreateUsers trên tài khoản PM.
- Giới hạn đăng nhập theo username chuẩn hóa và địa chỉ kết nối, không tin X-Forwarded-For từ client. Bộ đếm có thời hạn trong MySQL để không mất khi restart và không chỉ bảo vệ một process. Mức khởi đầu: 5 yêu cầu/username/phút và 30 yêu cầu/IP/phút, gồm cả thành công. Trả 429 có Retry-After; không khóa vĩnh viễn tài khoản.
- Audit chỉ lưu ID actor/subject, loại sự kiện, thời gian/requestId. Không lưu mật khẩu, hash, CSRF, cookie, token hoặc username thử sai; log sai đăng nhập dùng subject null.
- Bootstrap admin chỉ từ biến môi trường opt-in, không có mật khẩu mặc định trong git. Chỉ tạo khi chưa có user; chạy lại không đổi mật khẩu hoặc quyền tài khoản đã có.
- Frontend bảo vệ shell bằng phiên thật, hiển thị tên hiện tại và đăng xuất. Khi hết phiên, khóa tương tác và yêu cầu đăng nhập lại; draft giữ trong bộ nhớ chỉ được khôi phục nếu cùng tài khoản, chuyển tài khoản thì reset cây ứng dụng. Không tạo màn theo dõi kỹ thuật trên web.
- Các màn nghiệp vụ vẫn dùng prototype; đăng nhập thật không có nghĩa công việc/test case đã nối API. Không mở tài khoản khách trước khi giải quyết Q09 và project scope.

Tham chiếu kỹ thuật: [Spring Security 6.5 session persistence](https://docs.spring.io/spring-security/reference/6.5/servlet/authentication/session-management.html), [Spring Session JDBC 3.5](https://docs.spring.io/spring-session/reference/3.5/configuration/jdbc.html). Quyết định chức năng của dự án nằm trong ADR này; tài liệu thư viện dùng để đối chiếu implementation.
