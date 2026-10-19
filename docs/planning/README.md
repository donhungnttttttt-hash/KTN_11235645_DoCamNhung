# Kế hoạch phát triển theo sprint

Yêu cầu bàn giao 19/10: người dùng cho phép commit toàn bộ thay đổi source hiện tại và push `system-design`. Phạm vi gồm backend/frontend, tests, migration, scripts và tài liệu; giữ `var/` (log, dữ liệu/bằng chứng thô, file tạm) ở máy local. Báo cáo có tóm tắt kiểm chứng trong Git; đường dẫn bằng chứng `var/` chưa được xuất bản cùng source. Không merge/deploy; FR-12/S11 vẫn IN_REVIEW. Các ghi chú chưa commit/push bên dưới là snapshot trước yêu cầu bàn giao này.

Admin entry/UIUX19/10: [sửa menu sau đăng nhập, popup/focus/form và responsive](../reviews/2026-10-19-admin-entry-uiux.md), [checklist](2026-10-19-admin-entry-uiux.md). 1100/1100 frontend test (120 file), build PASS trên hash 320 file ổn định; Chrome desktop/mobile/low-height theo từng receipt. Coverage chưa đo mới; không nghiệm thu mọi button/trạng thái. Bảo toàn baseline 3.374 file, không sửa backend/schema/config, không ghi nghiệp vụ/commit/push. UX-002/011 và UAT còn mở; FR-12/S11 IN_REVIEW. Các ghi chú cũ bên dưới là checkpoint lịch sử, trạng thái main hiện hành xem STATUS.json.

Follow-up UI/Chrome19/10: [main5173/API404,7lỗi UI sửa và980FE](../reviews/2026-10-19-fixreports-ui-followup.md). Công cụ upload lỗi dù user xác nhận quyền bật; không quy lỗi user. MainV30 chưa đồng bộ, cần quyền restart cụ thể theo prompt; vẫn S11 IN_REVIEW.

FixReports19/10: [kế hoạch FR-00–FR-12](2026-10-19-fixreports-implementation-plan.md), [kết quả/skills/A01–A20](../reviews/2026-10-19-fixreports-implementation-review.md). Source và kiểm thử cô lập đã chốt:975FE/645offlineBE, các native suites vàsnapshot mainV30→33 bảo toàn7.362row cũ PASS; browser4vai trò có upload/kiểm manual còn riêng. Main8080V30 chưa nâng cấp/restart; project12SPIDER-PLUS/PM syp.lab.pm03 được thêm theo user cho phép. LiveAI/UAT/cutover chưa thực hiện, S11 IN_REVIEW; không commit/push.

Chat chỉ chọn phạm vi18/10: [bỏ tác vụ/tìm nguồn/file-ticket, tự lấy ngữ cảnh dự án](../reviews/2026-10-18-ai-chat-scope.md). Mặc định toàn bộ dự án được phép; chọn riêng dùng PROJECT_CHAT, gợi ý gửi ngay và giữ nhập tự do/lịch sử cũ. FullFE896 rồi finalAI60,165BE AI/13native/coverage/build PASS; Chrome app thật1combo/320px và fixture gửi đúng scope. Local8080 PID28580/tmsV30/UP, dữ liệu cũ giữ nguyên, không migration mới/live call/commit/push. S11 IN_REVIEW.

Điều chỉnh AI tiếp theo18/10: [bấm câu hỏi có sẵn gửi ngay](../reviews/2026-10-18-ai-preset-send.md). Dùng cùng send/lock/retry; giữ nháp tự viết, khóa khi chưa đủ điều kiện gửi. RED7→GREEN35; hồi quy AI60/4file, coverage AiChat và build PASS; Chrome fixture giả lập xác nhận1click/1request, pending và nháp còn nguyên. Không backend/schema/live call mới hoặc commit/push; S11 IN_REVIEW.

