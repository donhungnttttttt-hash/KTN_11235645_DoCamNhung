# SYSTEM DEVELOPMENT MASTER PLAN

Phiên bản kế hoạch 1.0 — 22/09/2026. Baseline: `bd7e482`, nhánh `feature/Fontend-design`. Discovery đã hoàn tất bằng đọc source trước khi lập tài liệu này. **Đây là kế hoạch, chưa phải implementation.** Các rule khách chưa xác nhận được đánh dấu trong [business rules](02-business-rules.md), không coi là đã duyệt vì có tên trong roadmap.

## 1. Executive Summary

Phát triển TMS cho kiểm thử thủ công tại SY Partners trên nền giao diện React đã làm. Giữ sáu nhóm menu và Kanban/Danh sách trong menu con Bảng công việc. Bổ sung Spring Boot, MySQL, Flyway theo từng sprint; thống nhất dữ liệu case–execution–bug–tiến độ. Không triển khai toàn bộ một lúc. [STATUS.json](STATUS.json) và [file sprint](sprints/) là điểm bắt đầu mỗi lần làm.

## 2. Business Problem

Ticket thiếu điều kiện tái hiện; test case/bug/báo cáo nằm ở Excel/SharePoint, Redmine và Notion; cập nhật trạng thái độc lập dễ bỏ sót. Trao đổi đặc tả đi qua tester–BrSE–SHIFT–khách, thiếu nơi lưu quyết định có thể truy vết. Giải pháp cần giảm các thao tác lặp và làm rõ căn cứ của số liệu, không chỉ thêm màn hình quản lý.

## 3. Current Workflow

Khách/SHIFT cung cấp case Nhật → BrSE dịch Việt → PM phân công và chốt môi trường/build → tester chạy → NG ghi ticket theo rule → BrSE xác nhận → Dev tái hiện/sửa → tester retest đúng bản sửa → cập nhật case/ticket → báo cáo. Không tái hiện cần kiểm tra lại và kết luận có căn cứ, không tự coi là đã sửa. Chi tiết tại [discovery §2](01-discovery.md) và [business rules](02-business-rules.md).

## 4. Current System Architecture

`index.html → main.jsx → AppEntry/ProjectDataProvider → App → MainLayout/AppRouter → pages/features`. Chưa có backend, API hay DB. Ba nguồn dữ liệu trong trình duyệt: mocks ở App, work-items context, runner local state.

## 5. Current Code Analysis

Source được phân loại trong [discovery](01-discovery.md). Giữ cấu trúc pages/layouts/features, sửa từng điểm khi nối domain/API. Tệp legacy ngoài import graph không được dùng làm căn cứ chức năng đang chạy. Không rewrite toàn repo hay đổi stack frontend để “đúng kiến trúc”.

## 6. Current Frontend Analysis

React/JSX, Vite, Tailwind, Lucide, CSS riêng cho shell/work-items; có filter/list/board/form/drawer/overview. Dữ liệu mất khi reload; attachment chỉ tên; nhiều action, actor và số liệu là mẫu. Runner vừa sửa định nghĩa vừa đổi kết quả, thiếu persistence và audit thật. Giữ format giao diện đã thống nhất, tách hook/component ở sprint phụ trách.

## 7. Current Backend Analysis

Backend hiện chỉ `.gitkeep`. Không kết luận backend sai architecture: đây là phần chưa triển khai. S01 tạo foundation; S02+ thêm module từng use case. Backend do Codex thực hiện theo tài liệu người dùng; frontend có thể do Codex hoặc người/agent frontend khác, cùng contract.

## 8. Current API Analysis

Chưa có HTTP business API hoặc client tập trung. URL hash là route frontend, không phải endpoint backend. [API dự kiến](05-api-contract.md) là bản thiết kế; S01 tạo OpenAPI thực, mỗi sprint thêm contract trước implementation.

## 9. Current Database Analysis

