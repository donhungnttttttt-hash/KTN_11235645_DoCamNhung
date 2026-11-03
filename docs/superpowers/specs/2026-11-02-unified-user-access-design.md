# User thường hợp nhất Tester/Dev và tài khoản Khách

Ngày: 02/11/2026. Baseline source: `13737f4`, nhánh `system-design`.
Trạng thái: **APPROVED; U01–U10 đã thực hiện và nghiệm thu local ngày 03/11/2026**. Người dùng duyệt thiết kế bằng “Duyệt rồi nha” và duyệt toàn bộ kế hoạch ngày 02/11/2026. [Kế hoạch thực thi](../plans/2026-11-02-unified-user-access.md) và [báo cáo hiện hành](../../reviews/2026-11-03-self-profile-and-cutover.md) ghi bằng chứng. Main hiện V38; hai Admin đã chuyển đổi. Phần phân tích source/snapshot bên dưới mô tả thời điểm lập thiết kế.

Bổ sung được duyệt ngày 03/11: cả bốn loại tài khoản tự sửa tên, avatar và thông tin liên hệ; ID/loại tài khoản chỉ đọc. Ngoại lệ này cho Khách chỉ áp dụng hồ sơ của chính mình, không mở quyền ghi dự án. Xem [contract hồ sơ cá nhân](../../api/self-profile.md).

## 1. Mục tiêu và quyết định đã xác nhận

- Không chọn Tester/Dev khi tạo hoặc thêm tài khoản vào dự án. User thường có hợp các quyền nghiệp vụ Tester và Dev cũ.
- Giữ điều kiện của từng thao tác hiện hành: membership, người được phân công/người tạo, dự án/Feature đang hoạt động, trạng thái, optimistic version, CSRF và audit. Hợp nhất loại tài khoản không biến User thành PM.
- Form tạo tài khoản có ID đăng nhập, tên, mật khẩu và hai checkbox Admin/Khách. Không tích: User. Admin: quyền PM hiện tại. Khách: chỉ xem tiến độ, biểu đồ và báo cáo trong dự án được thêm vào.
- Nếu tích cả hai, bấm tạo phải mở popup cảnh báo và giữ nháp; không tạo tài khoản. Backend cũng phải từ chối tổ hợp này.
- Quyết định cuối thay yêu cầu một Admin tổng: giữ hai tài khoản `admin`, `admin2`, tên tương ứng ID. `admin.local` đổi thành `admin`; `syp.demo.admin` đổi thành `admin2`; khóa `handover.admin`, không xóa lịch sử.
- Mật khẩu của hai tài khoản dùng giá trị người dùng đã cung cấp qua phiên làm việc. Không chép mật khẩu/hash cố định vào spec, migration, source, log hay dữ liệu demo được commit.
- Luồng Feature/Bug–QA, version test/ngày thực hiện, UI bố cục và dữ liệu hiện hành được bảo toàn. Không khôi phục các luồng run/retest/file session đã nghỉ.

## 2. Hướng thiết kế và lựa chọn

**Chọn mô hình cố định bốn loại tài khoản, kiểm quyền theo hành động và ngữ cảnh dự án.** Mã nội bộ đề xuất giữ `ADMIN` cho Admin tổng, `PM` cho Admin dự án để giảm thay đổi không cần thiết; bổ sung `USER`, `GUEST`. Không có lựa chọn TESTER/DEV cho dữ liệu hiện hành. Nhãn giao diện không dùng mã kỹ thuật để gây nhầm Admin với Admin tổng.

Phương án khác là xây trình cấu hình role/permission động. Phương án này cho phép nhiều cấu hình hơn nhưng thêm cơ chế cấp quyền, UI cấu hình và tổ hợp cần kiểm thử không nằm trong yêu cầu. Không chọn cho đợt này.

Không chỉ đổi nhãn TESTER thành User hoặc gán đồng thời hai role cũ: các nhánh loại trừ Dev, điều kiện chọn assignee và thứ tự nhánh status sẽ vẫn gây sai quyền. Mỗi policy phải xét hành động cụ thể, dùng hợp các quyền được phép chứ không dùng giao hoặc lấy nhánh đầu tiên.