AI tổng hợp dự án18/10: [Các dự án của tôi và bốn câu hỏi có sẵn](../reviews/2026-10-18-ai-my-projects.md). Backend lọc membership/Admin, fingerprint kiểm tra xuyên vòng đời chat; KPI theo ReportMetrics và mẫu việc/case của chính người hỏi. 893FE/162BE AI/9native/14runner/live synthetic1 PASS, coverage/build và browser320px; local8080/V30/healthUP, dữ liệu trước/sau giữ nguyên. Chất lượng nghiệp vụ thực tế/UAT còn mở, S11 IN_REVIEW; không commit/push.

Sửa chat AI18/10: [contract Caheo và Enter gửi tức thời](../reviews/2026-10-18-caheo-chat-send.md). Tái hiện HTTP200 nhưng field `answer` sai schema `text`; làm rõ instructions, giữ validation. UI xóa composer/hiện câu hỏi ngay, giữ bản nháp và same-key khi chưa rõ kết quả. 890FE/151BE AI/build/live chat PASS; Chrome thread3 trả lời câu chào, backend PID7000/readiness200. Coverage đã đo; giữ S11 IN_REVIEW, không commit/push.

Kết nối AI 18/10: [Caheo/gpt-5.6-luna](../reviews/2026-10-18-caheo-ai-connection.md). Endpoint server-only có allowlist, key local được bảo vệ/backup ngoài Git; probe Java thành công không dữ liệu dự án. 149 test AI và loader PASS, backend đã restart/readiness200, metadata ADMIN có model sẵn sàng. Chất lượng tác vụ AI cần đánh giá riêng; S11 IN_REVIEW, không commit/push.

Đồng nhất màu 18/10: [bộ màu kết quả kiểm thử](../reviews/2026-10-18-result-colors.md). 5 biến màu dùng chung, 7 file CSS; 425 test FE và build PASS, Chrome kiểm tra 42 mẫu/0 lệch màu. Màu theo lựa chọn của người dùng; giữ S11 IN_REVIEW, chưa commit/push.

Review tài liệu17/10: [KL.zip so với source TMS](../reviews/2026-10-17-kl-documents-review.md).24nhóm sai lệch, ma trận14UC/22sơđồ/25bảng và hướng biên tập; không sửa Word/source nghiệp vụ, không chạy test/DB hoặc commit/push trong tác vụ review này. Các ý tưởng khách/BrSE được tách khỏi chức năng nội bộ đã triển khai; giữ S11 IN_REVIEW.

Yêu cầu mới17/10: người dùng cho phép commit và push phần audit16–17/10 cùng tinh chỉnh UI/UX lên nhánh hiện tại `system-design`. Quyền một lần này thay giới hạn commit/push của hai đợt bên dưới; không cho phép merge/deploy hoặc thay đổi các gate kiểm chứng. Các ghi chú chưa push là trạng thái tại thời điểm kiểm tra.

Tinh chỉnh UI/UX17/10: [cải tiến, ảnh trước/sau và giới hạn](../reviews/2026-10-17-uiux-refinement.md). Shared selection/filter/focus, lỗi tải/retry và phản hồi member đã sửa; full FE884/82files, coverage đo mới và build PASS. Chrome component fixture375/768/1440 dùng mock/API blocked; backend đang tắt nên chưa chứng minh tích hợp. Zoom200%/touch/AT/UAT còn mở, S11 IN_REVIEW; không commit/push.

Rà soát hiện hành16–17/10: [ma trận luồng,5lỗi sửa,skill và bằng chứng](../reviews/2026-10-16-workflow-audit.md). FE872/79files, BE552unit, coverage đo mới, build và DB chỉ đọc76bảng/185FK/10liên kết không vi phạm. Native V29/browser/UAT còn gate riêng; S11 IN_REVIEW. Yêu cầu đợt này không cho commit/push/merge/deploy/PR, restart/tạo server/container hoặc chạy fixture trên database sử dụng; quyền một lần11/10 bên dưới là lịch sử.

