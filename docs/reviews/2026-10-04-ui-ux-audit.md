# Rà soát UI/UX và chuẩn bị push system-design — 04/10/2026

## Phạm vi và quyết định

Người dùng yêu cầu dò từ code, sửa UI/UX hiện có rồi push nhánh `system-design`. Tiếp tục thiết kế đã duyệt: sidebar có menu con, bảng test case kiểu Excel, ghi kết quả theo đợt/cấu hình và lịch sử thật. Không đổi backend, schema, quyền PM/Tester hoặc tự tạo phạm vi kiểm thử. Gộp các sửa cuộn chuột, ô kết quả và dialog đang có trong working tree vào cùng đợt bàn giao.

Đã đọc `prompt-master`, `brainstorming`, `ui-ux-pro-max`, `ui-styling`. Brainstorming phân loại bounded; giữ bố cục đã duyệt và sửa hành vi có bằng chứng. UI/UX tra local guideline về keyboard, loading/error/retry và responsive. ECC áp dụng frontend-patterns, tdd-workflow, code-review-and-quality, security-review và verification-loop từ đợt review liên tục. Prompt-master dành cho viết prompt nên không tạo prompt thay cho sửa code.

## Lỗi đã sửa thêm

| Phát hiện | Xử lý |
| --- | --- |
| Chọn dự án không đóng bằng Escape/Tab ra ngoài; menu tài khoản làm mất focus khi đóng. | Đóng đúng thời điểm, trả focus về nút mở, có trạng thái mở và dự án hiện tại. |
| Thu gọn sidebar ở desktop rồi mở ở mobile làm thiếu menu con. | Drawer mở đầy đủ, focus nằm trong menu, Escape/nút Đóng/chọn mục đóng menu; nội dung phía sau inert. Nút Đóng cũng hiện trên màn tài liệu ở desktop. |
| URL tài liệu có `?caseId=...` không được nhận diện là màn bảng toàn chiều rộng. | Nhận diện theo pathname, giữ query để mở đúng case. |
| Modal công việc dùng bộ xử lý Tab riêng có thể chọn nút disabled cuối danh sách. | Dùng chung useDialogFocus, giữ xử lý dialog trên cùng. |
| Chi tiết test case đang tải không có nút đóng; tải lỗi vẫn hiện Dự thảo và nút sửa dù chưa có dữ liệu. | Giữ khung dialog/Đóng/Escape khi tải, thông báo status/alert và Thử lại; không hiển thị dữ liệu revision giả. |
| Phản hồi case cũ có thể ghi đè case mới khi đổi nhanh. | Tách vòng đời theo project/case và bỏ phản hồi request cũ; reset draft cùng case. |
| Form revision/tạo dự án còn sửa được trong lúc gửi. | Khóa trường và chặn gửi lặp, giữ bản nháp nếu API lỗi; cho phép thử lại. |
| Tên dự án dài, nhóm nút/lịch sử revision và dialog tạo dự án dễ tràn màn nhỏ hoặc màn thấp. | Giới hạn tên/popup, xuống dòng toolbar/lịch sử, cuộn dialog trong chiều cao viewport. |
| Nút yêu thích chỉ đổi state rồi mất khi reload. | Bỏ thao tác chưa có lưu trữ khỏi tổng quan; giữ mở công việc/bình luận. Không thêm bảng hoặc API. |
| Nút chính ở login, công việc và cài đặt dùng các màu khác nhau, badge nhỏ khó đọc. | Dùng chung màu teal đậm cho nút chính, tăng tương phản badge đã duyệt/dự thảo. Không tuyên bố toàn ứng dụng đạt WCAG. |

Các sửa trước trong cùng working tree: native wheel, ô kết quả mở dialog, tải lại lịch sử giữ draft, quản lý focus ba dialog thực thi, tiêu đề tab theo route, nhận diện TMS, bố cục ghi kết quả desktop/mobile. Chi tiết tại `2026-10-04-functionality-ui-review.md` và hai báo cáo 03/10.

## Kiểm chứng