Chưa có MySQL connection, schema, SQL migration hoặc repository. JS array/local state không phải DB. [Database blueprint](04-database-and-migrations.md) mô tả mục tiêu, không chứng minh bảng đã tồn tại.

## 10. Proposed Solution

TMS lưu case revision và execution có lịch sử; structured bug fields dùng rule có phiên bản; gắn execution với bug; server kiểm soát transition và retest; báo cáo lấy từ dữ liệu thống nhất. Với tracker ngoài, lưu reference trước và adapter theo quyết định nguồn chính. Không tự thay thế Redmine khi khách vẫn yêu cầu dùng.

## 11. Proposed Solution vs Current Code

| Khả năng cần có | Hiện tại | Hướng triển khai |
| --- | --- | --- |
| Shell sáu menu + submenu | Đã có | KEEP, regression S01 |
| Bảng công việc + lỗi chung một nguồn | Board/list chung context; /issues store riêng | EXTEND/REFACTOR S06 |
| Case có version/import | Danh sách/grid mẫu | EXTEND S04–S05 |
| Rule khách + bằng chứng | Mô tả mẫu/file chỉ tên | CREATE policy/storage S03/S06 |
| Retest và đóng lỗi nhất quán | Chưa có use case | CREATE S07 |
| Số liệu thật | Số mock và đếm work-items | REPLACE data source S08 |
| Redmine/API/DB/quyền | Chưa có | CREATE có thứ tự; S09 có gate |

## 12. What Is Already Correct

Frontend có component, shell và feature boundary; board/list chia sẻ filter/provider; UI tiếng Việt và sáu menu đúng yêu cầu; style được giới hạn phạm vi. Đây là tài sản giữ lại khi nối API. Không phải làm lại giao diện từ đầu.

## 13. What Is Incomplete

Persistence, auth, project scope, cấu hình rule, import case, assignment, execution history, evidence, traceability, lifecycle guard, metrics và adapter ngoài. Một số nút prototype chưa có hành vi thật. Theo dõi các phần này bằng task, không gắn nhãn DONE từ ảnh chụp UI.

## 14. What Is Architecturally Wrong

Nếu đem prototype dùng cho nghiệp vụ thật, việc mỗi view tự đổi trạng thái, tự sinh mã, gán actor hardcode và dùng các kho bug tách rời sẽ gây sai dữ liệu. Kanban/batch có thể bỏ rule đóng mà form kiểm tra. Đây là các boundary cần thay bằng use case chung; sự vắng mặt backend không tự nó là lỗi kiến trúc.

## 15. What Should Be Refactored

S01 sửa parse path/query và not-found; S04/S05 tách runner; S06 gom /issues và board/list theo canonical API, tách field editor/upload/hooks; S08 gỡ nguồn KPI mẫu. Legacy cleanup chỉ sau reference/build check; CSS/dependency cleanup không liên quan nằm backlog. Mỗi bước giữ một đường chạy được kiểm tra.

## 16. What Should Be Created

Backend modular monolith, API client/contracts, MySQL/Flyway, auth/permissions, catalogs/rules, case revisions/import, cycles/attempts, work item policies/evidence, retest, reporting, audit/concurrency, test suite, integration adapter nếu được yêu cầu và runbook triển khai pilot.

## 17. Target Architecture

Ứng dụng frontend React → feature hook/state → API client → REST. Backend một ứng dụng Spring Boot theo module: presentation/controller → application service → domain policy → repository/persistence → MySQL. File evidence ở storage riêng, metadata/quyền ở MySQL. HTTP tới tracker qua adapter và outbox nếu triển khai S09; không dùng microservices/message broker khi chưa có nhu cầu.

## 18. Domain Model

Project/Membership/Catalog xác định scope. TestCase là danh tính, TestCaseRevision là nội dung đã duyệt. Cycle giữ phạm vi; RunItem là case revision trong cấu hình cần chạy; ExecutionAttempt là một lần thực thi. WorkItem có subtype BUG và BugDetail; links giữa attempt và bug là N:N. RuleVersion, Confirmation, Verification/Retest, Evidence và Audit giữ căn cứ. Định nghĩa/table ownership xem [02](02-business-rules.md) và [04](04-database-and-migrations.md).