Yêu cầu mới 11/10: người dùng cho phép commit và push các thay đổi đã kiểm chứng lên nhánh hiện tại `system-design`. Quyền này chỉ áp dụng cho lần bàn giao này, không bao gồm merge/deploy. Các ghi chú “chưa push” bên dưới phản ánh thời điểm review trước yêu cầu mới.

Rà soát sâu 11/10: [source, button và liên kết dữ liệu](../reviews/2026-10-11-deep-source-buttons-review.md). Đọc 354 file/29.224 dòng; sửa 12 lỗi, FE856, BE552 unit và 60 native PASS. Coverage FE 86,98/84,22/81,65/86,83; Java264 không lỗi/cảnh báo. Không đồng nhất kiểm tra source với UAT mọi trạng thái; giữ S11 IN_REVIEW, không commit/push.

Kết quả thực thi 11/10: [nghiệp vụ đã chốt](2026-10-11-execution-document-results.md), [kiểm chứng](../reviews/2026-10-11-execution-document-results.md). Sửa popup mặc định NG; lần thực thi mới nhất cập nhật cột iPad một chiều, sửa iPad không đổi lượt test lần 2. FE846, native32 và lượt BE127 có test trùng PASS; JDT263source0lỗi0cảnhbáo, build/contract PASS. Backend local đã chạy lại V29, dữ liệu cũ giữ nguyên; không push, S11 IN_REVIEW.

Rà lại nút 11/10: [các lỗi mới và bằng chứng](../reviews/2026-10-11-button-recheck.md). Sửa submit nhầm, bàn giao một phần, điều hướng muộn, focus/retry/phản hồi; full FE842, coverage toàn FE 86.85/83.95/81.35/86.65, build/contract PASS. Có ảnh Chrome; không commit/push, giữ S11 IN_REVIEW.

Rà soát nút thao tác 11/10: [nguyên nhân, sửa chữa và bằng chứng](../reviews/2026-10-11-action-buttons-audit.md). Bàn giao nhiều máy có người nhận chung, thông báo thiếu dữ liệu và phản hồi cạnh nút; sửa thêm validation/lưu/phân trang/retry AI ở các module đang dùng. 822 FE, 547 unit BE, 16 native/inventory PASS; không commit/push.

Sửa luồng 11/10: [kế hoạch W1–W7](2026-10-11-workflow-repair.md), [kiểm chứng](../reviews/2026-10-11-workflow-repair.md), [hướng dẫn sử dụng](../user-guides/project-testing-workflow.md). Giao theo file/khoảng ID, chia Tester, phản hồi lưu thành viên, bổ sung máy tại dự án và sửa UI dùng chung. Local V29; 791 FE, 547 unit BE, hồi quy native/migration và JDT 0 lỗi/cảnh báo PASS. Giữ S11 IN_REVIEW và không commit/push.

Sửa bổ sung 11/10: [nút giao test lần 2](../reviews/2026-10-11-second-test-assignment.md). Admin/PM mở hộp phân công cho case nháp và duyệt phiên bản ngay trong hộp; hướng dẫn khi thiếu đợt/cấu hình/Tester. 765 test frontend và build PASS; không đổi backend/schema, không commit/push. Giữ S11 IN_REVIEW.

Quyết định mới 10/10: [Admin tổng toàn quyền và khôi phục nút kết quả](2026-10-10-admin-full-authority.md), [kiểm chứng](../reviews/2026-10-10-admin-full-authority.md). Thay chế độ Admin chỉ xem; vòng bấm Unexecuted → OK → NG → P → NA → Unexecuted. Local V28; frontend 756, backend unit 546, native hồi quy 35 test PASS, Java 0 lỗi/cảnh báo. Không commit/push; giữ S11 IN_REVIEW.

Sửa bổ sung 10/10: [chọn thiết bị và 39 Java Problems](../reviews/2026-10-10-device-picker-java-problems.md). Nhóm nút/hướng dẫn responsive; Eclipse kiểm tra 256 file còn 0 lỗi/0 cảnh báo; 20 test FE và 69 test BE liên quan PASS. Không commit/push.

