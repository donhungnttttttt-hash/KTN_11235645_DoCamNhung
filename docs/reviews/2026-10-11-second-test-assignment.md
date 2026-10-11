# Sửa nút giao test lần 2 — 11/10/2026

## Nguyên nhân và thay đổi

Nút `Giao test lần 2` bị khóa khi dòng Excel còn là phiên bản dự thảo, dù người dùng có quyền Admin/PM. Điều kiện duyệt trước phân công đã được backend kiểm soát, nhưng frontend chỉ giải thích bằng tooltip trên nút bị vô hiệu hóa, khiến người dùng không có đường thao tác ngay trong bảng.

- Admin/PM mở được hộp phân công cho dòng dự thảo. Vẫn chặn khi tài liệu đang lưu/tải, có lỗi lưu kết quả hoặc case đã lưu trữ.
- Hộp phân công hiển thị rõ yêu cầu duyệt và nút `Duyệt phiên bản này`, gọi API duyệt phiên bản hiện có. Đây là thao tác riêng do người dùng bấm; không tự động duyệt khi mở hoặc lưu phân công.
- Sau duyệt, cập nhật nhãn dòng trong bảng, giữ nguyên Tester/ghi chú đã chọn; đóng rồi mở lại không yêu cầu duyệt lại phiên bản đó.
- Chỉ cho lưu khi tải xong lựa chọn, phiên bản đã duyệt, đợt/cấu hình hợp lệ và Tester đang hoạt động, tài khoản không bị vô hiệu hóa. Phân công mới vẫn dùng đợt nháp; đợt đã chốt phải mở lại trước khi đổi phân công.
- Thiếu đợt nháp, cấu hình hoặc Tester có hướng dẫn cụ thể. Nút mở đợt đi đúng đợt đang chọn. Lỗi duyệt/lưu giữ dữ liệu người dùng để thử lại.

Không sửa backend, API contract hoặc schema trong lần sửa này. Không dùng database nghiệp vụ để ghi fixture. Giữ các thay đổi đang có trên `system-design`; không commit/push/merge/deploy.

## Kiểm chứng

Skill: `frontend-patterns`, `tdd-workflow`, `verification-loop`.

1. Tái hiện đỏ trước sửa: hai test Admin/PM thất bại vì nút bị disabled; test luồng duyệt thất bại vì chưa có nút duyệt.
2. `document-editing.test.jsx`: **15 test PASS**, bao gồm mở hộp với case nháp cho Admin không có membership và PM; duyệt/lưu; lỗi và thử lại; bảo toàn lựa chọn; thiếu đợt/cấu hình/Tester; phân trang; đợt đã chốt; cập nhật nhãn sau duyệt.
3. Toàn bộ frontend: **70 file / 765 test PASS** (`npm test`). `npm run build` PASS; còn cảnh báo bundle Vite lớn hơn 500 kB.
4. Coverage đo riêng `DocumentSecondTestDialog.jsx`: statements **98.05% (101/103)**, branches **90.38% (94/104)**, functions **100% (32/32)**, lines **100% (37/37)**. Không suy ra coverage toàn frontend. Báo cáo local: `Frontend/coverage/second-test/`.
5. Chrome local, tài khoản `[Demo] Quản trị tổng`, dự án DEMO-PILOT, document 13: nút trên case dự thảo được bật; bấm mở hộp phân công; thấy bước duyệt và danh sách Tester; chọn `DEMO-4` tải được cấu hình `QA nội bộ / Chrome / Windows · 1.2.0`; đóng hộp trả focus về đúng nút. Không bấm duyệt hoặc lưu trên database đang sử dụng. Chụp ảnh bị timeout ở trình điều khiển trình duyệt, nên xác nhận giao diện bằng accessibility tree, không tuyên bố đã kiểm tra hình ảnh/responsive trong lần này.

Kiểm tra cấu trúc contract/liên kết tài liệu (`Check-Contracts.cjs`) và `git diff --check`: PASS. Git chỉ cảnh báo chuyển LF/CRLF theo cấu hình hiện tại.

Backend/MySQL không chạy lại vì không thay đổi trong phạm vi này; bằng chứng kiểm thử backend trước đó nằm ở [review Admin toàn quyền](2026-10-10-admin-full-authority.md). S11 giữ `IN_REVIEW`; UAT người dùng và thiết bị thật vẫn là gate riêng.
