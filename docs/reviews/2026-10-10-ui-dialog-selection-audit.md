# Kiểm chứng UI, popup và bộ chọn — 10/10/2026

## Kết quả

Đã sửa form quản trị dạng thẻ hẹp thành dialog có giới hạn viewport; dùng bộ chọn chung có lọc, cột Ô chọn/Tên, chọn tất cả dòng hợp lệ đang hiển thị. Các màn sử dụng: thành viên dự án, thiết bị ban đầu, revision công việc theo file, phạm vi đợt kiểm thử và coverage retest. Danh sách công việc có chọn tất cả trên trang, giữ bộ lọc nghiệp vụ đang có.

Nguyên nhân form tạo dự án trước đó: form được render trong luồng trang, chịu giới hạn `.admin-main form` 450px. Sửa bằng `AdminFormDialog` dùng chung, không chỉ mở rộng một input. Sửa thêm focus hook: dialog AI có `aria-modal=false` không được ngăn Escape/Tab của modal đang mở.

## Skill và cách áp dụng

- Đọc `prompt-master`: skill chuyên xây prompt; không áp quy trình prompt-only thay thế nhiệm vụ sửa code.
- `ui-ux-pro-max`: áp dụng hướng dẫn form, typography, responsive, focus, touch target và reduced motion trong tài liệu skill/quick reference.
- `frontend-patterns`: component dùng chung, controlled selection, bảo toàn draft qua re-render/phân trang.
- `verification-loop`: RED/GREEN, regression, build, kiểm tra trực quan và ghi giới hạn.
- Script tìm design system của UI skill không chạy được vì môi trường không có `python`/`py`; không coi lần gọi đó là kết quả thiết kế. Dùng hướng dẫn được đóng gói sẵn trong skill.

## Kiểm thử tự động

- RED trước sửa: không tìm thấy dialog tạo dự án có tên; Escape không gọi onClose khi sau modal có chat AI không modal. Sau sửa các test đều PASS.
- Test bộ chọn kiểm tra tìm tên, loại trừ dòng disabled, trạng thái chọn một phần, chọn/bỏ chọn đang hiển thị và giữ lựa chọn ngoài trang.
- Test tích hợp thành viên kiểm tra chuyển trang, lọc vai trò qua API, bỏ chọn trang hiện tại không bỏ PM trên trang khác.
- Test tích hợp thiết bị kiểm tra lọc không làm mất người nhận và ghi chú bàn giao đã nhập.
- Phản hồi cuối yêu cầu gom tìm kiếm/lọc cùng hàng: chuyển các filter bên ngoài vào slot `filters` của SelectionTable; rút gọn nhãn hiển thị, giữ accessible name và contract API. Chrome xác nhận mọi trường của mỗi hàng cùng tọa độ Y, cao36px ở desktop. CSS trước đó của `.admin-form input:not([type=checkbox])` đè chiều cao input; đã sửa specificity và đo lại, không chỉ đọc stylesheet.
- Full frontend cuối: **67 file / 736 test PASS** (`npm test -- --reporter=dot`, 18:02:58 ngày 10/10, sau toàn bộ chỉnh sửa).
- Trong quá trình sửa: bộ chọn **2 file / 4 test PASS**, QA **2 file / 97 test PASS**; sau đó chạy lại full suite như trên.
- Build cuối: **PASS**; JS 627.30kB, gzip 178.96kB. Vite còn cảnh báo chunk >500kB; đây là việc tối ưu tải trang riêng, chưa được giải quyết trong lần sửa này.
- `git diff --check`: PASS.
- Coverage cho phần UI lần này: **NOT_MEASURED**. Số test PASS không đại diện cho tỷ lệ coverage.
- Không sửa backend/schema trong phần UI này; không ghi/xóa dữ liệu nghiệp vụ để kiểm tra layout. Admin import Excel/V26 là phần trước, có báo cáo riêng.

## Kiểm tra Chrome với ứng dụng local

Backend chính 8080, frontend 5173. Tài khoản demo Admin/PM, dữ liệu đang có. Không gửi yêu cầu inference AI, không tạo dự án/case/ticket hay bàn giao/thu hồi máy trong lúc đo UI.