Bổ sung bảng tài liệu 10/10: [kế hoạch](2026-10-10-document-workspace.md), [review](../reviews/2026-10-10-document-workspace.md). Toolbar/phân trang ở trên, sửa ô có revision/lịch sử, PM phân công test lần 2 liên kết run thật; Flyway V27, 748 test frontend PASS. Giữ S11 IN_REVIEW, không commit/push.

Bổ sung linkage/UI 10/10: [kế hoạch](2026-10-10-workflow-linkage-audit.md), [review](../reviews/2026-10-10-workflow-linkage-review.md). Search dropdown, bộ lọc một hàng, phóng to ticket và nguồn Excel trước phân công; audit 73 bảng/179 FK, integration V26 và kiểm thử frontend. Không push.

Bổ sung UI 10/10: [popup và danh sách lựa chọn](2026-10-10-ui-dialog-selection-audit.md), [kiểm chứng](../reviews/2026-10-10-ui-dialog-selection-audit.md). Modal quản trị, bộ lọc/chọn tất cả/cột chọn-tên dùng chung; 736 test frontend PASS, kiểm tra responsive Chrome. Giữ riêng các giới hạn UAT/thiết bị thật và không push.

Bổ sung 10/10: [Admin tổng nhập Excel và nhập nhiều file](2026-10-10-admin-excel-import.md). Quyền import tách khỏi quyền thực thi; V26 lưu đúng identity người nhập không cần membership. Không push khi chưa có yêu cầu mới.

Phần mở rộng AI ngày 10/10: [kế hoạch](../superpowers/plans/2026-10-09-role-ai.md), [đặc tả theo vai trò](../product/AI-ASSISTANCE.md). Không gộp trạng thái nghiệm thu model live vào S11; gate số dư API và đánh giá chất lượng người dùng được ghi riêng.

Mở rộng đã duyệt ngày 10/10: [nguồn AI và chat nổi](../superpowers/plans/2026-10-10-ai-providers-chat.md), [thiết kế](../superpowers/specs/2026-10-10-chatgpt-plan-connection-design.md). Đã triển khai lựa chọn ChatGPT/API/Ollama và hội thoại riêng lưu tạm MySQL; backend local đã lên V25, code đã qua review/sửa lỗi và kiểm chứng local; xem báo cáo bàn giao. OAuth và chất lượng model live phải được kiểm chứng riêng, không suy từ tài khoản trả phí.

Chỉ đạo mới nhất ngày 10/10: giữ cả ba nguồn AI và chat, hủy yêu cầu hoàn tác trước đó. **Không còn quyền push thường trực: chỉ push sau một yêu cầu rõ ràng mới của người dùng.** Chỉ đạo giữ tính năng không phải cho phép push; chưa merge/deploy phần mở rộng này.

Bàn giao ngày 09/10: [kiểm nghiệm và V22](../reviews/2026-10-09-verification-demo-v22.md), thêm [100 user/120 thiết bị](../database/demo-v22.md), sửa focus form kho máy. Local đã lên V22; giữ S11 IN_REVIEW cho các gate UAT/môi trường thật.

Bàn giao ngày 06/10: [tài khoản theo vai trò, sửa cảnh báo và kiểm thử thực tế](../reviews/2026-10-06-role-handover.md). Người dùng đã cho phép tạo tài khoản, kiểm thử và commit/push `system-design`; xem phạm vi trong `executionPolicy.handoverAuthorization`.

Baseline sản phẩm ngày 06/10/2026: [PRD và đặc tả TMS](../product/README.md), có ma trận source/test/UAT và từ điển V16. Người dùng đã duyệt toàn bộ phần F/Q mở rộng luồng công việc theo file/QA; đang triển khai theo [kế hoạch F/Q](../../tasks/plan.md) và [checklist](../../tasks/todo.md). Các gate database native/UAT vẫn theo dõi riêng, chưa phải sprint DONE. Phần kế hoạch nền phía dưới giữ lịch sử lập ngày 22/09; trạng thái hiện tại xem STATUS.json.

