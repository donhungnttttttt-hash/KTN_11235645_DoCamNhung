# SYSTEM DISCOVERY & ARCHITECTURE REVIEW

Ngày rà soát: **22/09/2026**. Mốc mã nguồn: `bd7e482` trên nhánh `feature/Fontend-design`.

Đây là báo cáo khảo sát để lập kế hoạch sprint, **không phải thông báo đã triển khai backend hoặc hoàn thành nghiệp vụ**. Phạm vi gồm entry point, toàn bộ module React đang được nhập vào ứng dụng, dữ liệu mẫu, cấu hình frontend, tệp legacy và thư mục Backend. Các nhận định được kiểm tra bằng đọc mã nguồn và tìm references trong repository; không chạy ứng dụng, kiểm thử động hoặc đánh giá độ an toàn production trong bước này. Các đường dẫn dưới đây tính từ thư mục gốc repository.

Đầu vào nghiệp vụ là hai tài liệu người dùng cung cấp: mô tả quy trình SY Partners/SHIFT/khách hàng Nhật và MASTER SOFTWARE DEVELOPMENT PROMPT. Các tài liệu/liên kết Google Docs, Figma được nhúng trong code chưa được cung cấp nội dung; báo cáo không coi chúng là quy tắc nghiệp vụ đã được xác nhận.

## 1. Current Architecture — Kiến trúc hiện tại

**Hiện có một frontend React dùng dữ liệu mẫu trong bộ nhớ. Backend, REST API và cơ sở dữ liệu chưa được triển khai.**

Luồng khởi động thực tế:

```text
Frontend/index.html
  -> src/main.jsx
     -> src/AppEntry.jsx
        -> ProjectDataProvider [state công việc + hoạt động]
           -> src/App.jsx [hash route + state mock kiểm thử]
              -> MainLayout [Header, Sidebar, Footer]
                 -> AppRouter
                    -> pages/modules/features
```

Ba nguồn dữ liệu độc lập đang hoạt động:

| Nguồn | Nơi tạo/giữ | Nơi dùng | Giới hạn hiện tại |
| --- | --- | --- | --- |
| Dữ liệu dự án, thành viên, test specification, lỗi và tiến độ mẫu | `Frontend/src/mocks/storeData.js`, `Frontend/src/App.jsx` | Tổng quan kiểm thử, Quản lý kiểm thử, Quản lý lỗi, Quản lý tiến độ | Các state ở App không có setter truyền xuống; không cập nhật từ thao tác chạy test |
| Công việc và activity | `Frontend/src/app/features/work-items/data.js`, `ProjectData.jsx` | Tổng quan dự án, Kanban, danh sách, thêm/chi tiết/bình luận công việc | Dùng chung giữa các màn này, nhưng chỉ tồn tại đến khi tải lại trang |
| Nội dung case, kết quả chạy, định dạng và history | `Frontend/src/app/pages/TestRunnerGridPage.jsx` | Chỉ màn runner hiện tại | State cục bộ; không liên kết specification bằng dữ liệu thật; không truyền về hai nguồn trên |

Điểm kiến trúc phù hợp: shell, page, feature, hook và component đã được tách; màn công việc chia sẻ một provider và một hàm lọc. Điểm cần điều chỉnh khi trở thành hệ thống nghiệp vụ: canonical data và quyết định chuyển trạng thái đang nằm ở browser, không có boundary dịch vụ/API. Việc backend chưa tồn tại là **missing implementation**, không chứng minh một kiến trúc backend nào đang sai.

## 2. Current Workflow — Quy trình hiện tại

### Quy trình thực tế theo tài liệu nghiệp vụ

1. Khách hàng/SHIFT cung cấp bộ test case tiếng Nhật; BrSE dịch sang tiếng Việt, đưa Excel lên SharePoint.
2. PM xác định đợt test, môi trường, phiên bản và phân công tester; tiến độ được quản lý trên bảng tính.
3. Tester chạy case, ghi kết quả, người thực hiện, phiên bản; khi phát hiện lỗi thì tạo ticket Redmine theo rule khách hàng và gắn liên kết case.
4. BrSE trao đổi qua Slack với SHIFT/khách hàng để xác nhận lỗi, đặc tả và hướng xử lý; tester hoàn thiện ticket cho Dev.
5. Dev tái hiện và sửa; nếu không tái hiện được thì quay lại làm rõ với tester. Tester kiểm tra lại trước khi chốt kết luận không tái hiện và báo khách hàng.
6. Sau khi Dev sửa, tester retest trên bản sửa. Nếu đạt, cập nhật kết quả case, phiên bản và đóng ticket. Nếu chưa đạt, tiếp tục vòng xử lý.
7. Thành viên hoặc PM tổng hợp số liệu Excel/Redmine sang Notion. Thao tác trên nhiều nền tảng tạo nguy cơ quên cập nhật, lệch số liệu và thiếu khả năng truy vết.

### Quy trình thật sự chạy trong code

