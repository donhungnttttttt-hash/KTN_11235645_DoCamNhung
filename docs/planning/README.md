# Kế hoạch phát triển theo sprint

Phần mở rộng AI ngày 10/10: [kế hoạch](../superpowers/plans/2026-10-09-role-ai.md), [đặc tả theo vai trò](../product/AI-ASSISTANCE.md). Không gộp trạng thái nghiệm thu model live vào S11; gate số dư API và đánh giá chất lượng người dùng được ghi riêng.

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