## 19. System Modules

Identity (S02); Project/Catalog/Rules/Handbook (S03); TestLibrary/Import (S04); Planning/Execution (S05); WorkItems/Bugs/Evidence/Triage (S06); Retest/Traceability (S07); Reporting (S08); ExternalIntegration (S09). S01 cung cấp nền, S10 xác minh toàn hệ thống, S11 pilot/bàn giao. Mỗi module được thêm khi sprint đó được yêu cầu.

## 20. Business Rules

[20 rule BR-01…BR-20](02-business-rules.md) có nguồn, mức xác nhận và nghiệm thu. Trọng tâm: đủ thông tin tái hiện; case nguồn/bản dịch giữ lịch sử; actor/build/env/device đúng; dev resolved chưa phải verified; một bug không tạo trùng khi chạy lại; các view và báo cáo cùng nguồn. Rule chính thức của khách vẫn cần tài liệu cụ thể.

## 21. State Machines

Tách bốn lifecycle: nội dung case/revision, cycle, execution result và bug. Mười status đang thấy ở UI không phải mười result của tester. Mỗi transition phải có actor/permission/current/action/precondition/next/side effects/failure. Danh sách draft ở [02 §5–6](02-business-rules.md); không migration enum production trước khi chốt Q03/Q06. `Fix` không được dùng để đánh dấu dev vừa sửa.

## 22. Frontend Architecture

Giữ `src/app/pages`, `layouts`, `components`, `features`, `hooks`, `styles`; thêm `providers`/`services/api` và feature hooks theo nhu cầu. Dữ liệu server ở API/cache, draft nhập ở state local, layout/sidebar/filter là UI state. Không gọi fetch rải khắp page hoặc dùng mock fallback khi API thật lỗi. Không bắt buộc chuyển TypeScript vì code hiện là JS.

## 23. React Development Plan

S01 route/client/test skeleton → S02 session → S03 project/catalog → S04 library/import → S05 runner → S06 board/list/bug/forms → S07 retest → S08 reporting. Mỗi mutation: validation UX → pending → API → server validation → success/refetch hoặc lỗi giữ draft. Tình huống initial/loading/empty/401/403/404/409/422/500/network/retry phải được xử lý theo screen.

## 24. Backend Architecture

Đề xuất package theo feature (`identity`, `project`, `testcase`, `execution`, `workitem`, `retest`, `reporting`, `integration`) với lớp presentation/application/domain/infrastructure khi module cần. Controller chỉ HTTP/binding/auth context; service orchestration và transaction; domain giữ rule; repository giữ truy vấn. DTO tách JPA entity. Không tạo interface/factory/abstraction nếu không có trách nhiệm thực tế.

## 25. Spring Boot Development Plan

S01 chọn bản stable tương thích Java 21, Maven wrapper và pin dependency; MySQL 8.4 LTS là hướng đề xuất. Web, Validation, Security, Data JPA, Flyway/MySQL module, JUnit/Mockito/Spring tests theo nhu cầu. Package/base naming ghi trong ADR trước scaffold. Phiên bản cụ thể kiểm chứng lúc S01, không ghi “latest” làm cấu hình tái lập. [Căn cứ kỹ thuật](04-database-and-migrations.md).

## 26. API Specification

[05-api-contract.md](05-api-contract.md) có inventory, DTO mẫu, permissions/errors/transaction và các use case rủi ro. Prefix `/api/v1`; paging/sort/filter ổn định; string IDs; server actor; optimistic version; idempotency cho lệnh dễ retry. OpenAPI của sprint phải đủ request/response/schema/examples/HTTP codes, không chỉ danh sách URL.

## 27. MySQL Architecture

