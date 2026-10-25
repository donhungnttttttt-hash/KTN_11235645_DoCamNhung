# Vai trò thành viên dự án chỉ hiển thị

Ngày 25/10/2026, người dùng yêu cầu bỏ tính năng đổi vai trò của thành viên đã có trong dự án. Phạm vi đã hoàn tất ở giao diện; giữ việc chọn vai trò ban đầu khi tạo dự án hoặc thêm thành viên.

## Thay đổi

- `AdminProjectDetail.jsx`: thay dropdown bằng chữ in đậm, bỏ nút lưu vai trò và state/handler bản nháp vai trò. Giữ thêm/gỡ thành viên, thông báo kết quả và kiểm tra phiên bản.
- `ProjectMembers.jsx`: bỏ nút và form sửa vai trò; form thêm chỉ nhận người chưa có trong danh sách thành viên hiện tại. Giữ luồng khôi phục membership đã gỡ với phiên bản tương ứng.
- `AdminProjectLifecycle.jsx`: bỏ hướng dẫn hoàn nguyên vai trò chưa lưu vì thao tác đó không còn trên giao diện. Vẫn chặn đổi trạng thái dự án khi đang chỉnh sửa/thêm/gỡ thành viên.
- Không đổi backend API, quy tắc quyền hoặc vai trò đã lưu. API dùng chung để thêm/khôi phục membership vẫn còn; đây không phải thay đổi cơ chế phân quyền máy chủ.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Test Admin trước sửa giao diện | RED: 3 test thất bại đúng hành vi mới; sau sửa 21/21 đạt |
| Test ProjectMembers/settings | RED: 2 test thất bại đúng hành vi mới; sau sửa 23/23 đạt |
| Test vòng đời dự án | Cập nhật test bản nháp vai trò đã bị loại bỏ sang kiểm tra chặn trong lúc gỡ, khôi phục sau lỗi, mở lại sau thành công; 4/4 đạt |
| Toàn bộ frontend cuối cùng | 1.202/1.202 test, 129 file, 0 thất bại/0 bỏ qua; exit 0 |
| Build frontend | Vite build exit 0; còn cảnh báo bundle JS 504,51 kB vượt ngưỡng 500 kB |
| Chrome thực tế | `localhost:5173/#/admin/projects/5`: bốn thành viên hiển thị PM/TESTER/TESTER/DEV bằng chữ, không có dropdown hoặc nút lưu/sửa vai trò; nút gỡ vẫn hiển thị |
| Coverage | Không đo lại trong đợt này; không suy coverage từ số test đạt |

Lệnh chạy: `npm test -- --reporter=json --outputFile=../Backend/target/member-role-readonly-tests.json`, `npm run build` trong `Frontend` (qua RTK). Báo cáo JSON là artifact local trong thư mục build. Ảnh Chrome local: `var/member-role-readonly-2026-10-25/chrome-members.png`.

Lượt chạy toàn bộ đầu tiên còn một test cũ tìm dropdown vai trò; đã thay bằng kiểm tra hành vi vòng đời ở trên rồi chạy lại toàn bộ, đạt 1.202/1.202. Không ghi nhận lượt đầu là PASS.

## Skill và review

| Skill | Áp dụng | Bằng chứng |
| --- | --- | --- |
| `frontend-patterns` | Loại state và đường sửa vai trò khỏi cả hai component, giữ luồng thêm/gỡ | Diff ba file sản phẩm và kiểm tra Chrome |
| `tdd-workflow` | Viết/cập nhật test hành vi mới trước khi bỏ điều khiển, kiểm tra hồi quy thêm/gỡ/phiên bản | Các lượt RED/GREEN và toàn bộ 1.202 test đạt |
| `code-review-and-quality` | Review độc lập các đường thêm/gỡ và loại điều khiển vai trò | Không có phát hiện bắt buộc sửa trong phạm vi này |
| `verification-loop` | Chốt test toàn bộ, build, diff và giao diện thực tế | Kết quả và giới hạn nêu trên |

Không thao tác thêm/gỡ thành viên thật khi kiểm tra Chrome; chỉ đăng nhập tài khoản demo và xem trang, có thể phát sinh phiên/nhật ký đăng nhập bình thường. Không migration, restart backend, commit, push, merge hoặc deploy. Chưa kiểm thử thao tác thêm/gỡ bằng browser trên dữ liệu thật; các luồng đó được kiểm tra bằng test frontend có API giả lập. Không đánh dấu toàn bộ UAT hệ thống hoàn tất; S11/FR-12 vẫn IN_REVIEW và Arena vẫn là kế hoạch.

## Bàn giao sau kiểm chứng

Sau checkpoint trên, người dùng yêu cầu commit và push phần thay đổi này lên nhánh hiện tại `system-design`, gồm source, test, tài liệu và ảnh Chrome kiểm chứng. Ghi chú chưa commit/push ở trên phản ánh thời điểm kiểm chứng; quyền bàn giao lần này không bao gồm merge hoặc deploy.
