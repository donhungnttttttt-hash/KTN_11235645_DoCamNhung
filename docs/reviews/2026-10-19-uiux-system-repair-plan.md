# Kế hoạch sửa UI/UX hệ thống — 19/10/2026

> **Hướng dẫn cho agent triển khai:** Khi được giao thực hiện, dùng `executing-plans` hoặc phương thức thực thi được người dùng chọn; đọc SKILL.md trước khi dùng. Các checkbox dưới đây **chưa thực hiện**. Đợt hiện tại chỉ audit, không commit/push/merge/deploy. Không coi tài liệu này là lệnh tự khởi động việc sửa.

**Mục tiêu:** Loại bỏ các điểm chặn thao tác và mất ngữ cảnh/nháp đã xác nhận, giữ đúng luồng Feature/Issue và quyền hiện hành.

**Kiến trúc:** Sửa tại thành phần sở hữu hành vi: bố cục Modal, trình soạn và nháp, ngữ cảnh điều hướng, API xem trước và chính sách vòng đời dự án. Giữ React JavaScript + Spring Boot + MySQL/Flyway; tái sử dụng điểm tích hợp và kiểm thử hiện có, không đổi hệ thống thiết kế hoặc khôi phục luồng run/retest đã bỏ.

**Công nghệ:** React 18 JavaScript, Vite/Vitest/Testing Library; Java/Spring Boot, MySQL cài trực tiếp + Flyway. Dùng trình duyệt thật để kiểm hiển thị/focus, fixture cô lập để kiểm thao tác ghi và xử lý đồng thời.

**Đặc tả:** [Báo cáo và finding UX-001–014](2026-10-19-uiux-system-audit.md), [ma trận bao phủ và khoảng trống](2026-10-19-uiux-system-coverage.md), [nghiệp vụ đã làm rõ và chốt](../planning/2026-10-19-fixreports-clarification.md). Số dòng source là mốc tại ngày audit; người triển khai kiểm lại trước khi sửa.

## Giới hạn chung

- Giữ nhánh `system-design`, mọi thay đổi có sẵn và dữ liệu cần giữ. Không reset/clean hoặc tự tạo server/container/cài dependency để vượt thiếu môi trường.
- Admin có quyền toàn hệ thống, không cần membership dự án; dự án đã lưu trữ vẫn theo chính sách chỉ đọc của server. Quyền AI liên dự án của PM không mở rộng CRUD thông thường.
- Status: Unexecuted → OK → NG → P → NA → Unexecuted. P và NA tính đã test, NA nằm trong mẫu số, không có case thì tiến độ bằng 0%; tiến độ không phải nghiệm thu.
- Feature/file/case độc lập; không áp lại điều kiện build/device/run, không đưa luồng retest cũ trở lại.
- Chính sách mới đã được người dùng chọn: **Admin xác nhận ngoại lệ có lý do đối với đợt kiểm thử/retest cũ đang chặn lưu trữ; giữ nguyên lịch sử**. Ngoại lệ không bỏ qua bất kỳ blocker nào khác.
- Ghi dữ liệu kiểm thử chỉ ở fixture cô lập có guard schema/origin. Không chỉnh Status/phân công/thiết bị/main chỉ để thử nút. Không gửi dữ liệu dự án thật sang AI.
- Mỗi sửa hành vi: tái hiện bằng test thất bại có ý nghĩa → sửa tối thiểu → chạy kiểm thử hồi quy phù hợp → kiểm hành trình trên trình duyệt tại đúng route. Test một giá trị CSS đơn lẻ không thay thế kiểm bố cục/focus trên trình duyệt.
- Chỉ đánh dấu hoàn tất khi AC tương ứng có bằng chứng; NOT_RUN còn giữ trong coverage. Không tự commit/push/merge/deploy hoặc restart/migrate môi trường đang dùng.

## Trọng tâm review

1. Modal mở từ ô trong bảng cuộn, ngoài phần tử cha mang CSS cũ: control không bị cắt; focus không bị giữ tại vùng ngoài màn hình. Task RX-01.
2. Hai người cùng sửa Note/phân công: nháp và bản mới trên server cùng được trình bày; không ghi đè khi chưa đối chiếu. RX-03/RX-07.
3. Thao tác ghi đã thành công nhưng phản hồi hoặc lượt tải lại thất bại: phục hồi không ghi lặp, không báo chưa lưu khi dữ liệu đã lưu. RX-11. Lỗi đọc chat được xử lý riêng tại RX-12.
4. Dự án/tài khoản/quyền thay đổi trong khi đang đọc hoặc ghi: không lẫn dữ liệu, không mất nháp mà không báo, không mở rộng quyền. RX-04/RX-06/RX-09/RX-12.
5. Lưu trữ dự án có đồng thời tồn cũ và blocker hiện hành: ngoại lệ chỉ cho đúng loại, có lý do/nhật ký/phiên bản và không xóa lịch sử. RX-02.

Các task độc lập có thể làm theo thứ tự ưu tiên sau khi được giao; RX-01 nên hoàn tất trước khi nghiệm thu các luồng Issue. Phụ thuộc: RX-01 → RX-08 và phần kiểm Issue trên trình duyệt của RX-06; RX-02 độc lập với các task khác nhưng cần contract trước UI; RX-03/04/05/07/09/10/14 độc lập. Phần phục hồi tạo báo cáo của RX-11 phụ thuộc quyền sở hữu nháp tại RX-04; các phần khác của RX-11 và RX-12 được xử lý sau khi tái hiện rủi ro. RX-13 đo/hoàn thiện sau khi sửa component gốc; RX-15 là bước kiểm tổng hợp cuối.