**Mục đích:** khi nhận “Làm Sprint X”, mở đúng sprint và biết cần làm gì, kiểm tra ra sao, khi nào dừng. Không triển khai tất cả chức năng cùng lúc.

Lập ngày **22/09/2026**, dựa trên source `bd7e482` của `feature/Fontend-design` và hai tài liệu người dùng cung cấp. Theo yêu cầu tiếp theo, đã tạo `feature/sprint-01-foundation` từ `develop` tại `3355cfc` và thực hiện Sprint 01 với FE + BE + MySQL + Flyway V1. Xem [hướng dẫn chạy](../development.md) và [quyết định phạm vi](../decisions/ADR-001-sprint-01-foundation.md).

## Bắt đầu ở đâu

1. Đọc [STATUS.json](STATUS.json) để biết sprint/task đang dở, sprint gần nhất hoàn thành và `executionPolicy`. Từ yêu cầu 29/09/2026, người dùng cho phép tiếp tục tuần tự các sprint sau S06: hoàn tất/kiểm chứng từng sprint rồi chuyển tiếp khi đủ điều kiện, không hỏi lại phê duyệt chung. Không bỏ qua quyết định nghiệp vụ còn thiếu.
2. Đọc [quy trình thực hiện](06-execution-guide.md), rồi đúng file sprint bên dưới.
3. Đọc rule/contract/database liên quan, kiểm tra prerequisite với code thực tế.
4. Giữ phạm vi rõ theo từng sprint, ghi kết quả/test/blocker vào trạng thái và nhật ký. Theo quyền tiếp tục tuần tự đã được cấp, chuyển sang sprint kế tiếp đủ điều kiện; không gom task của nhiều sprint để bỏ bước kiểm chứng.

Ví dụ: **“Làm Sprint 1 theo kế hoạch trong repo”**, **“Tiếp tục Sprint 5”**, **“Làm task S06-T02”**. Không cần gửi lại toàn bộ tài liệu. [AGENTS.md](../../AGENTS.md) ở gốc repository hướng dẫn các lần làm sau đọc kế hoạch này.

## Lộ trình

| Sprint | Phạm vi | Đầu ra chính | Trạng thái hiện tại |
| --- | --- | --- | --- |
| [00](sprints/SPRINT-00.md) | Khảo sát và quyết định | Discovery, master plan; các câu hỏi được chốt theo gate | Tài liệu đã lập; IN_REVIEW cho quyết định |
| [01](sprints/SPRINT-01.md) | Nền tảng kỹ thuật | Spring Boot, MySQL/Flyway V1, API client, test framework; theo dõi bằng terminal/log | DONE — xem nhật ký và bằng chứng |
| [02](sprints/SPRINT-02.md) | Danh tính và quyền | Login/session, Admin/PM/Tester; Admin cấp quyền tạo tài khoản cho PM | DONE — FE/BE/MySQL/Flyway V2; xem nhật ký |
| [03](sprints/SPRINT-03.md) | Cấu hình dự án | Membership, build/env/device, rule nội bộ có phiên bản, sổ tay | DONE nội bộ — review 30/09 |
| [04](sprints/SPRINT-04.md) | Thư viện test case | Case/revision gốc và bản Việt, Excel preview/import | IN_REVIEW |
| [05](sprints/SPRINT-05.md) | Thực thi kiểm thử | Review database, cycle, phân công, lần chạy có actor/build/context/history | DONE — coverage và E2E TESTER đã kiểm chứng |
| [06](sprints/SPRINT-06.md) | Công việc và bug | Structured bug, rule server, triage/evidence; board/list/lỗi chung dữ liệu | DONE — bản nội bộ ADR-006, xem review S06 |
| [07](sprints/SPRINT-07.md) | Retest và tính nhất quán | Xác minh bản sửa, đóng/mở lại lỗi đúng điều kiện, traceability | DONE nội bộ — review S07 |
| [08](sprints/SPRINT-08.md) | Tổng quan và báo cáo | NA/chốt đợt, KPI/tiến độ thật, export XLSX | DONE nội bộ — review S08 |
| [09](sprints/SPRINT-09.md) | Tracker ngoài | Redmine sandbox đã chọn; outbox/retry/đối chiếu | DONE nội bộ — ADR-009, review S09 |
| [10](sprints/SPRINT-10.md) | Kiểm tra toàn hệ thống | Regression, UAT, bảo mật, hiệu năng, phục hồi | IN_REVIEW — T02/T03 DONE nội bộ; T01 còn gate |
| [11](sprints/SPRINT-11.md) | Pilot và bàn giao | Triển khai thử, hướng dẫn, nghiệm thu và đánh giá đề tài | IN_REVIEW — gói/demo local đã có; chờ UAT/đích thật |