- RED → GREEN: 6 regression menu/modal, 3 regression tải chi tiết/đổi case, 1 regression yêu thích không lưu và 1 regression khóa form tạo dự án. Bổ sung luồng chọn dự án/tạo dialog/trả focus, PM xác nhận phê duyệt và retry, lưu revision giữ bản nháp/expectedCurrentRevisionId, ngôn ngữ và lịch sử lỗi.
- Final toàn bộ frontend: **271/271 test, 33 file PASS**. Lệnh dùng `npm run test:coverage -- --maxWorkers=2` cùng sáu `--coverage.include` bên dưới.
- Coverage chỉ sáu file `CaseDetailModal`, `ProjectSelector`, `CreateProjectDialog`, `MainLayout`, `useDialogFocus`, `AttemptDialog`: **93,84% statements; 87,66% branches; 90,54% functions; 96% lines**. CaseDetailModal đạt 100% lines; không suy ra coverage toàn frontend/backend.
- Một lần chạy coverage song song build có test `restores detail navigation...` vượt 5 giây. Chạy lại với 2 worker: 267/267 PASS; sau bổ sung kiểm thử luồng revision, final 271/271 PASS. Không nới timeout hoặc bỏ test để lấy kết quả xanh.
- `npm run build`: PASS, 1666 module, không thêm dependency. Không có script lint/TypeScript nên không báo đã chạy.
- `git diff --check`: PASS. Kiểm tra ứng viên commit với 9 giá trị secret local: không trùng; không phát hiện private key. Không thêm `.env`, log runtime, workbook khách hoặc ảnh output vào commit.
- Backend không đổi, không restart vì thay FE; không chạy fixture ghi/xóa lên `tms`.

## Kiểm tra trình duyệt thật

- Dùng Vite5173/backend8080 và dữ liệu demo MySQL native, không ghi mới nghiệp vụ trong đợt này.
- Dò layout tại 320px trên tổng quan, bảng/thêm công việc, thư viện/tất cả case, đợt, retest, tiến độ/phân tích và các mục cài đặt. Đây là kiểm tra tải/layout, không thay thế UAT toàn bộ nút và mọi vai trò.
- Mobile320: mở/đóng menu bằng Escape, focus trả nút mở; thu gọn desktop → mobile vẫn đủ nhóm/con; chọn Đợt kiểm thử tự đóng drawer và tải 4 đợt thật, pageWidth=320, không alert.
- Tạo dự án ở 320×480: dialog nằm y=12…468, nội dung cuộn thật từ 0 lên 31,2px, nút lưu nằm trong viewport; không submit dữ liệu.
- Chi tiết case ở 390×844: toolbar/lịch sử xuống dòng, body scrollWidth bằng clientWidth, không tràn ngang; ảnh đã xem lại.
- Desktop1440×900: tài liệu5 với query case405 mở chi tiết đúng; bảng giữ toàn chiều rộng; menu nổi có nút đóng; bấm ô kết quả mở form và hiển thị OK hiện tại cùng 3 bản ghi lịch sử. Không lưu thêm attempt. Console cuối lần kiểm tra không có warn/error được thu thập. Đã reset viewport.
- Ảnh local được ignore: `output/playwright/2026-10-04-case-detail-mobile.jpg`, `2026-10-04-navigation-mobile.jpg`, `2026-10-04-ui-audit-desktop.jpg`.

## Còn lại và bàn giao

- S11 vẫn **IN_REVIEW**: cần UAT theo vai trò, pilot và kiểm thử tích hợp native trên schema độc lập.
- Importer vẫn từ chối mọi ô gộp (`TestCaseWorkbook.java`); đây là lỗi chức năng còn mở, cần sửa bằng test workbook và kiểm chứng dữ liệu nguồn/export, không coi các sửa UI đã giải quyết parser.
- Phát hiện yêu thích tạm trong báo cáo trước đã được xử lý bằng bỏ nút; chưa triển khai tính năng yêu thích có lưu trữ.
- Người dùng đã cho phép commit/push lên `system-design` cho tác vụ này. Quyền này không tự mở rộng thành merge/deploy hoặc tự push mọi sprint sau. Mã commit và kết quả remote được xác minh sau khi commit/push trong phản hồi bàn giao.
- Không có bằng chứng để cam kết “không còn bất kỳ lỗi nào”; kết luận chỉ trong phạm vi code, regression và màn đã kiểm chứng ở trên.