## RX-01 — Khôi phục Modal/drawer Issue và sở hữu vòng đời đóng

**Finding:** UX-001; kiểm bổ sung R01. **Priority:** P1.

**Files dự kiến:** `Frontend/src/app/features/work-items/components.jsx`, các file cùng thư mục `work-items.css`, `work-items-live.css`, `FeatureIssuesPage.jsx`, `CaseIssueAction.jsx`, `FeatureIssueForm.jsx`, `FeatureIssueDetail.jsx`; `Frontend/src/app/styles/work-board.css`; `Frontend/src/app/hooks/useDialogFocus.js` chỉ nếu chứng minh cần. Test hiện có: `testing/testing-modal.test.jsx`, `work-items/modal-expand.test.jsx`, `FeatureIssuesPage.test.jsx`, `CaseIssueAction.test.jsx` và kiểm thử tích hợp route tương ứng.

**Interfaces:** Modal phải sở hữu bố cục lớp phủ/header/body/actions, độc lập với phần tử cha của route. Caller cung cấp rõ trạng thái đang xử lý/có nháp chưa lưu. Giữ props và hành vi của caller cũ trừ khi thay có kiểm soát; không thêm selector toàn cục thiếu phạm vi. Chọn wrapper hay portal sau khi kiểm vùng cắt trong grid, thứ tự các lớp và focus. Đầu ra: cùng một Modal dùng được từ danh sách, bảng trạng thái và ô case.

**Skills:** `implement`, `frontend-ui-engineering` cho kích thước/cuộn/focus; `frontend-patterns` cho quyền sở hữu trạng thái xử lý/nháp; `tdd`/`test-driven-development` trong cùng một vòng hành vi; `code-review` cho mọi caller và ảnh hưởng CSS.

- [ ] Tạo test hồi quy với đúng cấu trúc cha của route hiện tại: mở form monkey/chi tiết/tạo Issue từ case, kiểm lớp phủ thao tác được; kiểm đóng khi đang xử lý và Escape khi có nháp riêng, không coi việc chủ động bấm Hủy luôn là lỗi.
- [ ] Chạy test xác nhận RED đúng thiếu sót; giữ ảnh/số đo UX-001 làm mốc trên trình duyệt.
- [ ] Sửa phạm vi CSS/bố cục của component; nếu dùng portal thì quản lý focus, trả về trigger, thứ tự lớp và khóa cuộn trang đúng; giữ select/menu lồng hoạt động. Nối trạng thái xử lý/nháp của component con với chính sách đóng hoặc giữ nháp tại thành phần sở hữu rõ ràng.
- [ ] Chạy test các caller cũ/mới và Chrome ở 320/390/768/1440, viewport thấp, nội dung dài, dạng thường/mở rộng; kiểm Tab/Shift+Tab/Escape, bấm lớp nền/X và trả focus.

**AC:** tới được tiêu đề và hành động bằng chuột/bàn phím; form case không bị ép theo chiều rộng ô; modal không thành đoạn cuối trang; mở rộng thực sự đổi kích thước; không khóa cuộn trang khi lớp phủ không hiển thị; không mất theo dõi kết quả đang xử lý khi đóng; hộp chưa sửa vẫn đóng nhanh. **Rủi ro hồi quy:** z-index với header/sidebar/chat, hai modal lồng, phục hồi vị trí cuộn, kiểu Status/icon tại từng route. Zoom 200%/cảm ứng cần kiểm riêng nếu công cụ chưa hỗ trợ.

## RX-02 — Ngoại lệ archive cho đợt/retest cũ, có lý do và lưu lịch sử

**Finding:** UX-002. **Priority:** P1 có điều kiện. **Dependencies:** quyết định đã chốt trong audit; không hỏi lại quyền áp dụng policy này khi được giao sửa.

**Files:** `Backend/src/main/java/vn/syp/tms/admin/ProjectLifecycleService.java`, controller/DTO/store vòng đời hiện có; `Frontend/src/app/features/admin/AdminProjectLifecycle.jsx`, API client và `docs/api/project-lifecycle.md`. Test `AdminProjectLifecycle.test.jsx`, `AdminProjectLifecycle.integration.test.jsx`, các suite native về vòng đời/quyền hiện có. Chỉ thêm migration nếu cơ chế lưu hiện tại không đủ ghi quyết định ngoại lệ; không tự chạy migration trên main.

**Interfaces:** readiness phân biệt blocker hiện hành với đợt kiểm thử/retest cũ được phép xác nhận ngoại lệ. Lệnh lưu trữ nhận xác nhận và lý do cho đúng blocker được chọn, giữ version/request key hiện có; server kiểm ADMIN, lý do và bản chụp blocker. Lưu người quyết định, thời điểm, lý do, loại và số lượng blocker cùng quyết định; giữ nguyên lịch sử cũ. Chỉ ngoại lệ `UNFINISHED_CYCLES` và `OPEN_RETESTS` thuộc luồng cũ đã xác định; không tự mở rộng sang phiên file cũ hoặc blocker khác.

**Skills:** `api-design` cho readiness/command/audit contract; `security-review` cho quyền/bypass scope; `deprecation-and-migration` nếu cần persistence; hành vi TDD và `frontend-ui-engineering` cho confirmation.

