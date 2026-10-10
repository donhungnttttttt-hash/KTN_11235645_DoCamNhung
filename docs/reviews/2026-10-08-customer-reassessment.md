# Đánh giá khách hàng lần hai và lưu trữ dự án — 08/10/2026

## Phạm vi và nhận định

Người dùng duyệt lựa chọn quy tắc tốt nhất cho khách hàng, triển khai rồi đánh giá lại. Đây là đánh giá mô phỏng khách hàng khó tính, đối chiếu source và kiểm chứng kỹ thuật; không giả nhận đã có khách hàng thật ký UAT. Tiếp tục trên `system-design`, giữ S11 IN_REVIEW.

Luồng làm việc đã rõ hơn sau checklist, từng case, hộp việc và tìm dự án. Tuy nhiên, kiểm tra độc lập tìm thấy những điểm cản trở thật: lưu case kéo mất vị trí, polling làm mất focus danh sách, gán Dev không đủ quyền làm QA, và dự án không thể kết thúc vì công việc thường không có đường đóng. Đợt này sửa các điểm đó và bổ sung vòng đời dự án có kiểm soát.

## Quy tắc đã thực hiện

- Chỉ ADMIN tổng được lưu trữ/mở lại, bắt buộc lý do, version và mã yêu cầu. V21 lưu quyết định/người/thời gian, replay không tạo trùng hoặc đảo ngược quyết định đến sau; audit dùng chung vẫn ghi sự kiện.
- Sáu nhóm chặn: phiên DOING/PAUSED, máy chưa thu hồi, công việc chưa terminal, đợt ACTIVE hoặc DRAFT có run, retest OPEN, Redmine QUEUED/RETRY_WAIT/RUNNING. Không có bỏ qua, tự đóng ticket hoặc thu hồi máy. Đợt nháp trống được giữ nguyên.
- Redmine FAILED/UNCERTAIN/CONFLICT mới nhất có cảnh báo riêng, không chặn vĩnh viễn; sau archive cần mở lại trước khi đối chiếu/thử lại. Dashboard tổng loại dự án đã lưu trữ khỏi cảnh báo hành động quá hạn/thiếu kế hoạch; chi tiết vẫn giữ mốc lịch sử.
- Dự án lưu trữ chỉ đọc; lịch sử/tài liệu/kết quả/xuất theo quyền vẫn còn. Mở lại không tự mở ticket, tạo phiên hay cấp máy. UI chỉ cho xác nhận sau khi tải kiểm tra hiện hành; giữ lý do khi lỗi và bảo vệ chỉnh sửa dự án chưa lưu.
- PM được kết thúc TASK/REQUEST/IMPROVEMENT bằng Hoàn thành hoặc Không xử lý, mở lại terminal chỉ về Chưa xử lý; có lý do/version/history. Không dùng trạng thái Không tái hiện hoặc build sửa lỗi cho công việc thường. BUG/QA giữ luồng chuyên biệt.
- DEV phải khớp quyền hệ thống và membership hai chiều; dữ liệu cũ không bị tự sửa. Admin quản lý thành viên ở khu tổng, màn cài đặt cũ dẫn tới đúng màn.

## Khách hàng đánh giá lại