| Thao tác | Hành vi đã có | Chưa có |
| --- | --- | --- |
| Mở dự án | Vào dashboard, đổi tab tổng quan, mở menu sáu nhóm | Chọn dự án có quyền truy cập; phiên đăng nhập |
| Mở test specification | Danh sách 5 bản ghi mẫu, nhấn tên mở runner | Tạo/import spec, version spec, phân công thực thi |
| Thực thi case | Chỉnh văn bản ô, đổi định dạng, lọc theo kết quả, mở chi tiết/history | Lưu server, lịch sử execution độc lập, môi trường/thiết bị/bản test bắt buộc |
| Đổi kết quả case | Xoay vòng `Unexecuted -> OK -> NG -> P -> Fix -> NA` | Guard, quyền, chứng cứ, liên kết bug, ghi audit cho thao tác đổi kết quả |
| Báo cáo lỗi từ case | Nút “Báo cáo” điều hướng chung tới `/issues` | Truyền case/execution ID; tạo lỗi có traceability |
| Quản lý công việc | Tạo, bình luận, gán người, lọc/sort, chuyển trạng thái, CSV | Ghi nhận lỗi theo rule khách hàng; API; quy tắc chuyển trạng thái thống nhất |
| Theo dõi tiến độ | Tổng quan dự án tính số đếm từ context công việc; tổng quan kiểm thử dùng số mẫu | Chỉ số thống nhất từ execution/bug, đồng bộ nhiều người dùng, dự báo có căn cứ |

“Đã có giao diện tương tác” và “đã có quy trình nghiệp vụ end-to-end” phải được theo dõi riêng trong kế hoạch sprint.

## 3. Current Code Structure — Cấu trúc mã nguồn

```text
README.md                                  # mới có tên dự án
Backend/.gitkeep                           # chưa có mã backend
Frontend/
  index.html                               # entry đang dùng: /src/main.jsx
  package.json, package-lock.json
  vite.config.js, tailwind.config.js, postcss.config.js
  src/
    main.jsx -> AppEntry.jsx -> App.jsx
    index.js                               # entry cũ, không được index.html dùng
    mocks/storeData.js
    app/
      components/                          # Header, Sidebar, Footer
      layouts/MainLayout.jsx
      routes/                              # AppRouter, legacyRoutes
      hooks/useLenis.js
      modules/                             # tổng quan, handbook, KPI
      pages/                               # dashboard, board, specs, runner,
                                           # issues, progress, analysis
      features/work-items/                 # board/list/form/detail/data/filter
      styles/                              # global + shell + dashboard overrides
  app.js, react-app.jsx, store.js,
  charts.js, styles.css                     # prototype legacy, không trong entry graph
```

`Frontend/src` hiện có **25 tệp JSX, 6 tệp JS, 5 tệp CSS, 1 README**. Trong 6 tệp JS có `src/index.js` không thuộc entry đang chạy. Không có TypeScript source, `tsconfig`, Java source, Maven/Gradle project, SQL migration, OpenAPI spec hoặc automated-test setup trong mã nguồn khảo sát.

Phân biệt legacy:

- `Frontend/app.js`: router/render bằng `innerHTML`, handler toàn cục, tham chiếu `window.CatStore`, `window.CatCharts`, `lucide`.
- `Frontend/react-app.jsx`: một prototype React khác dựa vào global `React`, `ReactDOM`, `CatStore`; tự mount vào `root`.
- `Frontend/store.js`: dataset legacy riêng, **không phải database hay store được app mới sử dụng**.
- `Frontend/charts.js`: cấu hình Chart global cho prototype; không phải biểu đồ đang nối với API.
- `Frontend/styles.css`: CSS của prototype cũ; runtime nhập `src/app/styles/global.css` và style feature.
- `Frontend/src/index.js`: mount App trực tiếp, không bọc `ProjectDataProvider`; không nên dùng lại làm entry thứ hai.
- `Frontend/src/app/routes/legacyRoutes.js` **đang dùng và cần giữ**: redirect bookmark `/design/...`; không đồng nghĩa còn giao diện design độc lập.

Các tệp legacy chỉ nên REMOVE sau khi rà references/build trong sprint dọn nền tảng; không xóa bằng suy đoán dựa trên tên.

## 4. Current Frontend — Frontend hiện tại

### Stack và trạng thái

`Frontend/package.json` khai báo React 18, Vite 6, Tailwind 3, Lucide và Lenis; source hiện là JavaScript/JSX. Đây là các major version khai báo trong repository, không phải đề nghị tự nâng lên bản mới nhất. Có dependency `react-router-dom`, `chart.js`, `react-chartjs-2`, `clsx` nhưng không tìm thấy import vào runtime `src`. Không cần chuyển toàn bộ dự án sang TypeScript chỉ để lập kế hoạch.

Scripts hiện có: `dev`, `build`, `preview`, `start`; chưa có `test`, `lint`, `typecheck`. Vite mở port 5173 và `host: true`, chưa cấu hình proxy/API environment.

### Route đang dùng

| Hash route | Page/chức năng | Nguồn dữ liệu |
| --- | --- | --- |
| `#/dashboard` | Tổng quan dự án | ProjectDataProvider |
| `#/dashboard/testing` | Tổng quan kiểm thử | App mocks + KPI hardcode |
| `#/dashboard/new`, `#/dashboard/issue/:id` | Modal thêm và drawer chi tiết | ProjectDataProvider |
| `#/board` | Bảng Kanban | ProjectDataProvider |
| `#/board/list` | Danh sách, lọc cơ bản/nâng cao, CSV | ProjectDataProvider |
| `#/board/new`, `#/board/issue/:id` | Thêm/chi tiết; query `view`, `detail` | ProjectDataProvider |
| `#/tests` | Danh sách specification | App mocks |
| `#/tests/:id` | Runner toàn màn hình | Spec name từ App; case/result local |
| `#/issues` | Danh sách lỗi riêng | 2 lỗi trong App mocks |
| `#/progress` | Tiến độ theo thành viên/ngày | App mocks |
| `#/analysis` | Khung phân tích | Nội dung tĩnh |