- [ ] Tạo fixture cô lập chỉ có đợt/retest cũ và fixture có đồng thời máy/công việc hiện hành; viết test thất bại cho thiếu lý do, tài khoản không phải Admin, phiên bản cũ và gửi lại cùng yêu cầu.
- [ ] Bổ sung contract và kiểm tra ngoại lệ có lý do ở server; không ép hoàn tất/xóa dòng dữ liệu cũ. Phiên file cũ hoặc blocker khác chỉ được xét mở rộng khi đã phân loại và có quyết định riêng phù hợp.
- [ ] UI giải thích đúng phạm vi, cho xem điều được ngoại lệ và lý do; thay hướng dẫn đi hoàn tất màn đã ngừng bằng hành động hỗ trợ hiện tại.
- [ ] Lưu trữ/mở lại dự án dùng riêng cho kiểm thử, đọc lại nhật ký/lịch sử, đối chiếu hash dữ liệu cũ; chạy test quyền, xử lý đồng thời và gửi lại yêu cầu.

**AC:** Admin lưu trữ được khi chỉ còn loại tồn được phép ngoại lệ, đã xác nhận và nhập lý do; lý do rỗng hoặc tài khoản không phải Admin bị từ chối; blocker hiện hành không bị vô hiệu hóa; gửi lại cùng yêu cầu chỉ ghi một quyết định; bản readiness cũ không vượt kiểm tra hiện tại; mở lại/xem lịch sử được. **Risk:** quyền ngoại lệ bị mở quá rộng hoặc làm sai nghĩa lịch sử; phải kiểm server trước UI.

## RX-03 — Phục hồi khi Note gặp lỗi 409, giữ nháp và đối chiếu bản mới

**Finding:** UX-003. **Files:** `Frontend/src/app/features/projects/ProjectNotes.jsx`, `ProjectNotes.test.jsx`, `services/api/notes.js`; `Backend/src/main/java/vn/syp/tms/notes/ProjectNotesService.java` chỉ đổi khi contract đọc hiện tại thật sự thiếu.

**Interfaces:** dùng `notesApi.get`/version hiện có; tách bản gốc khi mở sửa, bản server mới nhất và nháp. Có bước đối chiếu/thử lưu do người dùng chọn; không tự gán phiên bản mới rồi ghi đè bằng nội dung cũ.

**Skills:** `frontend-patterns` cho chuyển trạng thái, `api-design` cho lỗi 409/thử lại, `frontend-ui-engineering` cho đối chiếu/focus; TDD khi triển khai. **Dependencies:** không phụ thuộc Modal Issue.

- [ ] RED: mở sửa v0 → người khác lưu v1 → lỗi 409 → tải lại → thấy bản mới/nháp → người dùng giải quyết xung đột và lưu với phiên bản đã đối chiếu. Kiểm thêm thay đổi v2 và Note mất quyền/bị xóa.
- [ ] Thực hiện phục hồi có giữ nội dung nhập; lỗi/tải lại không hủy trình soạn hoặc trộn Note khác.
- [ ] Chạy các suite Note/settings hiện có và kiểm trên trình duyệt với hai người sửa trong fixture, ở 768/390.

**AC:** không còn vòng lỗi 409 lặp lại với chỉ dẫn không giúp phục hồi; nháp không mất, server vẫn chặn xung đột; hủy/bỏ nháp rõ ràng; chuyển dự án/tài khoản không lộ nháp. Kiểm xung đột xóa riêng, không sao chép giả định từ thao tác sửa. **Risk:** ghi đè chưa đối chiếu hoặc nháp gắn sai Note.

## RX-04 — Nháp báo cáo theo tài khoản/dự án/báo cáo và chính sách thoát

**Finding:** UX-004; phần chống tạo lặp thuộc RX-11. **Files:** `ManagementAnalysisPage.jsx`, `ManagementAnalysisPage.test.jsx`, `App.jsx`, `ProjectSelector.jsx`, tiện ích giữ nháp hiện có nếu có thể tái dùng. Không tự lưu dữ liệu nghiệp vụ.

**Interfaces:** khóa nháp gồm tài khoản sở hữu, dự án, báo cáo hoặc phạm vi Feature của bản soạn mới; chỉ xóa sau khi lưu thành công, người dùng chủ động bỏ nháp hoặc đổi tài khoản. Dùng bộ nhớ nháp/chặn thoát nhất quán, không tạo vòng điều hướng không thoát được.

**Skills:** `frontend-patterns`, `security-review` để tách dữ liệu theo tài khoản, `frontend-ui-engineering` cho xác nhận bỏ nháp; hành vi TDD. **Risk:** nháp dự án A hiện trong B hoặc nháp riêng tồn sang tài khoản khác.

- [ ] RED khi rời route/quay lại, đổi dự án A → B → A, sửa báo cáo đã lưu, lưu lỗi/thành công, đổi tài khoản; xác định hành vi tải lại/đóng trang trong test riêng.
- [ ] Thực hiện chính sách sở hữu/thoát ở mức cần thiết, thống nhất guard nháp khi đổi Feature/báo cáo với lúc rời route.
- [ ] Kiểm component và nháp giả trên trình duyệt, gồm điều hướng bằng bàn phím; không ghi báo cáo trên main.

