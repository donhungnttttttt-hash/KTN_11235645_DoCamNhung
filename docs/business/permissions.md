# Quyền nội bộ

## Chốt thành viên 25/10/2026 (thay các quy định cũ khác bên dưới)

- Danh sách thêm loại người đang là thành viên của dự án hiện tại từ truy vấn server trước phân trang; người thuộc dự án khác vẫn được chọn. Chỉ tài khoản đang hoạt động được thêm.
- Admin tổng thêm mọi nhóm tài khoản; PM chỉ thêm DEV/TESTER vào dự án mình quản lý. PM không được gỡ thành viên, không quản trị tài khoản hoặc thêm PM/ADMIN. Dự án lưu trữ chặn thêm/khôi phục.
- Không đổi vai trò khi thêm hay sửa thành viên. PM → PM, TESTER → TESTER, DEV → DEV. ADMIN vẫn là tài khoản ADMIN và giữ toàn quyền quản trị tổng; hiển thị **ADMIN · Làm PM** vì đảm nhiệm PM ở dự án. Không UPDATE role_code của tài khoản.
- API từ chối đổi projectRole của membership đã có; khôi phục giữ vai trò đã lưu. Không tự đổi dữ liệu lịch sử. Bộ lọc “Vai trò” chỉ lọc danh sách; chọn vai trò khi tạo tài khoản mới vẫn là nghiệp vụ riêng.
- Endpoint ứng viên theo dự án kiểm quyền PM và chỉ trả nhóm phù hợp; PM chỉ nhận có/chưa có dự án, không nhận tên/mã dự án ngoài phạm vi.

## FixReports — quyền hiện hành trong source ngày 19/10/2026

Phần này ưu tiên khi khác mô tả cycle/run/file-session/typed-QA lịch sử bên dưới. Nguồn: [contract FixReports](../api/fixreports-contract.md), [Issue](../api/work-items.md), [AI chat](../api/ai-chat.md), [báo cáo](../api/reporting.md). Contract/source không chứng minh main DB đã được chuyển đổi hoặc UAT hoàn tất.

| Hành động mới | ADMIN | PM của chính dự án | TESTER thành viên | DEV thành viên |
| --- | --- | --- | --- | --- |
| Đọc Feature/file/case/Status/history | Có, không cần membership | Có | Có | Có |
| Tạo/sửa/archive/restore Feature; import/ẩn file; sửa nội dung case | Có | Có | Không | Không |
| Phân công case | Có | Quản lý toàn file | Tự nhận/sửa phần mình, không đè phần người khác | Không |
| Ghi Status | Có | Có | Case thuộc trách nhiệm hiện hành | Không |
| Tạo Bug/QA từ case; tạo Bug Monkey theo Feature | Có | Có | Có trong dự án | Không |
| Sửa/phân công/chuyển Issue | Theo capability quản lý | Theo capability quản lý | Sửa/xóa mềm Bug Monkey do mình tạo; chuyển/comment theo capability | Xử lý Issue được giao theo capability, không triage/phân công |
| CRUD Note | Có | Có | Chỉ đọc | Chỉ đọc |
| Xem/tạo/sửa/tải management report | Có | Có | Không, kể cả gọi API trực tiếp | Không, kể cả gọi API trực tiếp |

Global DEV không được hưởng quyền PM/Tester từ membership cũ bất nhất; ADMIN toàn cục là ngoại lệ toàn quyền. Actor lấy từ session và identity hiện hành, không từ client hoặc người được phân công. Luồng Feature/Note/report lưu identity tác giả trực tiếp; quyền ADMIN không cần được bổ sung membership giả. Resource vẫn phải thuộc projectId URL; sai scope404, thiếu quyền403, version cũ409. Dự án/Feature/file lưu trữ giữ đọc lịch sử nhưng chặn các lệnh ghi tương ứng; server kiểm lại trước replay.