Routing được tự cài bằng hash listener trong `App.jsx`, so khớp chuỗi trong `AppRouter.jsx`, không dùng React Router dù đã cài dependency. Có normalize bookmark cũ. Route không khớp mặc định về dashboard, chưa có màn 404 thật.

### Component và các giới hạn đã xác định

- **Shell:** `Header.jsx`, `Sidebar.jsx`, `MainLayout.jsx` đã thể hiện menu sáu nhóm và submenu Kanban/Danh sách, thu gọn/mobile, active state. Header hiển thị tài khoản cố định; chọn giai đoạn chỉ đổi state của MainLayout, không đổi dữ liệu dashboard/runner.
- **Công việc:** `WorkBoardPage.jsx` giữ hai view mounted để giữ filter/scroll. `ProjectData.jsx` ghi hoạt động khi tạo/cập nhật. `issueFilters.js` tập trung filter chung. Đây là nền tảng tái sử dụng tốt.
- **Form:** `IssueForm.jsx` có tiêu đề, mô tả, loại, status, ưu tiên, category, assignee, milestone, version, ngày, giờ, reason, parent/related và comment. Validation hiện chỉ yêu cầu tiêu đề khi tạo, reason khi `closed`, thứ tự ngày; phần môi trường/thiết bị/OS/bước tái hiện là văn bản mẫu, chưa là trường có rule.
- **Editor:** `components.jsx` chèn cú pháp Markdown; renderer chỉ nhận heading/quote và dòng text, chưa render hết toolbar. “Kiểm tra nội dung” chỉ hiển thị hướng dẫn cố định, không gọi AI. Tệp đính kèm chỉ giữ tên trong local state của editor, không upload/lưu payload vào issue. Người nhận comment chỉ là chuỗi, không gửi notification.
- **Runner:** `TestRunnerGridPage.jsx` khoảng 69 KB, cùng một component chứa seed cases, trạng thái, editing, formatting, resize, menu, history và nhiều modal. Có 3 case mẫu nhưng state status khởi tạo cho 4 ID; thống kê summary và phân trang có số cố định. `toggleStatus` không ghi execution audit; sửa văn bản/format có history local với người và build hardcode. Detail “Kết quả kỳ vọng” chứa nội dung cố định thay vì `selectedDetailCase.expected`.
- **Liên kết case:** `handleCopyLink` tạo `#/tests/:specId?caseId=:id`, nhưng AppRouter truyền cả phần query thành specId. Runner không tìm thấy sẽ fallback spec đầu và không xử lý `caseId`. Đây là lỗi route/traceability cần sửa và kiểm thử.
- **Báo cáo kiểm thử:** `TestingOverview.jsx`, `KpiSummaryBar.jsx`, `ProgressPage.jsx` không tính từ runner. Tổng `caseCount` của 5 spec mẫu là 59, trong khi project/KPI là 136. `TestSpecsPage.jsx` in tiến độ `100%` cố định; đây là dữ liệu minh họa không thể dùng để nghiệm thu số liệu.
- **Lỗi:** `pages/IssuesPage.jsx` và `features/work-items/IssuesPage.jsx` là hai màn khác nhau, không dùng cùng nguồn. Bộ lọc số lỗi của màn `/issues` có 1 và 7 hardcode trong khi bảng có 2 bản ghi.
- **Sổ tay:** `CatHandbook.jsx` có nội dung tham khảo và external links, chưa có quản lý rule theo dự án/phiên bản. Tài liệu nhắc Backlog trong khi requirement mới mô tả Redmine; phải xác nhận connector và mapping.
- **UI states:** một số màn công việc có empty/not-found/validation/toast; chưa có loading, expired-session, forbidden, conflict, network/server error/retry xuyên suốt vì chưa nối API.
- **Styles:** đã có scope `.work-items`, style mint/Inter và responsive; vẫn còn tầng override giữa `work-items.css`, `work-board.css`, `project-overview.css` và `app-shell.css`. Có selector prototype không còn có UI tương ứng; nên dọn có kiểm tra visual, không rewrite đồng loạt.

## 5. Current Backend — Backend hiện tại

`Backend` chỉ có `.gitkeep` rỗng. Chưa có:

- Java/Spring Boot application, build file hoặc wrapper;
- controller, service/use case, domain/entity, repository, DTO/mapper;
- validation server, transaction, exception handler;
- authentication, authorization hoặc project access checks;
- integration Redmine/Backlog/Slack/Notion;
- file storage/upload/download;
- audit server, logging, monitoring, background job;
- backend tests, cấu hình môi trường hoặc triển khai.

Phân loại: **MISSING / CREATE NEW**. Không thể nhận xét “controller đang chứa business logic”, “JPA bị N+1”, “backend đang expose entity” hoặc “SQL thiếu index” khi các thành phần này chưa tồn tại.

## 6. Current API — API hiện tại

| Method | Endpoint | Request | Response | Authentication | Authorization | Business purpose |
| --- | --- | --- | --- | --- | --- | --- |
| Chưa có | Chưa có REST endpoint triển khai trong repository | Chưa có DTO | Chưa có DTO | Chưa có | Chưa có | Chưa có API nghiệp vụ |

Không thấy `fetch`, Axios, XMLHttpRequest hoặc API client nghiệp vụ trong source đang dùng. Đường dẫn `#/...` là route trình duyệt, **không phải API**. External document links và font Google là tài nguyên/liên kết giao diện, không phải tích hợp nghiệp vụ.

API contract, quy ước pagination/filter/sort, error codes, versioning, upload contract và transaction behavior đều cần thiết kế. Kế hoạch nên tạo contract `/api/v1/...` theo use case trước khi frontend/backend của feature đó chạy song song.