| Phạm vi | Viewport / thao tác | Kết quả quan sát |
| --- | --- | --- |
| Admin: tổng quan, dự án, user, thiết bị, audit, AI | 390×844 | document width không vượt viewport |
| Workspace: tổng quan dự án, tổng quan kiểm thử | 390×844 | Không tràn ngang toàn trang |
| PM: thư viện, công việc theo file, đợt test, retest, lỗi, tiến độ, phân tích, AI, thông tin dự án, thành viên, danh mục, quy tắc báo lỗi, sổ tay, Kanban, danh sách | 390×844 | document width ≤390px; bảng rộng dùng vùng cuộn |
| Tạo dự án | Desktop 1920, 1366×768; mobile 390×844 | Desktop tối đa1080px; mobile dialog366px, lề12px; header/footer còn tiếp cận được, nội dung cuộn riêng |
| Chọn thành viên | Lọc PM, chọn tất cả 6 PM trên trang; hủy | Cột chọn/tên/vai trò riêng, count/checkbox đúng; không ghi dữ liệu |
| Tạo user | 390×844 | Dialog366px, các input/nút nằm trong khung |
| Nhập/sửa máy, bàn giao, thu hồi | 390×844 | Cả4 dialog rộng366px, không vượt viewport; form dài cuộn trong khung |
| Công việc thường/QA | 390×844, landscape844×390 | Header hiện, form cuộn; landscape dialog796×342px trong viewport |
| Danh sách công việc | 768×1024 | Không tràn ngang toàn trang |
| Import Excel, tạo case, tạo nhóm | 768×1024 | Import/case rộng728px, nhóm500px; trong viewport |
| Thêm revision từ chi tiết case | 390×844 | Dialog374px, chiều cao khoảng802px; nằm trong viewport |
| Chi tiết file và phân công | 390×844 | Form phân công không tràn; không gửi thay đổi |
| Phân công run và quyết định NA | 390×844 | Dialog370px; phân công cao391px, NA329px; không gửi thay đổi |
| Bộ lọc thành viên/máy sau phản hồi cuối | Desktop1920, mobile390×844 | Desktop tìm257/260px, vai trò100px, hiển thị128px; tất cả cao36px và cùng Y. Mobile44px, thanh lọc không tràn |
| User/thiết bị/audit sau compact | Mobile390×844, laptop1366×768 | Không tràn trang; audit desktop field cao36px, project280px, field200px; xuống hàng khi thiếu chỗ |
| Tester: việc cần xử lý, chi tiết file, lịch sử, tạo QA | Laptop1366×768, mobile390×844 | Trang ≤viewport; QA370×824px, cuộn nội dung; nhãn tài liệu/công việc/lượt/phiên bản thay key kỹ thuật; không tạo QA |
| Dev: công việc và bộ lọc nâng cao, chọn dự án, AI/chat, phân tích, file, thư viện | Mobile390×844, laptop1366×768 | Không tràn toàn trang. Chat374×740px nằm trong viewport; AI tìm280×36px, report filter220×36px. Bộ lọc file hai hàng riêng, các trường cùng Y sau sửa căn hàng |

Đã đọc route/component/CSS cho các nhóm màn đang dùng và các vị trí checkbox chọn nhiều. Những checkbox đơn như “Được giao cho tôi”, xem lịch sử hay bộ lọc lỗi không đổi thành bảng chọn. Các trang prototype cũ không còn được route sử dụng không nằm trong claim kiểm thử trình duyệt.

## Giới hạn và việc còn lại

- Đây là kiểm tra Chrome emulated viewport, chưa thay thế Safari/iOS/Android và bàn phím ảo trên máy thật.
- Không khẳng định đã kiểm tra mọi tổ hợp dữ liệu dài, phân quyền, lỗi mạng và mọi popup lồng nhau bằng trình duyệt. Regression tự động đã chạy cho toàn frontend; browser audit tập trung Admin/PM, bổ sung các màn đại diện Tester/Dev. Demo Dev không có ticket ở dự án đang chọn; không suy từ empty state rằng form xử lý ticket đã được nghiệm thu live.
- Dialog import đã kiểm tra bố cục; upload file qua extension còn gate quyền file URL được ghi ở báo cáo Admin Excel. Không gọi đây là upload E2E browser thành công.
- AI live và xác thực OAuth vẫn là gate riêng. Không gửi dữ liệu dự án sang model trong audit UI.
- Còn cảnh báo kích thước bundle. Có thể xử lý tách bundle theo route trong tác vụ hiệu năng riêng.
- Thay đổi ở local `system-design`; không commit/push/merge/deploy. Không đánh dấu S11 DONE từ lần kiểm tra UI này.
