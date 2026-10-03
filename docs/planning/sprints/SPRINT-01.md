# Sprint 01 — Nền tảng backend, MySQL và Flyway

Trạng thái: **DONE**, bằng chứng trong nhật ký bên dưới và [STATUS.json](../STATUS.json). Kế hoạch lập và thực hiện 22/09/2026. Ước lượng ban đầu **4–6 ngày công** là ước lượng khi lập kế hoạch, không phải thời gian thực tế đã tiêu tốn.

## Mục tiêu

Khởi chạy backend có kiểm tra sức khỏe, migration có kiểm soát và bộ khung kiểm thử/contract. Theo chỉnh sửa của người dùng, kiểm tra hệ thống được thực hiện qua terminal/log/công cụ phát triển; không đưa lên giao diện web.

Theo dõi bằng `scripts/Check-System.ps1`, log backend/Flyway và test tự động. API local `/api/v1/system/**` và bảng `foundation_checks` trong V1 chỉ phục vụ kiểm tra nội bộ. Bảng này xác nhận đường ghi/đọc thực tế, không phải CRUD nghiệp vụ S02–S06. [ADR-001](../../decisions/ADR-001-sprint-01-foundation.md) ghi lý do và giới hạn.

## Phụ thuộc và điều kiện vào

S00-T01/T02 hoàn thành; các đề xuất kỹ thuật được ghi rõ. Không phụ thuộc câu trả lời integration ở S09.

Đọc [discovery](../01-discovery.md), [business rules](../02-business-rules.md), [API](../05-api-contract.md), [database](../04-database-and-migrations.md) và [quy trình thực hiện](../06-execution-guide.md). Kiểm tra điều kiện tiên quyết bằng code và kết quả kiểm thử thực tế; không tự làm các sprint tiền nhiệm nếu chưa hoàn thành.

## Ngoài phạm vi

Không CRUD bug/test case, không login hoàn chỉnh, không chạy tất cả schema tương lai.

## Thứ tự task

### S01-T01 — Chốt cấu hình và skeleton

- **Feature:** Chốt cấu hình và skeleton
- **Objective:** Chọn bộ phiên bản Java 21, Spring Boot, MySQL 8.4 và Flyway tương thích, cố định phiên bản; tạo Maven wrapper và cấu hình theo môi trường.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Backend/pom.xml; Backend/mvnw*; Backend/src/main/**; compose.yaml; .env.example; docs/development.md
- **Backend changes:** Spring Web/JPA/Validation/Security nền, cấu hình môi trường, health, exception mapping/requestId; không mở endpoint nghiệp vụ vô danh.
- **Frontend changes:** Giữ entry hiện tại; chỉ cấu hình API base URL nếu cần.
- **Database changes:** MySQL local volume + healthcheck; credentials qua env; chưa có dữ liệu khách.
- **API changes:** Health, error conventions trong docs/api/openapi.yaml.
- **Business rules:** Không secret trong git/log; runtime credentials khác migrator.
- **Tests / bằng chứng cần có:** Compile/verify bằng wrapper; kiểm tra health khi sẵn sàng và chưa sẵn sàng; cấu hình thiếu trả lỗi rõ ràng.
- **Dependencies:** S00-T01/T02.
- **Risk:** Version lệch, port trùng, Docker/Java chưa có.
- **Definition of Done riêng:** Hướng dẫn cài từ môi trường sạch với dependency cố định có thể tái lập; smoke test PASS, chỉ cài thành phần cần thiết.

### S01-T02 — Migration nền tảng

- **Feature:** Migration nền tảng
- **Objective:** Thiết lập Flyway và kiểm chứng nâng schema an toàn.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Backend/src/main/resources/db/migration/; Backend/src/test/**/migration/; docs/database/; compose.yaml
- **Backend changes:** Tích hợp flyway-core + module MySQL phù hợp; Hibernate validate.
- **Frontend changes:** N/A — phiên bản schema theo dõi tại terminal, không có màn diagnostic trên web.
- **Database changes:** Migration đầu chỉ chứa phần nền tảng cần ở S01; có lịch sử migration; không sinh trước toàn bộ domain; tách dữ liệu seed demo.
- **API changes:** N/A — migration không tạo business endpoint.
- **Business rules:** Migration đã dùng chung bất biến; không clean/repair tự động; fail thì app không ready.
- **Tests / bằng chứng cần có:** MySQL thật trên môi trường tạm: migrate DB rỗng, khởi động lại không chạy lặp, phát hiện lệch checksum, xử lý DB không sẵn sàng; ghi mốc schema dùng để kiểm tra nâng cấp.
- **Dependencies:** S01-T01.
- **Risk:** MySQL DDL implicit commit; không thể hứa rollback migration.
- **Definition of Done riêng:** Cài mới và chạy lại đều PASS; vô hiệu hóa Flyway clean; ghi rõ kế hoạch phục hồi.