## 7. Current MySQL/Database — Cơ sở dữ liệu hiện tại

| Hạng mục | Bằng chứng hiện tại |
| --- | --- |
| MySQL server/schema được project cấu hình | Không có cấu hình hoặc code kết nối trong repository; không suy ra máy người dùng đã/chưa cài MySQL |
| Tables, columns, PK, FK, unique, indexes, constraints | Không có schema nên chưa tồn tại thiết kế có thể kiểm chứng |
| JPA entities/repositories | Không có |
| Flyway/Liquibase/migrations | Không có |
| Database backup/restore/seed | Không có |
| Dữ liệu browser | `useState`/context; `sessionStorage` chỉ lưu điều kiện lọc công việc |

Các mảng trong `storeData.js`, `data.js`, `store.js` **không phải database schema**. Không chuyển cơ học từng field UI thành một cột DB mà bỏ qua TestCaseVersion, TestRun, Execution, Defect, Traceability và ProjectPermission.

Flyway + MySQL phù hợp với yêu cầu version hóa DB của người dùng; đây là **lựa chọn mục tiêu**, chưa được cài đặt trong lượt discovery. Phải chốt model trước khi viết migration của từng sprint, không tạo trước toàn bộ database cho mọi feature.

## 8. Proposed Solution — Giải pháp đề xuất

Xây dựng TMS tập trung cho kiểm thử thủ công, dùng lại giao diện đã thống nhất. Backend Java/Spring Boot thực thi use case và business rules; MySQL lưu dữ liệu chuẩn; Flyway quản lý schema theo phiên bản. React chỉ gửi ý định thao tác và hiển thị kết quả được backend chấp nhận.

Trọng tâm nghiệp vụ:

1. Tiếp nhận/version hóa bộ test case và tổ chức đợt test/phân công.
2. Ghi execution có case version, người thực hiện, môi trường/thiết bị/build, kết quả và evidence.
3. Tạo bug có thông tin tái hiện đầy đủ theo bộ rule đã duyệt, liên kết execution/case ngay khi tạo.
4. Quản lý xác nhận đặc tả/bug, xử lý và retest theo actor/permission/guard.
5. Cập nhật retest và tình trạng defect nhất quán theo rule đã xác nhận; không tự đóng toàn bộ bug chỉ vì một case đạt.
6. Tổng hợp tiến độ từ cùng nguồn dữ liệu, không nhập tay lại KPI.
7. Tra cứu sổ tay/rule tập trung; xác định riêng chính sách đối với tài khoản/mật khẩu thử nghiệm.
8. Kết nối công cụ ngoài theo phạm vi được chốt, với mapping/status/retry/audit rõ ràng. Không mặc định làm đồng bộ hai chiều mọi nền tảng trong MVP.

Giữ sáu nhóm menu hiện tại. “Quản lý lỗi” nên là góc nhìn và thao tác dành cho defect của cùng dữ liệu chuẩn, không duy trì một mảng lỗi riêng với “Bảng công việc”. Công việc tổng quát và bug có thể khác loại nhưng phải có quan hệ và trách nhiệm rõ ràng, không mặc định mọi task là defect.

## 9. Proposed Solution vs Current Code — Đối chiếu

| Nhu cầu | Đã có để kế thừa | Khoảng trống/điều chỉnh | Loại |
| --- | --- | --- | --- |
| Tập trung dữ liệu | Context nối board/list/project overview | Nối test execution, defect, progress về API/MySQL | REFACTOR + CREATE NEW |
| Test case phiên bản và tiếp nhận Excel | Danh sách spec, grid editing | Schema, import có preview/validation, mapping cột, version provenance | EXTEND + CREATE NEW |
| Phân công theo đợt/môi trường | Dropdown giai đoạn, mock thành viên | Project/phase/run/assignment thật và permission | EXTEND + CREATE NEW |
| Bug đúng rule | Form công việc và khung mô tả | Rule profile đã duyệt, field tái hiện có cấu trúc, validation FE/BE/DB | REFACTOR + EXTEND |
| Case ↔ bug traceability | Parent/related giữa công việc | Quan hệ execution-defect/case-defect và deep link đúng | CREATE NEW |
| Lifecycle và retest | 10 màu/status, form, Kanban | Transition policy, actor, guard, reason, audit, retest version | REPLACE logic + KEEP UI |
| Dữ liệu báo cáo thống nhất | Dashboard và bảng tiến độ | Aggregate từ facts, định nghĩa KPI/mẫu số, scope project/run | REPLACE data + EXTEND UI |
| Rule và tri thức tập trung | Handbook tĩnh | Quản lý nội dung/phiên bản/quyền và liên kết từ form | EXTEND |
| Bảo mật | Chưa có | Login/session/project scope/role/permission/server authorization | CREATE NEW |
| Redmine/Backlog | Hình dáng UI và external links | Quyết định connector, API mapping, idempotency, retry/reconciliation | CREATE NEW sau khi chốt scope |

Giải pháp đề xuất phù hợp với vấn đề dữ liệu rời rạc. Code hiện tại đi đúng hướng về trải nghiệm giao diện; mức hoàn thiện nghiệp vụ còn thấp vì là prototype. Không cần bỏ frontend để viết lại từ đầu.

## 10. What Is Already Correct — Những phần đang đúng