## 3. Mô hình tài khoản và định danh

| Loại hiển thị | Mã nội bộ dự kiến | Cách tạo | Phạm vi |
| --- | --- | --- | --- |
| Admin tổng | ADMIN | Hai tài khoản được thiết lập khi chuyển đổi/bootstrap | Quyền quản trị toàn hệ thống hiện hành |
| Admin dự án | PM | Chỉ tích Admin | Quyền PM trong dự án mình quản lý |
| User thường | USER | Không tích | Hợp quyền Tester và Dev theo từng chức năng |
| Khách | GUEST | Chỉ tích Khách | Chỉ đọc tiến độ/biểu đồ/báo cáo dự án có membership hoạt động |

ID đăng nhập là trường `username` hiện có, không phải khóa UUID `identity_users.id`. Giữ quy tắc chuẩn hóa/duy nhất hiện hành và nhãn UI đổi thành “ID đăng nhập”; `displayName` hiển thị là “Tên”. Không tự sinh hoặc đổi tất cả ID cũ sang dạng syp_userNNN; đây chỉ là ví dụ định dạng hợp lệ. Giữ UUID và password hash hiện có cho tài khoản khác.

Tài khoản nội bộ vẫn dùng quy tắc mật khẩu 12–128 ký tự hiện hành khi tạo/reset qua UI. Ngoại lệ kỹ thuật đề xuất: thao tác thiết lập riêng hai Admin tổng nhận giá trị đã được người dùng chỉ định qua cấu hình cục bộ bảo mật, không hạ chuẩn chung để đáp ứng mật khẩu của hai tài khoản này. Thao tác thiết lập dùng PasswordEncoder của ứng dụng.

Hai Admin tổng được nhận diện bằng UUID ổn định trong danh sách tối đa hai vị trí quản trị hệ thống; không nhận diện quyền bằng chuỗi username hoặc displayName. Lưu hai vị trí với ràng buộc duy nhất/giới hạn tại DB và serialize thay đổi liên quan. Không có API/form tạo Admin tổng thứ ba. `handover.admin` giữ bản ghi nhưng bị khóa, thu hồi phiên và không nằm trong hai vị trí; không được dùng nút bật tài khoản chung để khôi phục quyền tổng. Quyền quản trị dựa trên tài khoản đang hoạt động và vị trí quản trị hợp lệ, kể cả tại bước tạo authorities của phiên.

## 4. Form và API tài khoản

- Form dùng hai boolean `isProjectAdmin`, `isGuest`; mặc định false. Submit không còn role selector.
- Hai ô có thể cùng được tích trong nháp để đúng hành vi người dùng yêu cầu; bấm tạo thì hiện dialog “Không thể chọn đồng thời Admin và Khách”, nút quay lại chọn, không gửi POST và không mất nội dung nhập.
- Request với cả hai true gửi trực tiếp tới backend trả422 với mã lỗi riêng. API không chấp nhận client tự cấp `ADMIN` hoặc giả mạo loại khác qua trường role cũ; contract mới được kiểm chặt, lỗi có thể hiểu được trên UI.
- Không tích -> USER; Admin -> PM; Khách -> GUEST. Backend tự ánh xạ, không tin quyền gửi từ frontend.
- Giữ quy tắc ủy quyền tạo tài khoản hiện có: chỉ Admin tổng hoặc PM đã được cấp `canCreateUsers`. PM được cấp chỉ tạo User thường, không tạo Admin dự án/Khách hoặc cấp quyền tiếp. Entry PM được đổi từ “Tạo tài khoản Tester” thành “Tạo tài khoản”; ẩn hai checkbox tại entry này và backend vẫn kiểm lại.
- Quyền sửa tên/ID/reset mật khẩu/khóa tài khoản vẫn dành cho Admin tổng như hiện tại. Không mở UI đổi loại tài khoản hoặc vai trò thành viên vốn đã bị bỏ.
- Sau đổi ID/mật khẩu/loại/quyền, tăng account version và thu hồi phiên bị ảnh hưởng. Tài khoản bị khóa không còn quyền đọc hoặc ghi bằng phiên cũ.

## 5. Membership và quyền User thường