**AC:** nháp giữ đúng phạm vi hoặc người dùng có thể hủy điều hướng/bỏ nháp trước khi mất; lưu thành công xóa trạng thái chưa lưu, lưu lỗi giữ nháp; tài khoản khác không phục hồi nội dung của người trước.

## RX-05 — Chuẩn hóa contract ID nguồn trong import preview

**Finding:** UX-005. **Files:** `Backend/src/main/java/vn/syp/tms/feature/FeatureService.java`, `Frontend/src/app/features/test-cases/ExcelImportPreview.jsx`, `ImportExcelDialog.jsx`, `services/api/features.js`, `testCases.js`; contract và các test native/UI về import hiện có.

**Interfaces:** chọn field chuẩn và adapter có chủ đích cho các caller còn được hỗ trợ; `caseNo` trong response Feature hiện tại phải được ánh xạ đúng tới phần hiển thị, không giả định có `sourceCaseKey`. Đầu ra: ID nguồn chính xác ở preview một file/nhiều file.

**Skills:** `api-design`, `frontend-patterns`, TDD hành vi. **Dependency:** bước kiểm upload qua trình duyệt độc lập; có thể sửa/kiểm API và component trước.

- [ ] RED bằng payload thực của endpoint Feature với ID `1`, `TC-A`, ID Unicode; không dùng mock chung chỉ có mảng dòng rỗng.
- [ ] Sửa DTO/adapter/renderer tại một boundary, giữ identity và mẫu import cũ còn hỗ trợ.
- [ ] Kiểm preview một file/nhiều file/trạng thái lỗi và roundtrip cô lập; nếu `setFiles` vẫn bị công cụ từ chối thì ghi nhập qua trình duyệt là NOT_RUN, không đổi bảo mật/cấu hình trình duyệt để vượt giới hạn.

**AC:** IDs đúng tuyệt đối, không blank/undefined, original/current export và số case không đổi ngoài hành vi hiển thị. **Risk:** sửa một caller làm hỏng preview legacy hoặc commit identity.

## RX-06 — URL giữ dự án/bộ lọc và điều hướng chi tiết case hữu dụng

**Findings:** UX-006/007; kiểm thêm R11. Hai thay đổi có thể review/test độc lập trong cùng đợt sửa điều hướng. **Files:** `FeatureIssuesPage.jsx`, route helpers/ProjectProvider/AppRouter; `TestingDocumentPage.jsx`, `DocumentCaseDialog.jsx`; `FeatureIssuesPage.test.jsx`, `TestingDocumentPage.test.jsx`, các test điều hướng.

**Interfaces:** hàm tạo route giữ `projectId`, `view/from`, bộ lọc/trang/kích thước trang; URL phải đồng bộ với Quay lại/tải lại mà không chọn nhầm dự án. Điều hướng case dùng đúng thứ tự đã lọc và các biên, không suy chỉ số từ ID nguồn có thể không liên tục.

**Skills:** `frontend-patterns`, `codebase-design` route ownership, `frontend-ui-engineering` focus/navigation, `security-review` scope; TDD. **Dependency:** RX-01 cho nghiệm thu Issue detail; case callback có thể làm độc lập.

- [ ] RED: đổi bộ lọc → tải lại/Quay lại; URL Issue sao chép từ dự án A khi mở trong tài khoản đang chọn B phải chọn đúng A hoặc từ chối; phạm vi không hợp lệ không lộ dữ liệu; ID case hợp lệ nhưng không tồn tại có thông báo.
- [ ] RED với case đầu/giữa/cuối và biên bộ lọc/trang; chọn nối callback hoặc bỏ nút không hỗ trợ kèm giải thích.
- [ ] Sửa hàm tạo ngữ cảnh/caller case, chạy test router/Issue/testing; kiểm nhiều dự án và file nhiều case trên trình duyệt.

**AC:** tải lại/Quay lại không âm thầm mất phạm vi; URL không phụ thuộc dự án đã lưu trong trình duyệt để đoán Issue; mở/đóng trở về đúng danh sách/bộ lọc; Trước/Tiếp không phải nút luôn bị khóa. **Risk:** vòng cập nhật URL/state, hiển thị dữ liệu dự án cũ khi đổi phạm vi, xác định nhầm dòng đầu/cuối.

## RX-07 — Lịch sử phân công và đối chiếu khi gặp lỗi 409

**Finding:** UX-009; R02 cần tái hiện. **Files:** `DocumentAssignments.jsx`, `TestingDocumentPage.jsx`, API `features.js`, `FeatureController/FeatureService` projection nếu cần tên lịch sử; tests assignment/history hiện có. Component mới chỉ nếu giúp một trách nhiệm rõ, không tạo màn run/retest.

**Interfaces:** tái dùng `assignment-history` với người thay đổi, thời điểm, membership trước/sau, version và cursor. Hiển thị tên người có nghĩa kể cả membership cũ không còn trong danh sách thành viên hiện tại. Khi tải lại sau lỗi 409, phải đưa `latest.items` vào phần đối chiếu, không chỉ đổi version/key.

**Skills:** `api-design` projection/history, `frontend-patterns` draft/current comparison, `frontend-ui-engineering` discoverability/focus, `security-review`; TDD. **Risk:** lẫn assignee với người thực thi hoặc thay assignment mới mà người dùng chưa nhìn thấy.