| Component | Current state / Assessment | Problem / Impact | Recommendation | Priority |
| --- | --- | --- | --- | --- |
| Shell/layout/sidebar | Đã tách thành component, đúng sáu nhóm menu; **GOOD ở phạm vi UI** | Chưa có project/auth thật, là phần chưa implement | KEEP; bổ sung context từ API | P2 |
| Work-item feature boundary | Có folder riêng và wrapper page; **PARTIALLY GOOD** | Còn gắn chặt mock/status cố định | KEEP UI, EXTEND adapter/hooks | P1 |
| Context board/list/overview | Cùng một state và activity; **GOOD cho prototype** | Chưa bền vững hoặc đồng bộ nhiều người dùng | KEEP ý tưởng chia sẻ; thay nguồn bằng server state | P1 |
| Shared filtering | `issueFilters.js` dùng chung; **GOOD cho data nhỏ** | Chưa có API filter contract | KEEP semantics hợp lệ, đối chiếu server filter | P2 |
| Form/Modal/Button/Badge | Reuse, label, preview, focus trap/Escape cơ bản; **PARTIALLY GOOD** | Không phải validation/security boundary | KEEP, bổ sung states/a11y theo feature | P2 |
| Legacy redirect | Giữ bookmark cũ khi bỏ prototype; **GOOD** | Cần regression khi đổi router | KEEP với tests | P2 |
| CSS scope/theme | `.work-items` hạn chế xung đột; **PARTIALLY GOOD** | Nhiều override, một số selector thừa | KEEP hình thức, refactor từ từ | P3 |

## 11. What Is Incomplete — Những phần chưa hoàn thiện

**Missing implementation:** backend, database, migrations, API, auth, access control, upload, notification, connector, transaction/concurrency, server audit, tests, deployment.

**Incomplete frontend:** spec CRUD/import, run/assignment, rule editor, case-to-defect link, real report calculation, API error states, thật sự khôi phục bộ lọc đã lưu, query/case deep links và form validation đầy đủ.

Một số tính năng đang hiển thị nhưng chưa thực hiện nghiệp vụ:

- Nút đăng ký spec và file evidence của runner chỉ `alert`; nhiều nút trong spec list chưa có handler.
- Modal batch runner chỉ đóng và hiện toast; select chưa áp dụng vào kết quả. Các modal summary/batch còn state nhưng chưa thấy nút mở trong UI hiện tại.
- File editor giữ tên, không có storage object; “thông báo cho” không gửi thông báo.
- “Lưu bộ lọc” ghi `sessionStorage`. Board chưa có read-back; list có read local khi `saved=true` nhưng wrapper truyền `sharedFilters` thay thế nên cần nối luồng khôi phục rõ ràng.
- “Phân tích” là placeholder, không có tập dữ liệu/mô hình báo cáo.

Những mục này phải được đánh dấu demo/incomplete trong backlog, không được tính DONE chỉ vì nhìn thấy nút hoặc toast thành công.

## 12. What Is Architecturally Wrong — Những điểm sai boundary cần sửa

Đánh giá dưới đây áp dụng **nếu tiếp tục dùng cách hiện tại cho hệ thống nghiệp vụ**, không phủ định giá trị của prototype.

1. **Frontend là nơi quyết định state nghiệp vụ.** `BoardPage.moveIssue`, list batch và `toggleStatus` tự chuyển status, không có use case authoritative. Đổi status không gắn actor, permission hay preconditions.
2. **Rule cùng một hành động không thống nhất giữa các lối vào.** Form yêu cầu reason khi `closed`, Kanban và batch không yêu cầu. Muốn bảo đảm rule phải đặt tại domain/application service; frontend hỗ trợ nhập và hiển thị lỗi.
3. **Ba kho dữ liệu độc lập mô tả cùng quy trình.** Case NG, bug list và board không liên thông. Cách tổ chức này sẽ tái tạo chính vấn đề Excel/Redmine/Notion mà hệ thống cần giải quyết nếu nối riêng từng màn mà không thống nhất model.
4. **Definition và execution bị trộn trong runner.** Sửa nội dung case, định dạng và kết quả cùng local component; không có case version bất biến tại thời điểm execution. Không thể điều tra đáng tin cậy “đã chạy nội dung nào trên build nào”.
5. **Định danh và audit do client giả định.** ID mới dùng max trong mảng + 1, actor/build cố định, timestamp phía máy người dùng. Không dùng cơ chế này làm định danh đồng thời hoặc audit production.

Không có bằng chứng circular dependency, SQL injection, N+1 hoặc controller/service boundary sai ở backend hiện tại vì backend chưa tồn tại. Đây là nội dung phải thiết kế/kiểm thử khi được tạo, không phải lỗi đã quan sát.

## 13. What Needs Refactoring — Kế hoạch refactor tăng dần

| Current | Target | Migration steps | Classification |
| --- | --- | --- | --- |
| `App.jsx` mocks và work-item context là các nguồn nghiệp vụ riêng | Context dự án/phiên đăng nhập + hooks gọi API theo feature | Chốt contract → giữ mock adapter demo riêng → nối từng feature → bỏ production fallback mock | REFACTOR |
| `/issues` có 2 lỗi riêng, board có 29 công việc | Một nguồn defect/work-item có view riêng theo chức năng | Chốt model/type → mapping legacy mẫu → list bug từ API cùng ID → regression board/dashboard | REPLACE data path, EXTEND view |
| Runner lớn, case và result trộn | Case editor, execution grid, result action, history dialog, hooks/model riêng | Tách UI không đổi behavior → thêm execution contract → thay mutation → thay audit → nối reporting | REFACTOR + EXTEND |
| Status mutation rải ở board/list/form/runner | Command/use case có policy thống nhất | Lập transition matrix → API validation/transaction → FE gửi command và rollback khi fail → test mọi entry | REPLACE business mutation |
| Hash/string parsing rải rác | Route definitions/params rõ ràng | Giữ URL cũ → xử lý path/query tập trung hoặc dùng HashRouter → not-found → deep-link tests | REFACTOR |
| CSS base + overrides | Theme/component styles có ownership rõ | Giữ screenshot baseline → gom từng component → xóa selector không reference | REFACTOR |
| Tệp top-level prototype và `src/index.js` không dùng | Một entry/runtime duy nhất | Kiểm tra reference/build → xóa legacy trong task riêng → cập nhật docs | REMOVE |
| KPI và progress số cố định | Query/report từ execution và defect | Chốt định nghĩa metric → backend query → UI loading/empty → đối chiếu fixture kiểm thử | REPLACE |
| README gần rỗng | Tài liệu chạy dự án, kiến trúc, sprint, env, migrations | Bổ sung theo từng sprint; tránh ghi lệnh backend chưa tồn tại như đã chạy được | EXTEND |