Membership mới: PM, USER, GUEST; MEMBER chỉ giữ cho bản ghi attribution/lịch sử nội bộ không cấp quyền hoạt động. Không tạo membership trùng theo từng công việc Tester/Dev. Giữ ID membership cũ để các assignment không đứt.

- TESTER/DEV hiện có -> USER ở account và membership tương ứng; không thay actor/assignee ID hay lịch sử.
- PM vẫn là PM, nhãn “Admin dự án”. Admin tổng có quyền toàn hệ thống như hiện tại; membership thật trước đây vẫn được giữ và chuyển TESTER/DEV cũ sang USER nếu có.
- Admin tổng thêm được Admin dự án/User/Khách đang hoạt động; Admin dự án chỉ thêm User thường, kế thừa giới hạn trước đây PM chỉ thêm Tester/Dev. Danh sách loại trừ thành viên hiện tại trước phân trang; không mở lại chọn vai trò.
- Phân công case cho User thường đang hoạt động. Phân công xử lý Issue cho User thường đang hoạt động. Cùng một membership nhận được cả hai loại công việc.
- Khách không xuất hiện trong picker phân công case, Issue hoặc nhận thiết bị nghiệp vụ. Không tính Khách là PM khi kiểm PM cuối cùng.

Quyền theo hành động:

| Hành động | User thường |
| --- | --- |
| Đọc nội dung dự án, case, Issue và lịch sử | Như hợp quyền đọc Tester/Dev, trong membership hoạt động |
| Nhận/phân công lại case theo luồng tự nhận hiện có | Giữ điều kiện của nhánh Tester hiện hành, không mở quyền phân công thay PM |
| Ghi Status, version test, ngày thực hiện | Theo quyền Tester và assignment hiện hành; tác động đúng case |
| Tạo Bug/QA, Bug monkey | Như quyền Tester hiện hành |
| Sửa/xóa mềm Bug monkey do mình tạo | Giữ điều kiện người tạo/trạng thái hiện hành |
| Xử lý Issue được giao | Như quyền Dev hiện hành |
| Chuyển trạng thái khi đồng thời là người tạo và người được giao | Hợp tập trạng thái mà hai nhánh cũ cho phép trên chính Issue đó |
| Bình luận/chứng cứ | Hợp quyền hai nhóm, vẫn kiểm scope, người tạo/assignee và lifecycle |
| Quản lý Feature/version, nhập Excel, sửa nội dung case, báo cáo quản trị | Không tự mở quyền ngoài hợp quyền hiện có; các thao tác PM giữ nguyên |

Các phép sửa dữ liệu không được bỏ qua kiểm tra quyền khi request được gửi lại bằng requestKey cũ. Issue resolved không tự đổi case thành OK; không thay trạng thái nghiệp vụ vì gộp loại tài khoản.

## 6. Khách: biên đọc riêng

Khách đăng nhập, xem thông tin tài khoản bản thân, đăng xuất, chọn dự án có membership hoạt động, xem tổng quan tiến độ/biểu đồ và danh sách/chi tiết báo cáo đã lưu trong các dự án đó. Không xem tổng quan toàn hệ thống. Gỡ membership hoặc khóa tài khoản chặn truy cập ngay ở backend, kể cả bằng URL cũ.

Thiết kế giới hạn đúng phần được yêu cầu: Khách không được mở workspace case/Issue, thành viên, kho máy, audit nội bộ, cấu hình, tài liệu nguồn hoặc các nút chỉnh sửa. Không có quyền tạo/sửa/xóa báo cáo, tạo báo cáo AI, chat AI hoặc cấu hình nhà cung cấp. Đây là giới hạn đề xuất của thiết kế theo phạm vi chỉ xem tiến độ/biểu đồ/báo cáo; không mở rộng các chức năng chưa được yêu cầu.

Không thêm GUEST vào guard đọc dự án chung rồi để mọi API GET kế thừa. Tách kiểm quyền xem báo cáo với kiểm quyền workspace; dùng endpoint/DTO tổng quan đọc phù hợp, lọc đúng projectId. Guest routes và backend allowlist phải xét cả method và resource, bao gồm các API AI ngoài `/projects`. Các GET phục vụ nghiệp vụ khác không được tự có quyền vì tài khoản đã đăng nhập.