| Tiêu chí khó tính | Đánh giá sau sửa | Còn cần chứng minh/cải thiện |
| --- | --- | --- |
| PM mới biết bước tiếp theo | Checklist có số liệu thật và đường dẫn; không tự duyệt hoặc kích hoạt thay PM. | Pilot với PM mới để đo bước phải hỏi người hỗ trợ; checklist tổng không thay preview phạm vi cụ thể. |
| Tester thao tác liên tục | Giữ case, DOM và vị trí khi lưu/làm mới; không focus form cho OK tự lưu; phục hồi focus không cuộn và không giành focus từ lịch sử vừa mở. | Cảm ứng/bàn phím ảo thật và phiên test kéo dài vẫn cần UAT. |
| Công việc không bị bỏ quên | Inbox giữ thẻ khi polling/lỗi mạng, hiện thời điểm và cảnh báo bản đọc cũ; thu hồi quyền xóa dữ liệu cũ. QA recheck ghi rõ PM cần xem xét, Dev là người được giao. | Chưa có notification lưu sự kiện/đã đọc hoặc nhắc khi rời inbox. Không gọi live queue là notification đã hoàn chỉnh. |
| Giao đúng người, đúng quyền | UI và backend chặn gán sai DEV; đường quản trị tập trung giảm hai cách chỉnh cùng dữ liệu. | Trường hợp dữ liệu cũ không tương thích cần Admin quyết định người/vai trò đúng, không tự chuyển hàng loạt. |
| Kết thúc dự án thực sự được | PM có đường đóng công việc thường; Admin có checklist, lý do, lịch sử, mở lại và kiểm tra đồng thời. | Chủ dự án vẫn chịu trách nhiệm xác nhận nội dung bàn giao; archive không là chữ ký nghiệm thu hợp đồng. |
| Excel đủ rõ trước khi gửi | Phạm vi xuất hiện thường trực, gồm toàn tài liệu đã lưu dù đang lọc; file gốc và execution được phân biệt. | Đối chiếu bộ mẫu khách hàng trong UAT; kiểm thử phần mềm không thay người chịu trách nhiệm phát hành tài liệu. |
| Tìm và đọc trên nhiều màn | Tìm dự án theo server, tên dài và điều khiển co giãn; modal vòng đời có cuộn và focus bàn phím. | Quy mô 300+ dự án, Safari và thiết bị thật chưa được nghiệm thu chỉ bằng viewport Chrome. |
| Phục hồi lỗi đáng tin | Archive dùng requestKey, current authorization và version; generic chuyển trạng thái bỏ lựa chọn cũ đã mất hiệu lực sau cập nhật. | Không bổ sung offline queue; khi mất kết nối người dùng vẫn cần retry hoặc kiểm tra lại. |
| Vận hành rộng | Schema mới được kiểm thử riêng, backup trước nâng cấp; không sửa migration đã áp. | Load/SLA, diễn tập restore và RPO/RTO production vẫn cần tiêu chí và môi trường vận hành thực tế. |

## Kiểm chứng trong đợt