PM/ADMIN có **quyền AI đọc liên dự án** kể cả ngoài membership; đây không phải quyền CRUD Feature/Note/Issue/report hoặc quyền quản lý dự án ngoài phạm vi. TESTER/DEV chỉ có chi tiết dự án/case/Issue trong quyền, không management totals/report/bulk export; ngoài phạm vi chỉ kinh nghiệm tổng hợp ẩn danh theo whitelist. Private chat và credential không thuộc context hay quyền đọc của ADMIN khác chủ sở hữu.

Không có luồng tạo TASK/REQUEST/IMPROVEMENT mới; Issue mới chỉ BUG/QA. Retest thực hiện thủ công trên case/Issue, không đòi run/session/build/máy/cycle để ghi Status hay tạo Issue. Các public legacy writes trả410 sau session/CSRF và các guard áp dụng; GET lịch sử vẫn theo quyền, không phải lối ghi thay thế. [Các API đã nghỉ](../api/file-work.md#fixreports--ngừng-ghi-luồng-cũ-ngày-19102026). Quản trị tài khoản/membership và bàn giao máy vật lý cho PM vẫn dùng quyền ADMIN hiện có, không gán máy nội bộ cho từng Tester.

Bổ sung19/10/2026 — R01/R07: status-report narrative cũ chỉ còn GET lịch sử cho PM của chính dự án/ADMIN (`canPost:false`); POST đã nghỉ trả410 `USE_FEATURE_REPORTS` sau kiểm quyền, không tạo membership cho Admin. Tester/DEV không được GET lịch sử quản lý; PM ngoài membership không dùng quyền AI để truy cập. Route Admin lịch sử vẫn ADMIN-only. [API báo cáo](../api/reporting.md).

## Lịch sử các quyết định trước FixReports

Các phần sau giữ nguyên quyết định/bằng chứng tại thời điểm ghi; điều kiện cycle/run/session/NA/QA cũ không áp vào luồng Feature mới nếu trái phần19/10 phía trên.

## Admin tổng toàn quyền — quyết định mới nhất 10/10/2026

Người dùng xác nhận: **Admin tổng có toàn quyền nghiệp vụ**. ADMIN đang hoạt động được quản lý mọi dự án, tạo/sửa/duyệt case, phân công kể cả test lần 2, tạo/mở/chốt đợt, ghi kết quả tài liệu và thực thi/retest, xử lý công việc và các bước QA của PM/Tester/Dev. Không cần membership đang hoạt động hoặc được giao riêng. Các mục “Admin chỉ xem/ngoại lệ import” bên dưới là lịch sử và đã bị thay thế bởi quyết định này.

Frontend và API cùng áp dụng. Quy tắc hợp lệ của dữ liệu vẫn giữ: đúng dự án trên URL, phiên bản hiện hành, nguồn/case đã duyệt, build/máy phù hợp, trạng thái cho phép và lịch sử. Dự án lưu trữ/đợt đóng cần mở lại bằng lệnh hiện có. Preview import riêng của người khác và hội thoại AI riêng không bị công khai bởi thay đổi này.

Đọc không thêm membership. Khi lệnh ghi cần FK membership để lưu tác giả, Admin chưa có liên kết được tạo bản ghi `MEMBER`, `active=false`; không thêm vào danh sách thành viên đang hoạt động hoặc cấp quyền PM/Tester. Mọi tác giả/executor vẫn là chính Admin. Khi tài khoản bị hạ quyền hoặc khóa, liên kết này không cấp quyền truy cập. V28 giữ FK cùng dự án nhưng tách người ghi kết quả khỏi người khởi tạo phiên và người nhận máy. [Kế hoạch và kiểm chứng](../planning/2026-10-10-admin-full-authority.md).

## Lịch sử: quyền nhập Excel riêng của Admin — đã thay bằng toàn quyền phía trên

Theo yêu cầu mới: ADMIN đang hoạt động được tải mẫu, tạo/xem preview của mình và xác nhận nhập Excel vào mọi dự án chưa lưu trữ, không cần membership. Đây là ngoại lệ riêng cho import, không mở quyền tạo/sửa case thủ công, phê duyệt, phân công hay ghi kết quả. PM vẫn chỉ import trong dự án mình quản lý; Tester/Dev không được import. Preview chưa commit của người khác vẫn bị chặn.

V26 lưu identity của người tạo revision bằng `created_by_user_id`, cho phép `created_by` (membership) rỗng khi Admin nhập. Không tạo membership giả, không mượn người tạo của PM. Lịch sử cũ giữ nguyên; nhật ký import ghi đúng Admin. Nhập nhiều file dùng preview/commit riêng cho từng file, có xác nhận và báo lỗi riêng.

## Lịch sử: Admin chỉ xem — đã thay bằng toàn quyền phía trên

Theo yêu cầu sửa lỗi Admin thấy dự án tại quản trị nhưng workspace trống: ADMIN đang hoạt động được liệt kê và đọc mọi dự án trong Không gian dự án, kể cả khi không có membership. Phạm vi đọc gồm công việc/QA, tài liệu đã import, case/revision, đợt/run/lịch sử, file được giao, báo cáo, danh mục, thành viên và máy bàn giao. Hàng việc cần xử lý của Admin quan sát là toàn dự án; bộ lọc cá nhân vẫn chỉ lấy đúng người.

Quyền xem không tạo membership, không tự gán PM/Tester và không cho phép ghi kết quả, phân công hoặc chuyển trạng thái nghiệp vụ. Quyền nhập file áp dụng ngoại lệ mới phía trên. ProjectSummary.projectRole vẫn null nếu không có membership. ADMIN có membership thật tiếp tục theo quy tắc hiện có. Các lệnh chỉ PM, executor, Dev được giao hoặc Tester tạo QA vẫn kiểm tra vai trò/người được giao như trước.

Tài khoản PM/Tester/Dev chỉ đọc các dự án có membership active. Resource ID vẫn phải thuộc projectId trên URL; Admin không được đọc resource của dự án B bằng URL của A. Preview import chưa commit vẫn thuộc người tạo. Tài khoản bị khóa/thu hồi quyền không được dùng quyền Admin cũ. Xem [báo cáo kiểm chứng](../reviews/2026-10-10-admin-workspace-read.md).

Các mục lịch sử bên dưới giữ quy tắc cho vai trò khác; giới hạn quyền ADMIN đã được thay bởi quyết định toàn quyền ở đầu tài liệu.

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
- Dashboard toàn hệ thống, selector dự án chỉ ở tab Dự án; bộ lọc user và thiết bị thuộc trang tương ứng. ADMIN ngoài membership có quyền quản trị và quyền đọc workspace toàn hệ thống; không có quyền PM nghiệp vụ ngầm.

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

Mở rộng được người dùng chốt ngày 25/10/2026: ADMIN được sửa `displayName`, `username` và đặt lại mật khẩu của tài khoản nội bộ, gồm tài khoản của chính mình. Không mở sửa vai trò hệ thống; vai trò thành viên dự án vẫn chỉ hiển thị theo quyết định trước đó. PM/TESTER/DEV không được sửa thông tin hoặc đặt lại mật khẩu qua API quản trị này, kể cả PM được cấp quyền tạo Tester. Mọi thay đổi thực sự của tài khoản vẫn thu hồi phiên theo `lock_version` hiện hành; Admin tự sửa phải đăng nhập lại. Không thay ID, membership hoặc liên kết lịch sử. Xem [contract identity](../api/identity.md).

Các kịch bản S03 phải kiểm chứng khi có API dự án: thành viên A không đọc/sửa dự án B bằng đổi URL/ID; không liên kết case/bug khác dự án; role dự án không nâng quyền tạo tài khoản. S02 không khẳng định các API chưa triển khai đã được kiểm tra.

## Xác nhận S04 ngày 28/09/2026

- Chỉ membership đang hoạt động với `projectRole=PM` của chính dự án được duyệt revision. ADMIN hệ thống không tự có quyền duyệt; phải được giao PM trong dự án đó.
- Đọc case/suite cần membership đang hoạt động hoặc global ADMIN hiện hành. Gỡ thành viên chặn quyền ghi; PM/Tester/Dev bị gỡ cũng mất quyền đọc.
- Tạo/sửa case, suite và nhập Excel: PM dự án hoặc ADMIN là thành viên dự án. Role dự án không cấp quyền tạo tài khoản mới.
- Dự án phải còn ít nhất một PM. Chặn gỡ/hạ quyền PM cuối cùng.
- Đã kiểm chứng phạm vi dự án, thành viên bị gỡ, admin ngoài dự án, duyệt PM-only, FK khác dự án và bản dựng khác dự án trong `TestCaseIntegrationTest`.

## Thực thi kiểm thử S05

| Hành động | Điều kiện tại backend |
| --- | --- |
| Đọc đợt, scope, lần chạy và lịch sử | Thành viên active của chính dự án hoặc global ADMIN hiện hành |
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

QA không dùng generic transition/batch/update để bỏ qua typed lifecycle, không vào BUG retest/closure/Redmine. UI dùng capability từ server và đóng quyền trong loading/error/scope hoặc version không phù hợp. Quyền vẫn được backend kiểm lại trước replay; bản nháp hoặc response thành công cũ không cấp quyền mới. ADMIN ngoài dự án được đọc resource nghiệp vụ theo cập nhật 10/10/2026, không tự có quyền ghi.

## Lưu trữ dự án và kết thúc công việc thường — 08/10/2026

Theo ủy quyền lựa chọn quy tắc của người dùng: chỉ ADMIN tổng được archive/reopen dự án; lý do bắt buộc, version hiện hành và requestKey được kiểm lại ở backend. Không cần tự thêm ADMIN vào membership để quản trị vòng đời. Quyền đọc tài liệu/case/xuất của workspace cho phép membership hiện hành hoặc ADMIN đang hoạt động; quyền quản trị tổng không trở thành quyền ghi nghiệp vụ dự án.

Archive bị chặn bởi phiên DOING/PAUSED, máy chưa thu hồi, ticket chưa terminal, đợt ACTIVE hoặc DRAFT có run, retest OPEN và outbox Redmine QUEUED/RETRY_WAIT/RUNNING. Không có quyền bỏ qua blocker. Mở lại không tự mở ticket hoặc bàn giao lại máy. Lý do/người/thời điểm lưu trong project_lifecycle_decisions V21 và sự kiện trong project_audit.

PM dự án được kết thúc TASK/REQUEST/IMPROVEMENT thành closed hoặc wontfix với lý do và version, rồi mở lại chỉ về open. TESTER/DEV không được kết thúc hoặc mở lại. BUG giữ coverage/retest/closure; QA giữ xác nhận câu trả lời và PM closure. Công việc thường không nhận trạng thái unreproducible hoặc fixed build.

Vai trò DEV phải khớp hai chiều: tài khoản hệ thống DEV chỉ nhận membership DEV; tài khoản không phải DEV không được gán membership DEV. Thay đổi không tự sửa dữ liệu cũ; Admin dùng màn quản lý thành viên để điều chỉnh trường hợp cũ không tương thích.
# Bổ sung ngày 10/10/2026 — bảng tài liệu

PM dự án được phân công **test lần 2** cho Tester đang hoạt động, gắn với một run thật trong đợt nháp có cấu hình. PM bắt đầu/chốt/mở lại đợt; chỉ người được giao ghi kết quả khi đợt ACTIVE. Giao lần 2 không tự tạo xác minh bug hoặc thay đổi trạng thái bug.

Sửa ô nội dung dùng quyền sửa revision hiện tại: PM hoặc ADMIN có membership đang hoạt động, dự án chưa lưu trữ, không có vai trò DEV. Nội dung case tạo revision mới cần PM duyệt; ô bổ sung có lịch sử riêng. Admin tổng không có membership vẫn xem và nhập Excel nhưng không hiện nút sửa revision hoặc ghi kết quả.
