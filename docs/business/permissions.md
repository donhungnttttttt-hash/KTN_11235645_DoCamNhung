# Quyền nội bộ — Sprint 02

## Thiết kế F/Q đã duyệt — 06/10/2026

Phần này bổ sung quyết định mới cho luồng công việc theo file và QA. Mã nguồn đang được triển khai theo [kế hoạch F/Q](../../tasks/plan.md); trạng thái chạy kiểm tra được ghi riêng tại [báo cáo triển khai](../reviews/2026-10-06-fq-implementation.md). Các mục sprint phía dưới giữ bằng chứng lịch sử, không tự chứng minh API mới đã chạy trên MySQL.

| Hành động mới | Điều kiện |
| --- | --- |
| Tạo/giao lại nhóm file, hủy phiên với lý do | PM hiện hành của dự án; không mượn quyền ADMIN ngoài membership |
| Bắt đầu/tiếp tục/ghi kết quả/kết thúc file | Người đang được giao, membership phù hợp, không là global DEV, dự án/đợt/ngữ cảnh hợp lệ; phiên đang làm có máy được bàn giao đúng người/dự án |
| Tạo QA | PM hoặc TESTER hiện hành; không là global DEV; source cùng dự án, không cần NG |
| Phân công QA, kết thúc/mở lại QA | PM hiện hành; kết thúc bình thường cần xác nhận của đúng câu trả lời hiện hành; ngoại lệ cần lựa chọn rõ và lý do |
| Bắt đầu xác minh/yêu cầu thông tin/trả lời QA | DEV hệ thống và DEV dự án đang được giao QA; không là Dev từng được giao trước đó |
| Bổ sung thông tin QA | PM hoặc người tạo vẫn là TESTER hiện hành, theo trạng thái QA |
| Xác nhận QA | Người tạo vẫn là TESTER hiện hành, đúng answer/version/generation; PM không tạo xác nhận thay Tester |
| Bình luận/chứng cứ QA | PM, người tạo TESTER hoặc DEV đang được giao; QA chưa đóng, ngữ cảnh còn hợp lệ; bình luận không là câu trả lời chính thức |
| Hàng chờ bàn giao BUG | PM hiện hành; là projection chỉ đọc, không tự giao retest hoặc đóng bug |

QA là loại riêng, không mở quyền Dev cho TASK/REQUEST/IMPROVEMENT. Generic edit/transition/batch/Redmine không được thay các lệnh QA. Current account/session/membership/ownership và source được kiểm tra trước cả việc trả kết quả thao tác lặp; ẩn nút ở UI không thay backend guard. Xem [contract QA](../api/qa.md) và [contract công việc theo file](../api/file-work.md).

## Cập nhật quản trị tập trung và Dev — 05/10/2026

- ADMIN tạo dự án tại khu quản trị, chọn PM và Tester/Dev ban đầu trong cùng transaction; không tự thêm người tạo thành PM. Không có quota người/máy. Máy vật lý thuộc A3.
- Thêm/đổi/gỡ membership chỉ ADMIN, kể cả gọi API dự án cũ. PM nhận dự án để vận hành. Last-PM, archived, version và audit vẫn áp dụng. PM được ủy quyền vẫn chỉ tạo tài khoản TESTER; ADMIN được tạo DEV.
- DEV là role hệ thống và role dự án. Tài khoản DEV không được gán PM/TESTER/MEMBER. Dữ liệu cũ không bị rewrite; các guard vẫn từ chối quyền ghi kết quả theo role DEV hiện hành, kể cả assignment cũ hoặc membership bất nhất.
- Dev đọc case, tài liệu, kết quả và lịch sử trong dự án. Chỉ xử lý BUG được giao còn chưa terminal sang `progress` hoặc `resolved`; cần version và lý do, `resolved` cần build đã sửa. Lý do/lịch sử/bình luận lưu thông tin sửa lỗi, không thêm bảng fix-notes. Bình luận/chứng cứ của Dev chỉ cho bug đang được giao.
- Dev không tạo/triage/phân công công việc, batch transition, đóng/mở lại lỗi, ghi execution/retest/kết quả tài liệu, duyệt case hay quyết định NA/đợt. Fixed không trở thành OK; Tester kiểm thử lại và PM đóng theo các guard hiện có.
- Dashboard toàn hệ thống, selector dự án chỉ ở tab Dự án; bộ lọc user và thiết bị thuộc trang tương ứng. ADMIN ngoài membership chỉ có API quản trị, không được dùng quyền PM nghiệp vụ ngầm.

Người dùng xác nhận chỉ tài khoản nội bộ và chỉ Admin/PM được Admin cấp quyền mới tạo tài khoản. Backend thực thi; ẩn nút frontend không phải ranh giới bảo mật.

| Hành động | TESTER | PM chưa cấp | PM đã cấp | ADMIN |
| --- | --- | --- | --- | --- |
| Đăng nhập, hồ sơ bản thân, đăng xuất | Có | Có | Có | Có |
| Tạo TESTER | 403 | 403 | Có | Có |
| Tạo ADMIN hoặc PM | 403 | 403 | 403 | Có |
| Danh sách tài khoản | 403 | 403 | 403 | Có |
| Bật/tắt tài khoản | 403 | 403 | 403 | Có, không tự tắt mình |
| Cấp/thu hồi quyền tạo tài khoản của PM | 403 | 403 | 403 | Có |
| Quyền theo dự án | S03 | S03 | S03 | Không tự coi Admin là thành viên mọi dự án |

PM chỉ được tạo TESTER là giới hạn an toàn của quyền được cấp ở S02. PM không được cấp quyền tiếp. Admin tạo PM cũng chưa cấp quyền tạo tài khoản; phải PATCH `canCreateUsers: true` rõ ràng. Không có CUSTOMER trong sprint này.