Có **39 task** (bổ sung S05-T00 review database và S08-T00 NA/chốt đợt theo quyết định người dùng), mỗi task chứa mục tiêu, files, thay đổi từng tầng, rule, tests, dependencies, risk và DoD. Ước lượng ngày công trong sprint chỉ để chia việc; chưa có deadline/capacity để gọi là lịch cam kết. Sau S01–S02 sẽ hiệu chỉnh và tách task nếu cần.

S01 có thể bắt đầu sau yêu cầu của người dùng với các đề xuất kỹ thuật đã ghi; không cần chờ mọi câu hỏi về S09/S11. Ngược lại, yêu cầu “làm Sprint 7” không tự cho phép làm toàn bộ S01–S06 còn thiếu.

## Trạng thái kiểm chứng ngày 30/09/2026

S01/S02/S03/S05/S06/S07/S08/S09 đã hoàn tất trong phạm vi nội bộ đã chốt. S03 đã hoàn thiện UI/API/version/audit và kiểm chứng lại; không còn dùng kết luận chỉ compile ngày 27/09. S04-T03 còn browser XLSX; S10-T01 còn browser/keyboard/mobile toàn chuỗi và UAT, T02/T03 DONE nội bộ. S11 đã mở phần chuẩn bị kỹ thuật theo yêu cầu 30/09; gói/demo local đã có, UAT và môi trường thật còn riêng. Xem [review S11](../reviews/2026-09-30-sprint-11.md). Xem [review hoàn thiện](../reviews/2026-09-30-review-completion.md) và [STATUS.json](STATUS.json). Chủ động [áp dụng skill ECC](../development-skills.md); không tự commit/push/merge/deploy hoặc ký UAT.

## Các mốc kiểm soát phạm vi

- **Sau S03:** có nền tảng và cấu hình thật; chưa gọi là TMS hoàn chỉnh.
- **Sau S07:** kiểm thử–bug–retest chạy được trong hệ thống; chưa tự khẳng định đồng bộ tracker.
- **Sau S08:** có thể demo quy trình nội bộ và số liệu thống nhất. Chưa tự dùng cho khách thật nếu rule/quyền/integration chưa đạt.
- **S09:** nếu khách bắt buộc mỗi bug phải có trên Redmine, khả năng gửi/đối chiếu được chấp thuận là điều kiện trước pilot. Chỉ hoãn adapter tự động khi khách chấp nhận phương án reference/export tương ứng; không âm thầm bỏ yêu cầu.
- **Sau S10/S11:** kết luận readiness dựa bằng chứng test/pilot, không dựa số màn hình đã thiết kế.

## Tài liệu và nguồn trách nhiệm

