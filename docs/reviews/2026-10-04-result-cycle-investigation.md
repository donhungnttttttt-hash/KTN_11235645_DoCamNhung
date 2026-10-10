# Khôi phục thao tác đổi kết quả ngay trên ô — 04/10/2026

**Quyết định mới sau báo cáo này:** người dùng đã chọn tự lưu trạng thái vào tài liệu và xuất bản cập nhật. Phần kết luận “chỉ lưu state giao diện” bên dưới là lịch sử, đã được thay bằng V13/API/history. Xem [báo cáo lưu kết quả và kết nối chức năng](2026-10-04-document-results-and-wiring.md).

Yêu cầu mới: mặc định Unexecuted; bấm một lần chuyển OK → P → NG → Fixed → NA. Ô kết quả không mở hộp thoại nhập; Lịch sử / chứng cứ là thao tác riêng.

## Truy vết

- `develop:Frontend/src/app/pages/TestRunnerGridPage.jsx`: `toggleStatus` tăng chỉ số STATUS_CYCLE, chỉ dùng React useState. Thứ tự cũ là Unexecuted → OK → NG → P → Fix → NA; thứ tự người dùng yêu cầu mới ưu tiên P trước NG và nhãn Fixed.
- Code hiện tại `TestDocumentPage` gọi cùng `execution.show(row)` cho ô kết quả và nút lịch sử; `DocumentExecutionControls` mở AttemptDialog. Đây là nguyên nhân tương tác khác mẫu cũ, không phải lỗi bắt click.
- Backend `ExecutionDtos.Attempt`/`ExecutionService.record`: OK/NG/P; NG bắt buộc actualResult, P bắt buộc reason, ghi theo assignee/build/ACTIVE/version/requestKey. Fixed thuộc bug/retest; NA là quyết định PM có lý do theo ADR-008. Không có API reset attempt về Unexecuted. Không được âm thầm dùng vòng React state làm kết quả đã lưu.

## Phiên bản trung gian — đã thay thế theo phản hồi tiếp theo

Người dùng yêu cầu thực hiện. Theo phương án đã thông báo: chọn trên ô rồi bổ sung/lưu ngay dưới dòng, giữ quy tắc nghiệp vụ hiện hành. Không diễn giải sự chấp thuận chung thành bỏ quyền/điều kiện P/NG/Fixed/NA.

- `ResultCycleButton` đã nối vào `TestDocumentPage`: Unexecuted → OK → P → NG → Fixed → NA → Unexecuted; hỗ trợ bàn phím, không mở modal. Chưa có lượt chạy hiển thị Unexecuted; chọn đợt/cấu hình thì hiển thị kết quả đã lưu. Excel nguồn và lịch sử không bị reset.
- `InlineResultEditor` lưu OK/P/NG qua API hiện có, đúng build/assignee/version/requestKey. P yêu cầu lý do, NG yêu cầu kết quả thực tế; nhãn Chưa lưu phân biệt lựa chọn với kết quả thật. Lỗi mạng giữ bản nháp và requestKey khi thử lại; lỗi 409 yêu cầu tải bản hiện hành trước khi lưu lại, giữ nội dung đã nhập.
- NA lưu qua scope API dành cho PM, có lý do; khôi phục phạm vi trước khi ghi lại. Fixed dẫn sang quản lý lỗi vì còn phải xác nhận build sửa/retest. Unexecuted không xóa lần chạy đã lưu. Các giá trị này không được giả lập như sáu verdict độc lập ở database.
- Lịch sử / chứng cứ mở AttemptDialog ở chế độ xem; thao tác ghi kết quả nằm tại dòng. Khi đang lưu khóa ô, context, bộ lọc/phân trang và thao tác NA để tránh đổi đích ghi.
- Tổng quan ghi rõ số đếm từ Excel nguồn; bộ lọc bảng theo kết quả thực thi. Không đổi backend/schema, không ghi thử/xóa dữ liệu TMS; chưa commit/push.

## Kiểm chứng phiên bản trung gian

