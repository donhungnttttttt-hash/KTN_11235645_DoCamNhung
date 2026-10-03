# Review chức năng và cải thiện UI — 04/10/2026

Nhánh: `system-design`. Phạm vi: kiểm tra các luồng hiện có và sửa lỗi UI có bằng chứng; không thay quy trình PM/Tester, không migration, không ghi/xóa dữ liệu nghiệp vụ. Giữ các thay đổi con lăn và ô kết quả từ lượt trước.

## Thiết kế áp dụng

Bounded: tiếp tục bố cục đã được người dùng duyệt, gồm sidebar xanh có menu con và bảng test case dạng Excel. Màn ghi kết quả phải cho biết kết quả hiện hành, phần nhập lần chạy mới và lịch sử. Người dùng chọn kết quả/build, nhập trường bắt buộc rồi lưu; lỗi tải lịch sử phải thử lại độc lập và không làm mất bản nháp.

Desktop dùng hai cột nội dung case / nhập kết quả; màn hẹp xếp một cột, cuộn trong dialog và giữ nút lưu dễ thấy. Tăng độ tương phản trong bảng màu xanh hiện có, không thay thành dashboard thẻ lớn hoặc đưa màn chẩn đoán lên web.

## Phát hiện và xử lý

| Mức | Phát hiện / bằng chứng | Kết quả |
| --- | --- | --- |
| P2 | `AttemptDialog`, `AssignmentDialog`, `CycleDecisionDialog` chưa quản lý focus/Escape. Browser tái hiện Escape không đóng hộp thoại ghi kết quả. | Đã dùng `useDialogFocus`, Tab giữ trong dialog, Escape đóng khi không lưu và trả focus về nút mở. |
| P2 | Hộp thoại chồng nhau có thể cùng nhận Escape, đặc biệt luồng gắn bug từ lịch sử NG dùng một modal khác. | Đã chỉ xử lý dialog trên cùng, bỏ qua dialog trong vùng hidden/inert. Có regression cho hai dialog cùng hook và dialog liên kết công việc. |
| P2 | Lỗi tải lịch sử thực thi dùng chung lỗi lưu, không có thử lại; khi đổi trang có thể còn dữ liệu trang cũ. | Tách lỗi/trạng thái tải lịch sử, nút thử lại riêng, xóa dữ liệu cũ trong lúc tải. Bản nháp giữ nguyên. Snapshot lịch sử rỗng được xử lý an toàn. |
| P2 | Các trường vẫn sửa được trong khi request lưu đang chạy, làm nội dung màn hình khác payload vừa gửi. | Khóa fieldset khi lưu; giữ chặn lưu lúc conflict/chưa có quyền; không đóng bằng Escape khi đang gửi. |
| P2 | Chuyển từ danh sách công việc sang đợt kiểm thử vẫn giữ tiêu đề tab “Danh sách công việc”. | Đồng bộ tiêu đề tại App theo route, gồm thư viện, tài liệu, đợt, retest, báo cáo, cài đặt. |
| P2 | Sidebar trắng trên xanh cũ có độ tương phản khoảng 2,68:1; nút xanh/trắng khoảng 2,50:1. | Đổi xanh sidebar sang `#147e75` (4,92:1 với trắng), nút chính `#0f766e` (5,47:1). Giữ cấu trúc/menu đã duyệt. Không suy ra toàn ứng dụng đạt WCAG từ hai phép đo này. |
| P3 | Footer/title/login còn thương hiệu, bản quyền và phiên bản CATEST/SHIFT/Flutter từ mẫu. | Đổi vùng nhận diện đang dùng sang TMS, bỏ phiên bản và thông tin hỗ trợ giả. |
| P3 | Hộp thoại chưa nói rõ kết quả hiện hành và điều kiện bắt buộc khi nhập NG/P. | Thêm thanh kết quả hiện tại, giải thích mỗi lần lưu tạo lịch sử, hướng dẫn trường bắt buộc, nút lưu nhìn thấy trong vùng nhập; cỡ chữ/nút rõ hơn ở màn hẹp. |
| P1 — còn mở | `TestCaseWorkbook.java:36` từ chối mọi merged region, không xét cột/vị trí. File khách hợp lệ có ô gộp vẫn bị chặn. | Chưa sửa parser trong lượt UI này. Cần test workbook có ô gộp, phân biệt gộp tiêu đề/gộp nội dung và ID; giữ byte nguồn/export, không tự nhân đôi case hoặc gán nhầm dữ liệu. Đây là ưu tiên chức năng tiếp theo. |
| P3 — còn mở | `HomePage.jsx` lưu yêu thích hoạt động trong `useState`; reload mất đánh dấu, chưa có API lưu. | Không coi đây là tính năng lưu yêu thích hoàn chỉnh. Cần chốt bỏ nút hoặc lưu theo người dùng trước khi đưa vào nghiệm thu. Chưa tự thêm bảng/API. |