MySQL là dữ liệu bền vững của TMS; backend là nơi kiểm soát business state. Quyền sở hữu trạng thái so với Redmine/Backlog cần Q01, không suy từ việc chọn DB. InnoDB, utf8mb4, thời điểm UTC, project scope, FK/unique/constraints bảo vệ integrity; thời gian báo cáo theo timezone project. Catalog/schema chi tiết tại [04](04-database-and-migrations.md).

## 28. Database ERD Description

Project 1:N Membership/Catalog/Suite/Cycle/WorkItem. Case 1:N Revision; Cycle 1:N RunItem; RunItem 1:N Attempt. WorkItem BUG 1:1 BugDetail; Attempt N:N Bug qua ExecutionIssueLink. Bug 1:N confirmations/history/verification; evidence có owner/link có kiểm soát. Composite FK đảm bảo đối tượng cùng project và revision thuộc đúng case; archive giữ history, không cascade xóa lịch sử nghiệp vụ.

## 29. SQL Schema

[04 §3–4](04-database-and-migrations.md) là schema catalog và SQL minh họa có mục đích review. **Chưa tạo bảng thật.** Khi vào sprint, hoàn thiện data dictionary từng cột (type/null/default/PK/FK/unique/index/delete), actual DDL và JPA mapping của đúng module đó; không sinh tất cả schema dựa trên bảng UI.

## 30. SQL Migration Plan

Flyway tại `Backend/src/main/resources/db/migration`; version toàn repo tăng dần, ví dụ `V1__create_foundation.sql`, tiếp theo lấy số chưa dùng, không cố định số theo sprint. Applied migration ở môi trường chung bất biến; forward fix bằng file mới. Validate history + JPA; không `ddl-auto=update`; fresh + upgrade tests bắt buộc. MySQL DDL không cho rollback cả chuỗi như transaction nghiệp vụ; backup/restore và expand–contract là kế hoạch phục hồi. Nguồn chính thức và cấu hình tại [04 §6–8](04-database-and-migrations.md).

## 31. Authentication

Phương án mặc định đề xuất cho web cùng hệ thống: server session cookie HttpOnly, Secure trên HTTPS, CSRF protection; password hashing phù hợp Spring Security, session rotate/revoke và rate limit. S02 xác nhận local login hay yêu cầu riêng trước implement. Không JWT/SSO nếu chưa cần, không token trong localStorage, không credential thật trong demo seed.

## 32. Authorization

Phân biệt system admin với role theo project. PM, tester, BrSE, dev, customer/viewer là actor dự kiến, không mặc định ai cũng được đóng lỗi. S02 dựng ma trận/auth nền; S03 enforce membership; từng feature test permission trực tiếp trên API, gồm đọc file/export. UI ẩn/disable phục vụ UX, không thay thế boundary server.

## 33. Validation Strategy

Frontend phản hồi theo field; Bean Validation kiểm tra cấu trúc; domain/ruleset kiểm tra ngữ nghĩa và transition; database chặn trùng/FK. Một ruleset dùng cho create/edit/board/batch/API ngoài. Publish version mới không sửa lịch sử rule áp dụng cũ. Không hardcode rule Nhật từ placeholder hiện có.

## 34. Error Handling

Error code ổn định, thông báo tiếng Việt, fieldErrors/requestId; không stack trace/secret. Tách 401/403/404/409/422/network. UI giữ draft khi thất bại, không báo “đã lưu” trước acknowledgement. Retry chỉ khi an toàn; request đã nhận nhưng mất response cần idempotency/reconciliation.

## 35. Transaction Strategy

Ghi execution + latest pointer + audit; tạo bug + detail + link + history; chuyển trạng thái + history/audit; retest + bằng chứng/attempt tương ứng + eligible closure là các transaction ứng dụng. Upload blob và HTTP tracker không nằm cùng ACID transaction với MySQL; dùng staging/cleanup và outbox. Retest chỉ một bug đạt không tự tạo toàn case OK.

## 36. Concurrency Strategy