Màn phân tích hiện vừa có biểu đồ vừa có editor báo cáo: tái sử dụng phần chỉ đọc; không mount editor, nút import, assignment hoặc cấu hình cho Khách. API summary chỉ trả trường cần để hiển thị báo cáo, không trả dữ liệu nội bộ thừa để rồi chỉ ẩn bằng CSS.

## 7. UI, metadata và AI

- Nhãn thống nhất: Admin tổng / Admin dự án / User thường / Khách. Checkbox vẫn tên Admin, có mô tả “Quản lý dự án, quyền tương đương PM; không phải Admin tổng”.
- Cập nhật danh sách/filter tài khoản, thành viên, form tạo dự án, assignee picker, account menu, quyền sidebar/router và landing sau đăng nhập.
- Admin tổng vào trang quản trị tổng như hiện tại; Admin dự án/User vào workspace được phép; Khách vào phần tổng quan/báo cáo dự án được tham gia, không rơi vào màn thiếu quyền mặc định.
- Worker capability trả từ backend là nguồn để bật nút; UI vẫn xử lý401/403/404/409/422, loading/empty/retry và giữ nháp.
- Tác vụ AI từng dành cho Tester hoặc Dev nay dùng được bởi USER theo source/ownership cũ. Không gán purpose PM cho USER. Các mã purpose và hội thoại cũ có thể giữ để đọc lịch sử, nhưng không dùng role cũ lưu trong thread để cấp quyền; kiểm lại tài khoản và phạm vi hiện hành trước đọc/gửi/áp dụng.
- Khách không nhận context AI qua các endpoint danh mục, portfolio, thread/message hoặc retry. Thay quyền và membership làm mất hiệu lực quyền cũ/fingerprint như thiết kế hiện hành.

## 8. Chuyển đổi dữ liệu và triển khai an toàn

Phân tách migration có thể chạy trên mọi máy với thiết lập hai tài khoản cụ thể của máy hiện tại:

1. Kiểm tra branch/head, schema version, account/membership mapping, username đích, PM cuối cùng và tình trạng backend. Sao lưu mới; thống kê/hash trước đổi. Không sửa V1–V36.
2. Migration mới thêm loại USER/GUEST và registry hai vị trí Admin tổng; chuyển các role hiện hành TESTER/DEV sang USER, giữ FK/ID. Lưu mapping chuyển đổi để kiểm chứng và khôi phục; không rewrite JSON audit/revision/attempt lịch sử.
3. Migration kiểm tra dữ liệu không nhất quán thay vì đoán quyền; source/test kiểm bootstrap/dataset demo cùng model mới. Nếu phát hiện mapping khác với snapshot đã kiểm tra, dừng bước chuyển tài khoản và báo rõ.
4. Thiết lập local ánh xạ hai UUID của admin.local/syp.demo.admin vào vị trí quản trị; đổi ID/tên, đặt mật khẩu bằng đầu vào riêng, khóa handover.admin, tăng version/thu hồi phiên. Không tạo lại ba người bằng UUID mới; không xóa membership, audit hoặc phân công của người bị khóa.
5. Nếu máy mới chưa có tài khoản, bootstrap nhận cấu hình riêng để thiết lập hai tài khoản theo model mới. Máy khác có tập tài khoản khác phải có mapping rõ ràng khi cutover; không nhúng UUID của máy này vào migration phổ quát hoặc âm thầm hạ quyền người khác.
6. Kiểm chứng account counts, membership, assignments, kết quả/version test, Issue, reports và lịch sử trước/sau; chỉ các trường có chủ đích mới thay đổi. Bản backup/file chứa mật khẩu nằm ngoài Git.
7. Cập nhật backend/frontend cùng phiên bản và yêu cầu đăng nhập lại; không cho runtime cũ ghi role TESTER/DEV sau cutover. Tắt/thu hồi phiên một mình không thay thế kiểm quyền server.