Không sửa các phần này đồng loạt trong discovery. Mỗi sprint chỉ refactor phần cần để feature của sprint đó chạy an toàn.

## 14. What Needs to Be Created — Thành phần cần tạo mới

| Thành phần | Assessment / Problem | Impact | Recommendation | Priority |
| --- | --- | --- | --- | --- |
| Backend foundation + configuration | **MISSING** | Chưa có runtime lưu dữ liệu | Spring Boot, Maven/Gradle thống nhất, env profiles, health/error conventions | P0 |
| MySQL + Flyway foundation | **MISSING** | Chưa có source of truth hoặc schema reproducible | Schema theo domain, migrations, seed dev tách biệt, verify migration | P0 |
| API contract và client boundary | **MISSING** | FE/BE không thể phối hợp chính xác | OpenAPI, DTO/errors/pagination/filter, API client tập trung | P0 |
| Identity & project permissions | **MISSING** | Không dùng được dữ liệu dự án thật an toàn | Authentication, membership, role/permission, backend enforce | P1 |
| Test definition/run/execution model | **MISSING** | Không lưu traceable results | Tách definition/version, run, assignment, result/history | P1 |
| Rule profile & defect use cases | **MISSING** | Thiếu đầu vào tái hiện và lifecycle đúng | Rule được xác nhận, create/triage/resolve/retest/close commands | P1 |
| Traceability & evidence | **MISSING** | Case và bug rời rạc, không có bằng chứng lưu thật | Relation IDs, links, secure storage metadata/access | P1 |
| Reporting model/query | **MISSING** | Số liệu không đáng tin cậy | Queries thống nhất scope/run, metric definitions, cập nhật sau mutation | P1 |
| Audit/concurrency/integration reliability | **MISSING** | Mất dấu vết, ghi đè hoặc duplicate khi có nhiều người | Server audit, version/conflict, idempotency, sync log nếu có connector | P1 |
| Test/CI/deployment/runbook | **MISSING** | Không có quality gates và vận hành tái lập | Unit/integration/E2E phù hợp, checks, env, backup/restore | P1–P2 |

## 15. Technical Debt — Sổ nợ kỹ thuật

Effort là ước lượng tương đối **cho phần sửa mã hiện tại**, không bao gồm toàn bộ feature/backend phụ thuộc: S ≤ 1 ngày, M 2–3 ngày, L 4–7 ngày, XL cần tách task. P0 blocking, P1 critical, P2 important, P3 improvement. Severity phản ánh hậu quả nếu dùng cho nghiệp vụ thật; không có nghĩa prototype đang xảy ra sự cố production.