### S01-T03 — Khung contract và kiểm thử frontend

- **Feature:** Khung contract và kiểm thử frontend
- **Objective:** Đặt API boundary và regression cơ bản cho shell/route.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/api/openapi.yaml; Frontend/src/app/services/api/; Frontend/src/app/routes/; Frontend/src/app/pages/TestRunnerGridPage.jsx; Frontend/package.json; Frontend/src/test/
- **Backend changes:** Chuẩn DTO/error pagination conventions; tests cho error handler.
- **Frontend changes:** API client tập trung, mock adapter chỉ bật khi được cấu hình rõ; Vitest/RTL; tách pathname/query khi đọc route, bỏ hành vi trả về spec đầu khi ID sai; giữ giao diện.
- **Database changes:** Dùng bảng foundation_checks do S01-T02 quản lý cho đường ghi/đọc diagnostic; không tạo bảng nghiệp vụ hay bảng riêng cho test UI. Test unit FE vẫn dùng mock tường minh.
- **API changes:** Error/health schemas, 401/403/409 xử lý tại client; endpoint feature chưa tồn tại không gọi giả.
- **Business rules:** URL caseId không được trỏ nhầm spec; lỗi API không âm thầm hiển thị mock.
- **Tests / bằng chứng cần có:** Route /board?filter, /tests/504?caseId=2, ID không tồn tại; sidebar submenu; FE test/build.
- **Dependencies:** S01-T01; không đợi domain bug.
- **Risk:** Refactor routing lan rộng; mock che lỗi production.
- **Definition of Done riêng:** Smoke routes và states PASS, API client có test, không rewrite toàn app.

## Demo và nghiệm thu sprint

Từ DB rỗng chạy một migration nền tảng; khởi động lại không chạy lặp; FE build; health và API error mẫu kiểm thử được.

- [x] Các task trong phạm vi đạt DoD riêng và [DoD chung](../06-execution-guide.md).
- [x] Không task bị chặn hoặc kiểm tra chưa chạy bị ghi thành DONE.
- [x] API/database/UI liên quan khớp nhau; migration kiểm tra DB rỗng và chạy lại V1. Chưa có V2 để kiểm tra nâng từ phiên bản trước.
- [x] Nhật ký, STATUS.json, docs và các quyết định được cập nhật.
- [x] Chưa tự triển khai sprint kế tiếp.

## Nhật ký thực hiện

### 22/09/2026 — S01-T01/T02/T03: PLANNED → IN_PROGRESS → DONE (lần nghiệm thu ban đầu)

Bằng chứng ở mục này ghi lại lần triển khai đầu; màn diagnostic và 4 test UI sau đó đã được gỡ theo chỉnh sửa ở cuối nhật ký. Dùng mục cập nhật cuối làm trạng thái hiện hành.

Nhánh `feature/sprint-01-foundation`, base `develop` tại `3355cfc` (đã chứa frontend). Chưa tạo commit/push/merge trong tác vụ này. Giữ tài liệu planning đang có trong working tree.

| Task | Đầu ra và bằng chứng |
| --- | --- |
| S01-T01 | Backend/pom.xml + wrapper 3.9.11 có SHA-256; Web/JPA/Security/Validation/Actuator; cấu hình env, requestId/error JSON. compose.yaml dùng MySQL 8.4.8, localhost:3310, volume riêng; tms_app chỉ DML và migrator riêng. docs/development.md có cách cài/chạy từ môi trường sạch. |
| S01-T02 | V1__create_foundation.sql: application_info + foundation_checks; flyway_schema_history do Flyway quản lý. Hibernate validate; clean bị khóa, baseline/out-of-order tắt. Testcontainers MySQL 8.4.8 kiểm tra DB rỗng, chạy lại giữ dữ liệu, phát hiện checksum sai, không clean, fail khi DB không kết nối. |
| S01-T03 | docs/api/openapi.yaml; API client cùng origin/timeout/cancel/CSRF/lỗi; màn Kiểm tra hệ thống có loading/empty/save/success/error/retry. Vitest/RTL; tách route query, bỏ fallback spec đầu, deep link mở đúng case; giữ sidebar submenu. |

**Kết quả kiểm tra:**

