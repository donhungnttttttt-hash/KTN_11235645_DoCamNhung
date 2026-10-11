# Rà soát nút thao tác và sửa bàn giao máy — 11/10/2026

Phản hồi mới: chọn 20 máy nhưng không bấm được “Bàn giao máy đã chọn”; kiểm tra các thao tác im lặng trên toàn source. Nhánh `system-design`, giữ cây làm việc đang có. Không commit/push/merge/deploy; S11 giữ `IN_REVIEW`.

## Nguyên nhân chính và sửa chữa

Popup bàn giao khóa nút khi bất kỳ máy nào chưa có người nhận. Danh sách thông tin người nhận nằm sau bảng chọn máy, trong khi footer dính ở cuối popup vẫn hiện nút bị khóa. Không có giải thích cạnh nút nên chọn 20 máy trông như đã hoàn tất nhưng không thể tiếp tục.

- Thêm **Người nhận chung → Áp dụng cho N máy đã chọn** trước bảng; người dùng vẫn đổi riêng từng máy. Áp dụng là thao tác rõ ràng, không tự chọn người nhận.
- Hiện số máy thiếu người nhận, nút **Điền người nhận còn thiếu** đưa focus đến đúng ô.
- Nút bàn giao nhận thao tác khi đã chọn máy, kiểm tra toàn bộ người nhận trước khi ghi. Thiếu dữ liệu hiện lỗi có focus; không giao một phần chỉ vì người nhận ở cuối danh sách chưa điền.
- Hiện đang bàn giao/thành công/lỗi trong vùng nút. Khóa bấm lặp và điều hướng nhập máy khi đang ghi. Nếu API lỗi giữa chừng, chỉ bỏ những máy đã thành công, giữ phần còn lại để xử lý.
- Áp dụng chung picker cho cả tạo dự án và bổ sung máy. Không thay quyền Admin, ràng buộc người nhận hợp lệ hoặc tình trạng máy.

## Các lỗi bổ sung đã sửa

| Nhóm | Lỗi được xác nhận | Sửa |
|---|---|---|
| Bàn giao một máy từ kho | Khóa nút khi thiếu dự án/người nhận mà không giải thích | Kiểm tra có thông báo và focus; giữ bản nháp khi lỗi; kiểm tra tài khoản/thành viên hợp lệ |
| Tạo dự án / tài khoản / máy / tài liệu / quy tắc | Native validation chặn gửi mà thiếu thông báo trên form dài | Thêm thông báo trường bắt buộc/định dạng; giữ kiểm tra gốc và focus trường của trình duyệt |
| Danh mục | Chuỗi toàn dấu cách qua required rồi bị trim thành rỗng trước API | Chặn trước API, báo tên trường và focus đúng ô |
| Tài khoản, kho máy, danh mục, sổ tay, quy tắc | Lưu/khóa/cấp quyền/lưu trữ/publish thiếu xác nhận hoàn thành | Hiện thông báo sau phản hồi thành công; giữ phản hồi lỗi và chống kết quả cũ ghi đè ngữ cảnh mới |
| Tài khoản hiện tại | Nút tự khóa bị khóa không giải thích | Thêm mô tả truy cập rõ lý do; không bỏ guard |
| Tạo test case | Lưu từ tab JP khi trường VI bắt buộc đã unmount gửi payload thiếu VI | Trở lại tab VI, thông báo có role alert/focus, không gọi API; lỗi lặp hoặc lỗi API cũng có focus, giữ bản nháp |
| Retest | Có thể đóng yêu cầu trong khi kết quả đang ghi | Khóa đóng trong lúc ghi để không mất callback cập nhật |
| Ticket | Lưu thông tin/tham chiếu/nội dung làm rõ thiếu pending/success, lỗi xa nút | Phản hồi cạnh thao tác, khóa gửi trùng, giữ phục hồi xung đột |
| Bình luận/lịch sử | Trang đủ 50 mục nhưng trang sau rỗng để lại nút bấm không đổi gì | Thông báo đã hết dữ liệu, dừng phân trang, hiện tải/lỗi; lọc trùng/kết quả cũ |
| Chứng cứ | Tải chậm không phản hồi, nhận nhiều lần bấm | Hiện đang tải, chặn tải trùng, xác nhận chuyển file cho trình duyệt; lỗi có thể thử lại |
| Kanban | Menu cho “chuyển” sang đúng trạng thái hiện tại, handler bỏ qua | Yêu cầu chọn trạng thái khác, giải thích điều kiện ngay tại thao tác |
| Tổng quan | Tải quyền lỗi chỉ làm nút Tạo bị khóa | Hiện lỗi tải quyền và cách thử lại, giữ kiểm soát quyền |
| AI workspace/chat | Tìm nguồn lại cùng từ khóa sau lỗi mạng không chạy effect | Mỗi thao tác tìm thực sự thử lại; có trạng thái tải/lỗi. Giữ nguyên request key của yêu cầu sinh nội dung đang chờ |

## Phạm vi rà soát source

Kiểm kê bằng AST **140 file frontend ngoài test**, **132 file trong cây import từ entry**, **393 khai báo HTML button**, trong đó **368 thuộc cây import**. Không tìm thấy ứng viên button thiếu cả handler lẫn đường submit hợp lệ. Đây là kiểm tra cấu trúc; không chứng minh mọi handler làm đúng, nên tiếp tục đọc luồng và viết test hành vi.