Source hiện có migration đến V36; Arena archive đang dự kiến V37. Số migration của thay đổi này chỉ chốt tại implementation sau kiểm tra toàn bộ SQL/Java migrations ở cả core/demo; nếu chiếm V37 thì cập nhật tham chiếu Arena sang version tiếp theo. Không đổi migration đã chạy để tránh trùng.

Rollback là phục hồi phối hợp app/schema/dữ liệu từ backup có kiểm chứng khi chưa có ghi mới, hoặc forward fix/mapping khôi phục phù hợp nếu đã có ghi mới. Không chỉ rollback binary về code cũ trên database có USER/GUEST.

## 9. Đối chiếu source và dữ liệu hiện hành

| Nhóm | File/module cần đưa vào kế hoạch thực thi | Điểm quan trọng |
| --- | --- | --- |
| Identity/session | `identity/IdentityUser`, `IdentityDtos`, `IdentityService`, `AuthController`, `AdminBootstrap`, `SessionAccountFilter`; `config/SecurityConfig` | DTO role hiện chỉ ADMIN/PM/TESTER/DEV, quyền tạo được delegate cho PM, phiên có account version |
| Project/admin | `project/ProjectService`, `MembershipRepository`, `ProjectActorService`; `admin/AdminProjectService`, `AdminOverviewService`, `DeviceInventoryService`, `ProjectLifecycleService` | Fixed role, PM-only, DEV exclusion, candidate filters/counts, attribution và last-PM |
| Testing | `feature/FeatureService`; `testcase/TestCaseService`, `TestDocumentService`, `TestDocumentEditingService` | Tester-only eligibility, requireNotDev, metadata canUpdateResult, version/date |
| Issues | `workitem/FeatureIssueService`, `WorkItemService`, controller retirement guards | Actor tester/dev tách biệt; assigned chỉ Dev; status filter hiện thu hẹp khi actor.dev true |
| Reports | `reporting/ManagementReportService`, ReportMetrics và các reporting/admin projections liên quan | Read hiện PM/Admin-only; write và read Guest phải tách |
| AI | `AiAccess`, `AiPurpose`, `AiContextService`, `AiPortfolioContext`, chat/provider/store policies | Role-purpose matching, source/membership và revocation |
| Legacy/integration | `execution`, `retest`, `qa`, `filework`, `integration/RedmineWorker` | Giữ API đã nghỉ đóng; kiểm read/history và background jobs với loại mới, không tái mở workflows |
| Frontend | `features/admin/UserCreateDialog`, AdminUsers/project forms, `features/auth`, `features/projects`, `features/testing`, `features/work-items`, `features/reports`, `features/ai`, `routes/AppRouter`, Sidebar/AppEntry | Role checks, account labels, create delegated entry, router và guest read-only |
| Schema/contracts/tests/docs | core/demo SQL + Java migrations, identity/project/reporting/AI contracts, permissions, seeds, acceptance tests, Arena references | Đối chiếu toàn bộ role literals; phân biệt nhãn lịch sử với quyền hiện hành |

Read-only database snapshot02/11/2026: admin.local có4 membership PM và1 TESTER; syp.demo.admin và handover.admin mỗi tài khoản có1 TESTER. Khóa handover.admin không làm mất PM cuối cùng. Tổng membership theo loại: ADMIN/PM4, ADMIN/TESTER3, PM/PM14, DEV/DEV25, TESTER/TESTER98; đều active. Đây là ảnh chụp kiểm tra, phải kiểm lại trước cutover; không coi snapshot là dữ liệu bất biến.

## 10. Nghiệm thu bắt buộc