Version/expectedVersion cho sửa mutable aggregate; 409 khi stale. Unique key + idempotency cho attempt/import/bug/retest; sinh mã server với counter/khóa phù hợp. Retest nhiều đối tượng khóa theo thứ tự, kiểm tra current fix/coverage revision. Không lock cả bảng hoặc retry mutation mù; test race trên MySQL.

## 37. Testing Strategy

Mỗi sprint có tests, không đợi S10. Domain unit tests cho rule/transition; repository/transaction/integration bằng MySQL tách biệt; contract/API tests với auth; frontend RTL/Vitest cho states; E2E luồng thật quan trọng. Migration fresh/upgrade/restart/checksum, concurrency/failure injection, import mẫu và N:N metrics. S10 bổ sung regression/UAT toàn hệ thống. Không coi build PASS thay cho business tests.

## 38. Security Strategy

Project isolation, input validation, password/session policy, CSRF/CORS, parameterized SQL, XSS sanitization, file allowlist/ownership, export formula escaping, rate limits và log redaction. Handbook chỉ metadata/reference cho tài khoản. Chốt visibility internal/customer, retention và storage trước dữ liệu thật; test cả thao tác API bypass UI.

## 39. Performance Strategy

Phân trang/cap batch ngay từ contract; đo query EXPLAIN/N+1 và indexes theo truy vấn. Tách execution count khỏi run-item count để report không nhân join. Chốt số case/bug/file/người đồng thời và mục tiêu latency ở Q14 trước benchmark; S10 lưu môi trường/dataset/kết quả thật. Không tự công bố SLA hoặc forecast ngày release khi thiếu dữ liệu.

## 40. Logging / Monitoring

Log ứng dụng có requestId/correlationId, error phân loại; audit actor/project/action/before-after đã lọc dữ liệu nhạy cảm. Health/readiness, thời gian request/DB, job failure/retry nếu có. Audit nghiệp vụ append-only, log kỹ thuật có retention; không log payload password/token/file nhạy cảm. Outbox delivery riêng với local business audit.

## 41. Deployment Strategy

Local/CI/staging tách dữ liệu; env mẫu không chứa secret. Runtime DML, migrator DDL riêng. Build → backup cần thiết → migration job/validate → app readiness/smoke. S11 chuẩn bị artifact/runbook và triển khai vào môi trường được giao; không triển khai production sản phẩm khách. Điều kiện dữ liệu/nguồn tracker bắt buộc phải đạt trước pilot thật.

## 42. Technical Debt

[Discovery §15](01-discovery.md) ghi TD-01…TD-18 với severity/priority/effort/dependencies. TD-05/13 ưu tiên S01; TD-04/09 S04–S05; TD-01/02/03/07/08 S06–S07; TD-06 S08; các cleanup P3 đưa [backlog](backlog.md). Chỉ trả nợ trong phạm vi task và có regression, không dùng refactor làm lý do rewrite.

## 43. Risks

| Rủi ro | Biện pháp / gate |
| --- | --- |
| Redmine vs Backlog, nguồn chính chưa rõ | Q01/Q10/Q13 trước S09 và trước pilot; giữ reference tách state |
| Rule/status/result được suy đoán từ UI | Q02–Q08; label draft, domain tests trước migration |
| Thiếu mẫu import/case nguyên bản | Gate S04; chỉ fixture rõ nguồn, không tự khẳng định tương thích mọi file |
| Mất lịch sử hoặc retest pass giả | Immutable attempt/revision, BUG_ONLY vs FULL_CASE, closure coverage S07 |
| Số liệu sai vì join hoặc source rời rạc | Canonical IDs + metric definitions + fixtures S08 |
| DB migration lỗi giữa nhiều DDL | Small migration, fresh/upgrade tests, forward fix + restore rehearsal |
| Scope quá rộng cho một người | 37 task trong 12 sprint gồm S00; re-estimate sau S01/S02, tách task lớn, không bỏ quality gate |
| Credential/environment chưa có | Task cụ thể BLOCKED; tiếp tục task độc lập; không gọi mock là integrated |

## 44. Open Questions