- RED trước sửa: ba hành vi focus/polling/archive badge, role Dev và màn membership cũ, ordinary close/reopen, metadata archived, lựa chọn chuyển trạng thái cũ, tranh focus khi history mở trước phản hồi, hướng dẫn phạm vi Excel. Lỗi fixture thiếu trường được sửa riêng, không gọi là lỗi ứng dụng.
- Frontend toàn bộ: **659/659 PASS, 56 files**. Coverage V8: **85.04% statements, 82.20% branches, 78.56% functions, 83.28% lines**. Đây là số đo trước hai thay đổi trình bày cuối; sau đó inbox **8/8**, document **24/24 PASS**. Admin/API **66/66**, root file-work/inbox/layout **96/96**, WorkItem/QA **61/61** là các lượt có phạm vi chồng lặp, không cộng thành tổng mới.
- Backend ordinary lifecycle/quyền/QA liên quan **41/41 PASS**, package PASS. Node contract + native-runner guards **36/36 PASS**, structural contract checker PASS; checker không thay native HTTP hoặc full OpenAPI validator.
- Native MySQL: **migration 1/1**, **lifecycle HTTP 7/7**, **concurrency 6/6**, **F/Q hồi quy 9/9 PASS**. Hai schema V21 riêng `tms_docstest_202610080021`/`tms_docstest_202610080022`; schema F/Q V19 cũ giữ nguyên. Fresh V20 → V21 bảo toàn workbook thật và snapshot dữ liệu V20; kiểm tra validate/rerun/ràng buộc. Test đồng thời gồm archive và reopen khi transaction đã cache trạng thái cũ, đọc snapshot RR cũ, cấp máy sau archive, quyền Admin bị thu hồi và lệnh lặp.
- Dashboard/status **13/13 PASS** sau RED hai trường hợp cảnh báo archived. Coverage backend chỉ đo riêng lượt native lifecycle: service **47/47 dòng, 601/637 instructions (94.35%), 38/54 branches (70.37%), 7/7 methods**; controller **6/6 dòng**. Không suy ra coverage toàn backend từ số đo này.
- YAML quản trị đã được parse bằng SnakeYAML 2.4 có sẵn: bốn operation vòng đời, tham chiếu nội bộ, nhánh `latestDecision=null` và schema cảnh báo hợp lệ về cấu trúc. Đã sửa kiểu nullable/allOf trước bàn giao; không gọi đây là full OpenAPI validator.
- Frontend production build PASS: bundle chính **560.23 kB / 158.08 kB gzip**, vẫn có cảnh báo chunk >500 kB. Lượt cuối sau cảnh báo/phạm vi xuất/nhãn QA: **44/44** kiểm thử chọn lọc PASS; không đo lại full coverage sau thay đổi trình bày này.
- Eclipse JDT: **203 source files, 0 lỗi, 0 cảnh báo**; không tắt cảnh báo để làm sạch kết quả.
- Runtime: backup native trước nâng cấp tại `var/mysql-native/backups/2026-10-07T18-09-56-738Z-tms.sql`; khởi động lại backend **8080**, health **UP**, Flyway **V21**, MySQL **3307/tms**. Đối chiếu trước/sau: **65 bảng nghiệp vụ, 5.304 bản ghi và SHA-256 của 8 workbook nguồn giữ nguyên**. Không ghi fixture hoặc thực hiện archive/reopen thử trên `tms`; các lệnh ghi đã kiểm chứng ở schema riêng.
- Chrome trên runtime mới: **1366×900, 768×1024, 375×812** không tràn ngang toàn trang ở màn kiểm tra lưu trữ. Modal có cuộn dọc, nút cao ít nhất 44 px; giữ lý do khi kiểm tra lại, chặn lưu trữ khi còn hai máy/một đợt kiểm thử, Escape trả focus đúng nút mở. Khi sửa dự án chưa lưu, thao tác lưu trữ bị chặn có giải thích. Lịch sử rỗng hiển thị đúng và không cho chuyển trang. Đã đăng xuất tài khoản kiểm thử, bỏ override viewport và đóng tab kiểm thử.

Ảnh bằng chứng trên runtime: [desktop](evidence/customer-reassessment-2026-10-08/archive-1366.jpg), [mobile](evidence/customer-reassessment-2026-10-08/archive-375.jpg). Đây là kiểm tra trình duyệt theo viewport, không thay kiểm thử cảm ứng trên máy thật.

## Phương pháp và giới hạn

Áp dụng `brainstorming`, `api-design`, `security-review`, `frontend-patterns`, `ui-ux-pro-max`, `tdd-workflow`, `verification-loop`, `ponytail`, `code-review-and-quality`. Đọc `prompt-master` theo yêu cầu, thực hiện công việc thay vì trả một prompt. Chia review độc lập với implementation rồi kiểm chứng lại finding bằng test. Python CLI của UI skill không có trong PATH; dùng hướng dẫn responsive/touch/accessibility trong skill, không báo đã chạy CLI.

Không kết luận “hết mọi lỗi”, không thay kết quả UAT thật bằng số PASS. Ưu tiên đợt tới: pilot theo bốn vai trò và đo thao tác, chốt nhắc việc có sự kiện/đã đọc nếu cần, đo tải và phục hồi theo yêu cầu production. Không tự mở thêm tài khoản khách, gửi thông báo ngoài hệ thống, merge develop hay deploy production.