| Tài liệu | Dùng để làm gì |
| --- | --- |
| [01-discovery.md](01-discovery.md) | 18 mục khảo sát, bằng chứng code, điểm giữ/sửa/tạo, technical debt |
| [02-business-rules.md](02-business-rules.md) | BR-01…20, vòng đời, quyền dự thảo, Q01…14 và nghiệm thu |
| [03-master-plan.md](03-master-plan.md) | 49 mục kế hoạch tổng thể theo yêu cầu master |
| [04-database-and-migrations.md](04-database-and-migrations.md) | Schema blueprint, FK/index/transaction, chính sách Flyway/MySQL và nguồn chính thức |
| [05-api-contract.md](05-api-contract.md) | Inventory REST/DTO/errors/permissions dự kiến, use case rủi ro |
| [06-execution-guide.md](06-execution-guide.md) | Quy trình bắt đầu/tiếp tục/dừng sprint và Definition of Done |
| [STATUS.json](STATUS.json) | Trạng thái phát triển có thể đọc tiếp ở phiên làm việc sau |
| [backlog.md](backlog.md) | Những việc chưa đưa vào scope sprint |
| [Nguồn nghiệp vụ](sources/business-context.txt) | Bản sao nguyên văn attachment quy trình SY Partners |
| [Nguồn yêu cầu phát triển](sources/master-development-requirements.txt) | Bản sao nguyên văn master prompt người dùng cung cấp |

Hai nguồn được giữ trong repo để không phụ thuộc đường dẫn attachment của một máy. Nếu có yêu cầu mới, cập nhật quyết định/master plan/task; không sửa lại nguồn gốc để làm như đã có từ trước.

## Quyết định quan trọng còn mở

1. Redmine đã chọn, TMS là nguồn trạng thái nội bộ (ADR-007/009); mapping/quyền tracker khách và phạm vi pilot vẫn cần xác nhận (Q10/Q13).
2. Bộ rule khách thật, mười hay danh sách trạng thái khác, quyền đóng/reopen (Q02–Q04).
3. Retest đủ trên bao nhiêu case/thiết bị (Q05). Q06 đã chốt: Fix là dev báo đã sửa, tester phải kiểm thử lại; không tự tính là OK.
4. Mẫu Excel khách hàng, cách tính NA/P/tỷ lệ và quyền khách xem (Q07–Q09). S04 đã chốt dùng mẫu Excel nội bộ trước và chỉ PM dự án được phê duyệt phiên bản test case; xem [ADR-004](../decisions/ADR-004-test-case-import-and-approval.md).
5. Lưu trữ evidence, quy mô, môi trường pilot (Q11/Q14).

Chưa có câu trả lời không chặn lập kế hoạch hoặc foundation độc lập, nhưng không được tự bịa rồi gắn là rule khách. Khi đến sprint liên quan mới hỏi gọn phần cần thiết.

## Quy tắc giữ nguyên

S02 đã hoàn thành trên `feature/sprint-02-auth`, mang nền S01 chưa commit từ checkpoint stash; chưa merge vào develop. **Tạo tài khoản chỉ cho Admin hoặc PM được Admin cấp quyền; Tester không có quyền.** PM được cấp ở S02 chỉ tạo Tester; chỉ Admin tạo Admin/PM hoặc cấp/thu hồi quyền. Chưa mở khách hàng; quyền dự án S03 không thay quyền hệ thống này. Chi tiết [ADR-002](../decisions/ADR-002-internal-auth.md).

Giao diện tiếng Việt; sáu menu đã thống nhất và Bảng công việc có Bảng Kanban/Danh sách bên trong. Backend do Codex phụ trách; React hiện dùng JavaScript. MySQL/Flyway quản lý dữ liệu/schema; V1 của S01 đã kiểm tra trên MySQL thật. Blueprint SQL/API nghiệp vụ vẫn là proposal đến khi từng task triển khai/kiểm tra hoàn thành. Nhánh tích hợp là `develop`; phải kiểm tra lại trạng thái nhánh ở mỗi lần làm. Việc hoàn thành S01 không tự cho phép commit/push/merge hoặc bắt đầu S02.