## Kiểm tra chức năng đang có

Đối chiếu router, component/API gọi và native browser qua frontend 5173/backend 8080/MySQL native. Browser dùng Admin local và các dự án demo có sẵn:

- Tổng quan dự án: tải hoạt động và thống kê 72 công việc.
- Danh sách công việc: trang đầu 50/72, chuyển trang sau 22/72.
- Quản lý lỗi: hiển thị 32/32 bug.
- Đợt kiểm thử: 4 đợt, gồm nháp/đang chạy/đã chốt, phạm vi 40/80 lượt.
- Kiểm thử lại: bộ lọc “Được phân công cho tôi” trả rỗng có thông báo; không coi rỗng là lỗi, chưa ghi retest mới bằng tài khoản Tester trong lượt này.
- Tiến độ/phân tích: tải KPI và dữ liệu nguồn 200 lượt, 4 trang; không có alert lỗi tải trong hai màn.
- Thành viên: tải danh sách và phân biệt rõ thêm thành viên dự án với quyền tạo tài khoản hệ thống.
- File demo số 5: bấm ô kết quả mở dialog; hiển thị OK hiện tại cùng ba lần chạy có sẵn. Focus vào Đóng, Escape đóng và trả focus về ô kết quả. Không ghi thêm attempt trong lượt này.
- Trang quản lý lỗi và dialog kết quả: đo 320, 768, 1024, 1440px không tràn ngang toàn trang/dialog; bảng rộng vẫn cuộn riêng. 390×844: cuộn dialog bằng con lăn thật tới `scrollTop=671.2`, Escape hoạt động; đã reset viewport sau thử.

Đọc `ExecutionService.record`: backend vẫn kiểm membership, người được phân công, version, đợt ACTIVE, NA, build/context, whitelist OK/NG/P và trường bắt buộc. Đây là đối chiếu code; không thay thế kiểm thử tích hợp phân quyền/transaction trên schema độc lập. Không đổi API/quyền hoặc coi Admin tự có quyền ghi mọi case.

## Kiểm chứng

- TDD: 6 test mới thất bại trước sửa (focus ba dialog, retry lịch sử, khóa input khi lưu, nested Escape). Sau đó thêm hai regression RED riêng cho modal liên kết bug và tiêu đề route; đã GREEN.
- Full frontend: **256/256 test, 30 file PASS**, có coverage.
- Sau tinh chỉnh vị trí nút lưu: chạy lại **57/57 test liên quan, 6 file PASS** và build PASS. `git diff --check` PASS.
- Coverage riêng `AttemptDialog.jsx` + `useDialogFocus.js`: statements **92,18%**, branches **85,84%**, functions **89,65%**, lines **97,14%**. Không đại diện coverage toàn hệ thống.
- Build frontend PASS, 1666 module. Không thêm dependency.
- Không có script lint/TypeScript trong dự án JavaScript này; không báo hai gate đó đã chạy.
- Backend không đổi; không chạy test ghi/xóa lên `tms`, không restart backend chỉ vì sửa frontend.
- Ảnh local (thư mục output được ignore): `output/playwright/2026-10-04-result-ui-desktop.jpg`, `output/playwright/2026-10-04-result-ui-mobile.jpg`.

## Skill và giới hạn kết luận

Đã đọc nhóm skill người dùng chỉ định. Áp dụng brainstorming cho phân loại bounded/bố cục hiện có; ui-styling + frontend-ui-engineering cho responsive/focus/trạng thái form; ui-ux-pro-max tra local UX về focus, bảng rộng, focus không bị che; ponytail dùng helper có sẵn và không thêm thư viện. ponytail-debt quét marker trong repository không tìm thấy khoản nợ được gắn marker; điều đó không có nghĩa dự án không còn thiếu sót.

ECC (tên bộ skill đang cài trong repo): frontend-patterns, tdd-workflow, code-review-and-quality, security-review (input/quyền của luồng liên quan), verification-loop. `prompt-master` đã đọc nhưng task không phải viết prompt nên không tạo prompt thay cho sửa code.

S11 vẫn **IN_REVIEW**. Còn hỗ trợ Excel gộp ô, quyết định yêu thích, schema tích hợp độc lập, UAT theo vai trò và pilot. Lượt này không chứng nhận mọi chức năng đã đạt chuẩn hoặc toàn bộ dự án sẵn sàng production. Không commit/push/merge/deploy.