| ID | Issue và bằng chứng | Impact | Severity | Priority | Recommendation | Effort | Dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TD-01 | Data stores tách rời: App / ProjectData / Runner | Bug, case và tiến độ lệch nhau | Cao | P1 | Hợp nhất canonical IDs và API source; giữ UI view | XL | Domain + API |
| TD-02 | Mutation status trực tiếp ở BoardPage/list/Runner | Bypass guard/permission, trạng thái không hợp lệ | Cao | P1 | Use-case commands/transition policy backend | L | State matrix, auth, API |
| TD-03 | Form closed.reason khác Kanban/batch | Cùng thao tác có rule khác nhau | Cao | P1 | Một rule server và UX nhập reason cho mọi lối vào | M | TD-02 |
| TD-04 | TestRunner 69 KB, data + UI + history lẫn nhau | Khó test, sửa một chức năng ảnh hưởng nhiều phần | Vừa | P2 | Tách grid/toolbar/dialog/hooks và model execution | L | Runner contract |
| TD-05 | Deep link query spec bị đưa vào `specId`; fallback spec đầu | Có thể mở sai test specification/case | Cao | P1 | Parse route/query và 404; resolve caseId đúng | S–M | Route test setup |
| TD-06 | KPI 136, tổng spec 59, runner 3; số %/pagination cố định | Hiểu nhầm tiến độ thực tế | Cao | P1 | Report từ cùng facts; không coi mock là số thật | L | Execution/report model |
| TD-07 | Rule bug mới chỉ ở mô tả mẫu, không validate fields | Vẫn tạo ticket thiếu thiết bị/môi trường/bước | Cao | P1 | Structured fields + rule profile + validation server | L | Rule khách hàng |
| TD-08 | ID max+1, actor/build hardcode, audit local | Duplicate ID/mất traceability khi nhiều người | Cao | P1 | Server ID, authenticated actor, immutable event/history | M | Backend/auth |
| TD-09 | Runner status không ghi history; expected detail hardcode | Kết quả/history không khớp nội dung | Cao | P1 | Result command có audit, bind detail đúng case version | M | Execution model |
| TD-10 | Legacy entries `app.js`, `react-app.jsx`, `src/index.js` và stores cũ | Người tiếp theo có thể sửa nhầm runtime | Vừa | P2 | REMOVE có kiểm tra imports/build; một entry duy nhất | S | Baseline build |
| TD-11 | Các controls chỉ alert/toast/no handler; editor file chỉ tên | Người dùng tưởng đã lưu/cập nhật thành công | Vừa | P2 | Backlog hóa; thực hiện thật theo sprint hoặc đánh dấu chưa hỗ trợ | M | Contract feature |
| TD-12 | Save filter thiếu restore nhất quán | Dễ mất ngữ cảnh lọc, link không tái lập đầy đủ | Thấp | P3 | Một filter model và lưu/khôi phục rõ ràng | S–M | Route/filter contract |
| TD-13 | Không có automated tests, lint scripts hay CI | Regression không được phát hiện lặp lại | Cao | P1 | Thiết lập nền test; test rule/route/use case quan trọng | M | Foundation |
| TD-14 | CSS override nhiều tầng, dependency chưa sử dụng | Maintain khó, tăng nhiễu kiến trúc | Thấp | P3 | Audit imports/selectors, prune sau visual baseline | M | UI regression |
| TD-15 | CSV chỉ escape dấu nháy, không xử lý giá trị mở đầu công thức | Rủi ro spreadsheet formula khi xuất dữ liệu người dùng | Vừa | P2 | Chốt export policy và test dữ liệu `=`, `+`, `-`, `@` | S | Export contract |
| TD-16 | API loading/conflict/retry/permission states chưa có | Sau khi nối API UX sẽ thiếu failure path | Vừa | P1 | API client/error boundary/hooks; tích hợp từng screen | L | API/error contract |
| TD-17 | Chọn giai đoạn chỉ đổi header; danh tính khác ở nhiều màn | Context hiển thị không phản ánh data/actor thật | Vừa | P2 | Active project/run và session context thống nhất | M | Project/auth model |
| TD-18 | README gốc chỉ tên; thiếu guide backend/env/migration | Onboarding và chạy sprint dễ sai phạm vi | Vừa | P1 | Duy trì docs/planning và guide được kiểm chứng | M | Quy trình sprint |

Backend/database/auth còn thiếu được theo dõi như **capability gaps** tại mục 14, không gọi mọi feature chưa viết là nợ kỹ thuật hoặc kiến trúc sai.

## 16. Risks — Rủi ro

| Rủi ro | Hệ quả | Cách kiểm soát trong kế hoạch |
| --- | --- | --- |
| Dùng prototype làm dữ liệu production | Mất dữ liệu khi reload, audit không đáng tin | Chỉ demo trước khi có persistence/auth; không thông báo lưu server khi chỉ lưu local |
| Nhầm “10/12 trạng thái” và Redmine/Backlog | Sai workflow hoặc connector | Chốt status IDs, terminal states, mapping theo dự án trước lifecycle sprint |
| Tự chuyển case OK khi đóng bug | Che giấu case còn lỗi hoặc nhiều bug liên quan | Tách execution/result và defect lifecycle; retest có guard và quan hệ rõ ràng |
| Phân tách bug và task bằng hai DB/store độc lập | Lặp lại phân mảnh hiện tại | Một model chuẩn và API views; không nối API từng màn theo mock có sẵn |
| Đồng bộ hai chiều external khi chưa rõ source of truth | Loop, duplicate, overwrite, trạng thái lệch | Chốt quyền sở hữu từng field/status; ưu tiên MVP tối thiểu; idempotency/reconciliation |
| Import Excel giữ nguyên mọi formatting/custom layout | Scope tăng nhanh, dữ liệu không chuẩn | Có template/mapping/preview/reject report; chọn nội dung cốt lõi trước |
| Dự báo release từ ít dữ liệu | Đưa kỳ vọng sai cho PM/khách | Tách metric đo được và forecast có giả định; không coi số đếm là cam kết ngày |
| Chứa account kiểm thử trong handbook thông thường | Rò credential trong comment/log/export | Chốt chính sách secret; không lưu mật khẩu plaintext trong tài liệu công khai |
| Client filtering/render mọi ticket | Chậm khi dữ liệu lớn | Server pagination/filter; đo trước khi thêm cache/virtualization |
| Thay giao diện được duyệt trong lúc nối backend | Tăng kiểm thử lại và sai mong muốn người dùng | KEEP layout/font/màu/menu; refactor data ở từng sprint có regression |

## 17. Open Questions — Câu hỏi cần chốt

Đây là decision backlog cho sprint phù hợp, không yêu cầu người dùng trả lời toàn bộ trước khi có thể lập kế hoạch.