- [ ] RED với lịch sử A → B → C, phân biệt người thao tác, phân trang/thử lại/phạm vi chỉ đọc; UI có lối vào từ file/case.
- [ ] RED với hai người sửa phân công gây lỗi 409: hiển thị cả phân công mới nhất và dải case đang soạn để đối chiếu; Tester tự nhận không chiếm phạm vi trái quyền.
- [ ] Thực hiện lối xem lịch sử và bước giải quyết xung đột do người dùng chọn; chạy test và ma trận dải case/biên/quyền trên trình duyệt với fixture.

**AC:** hai cột đầu tiên/gần nhất không thay thế lối xem lịch sử đầy đủ; không nhầm người được phân công với người thực sự ghi Status; thấy được nháp giữ lại và phân công mới nhất trước khi thử lưu; giữ đúng phạm vi/phiên bản API, không thêm workflow retest.

## RX-08 — Keyboard entry cho Issue popover; đo fan-out trước tối ưu

**Finding:** UX-008; R09/R10. **Files:** `CaseIssueAction.jsx`, `CaseIssueAction.test.jsx`, CSS/portal của preview Issue; chỉ đổi response tài liệu nếu kết quả đo dẫn tới lựa chọn lấy số lượng theo lô.

**Interfaces:** trigger có quan hệ với preview và cách đưa focus vào nội dung/hành động bằng bàn phím rõ ràng; đóng/trả focus ổn định. Badge vẫn đếm cả Issue đã đóng, đúng Feature/tài liệu/dòng. Cách tải số lượng không được đổi ý nghĩa dữ liệu.

**Skills:** `frontend-ui-engineering`, `frontend-patterns`; `api-design` nếu batch; browser/e2e, performance tooling chỉ khi có thực. **Dependency:** RX-01 để create/detail usable.

- [ ] RED với Tab/Enter hoặc phím vào preview được hướng dẫn tại một dòng giữa bảng; không phải Tab qua toàn bộ phần còn lại để vào portal. Kiểm Escape, mất focus, phân trang và tạo/mở Issue bằng bàn phím.
- [ ] Thực hiện hành vi focus/neo popup; kiểm cuộn/đổi kích thước không làm popup rời vị trí neo.
- [ ] Đo số request/thời gian khi hiển thị 20/100 dòng, ghi rõ điều kiện; chỉ triển khai batch/cache/tải khi cần sau khi có căn cứ lựa chọn tối ưu. Kiểm số lượng chính xác và cập nhật cache sau khi ghi Issue.

**AC:** tới được nội dung popup mà không cần hover/canh thời gian; trả focus đúng trigger, chuột/cảm ứng vẫn dùng được; kết quả đo hiệu năng được báo đúng phạm vi, không suy SLA production từ phép đo local. **Risk:** tự lấy focus không phù hợp, popup tự đóng khi chuyển vào, số lượng cũ sau khi tạo Issue.

## RX-09 — Capability thống nhất với trạng thái archived và lời giải thích Status

**Findings:** UX-010/013. **Files:** `TestingFeaturesPage.jsx`, `TestingFeaturePage.jsx`, `TestingDocumentPage.jsx`, `ResultCycleButton.jsx`, `projectAccess.js`; role/archived/result-cycle tests.

**Interfaces:** `projectActive && (ADMIN || projectPM)` hoặc server capabilities có semantics tương đương; không cho UI role union vượt archived. Disabled reason phân biệt pending/error/readonly/permission.

**Skills:** `security-review`, `frontend-patterns`, `frontend-ui-engineering`, TDD. **Risk:** vô tình thu hẹp quyền Admin trên dự án đang hoạt động hoặc chỉ giấu UI mà server vẫn sai.

- [ ] RED: Admin trên dự án lưu trữ được đọc/xuất/xem lịch sử nhưng không có thao tác ghi được bật; Admin không membership vẫn quản lý được dự án đang hoạt động. Ma trận PM/Tester/Dev dựa trên capability backend.
- [ ] RED với lý do khóa Status theo từng trạng thái xử lý/quyền; giữ vòng Status năm bước và công thức P/NA.
- [ ] Sửa helper/caller và câu chữ, chạy các suite quyền/testing/kết quả; trình duyệt trên main chỉ đọc, kiểm ghi vào dự án lưu trữ trên fixture dùng riêng.

**AC:** không mở form chắc chắn bị từ chối với lỗi lưu trữ 409; lý do đúng và có cách đọc ngoài hover; kiểm quyền server giữ nguyên hoặc chặt hơn theo contract.

## RX-10 — Làm rõ Rules lịch sử và phạm vi Analysis

**Findings:** UX-011/012. Có thể tách hai PR khi được yêu cầu, vì độc lập. **Files:** `RulesPanel.jsx`, `InternalRulePolicy.java`, Rules DTO/service/docs/sidebar nếu cần; `ManagementAnalysisPage.jsx`, `ManagementReportService.java`, tests Rules/management summary.

**Interfaces:** Rules UI không hứa tác dụng trên Bug hiện tại nếu backend không áp dụng; giữ các phiên bản lịch sử, không khôi phục điều kiện build/device/run. Analysis giữ đầy đủ danh mục Feature để chọn; bảng áp dụng phạm vi đã chọn hoặc có tiêu đề nói rõ đang so sánh toàn dự án.

**Skills:** `grill-with-docs`, `api-design` current/historical contract, `frontend-ui-engineering`, impeccable Operate/clarify reference. **Dependencies:** không cần thay nghiệp vụ đã chốt. Nếu chọn thêm tác dụng policy mới thì đó là scope mới, không tự thực hiện.