- Skills: frontend-patterns, tdd-workflow, verification-loop. Bảy test hành vi RED trước khi nối màn; đã thêm tổng cộng 13 test tích hợp frontend và 3 test nút.
- Full frontend `npm run test:coverage -- --maxWorkers=2 --reporter=dot`: **292/292 tests, 35 files PASS**. Lần chạy mặc định đầu tiên có 2 timeout 5 giây ở test cũ do chạy đồng thời; chạy lại giới hạn worker PASS, không tăng timeout hay bỏ test.
- Coverage toàn FE: statements 80.34%, branches 74.18%, functions 71.96%, lines 75.98%. Riêng InlineResultEditor: 92.5% statements / 89.65% branches / 86.66% functions / 95.12% lines. Không quy coverage này thành xác nhận toàn hệ thống hết lỗi.
- `npm run build` và `git diff --check` PASS. Test bao gồm lưu/remount, P/NG validation, NA/restore, conflict, retry, khóa khi lưu, cancel, assignee khác, đợt đóng, thiếu context và lịch sử riêng. Đây là kiểm thử API mock, chưa phải ghi dữ liệu qua backend thật cho thay đổi này.
- Cổng 5173/8080 đang lắng nghe. Chrome đăng nhập tài khoản tester thành công nhưng tài khoản đó chưa có dự án; sau đó kết nối điều khiển trình duyệt bị ngắt (debugger unattached), chưa kiểm chứng trực quan cuối và chưa có ảnh bàn giao. Không báo browser PASS.
- S11 vẫn IN_REVIEW theo các gate isolated integration/UAT/pilot còn lại.

## Phiên bản hiện hành — bấm đổi liên tục như develop

Người dùng yêu cầu bỏ toàn bộ phần dưới dòng, chỉ đổi liên tục trong ô và quy định màu. Đã đọc lại `develop:Frontend/src/app/pages/TestRunnerGridPage.jsx` (`toggleStatus`, `getStatusClass`, `getIpadCellBgClass`): trạng thái là React state, không có API lưu.

- Bỏ InlineResultEditor và các test của form đã bị thay thế; không còn hàng thêm, nhãn Chưa lưu ở từng ô, nút lưu hay mở context khi bấm ô. Mỗi case có state riêng, dùng chung cho chữ/viền/nền/bộ lọc; không mất lựa chọn khi bấm case khác hoặc đổi trang trong bảng.
- Vòng Unexecuted → OK → P → NG → Fixed → NA → Unexecuted. OK xanh dương, P vàng, NG đỏ, Fixed xanh lá, NA xám. Chữ/viền còn màu khi tắt tô nền.
- Đây là lựa chọn tại giao diện giống develop, chưa ghi vào đợt kiểm thử; có chú thích một lần trên thanh hướng dẫn. Reload/đổi context sẽ về trạng thái thực thi đã lưu hoặc Unexecuted. Không ghi đè Excel nguồn, không bỏ quy tắc backend. Lịch sử / chứng cứ vẫn là nút riêng.
- TDD: 3 bài RED trước sửa (màu ô chưa đổi, mất lựa chọn khi bấm dòng khác, thiếu phân biệt lựa chọn với dữ liệu thật). Sau sửa full **284/284 tests, 35 files PASS**, build và diff check PASS. Số test giảm vì bỏ 13 bài của form trung gian, thêm 5 bài cho hành vi mới. Coverage hai file TestDocumentPage/ResultCycleButton: statements94.52%, branches84.07%, functions89.65%, lines97.6%; không đại diện toàn hệ thống.
- Chrome local: đăng nhập Admin local, mở demo document5, bấm đủ vòng; kiểm tra DOM mỗi trạng thái luôn1dòng,0dialog, màu chữ/viền/nền đúng. Ảnh `output/playwright/direct-result-cycle.png`. Không ghi dữ liệu nghiệp vụ khi thử vòng. Kết nối browser lần này hoạt động lại; không còn blocker của bản trung gian.
- Skills frontend-patterns/tdd-workflow; không BE/schema/commit/push; S11 giữ các gate integration/UAT/pilot.
