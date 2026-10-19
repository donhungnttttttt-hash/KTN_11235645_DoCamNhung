const fs=require('fs');
function append(path,text){const heading=text.trim().split('\n')[0];let s=fs.readFileSync(path,'utf8');if(s.includes(heading))throw Error('Already added '+path);fs.writeFileSync(path,s.trimEnd()+'\n\n'+text.trim()+'\n');}
append('docs/business/permissions.md',`## Lưu trữ dự án và kết thúc công việc thường — 08/10/2026

Theo ủy quyền lựa chọn quy tắc của người dùng: chỉ ADMIN tổng được archive/reopen dự án; lý do bắt buộc, version hiện hành và requestKey được kiểm lại ở backend. Không cần tự thêm ADMIN vào membership để quản trị vòng đời. Quyền đọc tài liệu/case/xuất của workspace vẫn yêu cầu membership hiện hành; quyền quản trị tổng không trở thành quyền nghiệp vụ dự án.

Archive bị chặn bởi phiên DOING/PAUSED, máy chưa thu hồi, ticket chưa terminal, đợt ACTIVE hoặc DRAFT có run, retest OPEN và outbox Redmine QUEUED/RETRY_WAIT/RUNNING. Không có quyền bỏ qua blocker. Mở lại không tự mở ticket hoặc bàn giao lại máy. Lý do/người/thời điểm lưu trong project_lifecycle_decisions V21 và sự kiện trong project_audit.

PM dự án được kết thúc TASK/REQUEST/IMPROVEMENT thành closed hoặc wontfix với lý do và version, rồi mở lại chỉ về open. TESTER/DEV không được kết thúc hoặc mở lại. BUG giữ coverage/retest/closure; QA giữ xác nhận câu trả lời và PM closure. Công việc thường không nhận trạng thái unreproducible hoặc fixed build.

Vai trò DEV phải khớp hai chiều: tài khoản hệ thống DEV chỉ nhận membership DEV; tài khoản không phải DEV không được gán membership DEV. Thay đổi không tự sửa dữ liệu cũ; Admin dùng màn quản lý thành viên để điều chỉnh trường hợp cũ không tương thích.`);
append('docs/product/PRD.md',`## 19. Lưu trữ dự án và đánh giá khách hàng lần hai — 08/10/2026

Người dùng duyệt để lựa chọn quy tắc tốt nhất cho khách hàng, triển khai và đánh giá lại. Phần này thay trạng thái “chờ chốt archive” ở checkpoint 18; bản thiết kế tại [quy tắc vòng đời](../planning/project-lifecycle-2026-10-08.md).

ADMIN kiểm tra điều kiện, nhập lý do rồi lưu trữ; chỉ đọc dữ liệu và xuất vẫn hoạt động theo membership. Không xóa hoặc âm thầm kết thúc việc. Sáu nhóm blocker: phiên đang làm/tạm dừng, máy chưa thu hồi, ticket chưa terminal, đợt ACTIVE/DRAFT có run, retest OPEN, outbox Redmine đang chờ/gửi. Mở lại có lý do/version, không tự tạo việc hoặc cấp lại thiết bị. V21 bổ sung quyết định vòng đời có replay/audit. PM hoàn tất hoặc không xử lý TASK/REQUEST/IMPROVEMENT bằng lý do/version; từ terminal chỉ mở lại về open. BUG/QA giữ quy trình riêng.

Đánh giá lại phát hiện cần giữ vị trí/focus khi Tester lưu, tránh unmount hộp việc khi polling, chặn gán nhầm vai trò Dev và loại bỏ lựa chọn chuyển trạng thái đã hết hiệu lực. Các sửa này có regression test; thông báo nền không giành focus. Không dùng dữ liệu đọc cũ để cấp quyền ghi khi refresh thất bại.

Tiêu chí nghiệm thu: lời nhắc chỉ rõ người xử lý blocker; mất mạng thử lại không tạo quyết định trùng; thay đổi đồng thời không tạo hoạt động mới trong dự án đã lưu trữ; người dùng có thể đọc hồ sơ, mở lại theo quyền; PM hoàn tất được công việc thường để không rơi vào đường cụt. Bằng chứng và đánh giá lại tại [báo cáo](../reviews/2026-10-08-customer-reassessment.md). UAT người dùng thật, cảm ứng và NFR production vẫn là gate riêng.`);
append('docs/product/SYSTEM-SPECIFICATION.md',`## 17. Vòng đời dự án và quyền công việc thường — 08/10/2026

Được người dùng duyệt sau checkpoint 16: archive/reopen ADMIN với readiness, version, lý do và requestKey. V21 thêm project_lifecycle_decisions, không sửa migration cũ hoặc seed thêm tài liệu. API quản trị kiểm tra tài khoản hiện hành và khóa dự án trong cùng transaction; lưu audit và quyết định nguyên tử, replay cùng actor/payload trả trạng thái hiện hành, không đảo ngược quyết định đến sau.

Blocker, quyền và hướng xử lý tại [quyết định vòng đời](../planning/project-lifecycle-2026-10-08.md). PM đóng công việc thường allowlist TASK/REQUEST/IMPROVEMENT thành closed/wontfix; mở lại terminal chỉ open, có lý do/version/history. Không nới BUG/QA typed guards hoặc quyền TESTER/DEV. DEV role khớp cả hệ thống và dự án.

Read projection trên màn case và inbox giữ DOM khi làm mới cùng phạm vi để không mất vị trí. Đổi project/filter/build phải đổi scope; phản hồi cũ bị bỏ qua. 401/403/404 xóa bản đọc cũ. Trạng thái đang tải/lỗi authority khóa ghi kết quả; lỗi mạng inbox giữ lần đọc gần nhất kèm cảnh báo và retry. Thông báo thành công không tự kéo trang; sau lưu case phục hồi focus bằng preventScroll. Workspace lưu trữ hiển thị banner chỉ đọc.

Kiểm chứng kỹ thuật, regression responsive và đánh giá mô phỏng khách hàng ghi tại [báo cáo](../reviews/2026-10-08-customer-reassessment.md); không thay UAT thực tế.`);
append('docs/admin-guide.md',`## Lưu trữ và mở lại dự án

Vào **Dự án → chi tiết dự án → Vòng đời dự án → Kiểm tra lưu trữ**. Checklist nêu số phiên, máy, ticket, đợt kiểm thử, retest hoặc yêu cầu Redmine còn tồn. Admin thu hồi máy; PM điều phối kết thúc việc qua các màn nguồn. Không có nút tự đóng toàn bộ hoặc bỏ qua kiểm tra.

Khi đủ điều kiện, nhập lý do rồi xác nhận lưu trữ. Dữ liệu vẫn được giữ để thành viên tra cứu và xuất theo quyền. Phần Vòng đời dự án có lịch sử người, lý do, thời gian. Mở lại cũng yêu cầu lý do; không tự cấp máy, mở ticket hoặc tạo phiên mới.

Nếu mất kết nối sau xác nhận, dùng **Thử lưu lại** để gửi đúng yêu cầu cũ. Khi báo xung đột, dùng **Kiểm tra lại, giữ lý do**, đọc dữ liệu mới rồi xác nhận. Không coi việc bấm nút là đã lưu thành công.

PM kết thúc TASK/REQUEST/IMPROVEMENT bằng **Chuyển trạng thái → Hoàn thành / Không xử lý**, nhập lý do. Để mở lại công việc đã kết thúc, chọn **Chưa xử lý** và ghi lý do. BUG và QA tiếp tục đi qua luồng kiểm chứng riêng.

Quản lý thành viên tập trung ở Admin; màn cài đặt dự án cũ có liên kết tới đây. Chỉ tài khoản hệ thống DEV được gán vai trò dự án DEV. Tài khoản không tương thích cần Admin điều chỉnh, không coi nhãn Dev là đã đủ quyền xử lý QA.`);