- [ ] RED với Rules có DEMO sẵn/rỗng và vai trò reader/PM/Admin; câu chữ và quyền công bố phản ánh đúng tác dụng; không chỉ xóa field phía client khiến payload không hợp lệ.
- [ ] RED với hai Feature, so sánh chọn A và toàn dự án; danh mục trong dropdown, tiêu đề/bảng/Issue/đề xuất báo cáo diễn giải phạm vi nhất quán.
- [ ] Sửa phạm vi trình bày/contract ở mức cần thiết; kiểm UI và endpoint phù hợp, không công bố Rules trên main để thử.

**AC:** giữ lịch sử, không hướng dẫn bước thuộc workflow cũ; phạm vi rõ ràng, giữ đúng số liệu 3/5, P/NA và trường hợp không có case. **Risk:** biến sửa câu chữ thành đổi nghiệp vụ chưa duyệt; dropdown mất Feature vì lấy bảng đã lọc làm danh mục.

## RX-11 — Đã lưu nhưng tải lại lỗi, tạo báo cáo chưa rõ kết quả và trang cuối bị rỗng

**Risks:** R03/R04/R08; **chưa gọi là sửa lỗi đã tái hiện** trước bước RED. **Files:** `testingState.js`, Feature/file list/forms/assignment/cell callbacks, `ManagementAnalysisPage.jsx`, report API/DTO/service/store, device list paging hiện có; tests tại các boundary này.

**Interfaces:** phân biệt kết quả ghi với kết quả đọc lại; thử tải lại không gửi lại lệnh ghi. Nếu dùng khóa ý định tạo báo cáo và cơ chế gửi lại cùng yêu cầu, phải ràng buộc theo người thao tác/dự án/nội dung, giữ khóa khi phản hồi chưa rõ và giải thích cách phục hồi; không tạo trùng. Điều chỉnh trang danh sách theo tổng số/trang sau khi bỏ mục.

**Skills:** `systematic-debugging` để tái hiện, `api-design` cho chống ghi lặp, `frontend-patterns`, `security-review`, TDD; skill migration chỉ khi cần lưu thêm dữ liệu. **Dependencies:** phần tạo báo cáo phụ thuộc quyền sở hữu nháp tại RX-04 và cần contract trước UI; phần phản hồi tải lại/phân trang có thể làm độc lập.

- [ ] Dùng mock/fixture cô lập cho các tình huống: ghi thành công nhưng GET lỗi; báo cáo đã commit nhưng mất phản hồi; ẩn/lưu trữ/thu hồi mục duy nhất ở trang cuối. Ghi đúng hành vi thực tế trước khi sửa.
- [ ] Nếu RED xác nhận, sửa tại thành phần sở hữu hành vi nhỏ nhất; giữ định danh yêu cầu, phân biệt thông báo đã lưu với chưa tải lại được và điều chỉnh về trang hợp lệ.
- [ ] Kiểm chỉ một lần ghi/cùng ID báo cáo khi gửi lại, xung đột khi đổi payload, phiên bản cũ và quyền; thử lại trên trình duyệt với fixture và đối chiếu số dòng dữ liệu.

**AC:** người dùng biết dữ liệu đã lưu hay chưa; thử lại không tạo trùng; trang cuối không thành “trang 2/1”; lỗi đọc vẫn giữ nháp/bộ lọc. **Risk:** tự gửi lại lệnh ghi gây lặp, khóa báo cáo sai phạm vi, điều chỉnh trang gây vòng tải.

## RX-12 — Giữ vị trí đọc lịch sử chat và tách lỗi đọc có thể thử lại khỏi lỗi quyền

**Risks:** R06/R07; browser chưa tái hiện. **Files:** `AiChat.jsx`, `AiChat.test.jsx`, chat API error mapping nếu cần. Không đổi provider/OAuth/khóa trong đợt sửa UI.

**Interfaces:** thêm tin nhắn cũ vào đầu vẫn giữ vị trí đọc; chỉ tự theo tin nhắn mới khi phù hợp. GET lỗi có thể thử lại phải có lối tải lại cùng hội thoại; lỗi 401/403/404 thực vẫn che/xóa nội dung riêng khỏi UI và chặn gửi. Không tạo hội thoại/gửi tin mới để chữa một lỗi đọc.

**Skills:** `frontend-patterns`, `frontend-ui-engineering`, `security-review`, `e2e-testing`, TDD. **Dependency:** fixture hội thoại dài có phân trang và điểm giả lập lỗi một lần; không cần gọi AI thật.

- [ ] RED với hội thoại dài khi thêm tin cũ vào đầu: kiểm vị trí/độ lệch cuộn và tin mới khi đang ở cuối; so sánh lỗi mạng/503 tạm thời → thử lại với 403/404/đổi tài khoản.
- [ ] Nếu xác nhận, tách mục đích cuộn khỏi trạng thái đọc; giữ nháp, provider/model/phạm vi đã cố định và cơ chế bảo vệ pending/request key hiện có.
- [ ] Chạy test AiChat/AiConnections hiện có và trình duyệt thật ở 390/1440, viewport thấp; không gửi dữ liệu dự án sang provider để kiểm cuộn/thử lại.