Các nhóm đã đối chiếu handler, điều kiện khóa, validation, pending, lỗi, retry và hoàn thành:

- Admin: project/member/lifecycle, user, kho máy/bàn giao/thu hồi, audit, bộ chọn và phân trang, báo cáo PM.
- Project: general, catalog, handbook, rules; điều hướng project và danh mục.
- Test: thư viện, case/suite, import, bảng tài liệu/kết quả/sửa ô/lịch sử/test lần 2; cycle/scope/runner/attempt; file/source/range/session/inbox; retest/coverage/closure.
- Work: board/list, ticket/edit/reference/comment/history/evidence/transition; QA/handoff; dashboard/progress/report/export/inbox.
- Auth/AI: login/retry/logout/session; nguồn/model/kết nối/hủy/ngắt, tìm nguồn, sinh/lưu/copy/history/chat. Không gọi model trả phí hoặc thực hiện OAuth live trong đợt rà soát.
- Backend: đối chiếu API đang dùng, ràng buộc/transaction bàn giao, API đọc lại, tìm stub/nhánh bỏ qua và các nhóm exception/null có chủ đích. Chạy compiler và hồi quy unit/native; không thay production Java hoặc migration trong lần này.

Inventory local: `var/ui-audit/action-button-inventory.json`. Rà source không tương đương đã bấm tay mọi nút dưới mọi tổ hợp dữ liệu/vai trò.

## Bằng chứng kiểm tra

- RED → GREEN: 3 tình huống bàn giao 20 máy/thiếu người nhận/kiểm tra cả batch; 14 admin/project regression mới (12 tái hiện đỏ, 2 bổ sung luồng lỗi/giữ dữ liệu); 11 work/AI regression; tạo case JP, retest pending close và focus lỗi case.
- **Frontend toàn bộ: 822/822 test, 75 file PASS**. Build PASS; còn cảnh báo bundle Vite >500 kB. Log `buttons-frontend-full.log`, `buttons-build.log` trong `var/ui-audit/`.
- **Native + unit bàn giao: 16/16 PASS**. Test native tạo 20 máy trong transaction trên `tms_docstest_bab5ba2349be`, gọi API bàn giao từng máy, đọc lại đủ 20 máy mới với người nhận, gửi trùng bị 409; rollback fixture sau test. Log `buttons-native.log`.
- Hồi quy unit backend diện rộng: **547/547 PASS**, `buttons-unit.log`; không dùng số lượt có test trùng để cộng tổng test độc lập.
- Eclipse JDT: **262 source / 0 lỗi / 0 cảnh báo**; không tắt null analysis. Contract/reference checker PASS, `git diff --check` PASS.
- Coverage đo riêng **9 component admin/project**: statements **87.97%**, branches **85.42%**, functions **87.73%**, lines **95.45%**. Artifact `var/ui-audit/frontend-button-coverage/coverage-summary.json`. Không phải coverage toàn bộ thay đổi/app; các phần khác không đo lại coverage lần này.

## Kiểm tra trực tiếp browser

Chrome local, tài khoản demo Admin và dự án có sẵn:

1. Mở popup, chọn cả trang 20 máy; bấm bàn giao khi chưa có người nhận: nhận lỗi “20 máy chưa có người nhận hợp lệ”, focus nằm trên thông báo.
2. Bấm Điền người nhận còn thiếu: focus tới select của máy đầu tiên chưa có người nhận.
3. Chọn người nhận chung và áp dụng 20 máy: cả 20 select hợp lệ, lỗi cũ biến mất; nút bàn giao hoạt động. Không bấm gửi dữ liệu đủ điều kiện trên `tms`; hành vi ghi được xác minh qua API/MySQL riêng ở trên.
4. 1366×900: popup clientWidth/scrollWidth cùng 1080. 390×844: cùng 366, nút trong viewport, cao 44px. Reset viewport; hủy bản nháp kiểm tra.

Hai lần chụp ảnh gặp timeout `Page.captureScreenshot` của công cụ. Bằng chứng browser ở lần này là DOM/accessibility, focus và kích thước phần tử; không có ảnh mới để khẳng định review trực quan mọi màn hình. Không dùng ảnh lần trước thay cho bằng chứng lần này.

## Bàn giao

Skill đã dùng: `ui-ux-pro-max`, `code-review-and-quality` (review theo nhóm module), `frontend-patterns`, `tdd-workflow`, `verification-loop`; giữ hướng dẫn stack/quyền trong repository. Hướng dẫn thao tác bàn giao được cập nhật trong [luồng dự án → kiểm thử](../user-guides/project-testing-workflow.md).

Các lỗi xác nhận ở trên đã sửa và có kiểm chứng. S11 vẫn `IN_REVIEW`; UAT trên dữ liệu/vai trò thực, thiết bị thật, tích hợp AI/Redmine live và NFR production giữ riêng. Không đánh dấu toàn sản phẩm hết lỗi dựa trên kiểm kê hoặc số test. Không ghi fixture vào database đang sử dụng, không restart dịch vụ chính, không commit/push.