Chưa đăng nhập trả 401; request ghi còn cần CSRF. Login sai/disabled/không tồn tại cùng 401 AUTHENTICATION_FAILED; quá tần suất 429. Phiên hết hạn/user bị khóa/đổi quyền trả 401 UNAUTHENTICATED. CSRF sai/thiếu trả 403 CSRF_INVALID trước kiểm tra quyền; đúng CSRF nhưng sai quyền trả 403 FORBIDDEN. Version cũ trả 409 VERSION_CONFLICT; tự khóa trả 409 SELF_DISABLE; trùng username trả 409 USERNAME_EXISTS cho người có quyền tạo; input sai trả 422.

Thay enabled/quyền PM thu hồi toàn bộ phiên. Ghi audit cho tạo tài khoản, bật/tắt, cấp/thu hồi quyền và login/logout; không ghi mật khẩu/token.

Các kịch bản S03 phải kiểm chứng khi có API dự án: thành viên A không đọc/sửa dự án B bằng đổi URL/ID; không liên kết case/bug khác dự án; role dự án không nâng quyền tạo tài khoản. S02 không khẳng định các API chưa triển khai đã được kiểm tra.

## Xác nhận S04 ngày 28/09/2026

- Chỉ membership đang hoạt động với `projectRole=PM` của chính dự án được duyệt revision. ADMIN hệ thống không tự có quyền duyệt; phải được giao PM trong dự án đó.
- Đọc case/suite cần membership đang hoạt động. ADMIN ngoài dự án cũng bị từ chối; gỡ thành viên chặn cả đọc và ghi ngay request tiếp theo.
- Tạo/sửa case, suite và nhập Excel: PM dự án hoặc ADMIN là thành viên dự án. Role dự án không cấp quyền tạo tài khoản mới.
- Dự án phải còn ít nhất một PM. Chặn gỡ/hạ quyền PM cuối cùng.
- Đã kiểm chứng phạm vi dự án, thành viên bị gỡ, admin ngoài dự án, duyệt PM-only, FK khác dự án và bản dựng khác dự án trong `TestCaseIntegrationTest`.

## Thực thi kiểm thử S05

| Hành động | Điều kiện tại backend |
| --- | --- |
| Đọc đợt, scope, lần chạy và lịch sử | Thành viên active của chính dự án; ADMIN ngoài dự án không được đọc |
| Tạo đợt, thêm cấu hình/case, kích hoạt, phân công | PM dự án hoặc ADMIN là thành viên dự án; dự án chưa archive |
| Ghi OK/NG/P | Chính người đang được phân công, membership PM/TESTER active, user enabled; đợt ACTIVE, dự án chưa archive |
| Duyệt revision trước khi đưa vào scope | Vẫn chỉ PM của dự án theo S04 |
| NA, khôi phục scope, chốt/mở lại đợt | Chỉ PM active của dự án, không phải DEV; có version/lý do và guard S08 theo ADR-008; xem reporting.md |

TESTER không được quản lý cycle/phân công. ADMIN muốn ghi kết quả phải được phân công với membership hợp lệ; không có quyền giả danh executor. Các điều kiện này được kiểm chứng trong `ExecutionIntegrationTest`, gồm người ngoài dự án, admin ngoài dự án, thành viên bị gỡ, CSRF, người không được phân công và actor lấy từ session.

## F/Q đã duyệt ngày 06/10/2026

Phần này cập nhật source hiện hành; các mô tả S02–S05 ở trên giữ bằng chứng lịch sử. Xem [contract file-work](../api/file-work.md), [QA](../api/qa.md) và [báo cáo kiểm chứng](../reviews/2026-10-06-fq-implementation.md). Native/HTTP/UAT của F/Q còn là gate riêng.

| Hành động | Điều kiện hiện hành |
| --- | --- |
| Tạo dự án, cấp PM/Tester/Dev, bàn giao kho máy | ADMIN tổng; số người/máy ban đầu không là quota |
| Giao nhóm file và thay người | PM hiện hành của dự án, global role không DEV; run assignment là authority, không lưu assignee cạnh tranh ở group |
| Bắt đầu/tiếp tục/ghi/kết thúc phiên | TESTER hiện hành được giao, global role không DEV; current user/membership/project/cycle, allocation đúng người và máy phù hợp |
| Hủy phiên | PM với lý do/version; lịch sử và attempts giữ nguyên |
| Tạo QA | TESTER hoặc PM hiện hành, global role không DEV; metadata `canCreateQa` riêng |
| Giao/đóng/mở lại QA | PM hiện hành của dự án, global role không DEV; đóng thường cần xác nhận hợp lệ, ngoại lệ cần lý do |
| Bắt đầu/yêu cầu thêm thông tin/trả lời QA | DEV hiện hành được giao đúng QA; không cho DEV thao tác QA khác |
| Bổ sung thông tin QA | Người tạo còn quyền TESTER/PM hiện hành |
| Xác nhận câu trả lời QA | Chính TESTER tạo câu hỏi; đúng generation/answerId/answerVersion hiện hành |
| Bình luận/chứng cứ QA | Policy typed hiện hành cho PM, TESTER tạo hoặc DEV được giao; QA đã đóng không có quyền ghi |

QA không dùng generic transition/batch/update để bỏ qua typed lifecycle, không vào BUG retest/closure/Redmine. UI dùng capability từ server và đóng quyền trong loading/error/scope hoặc version không phù hợp. Quyền vẫn được backend kiểm lại trước replay; bản nháp hoặc response thành công cũ không cấp quyền mới. ADMIN ngoài dự án không tự được xem hoặc ghi resource nghiệp vụ dự án.