**AC:** đọc tin cũ không nhảy về tin mới nhất; thử đọc lại giữ hội thoại/nháp; dữ liệu bị từ chối không xuất hiện lại do phản hồi đến muộn; câu hỏi có sẵn vẫn gửi một lần qua guard hiện có. **Risk:** hồi quy bảo mật riêng tư hoặc mất khả năng theo dõi phản hồi mới.

## RX-13 — Soft-hide và hoàn thiện responsive/visual có đo

**Risks:** R05/R10/R11/R12 và đề xuất tùy chọn. **Files:** `TestingFeaturePage.jsx`, contract/tài liệu liên quan tới ẩn file; CSS có phạm vi, bảng/modal/handbook tùy kết quả tái hiện. Không thiết kế lại toàn cục.

**Skills:** impeccable ở chế độ Operate, dùng reference audit/adapt/harden khi phù hợp; `frontend-ui-engineering`; `systematic-debugging`; TDD cho hành vi có lỗi. **Dependency:** sau khi sửa component gốc, tránh đo trên bố cục đã biết sai.

- [ ] Tái hiện ẩn file trên fixture riêng, xác định phạm vi/cách giữ dữ liệu/phục hồi hiện có; thiết kế xác nhận theo ngữ cảnh hoặc hoàn tác/phục hồi được hỗ trợ, đúng quyền. Không tự thêm xóa cứng.
- [ ] Đo nội dung dài, vị trí neo, bộ chọn lồng, focus khi thêm phiên bản handbook và viewport thấp; đối chiếu kích thước vùng bấm, focus, tương phản với tiêu chí W3C phù hợp và các ngoại lệ, không bắt buộc mọi control phải đạt 44px.
- [ ] Chỉ sửa vấn đề có bằng chứng; dùng token chung cho khoảng cách/chữ/viền khi cùng ý nghĩa và đã đánh giá các caller; giữ bảng màu đã chốt và control phía trên grid theo yêu cầu.

**AC:** hủy ẩn không ghi dữ liệu; xác nhận ẩn giải thích dữ liệu/lịch sử còn được giữ và cách truy cập/phục hồi được hỗ trợ; thay đổi hiển thị có bằng chứng trước/sau, số đo và tác động; hoàn thiện tùy chọn không được báo thành lỗi đã sửa. **Risk:** làm sai nội dung/cấu trúc bảng, mất control hoặc vùng cuộn hữu ích, đổi ý nghĩa giữ dữ liệu khi ẩn.

## RX-14 — Lối tạo tài khoản Tester cho PM được cấp quyền

**Finding:** UX-014. **Priority:** P2. **Trạng thái bằng chứng:** SOURCE_GAP đã được review độc lập; chưa tái hiện trên trình duyệt. Quyền đã chốt từ S02 và chưa bị C09 loại bỏ: PM chỉ được tạo Tester khi ADMIN cấp riêng `users:create`.

**Files dự kiến:** `Frontend/src/app/features/auth/AccountMenu.jsx`, `AuthProvider.jsx` và component/form tạo tài khoản phù hợp; `Frontend/src/app/features/admin/AdminUsers.jsx` nếu tách phần trình bày để tái dùng; `Frontend/src/app/services/api/admin.js` hoặc adapter tạo tài khoản dùng chung. Đối chiếu `Backend/src/main/java/vn/syp/tms/identity/IdentityService.java`, `Backend/src/main/java/vn/syp/tms/config/SecurityConfig.java`, `docs/business/permissions.md` và các test identity/security hiện có; chỉ sửa backend nếu kiểm thử phát hiện thiếu enforce, không mở rộng quyền.

**Interfaces:** tạo lối vào có thể tìm thấy trong không gian mà PM truy cập được, dựa trên vai trò PM và capability `users:create` hiện hành. Tái dùng lệnh `POST /api/v1/users` theo contract đã có; form dành cho PM cố định role `TESTER`, không có lựa chọn tạo ADMIN/PM/DEV hoặc cấp quyền tiếp. Backend vẫn kiểm quyền hiện tại và từ chối payload giả role khác. Không mở AdminApp hoặc danh sách tài khoản cho PM; không tự thêm người mới vào dự án, tạo membership hoặc đổi quy tắc chọn thành viên chưa thuộc dự án.

**Skills:** `api-design` đối chiếu capability/contract/lỗi; `security-review` cho quyền hiện tại, role cố định và tách quyền tạo với quyền đọc/quản trị tài khoản; `frontend-patterns` cho trạng thái form/nháp; `frontend-ui-engineering` cho entry, validation, focus và phản hồi; TDD hành vi. **Dependencies:** độc lập RX-01 và các task Feature; cần fixture PM được cấp quyền, PM chưa được cấp và quyền bị thu hồi. Không tạo tài khoản trên main để kiểm nút.

- [ ] RED: PM có `users:create` tìm thấy và mở được form tạo Tester; PM chưa được cấp, TESTER và DEV không có entry. Admin vẫn dùng luồng quản trị hiện có; PM không được vào Admin hoặc đọc danh sách tài khoản.
- [ ] RED với role cố định `TESTER`, sửa payload thành ADMIN/PM/DEV bị server từ chối; thu hồi quyền khi form đang mở hoặc trước submit không tạo tài khoản. Kiểm người mới không có membership tự sinh.
- [ ] RED các nhánh validation, username trùng, lỗi mạng/server, đang gửi và phản hồi thành công; chặn submit lặp. Nháp không mất vì lỗi có thể sửa; Escape/X khi đã nhập có chính sách giữ/bỏ rõ ràng, đổi tài khoản không lộ nháp. Không lưu mật khẩu vào browser storage/log/evidence; xóa mật khẩu khỏi state sau thành công hoặc đóng form theo chính sách đã chọn.
- [ ] Triển khai entry/form trong phạm vi quyền đã chốt, chạy test auth/identity/security liên quan và hành trình PM trên fixture cô lập. Kiểm keyboard/focus, hiển thị ở 390/768/1440 và thông báo quyền bị thu hồi; chỉ đánh dấu browser PASS sau khi thực chạy.