### Checkpoint main FixReports19/10/2026

Người dùng đã cho phép nâng mainV30→33 và restart8080. Hoàn tất backup mới khi writer dừng, kiểm7.374 hàng cũ ngoài session giữ nguyên,10file/711case và12GET200; Chrome5173 mở được các màn mới, reload giữ workspace. FR12/S11 còn IN_REVIEW cho các gate manual/tool/live/UAT và ngoại lệ nguồn, không còn chờ quyền cutover. Xem [báo cáo](../reviews/2026-10-19-fixreports-ui-followup.md). Không commit/push/merge.

### Checkpoint audit UI/UX toàn hệ thống 19/10/2026

Đợt audit mới kiểm kê 92 mục route/biến thể/component/adapter và ghi trạng thái riêng cho từng mục; không phải 92 màn hình độc lập hoặc mọi nút đã PASS. Kết quả cuối có 14 finding (2 P1, 11 P2, 1 P3) và 12 nhóm rủi ro/chưa tái hiện; UX-014 được bổ sung sau đối chiếu cuối quyền tạo Tester của PM. Xem [báo cáo](../reviews/2026-10-19-uiux-system-audit.md), [coverage](../reviews/2026-10-19-uiux-system-coverage.md), [kế hoạch sửa chưa thực hiện](../reviews/2026-10-19-uiux-system-repair-plan.md). 78 test component hiện có vừa chạy đạt, không thay thế browser/runtime coverage. Không sửa source ứng dụng, không restart/migration/commit/push; các write chỉ thuộc fixture cô lập.

Người dùng chốt trong audit: Admin được xác nhận ngoại lệ có lý do đối với đợt kiểm thử/retest cũ đang chặn lưu trữ dự án, giữ nguyên lịch sử; không suy thành bỏ qua blocker hiện hành khác. Quyết định này được đưa vào kế hoạch RX-02, chưa triển khai. FR-12/S11 tiếp tục IN_REVIEW, mọi gate manual/tool/live/UAT còn mở.

### Rà lại và sửa đúng phạm vi Tổng quan — 19/10/2026

Theo người dùng đính chính, chỉ thay khối Công việc gần đây bằng Thông tin dự án trong Tổng quan; giữ trạng thái công việc và mốc phát hành. Đã sửa UX-015 theo đúng phạm vi, dùng số Issue hiện hành và metadata mốc, không khôi phục workflow cũ. RED5→GREEN10; full frontend985/985/106file và build PASS, Chrome main/fixture320/390/768/1440 có bằng chứng. Rà lại toàn bộ nhóm source/control:14finding cũ cònOPEN, không dùng testPASS để đóng; giữ lỗi focus thoáng qua và các sourcegap mới trong [báo cáo lần hai](../reviews/2026-10-19-uiux-recheck-and-overview-correction.md). Không backend/migration/restart/ghi nghiệp vụ/commit/push; S11/FR-12 vẫnIN_REVIEW.

### Hoàn thiện UI/UX và trạng thái thao tác — 19/10/2026

Đã áp dụng skill UI/UX và sửa frontend theo ba nhóm: Admin/Auth/General, Testing/Issue, Reports/AI; thống nhất bo góc, chuyển động và focus, sửa hộp thoại, giữ nháp, xử lý xung đột và đăng nhập lại. AST kiểm kê 997 control ở 111 file; đây không phải 997 nút đã bấm. Lượt toàn frontend trên source cuối đạt 1.048/1.048 test và build PASS; coverage dòng tại checkpoint là 87,74%. Chrome đã kiểm bốn role và các kích thước đại diện, chưa hoàn tất UAT. Trong 14 finding cũ, 11 có sửa source và test giả lập, 1 còn một phần, 2 còn mở; xem [báo cáo chi tiết](../reviews/2026-10-19-uiux-polish.md). Giữ dữ liệu và source cũ; không thay backend, migration, restart, commit hoặc push. FR-12/S11 vẫn IN_REVIEW.