- **PASS:** `Backend: .\mvnw.cmd -B -ntp verify` — **9 test**, không fail/error/skip; gồm DefaultProfileSecurityTest (1), FoundationIntegrationTest (5), MigrationTest (2), ApiExceptionHandlerTest (1). Test chạy trên container tạm, không dùng database local để chạy test.
- **PASS:** `Frontend: npm test` — **20 test**, 3 file; API boundary (10), UI states (4), route/submenu/deep link (6).
- **PASS:** `Frontend: npm run build` — Vite production build. `npm audit` sau khi nâng Vitest và bỏ react-router-dom chưa dùng: 0 advisory tại thời điểm kiểm tra, không phải chứng nhận an toàn tương lai.
- **PASS:** Browser mở `/#/dashboard/system`, thấy MySQL 8.4.8/V1, lưu tiếng Việt qua CSRF/session, reload vẫn đọc lại được từ MySQL. Kiểm tra DB có 1 bản ghi diagnostic và một history V1 thành công.
- **PASS:** Tạm dừng đúng container của dự án: readiness HTTP 503/DOWN và UI báo DATABASE_UNAVAILABLE kèm requestId; khởi động lại container và bấm Kiểm tra lại: dữ liệu cũ vẫn còn. Không tác động MySQL khác của người dùng.
- **PASS:** Browser mở submenu Bảng công việc → Danh sách đúng route `/board/list`; deep link `/tests/504?caseId=2` mở Chi tiết Case và chỉ số `2 / 3`.
- **PASS:** Kiểm tra runtime grants chỉ DML; thử CREATE TEMPORARY TABLE bị từ chối. Khởi động backend ở process riêng không có DB config thất bại, chỉ rõ TMS_DB_URL.
- **PASS:** Maven distribution kiểm SHA-512 với Maven Central trước khi ghi SHA-256 vào wrapper; dependency tree xác nhận Flyway 11.7.2, Connector/J 9.7.0, Testcontainers 1.21.4. Phiên bản không dùng latest.
- **PASS:** Đối chiếu 12 sprint/37 task, 25 tài liệu Markdown và bản sao nguồn: không có lỗi liên kết/ID/encoding. OpenAPI parse YAML thành công, không trùng key, 5 path/6 operation, mọi `$ref` nội bộ hợp lệ. `git diff --check` sạch; `.env`, dependency và output build được ignore.

Các test FE ban đầu lệch text/kích thước fixture được sửa theo UI thực tế, rồi chạy lại toàn bộ thành công. Không thay đổi nghiệp vụ để làm test pass. Browser kiểm tra tương tác/DOM; ảnh chụp màn hình bị timeout của kết nối trình duyệt, không coi đó là bằng chứng ảnh đã chụp.

**DoD không áp dụng ở S01:** phân quyền actor/project, business audit và transitions chưa có vì không có business endpoint. CSRF, local profile, loopback và credential separation bảo vệ phạm vi diagnostic. Backup/restore đầy đủ, tải lớn, deployment chưa kiểm tra; thuộc S10/S11. Không còn blocker trong phạm vi S01.

### 22/09/2026 — Điều chỉnh: theo dõi kỹ thuật ở terminal

- **Yêu cầu:** không để màn Kiểm tra hệ thống trên web; theo dõi nội bộ phía phát triển.
- **Đã sửa:** gỡ tab, SystemCheckPage, CSS, service diagnostic và 4 test gắn với màn đó. Dashboard giữ hai tab Tổng quan dự án/Tổng quan kiểm thử. Ghi quy tắc này vào AGENTS.md để các sprint sau không đưa lại công cụ kỹ thuật lên giao diện nghiệp vụ.
- **Công cụ nội bộ:** scripts/Check-System.ps1 đọc readiness, phiên bản MySQL và Flyway, không ghi dữ liệu. API client dùng chung, backend/API local, database và V1 đã áp dụng giữ nguyên.
- **PASS:** FE `npm test` **16/16**, `npm run build`; Check-System.ps1 trả exit 0 với backend thật, MySQL 8.4.8/V1; thử cổng không có backend trả FAIL/exit 1 đúng kỳ vọng.
- **Backend/migration:** không đổi source, không chạy lại 9 test backend đã PASS ở lần nghiệm thu đầu. Không tạo migration mới hoặc sửa V1 để gỡ một màn frontend.

**Bàn giao hiện tại:** [hướng dẫn chạy](../../development.md), [contract](../../api/openapi.yaml), [migration](../../database/README.md). Giao diện tại `http://127.0.0.1:5173/#/dashboard`; theo dõi hệ thống bằng terminal. Dừng tại S01; khi người dùng yêu cầu S02 thì đọc lại prerequisite và các câu hỏi về danh tính/quyền, không triển khai tự động.