**AC:** PM được ADMIN cấp quyền tạo được đúng tài khoản Tester qua UI được phép truy cập; không phải nhờ mở Admin. PM không đọc danh sách tài khoản, không tạo role khác, không cấp quyền tiếp; server kiểm lại khi quyền thay đổi. Validation/lỗi/thành công và nháp có phản hồi rõ; không có membership tự động hoặc dữ liệu riêng lẫn tài khoản. **Risk:** tái dùng form Admin làm lộ role/quyền hoặc danh sách người dùng, capability cũ vẫn cho gửi, tự gán dự án ngoài nghiệp vụ, hoặc lưu mật khẩu không phù hợp.

## RX-15 — Gate hồi quy, nút chưa thử và bàn giao trung thực

**Coverage:** tất cả UX/R được sửa và mọi khoảng trống trọng yếu còn trong ma trận. **Files:** test liên quan, ba tài liệu audit/ma trận bao phủ/kế hoạch sửa, `docs/planning/STATUS.json` và nhật ký; không viết test chỉ để tăng số lượng. Chỉ cập nhật trạng thái triển khai khi thực sự được giao sửa và có bằng chứng mới.

**Skills:** `e2e-testing`, `verification-loop`, `verification-before-completion`, `requesting-code-review`/`receiving-code-review`, `handoff`. Chọn skill/công cụ kiểm trình duyệt theo khả năng thực tế, không tự cài MCP.

- [ ] Thực thi lại trên fixture riêng các nút **Lưu thành viên đã chọn**, **Bàn giao máy đã chọn**, thu hồi máy và các hành động Admin khác; kiểm rỗng/thiếu PM/thành công một phần/phiên bản cũ/phản hồi thành công theo từng người thao tác. Không coi nút có handler hoặc test cũ PASS là đủ.
- [ ] Kiểm bổ sung R01 ở các form Admin/Feature/phân công/ô case: phân biệt chủ động Hủy với Escape/X khi có nháp; chọn giữ nháp hoặc xác nhận bỏ nháp khi cần, kiểm khóa đóng trong lúc ghi. Giữ phạm vi từng form, không áp một chính sách đóng cho mọi hộp theo suy đoán.
- [ ] Hoàn tất các hành trình đăng nhập/Feature/import/phân công/Status/Issue/Dev/Note/báo cáo/chat tại điểm tích hợp được phép; nếu upload/download qua trình duyệt vẫn bị chặn thì ghi đúng và kiểm phần độc lập.
- [ ] Chạy test hồi quy đúng phạm vi sau từng thay đổi; cuối đợt chạy suite bắt buộc, build, kiểm contract và bảo mật phù hợp; đo coverage riêng nếu cần, phân biệt unit/native/trình duyệt thật.
- [ ] Reviewer độc lập kiểm P1/P2 và phạm vi; so baseline source/diff/dữ liệu fixture, bảo toàn dữ liệu thật; cập nhật PASS/FAIL/NOT_RUN và bằng chứng cho từng mục/checkpoint. Không tự commit/push.

**AC:** finding đã sửa có bằng chứng hồi quy và hành trình thực; không tuyên toàn bộ UI hoàn tất khi còn nút/trạng thái chưa kiểm; vẫn ghi rõ giới hạn công cụ, công nghệ hỗ trợ (AT), thiết bị thật, AI thật, UAT và NFR chưa giải quyết. Bước này không đòi kiểm mọi tổ hợp trạng thái không hữu ích.

## Self-review và tình trạng kế hoạch

Mapping đầy đủ: UX-001 → RX-01; UX-002 → RX-02; UX-003 → RX-03; UX-004 → RX-04; UX-005 → RX-05; UX-006/007 → RX-06; UX-009 → RX-07; UX-008 → RX-08; UX-010/013 → RX-09; UX-011/012 → RX-10; UX-014 → RX-14. R01 → RX-01 và kiểm bổ sung chính sách nháp/đóng tại RX-15; R02 → RX-07; R03/R04/R08 → RX-11; R06/R07 → RX-12; R05/R10/R11/R12 → RX-13; R09 → RX-08. R11 về case deep link còn được kiểm tại RX-06. Năm trọng tâm review có test tại task chịu trách nhiệm. Mọi task có file/hành vi/skill/phụ thuộc/rủi ro/test/AC; giữ nguyên tên field preview `caseNo`/`sourceCaseKey` để diễn đạt chính xác lỗi contract.

Tất cả checkbox vẫn mở. Không có task nào đã được triển khai bởi việc viết kế hoạch. Người thực hiện tiếp theo đọc báo cáo/matrix trước, dùng fixture cô lập và cập nhật evidence mới; không cần lặp lại toàn audit để bắt đầu sửa nguyên nhân đã rõ khi người dùng giao việc.