[Q01…Q14 trong 02-business-rules.md](02-business-rules.md) là danh sách quyết định chính. Câu hỏi discovery là quan sát bổ sung, không dùng ID trùng làm đáp án. Các câu hỏi không chặn viết kế hoạch; chặn đúng task phụ thuộc. Khi user yêu cầu sprint, không hỏi lại toàn bộ danh sách, chỉ những câu thật sự cần cho sprint đó.

## 45. Development Phases

| Phase trong tài liệu yêu cầu | Thực hiện trong sprint |
| --- | --- |
| Discovery + Architecture | S00; cập nhật theo quyết định mới |
| Database/Backend Foundation + API/FE Foundation | S01–S03 |
| Backend Core + Feature Development | S04–S08, từng lát cắt domain→DB→API→BE→FE |
| Integration | Nối FE/BE trong từng sprint; tracker ngoài S09 |
| Testing | Từng task; regression/UAT S10 |
| Security + Performance | Auth/project scope từ S02/S03; kiểm tra toàn diện S10 |
| Deployment | S11, theo phạm vi được giao |

## 46. Feature-by-Feature Implementation Plan

| Sprint | Kết quả kiểm chứng được |
| --- | --- |
| [00](sprints/SPRINT-00.md) | Discovery/master plan; quyết định theo gate |
| [01](sprints/SPRINT-01.md) | Backend health + MySQL/Flyway nền + contract/client/test scaffolding |
| [02](sprints/SPRINT-02.md) | Login/session/identity và khung quyền |
| [03](sprints/SPRINT-03.md) | Project membership, catalog, ruleset, handbook |
| [04](sprints/SPRINT-04.md) | Case revision JP/VI + import preview/commit |
| [05](sprints/SPRINT-05.md) | Cycle/assignment/execution attempts thật |
| [06](sprints/SPRINT-06.md) | Một nguồn bug/work-item, triage, evidence, links |
| [07](sprints/SPRINT-07.md) | Retest/closure/reopen và đối chiếu traceability |
| [08](sprints/SPRINT-08.md) | Dashboard/progress/report cùng dữ liệu |
| [09](sprints/SPRINT-09.md) | Tracker adapter/reconciliation nếu cần; release gate nếu khách bắt buộc |
| [10](sprints/SPRINT-10.md) | UAT/regression/security/performance/recovery |
| [11](sprints/SPRINT-11.md) | Pilot, bàn giao, đánh giá có bằng chứng |

## 47. Task Breakdown

37 task mang ID S00-T01…S11-T03 (S06 có 4 task). Mỗi task ghi Feature, Objective, Files affected, Backend/Frontend/DB/API changes, Business rules, Tests, Dependencies, Risk, DoD. [Thư mục sprint](sprints/) chứa mô tả; [STATUS.json](STATUS.json) giữ trạng thái và bằng chứng. Đường dẫn có `**` là phạm vi module dự kiến, phải xác định file cụ thể sau khi đọc code lúc bắt đầu.

## 48. Definition of Done

Áp dụng [DoD chung](06-execution-guide.md) và DoD từng task. Có requirement/rule/contract/schema đúng, kiểm soát quyền/transaction/error/concurrency, tests/build thực sự PASS, tài liệu/trạng thái cập nhật, không lỗi critical còn mở. Nếu không chạy được test vì môi trường, ghi NOT_RUN + lý do, không coi như đã nghiệm thu. S00 là tài liệu, không phải backend DONE.

## 49. Recommended Implementation Order

S00-T01/T02 đã có đầu ra → người dùng yêu cầu **Sprint 1** → S01, dừng và báo kết quả → lần lượt S02…S11 theo readiness. Không tự vượt sprint hoặc làm bù toàn bộ dependency khi nhận “Sprint 7”. Ước lượng là ngày công tham khảo, chưa có deadline/capacity; chốt lịch sau hai sprint đầu. Nhánh tích hợp `develop`; phải kiểm tra frontend đã được merge trước khi tạo nhánh con từ đó. Kế hoạch không tự cho phép commit/merge/publish.