| ID / Question | Why it matters | Affected modules | Possible options | Current assumption | Blocking / Non-blocking |
| --- | --- | --- | --- | --- | --- |
| DQ-01: Redmine hay Backlog là tracker chính; có bắt buộc mỗi bug được đẩy ra ngoài? | Ảnh UI là Backlog, nghiệp vụ nói Redmine | Defect, connector, dashboard | Nội bộ + link; push một chiều; sync hai chiều | Chưa khẳng định connector; plan adapter tách biệt | Blocking cho connector; non-blocking cho discovery |
| DQ-02: Chính xác bộ trạng thái/terminal state và ai được chuyển? | Code có 10 status; người dùng trước đó nghi có 12; completion hiện chỉ đếm closed | Workflow, filters, report | Bộ cố định đã duyệt hoặc config theo dự án | Giữ 10 làm reference UI, không coi là policy được duyệt | Blocking trước lifecycle/rule implementation |
| DQ-03: Rule bug chính thức gồm trường nào, format tiêu đề, evidence nào bắt buộc? | Tránh tự bịa quy tắc khách Nhật | Rule profile, defect form, validation | Template có version; rule theo project/type | Yêu cầu tái hiện từ tài liệu là cơ sở phân tích, chưa đủ regex/mandatory policy | Blocking trước nghiệm thu tạo bug |
| DQ-04: `Fix` là kết quả riêng hay retest OK; quan hệ nhiều case/nhiều bug xử lý thế nào? | Quyết định đồng bộ trạng thái an toàn | Execution, traceability, retest | Result code riêng hoặc outcome+retest flag; N-N có mapping | Không tự đổi mọi case hoặc tự đóng mọi bug | Blocking trước retest transaction |
| DQ-05: Ai được sửa test case khách hàng giao và cách duyệt bản dịch? | Cần provenance/version, tránh thay expected âm thầm | Spec import/version, permissions | BrSE/QA Lead duyệt; tester ghi chú; quyền tùy dự án | Không coi grid-edit hiện tại là quyền đã được duyệt | Blocking trước edit/import permissions |
| DQ-06: Roles và phạm vi khách hàng/SY/SHIFT theo dự án? | Tránh lộ dữ liệu cross-project | Auth, membership, reports | Một tổ chức nhiều role; nhiều tổ chức theo project | Phân quyền server theo membership; tên role chờ chốt | Blocking trước auth/project acceptance |
| DQ-07: Evidence, tài khoản test và external links lưu ở đâu, giới hạn/retention? | Quyết định storage/security | Evidence, handbook, export | Object storage hoặc local dev; secret manager/link riêng | Không đưa secret vào Markdown/public API | Blocking trước production upload; non-blocking lập plan |
| DQ-08: KPI thực thi/hoàn thành/NG/NA/P, timezone và cập nhật “thời gian thực” định nghĩa gì? | Số liệu phải đối chiếu được | Reporting, progress, release | Sau mutation + refresh/poll; realtime push nếu cần | Chốt công thức và phạm vi trước report sprint | Blocking trước report acceptance |
| DQ-09: Template Excel, cỡ dữ liệu và source language cần giữ thế nào? | Quyết định import/mapping/test dữ liệu lớn | Test specs/import | Một template chuẩn trước, mở mapping sau | Không build importer cho mọi Excel format | Blocking cho import thật |

## 18. Target Architecture — Kiến trúc mục tiêu

Chọn **modular monolith** cho backend và React theo feature; chưa có lý do cần microservices. Không tạo abstraction chỉ để đủ tên lớp.

```text
React page / feature component
  -> feature hook + UI state
  -> API client / request-response contracts
  -> REST /api/v1 (authenticated project context)
  -> Controller (binding + validation trigger)
  -> Application service / use case (permission + transaction orchestration)
  -> Domain (rules + transitions + invariants)
  -> Repository boundary / persistence adapter
  -> MySQL (FK/unique/check/index theo model đã duyệt)

Flyway versioned migrations -> MySQL schema
Application use case -> Audit event trong transaction
Integration adapter -> external tracker (scope được chốt riêng)
Evidence service -> metadata DB + storage có kiểm soát truy cập
```

Boundary đề xuất:

- **Identity & Access:** user/session, project membership/permissions; backend chịu trách nhiệm enforce.
- **Project & Planning:** project, phase/release, environment/device/build, test run, assignment; không lấn sang quản lý DevOps của sản phẩm khách hàng.
- **Test Definitions:** specification, case, case version, import provenance và bản dịch nếu phạm vi yêu cầu.
- **Execution:** lần thực thi, result, actor, version/môi trường/evidence và lịch sử; definition không bị overwrite khi đã dùng trong execution.
- **Defect & Work Items:** lỗi và công việc liên quan, rule profile, lifecycle commands, comment, resolution/closure reason, traceability.
- **Reporting:** đọc cùng facts của execution/defect để tính KPI; thuật ngữ completed/resolved/terminal phải được định nghĩa.
- **Knowledge:** sổ tay/rule tham chiếu có version/quyền; dữ liệu bí mật có chính sách riêng.
- **Integration:** tracker mapping/sync status/retry theo scope; lỗi external không làm mất dữ liệu nội bộ đã ghi nhận.

Nguyên tắc triển khai:

1. Chốt use case/rule/domain/API của feature trước khi viết migration và code thực thi feature đó.
2. Mỗi sprint có phạm vi, dependency, đầu ra, test và DoD riêng; chỉ chạy sprint được yêu cầu và dừng tại điểm bàn giao.
3. MySQL bảo vệ data integrity; backend là nơi quyết định business state; frontend validation chỉ phục vụ UX.
4. Flyway lưu lịch sử migration theo sprint, không sửa migration đã áp dụng vào môi trường dùng chung; thay đổi mới bằng migration mới. Không dùng thao tác DB thủ công thay cho migration.
5. Giữ giao diện, menu và component có giá trị; thay mock từng phần bằng contract/API, không rewrite toàn bộ frontend.
6. Tests ưu tiên invariants, authorization, state transitions, linked retest, import, migration và report consistency; không chỉ test CRUD happy path.

Discovery này là đầu vào cho SYSTEM DEVELOPMENT MASTER PLAN. Kết luận sẵn sàng chuyển sang **lập kế hoạch**, không phải tự động bắt đầu tất cả sprint hoặc triển khai toàn bộ hệ thống.