1. Không tích checkbox tạo USER; một checkbox tạo đúng PM/GUEST; cả hai mở cảnh báo, không POST, giữ nháp; gọi API giả mạo vẫn bị chặn.
2. ID đăng nhập và tên độc lập; đăng nhập bằng ID đúng, trùng ID bị chặn; UUID và liên kết dữ liệu giữ nguyên sau đổi ID.
3. Cùng một USER thực hiện được một luồng kiểm thử và một luồng xử lý Issue, không đổi loại tài khoản.
4. Hợp quyền đúng trên Bug do mình tạo/được giao/đồng thời cả hai; không bị nhánh Dev chặn nhánh Tester. Case/Issue người khác vẫn theo điều kiện cũ.
5. Candidate/assignment picker có USER, không đòi TESTER hoặc DEV; loại GUEST và người đã bị khóa/gỡ membership; counts/pagination đúng.
6. USER không có các quyền quản lý trước đây chỉ dành PM/Admin; PM không có quyền toàn hệ thống do checkbox Admin.
7. Khách đọc được đúng summary/chart/report dự án được thêm; không đọc dự án khác hoặc workspace nội bộ bằng đổi URL/ID/API. Chặn mọi nghiệp vụ ghi, AI/chat và admin endpoints.
8. Guest view chỉ có thành phần đọc, không editor/nút sửa hoặc menu gây ngõ cụt; loading/error/empty và responsive không vỡ.
9. Hai tài khoản admin/admin2 có tên đúng và đăng nhập được bằng thông tin đã chỉ định; handover bị khóa, phiên cũ bị thu hồi, lịch sử còn nguyên. Không thể tạo/kích hoạt thêm quyền Admin tổng qua API thường; concurrent requests không vượt registry hai vị trí.
10. PM được delegate chỉ tạo USER; PM chưa delegate/USER/GUEST bị chặn tạo tài khoản. Giữ quyền sửa hồ sơ/reset mật khẩu của Admin tổng.
11. Tests quyền bằng API thật: unauthenticated, CSRF, spoof role/flags, stale version, replay sau thu hồi, archived project/Feature, cross-project, deleted version và ownership.
12. AI của USER có hợp tác vụ hai nhóm nhưng không vượt scope; lịch sử cũ đọc được khi còn quyền, không cần sửa role labels trong dữ liệu cũ để cấp quyền mới.
13. Migration fresh core, core+demo và upgrade snapshot hiện hành; kiểm trùng version, checksum cũ, UUID/FK/assignment/history và các registry constraints. Không chạy test ghi/xóa trên main.
14. Frontend suite, backend unit/native, build, Java diagnostics, contract checks; coverage đo riêng theo package/components đổi, không suy từ số test PASS. Chrome kiểm các entry và các loại tài khoản.

## 11. Checklist thiết kế và ranh giới thực thi

- [x] Đọc using-superpowers, brainstorming và hướng dẫn repository.
- [x] Xác nhận mục tiêu; User hợp quyền Tester/Dev, không hỏi lại câu hỏi chọn phạm vi đã làm rõ.
- [x] Đối chiếu code/API/schema và read-only mapping dữ liệu local.
- [x] So sánh mô hình cố định với phân quyền động; chọn mô hình cố định có capability theo hành động.
- [x] Viết thiết kế và tự review: không để quyền Admin checkbox trùng Admin tổng; không thay UUID; không cho Guest kế thừa read chung; không mở lại legacy writes; không lưu mật khẩu trong Git.
- [x] Người dùng review bản thiết kế viết này theo architectural gate của brainstorming: “Duyệt rồi nha”, 02/11/2026.
- [x] Sau review, dùng writing-plans để chia task/phụ thuộc/file/test/cutover tại kế hoạch liên kết phía trên.
- [x] Người dùng duyệt toàn bộ và cho thực hiện Native ngày 02/11/2026.
- [x] Thực thi và kiểm chứng theo kế hoạch được duyệt; bằng chứng U01–U10 và hồ sơ cá nhân tại báo cáo liên kết ở đầu tài liệu.

Các lựa chọn triển khai được nêu rõ để review: giữ mã ADMIN/PM nội bộ, chỉ Admin tổng thêm Khách, PM delegate chỉ tạo User, Guest chỉ có phần báo cáo và không AI, ngoại lệ mật khẩu giới hạn thao tác thiết lập hai Admin tổng. Đây là phạm vi kế thừa quyền cũ/giới hạn theo chức năng được yêu cầu, không phải tính năng phân quyền động mới.

Không commit/push tài liệu này tự động: AGENTS.md của dự án yêu cầu ủy quyền riêng cho tác vụ hiện tại. Lượt viết spec ban đầu chỉ kiểm tài liệu/JSON và truy vấn đọc; bằng chứng triển khai, test và cutover sau phê duyệt được ghi trong báo cáo hiện hành.
