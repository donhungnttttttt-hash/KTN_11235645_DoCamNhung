# Sprint 04 — Bộ test case, phiên bản và nhập Excel

### Cập nhật mới nhất 03/10/2026 — V12 và tài liệu Excel thật

03/10/2026 22:47–23:00: theo yêu cầu dùng Flyway tự cập nhật, đã backup native tms rồi restart backend để áp V12 thành công; restart lần nữa validate/up-to-date. API tài liệu hết404. Browser thật nhập workbook155case vào project1/document3, mở lưới/chi tiết revision, lọc NG3dòng, phân trang100+55, reload/menu/mobile PASS. Export API200, bản gốc giống bytes và bản hiện tại giữ155x14cell/type/style/hyperlink (39links). FE224/224/build PASS, BE14/14 parser/export/verify PASS. Coverage riêng TestDocumentPage: statements94.59%,branches83.2%,functions92.5%,lines98.59%. Còn isolated native integration/fresh migration, coverage BE API/service và UAT; không chạy destructive tests trên tms. Chi tiết docs/reviews/2026-10-03-test-documents.md.


### Cập nhật 03/10/2026 — Tài liệu Excel khách, đang kiểm chứng

Người dùng đã duyệt toàn bộ. Đã triển khai danh sách file → bảng14cột → chi tiết case/revision, import mẫu khách và export nguồn/hiện tại; giữ thư viện case/nhóm cũ ở `/tests/cases`. V12 thêm nguồn binary và sheet vào import_batches, không thêm bảng. M/N và kết quả cũ chỉ là nguồn, không tự tính vào execution. [Báo cáo, quyết định và lệnh tiếp tục](../../reviews/2026-10-03-test-documents.md).

FE222tests/build PASS; coverage4file96.01% statements/82.5% branches/96.29% functions/100% lines. BE65unit và final13parser/export PASS; actual155rows round-trip giữ39links/33styles. Eclipse136source/0warning. Fresh review sửa callback sau unmount có regression RED→GREEN. Browser mock API desktop/mobile/navigation PASS, không thay E2E thật. S04-T03 giữ IN_REVIEW: native schema test chưa được tạo/grant, user nói sẽ tạo trong Workbench; cần fresh/upgradeV12, integration và E2E thật. Không test ghi/xóa lên tms, không commit/push/deploy.

Trạng thái theo [STATUS.json](../STATUS.json). Kế hoạch lập 22/09/2026; chưa triển khai trừ các task tài liệu được ghi DONE. Ước lượng ban đầu: **6–9 ngày công**, chưa phải lịch cam kết.

## Mục tiêu

Thay việc quản lý bộ case bằng các tệp rời bằng dữ liệu tập trung, đồng thời giữ nguồn tiếng Nhật, bản tiếng Việt và lịch sử phiên bản.

## Phụ thuộc và điều kiện vào

S03; có file mẫu đã ẩn dữ liệu nhạy cảm, mapping cột và owner duyệt case.

Đọc [discovery](../01-discovery.md), [business rules](../02-business-rules.md), [API](../05-api-contract.md), [database](../04-database-and-migrations.md) và [quy trình thực hiện](../06-execution-guide.md). Kiểm tra điều kiện tiên quyết bằng code và kết quả kiểm thử thực tế; không tự làm các sprint tiền nhiệm nếu chưa hoàn thành.

## Ngoài phạm vi

Không dịch AI tự động, không thay nội dung khách đã duyệt, không parser mọi loại Excel.

## Thứ tự task

### S04-T01 — Domain case và revision

- **Feature:** Domain case và revision
- **Objective:** Thiết kế contract/schema và dịch vụ suite/case/revision/approval.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/api/openapi.yaml; Backend/**/testcase/; Backend/src/main/resources/db/migration/; Backend/src/test/
- **Backend changes:** Case stable identity + immutable revisions, source/translation provenance, permission approve.
- **Frontend changes:** N/A — nối UI ở T03.
- **Database changes:** Suites/cases/revisions; unique source identity, revision number, ownership/delete rules.
- **API changes:** List/detail/create/revisions/approve APIs.
- **Business rules:** Khách/SHIFT cung cấp case, BrSE dịch; chỉ revision đủ điều kiện được chọn chạy.
- **Tests / bằng chứng cần có:** Phiên bản đã lưu không bị sửa, nguồn nhập trùng, tham chiếu sai dự án, phê duyệt khi không có quyền và migration.
- **Dependencies:** S03 + quyết định owner/approval.
- **Risk:** Ghi đè expected result của case khách; mất nguồn gốc.
- **Definition of Done riêng:** Backend lưu history bất biến, API contract/tests PASS.

### S04-T02 — Import preview và commit

- **Feature:** Import preview và commit
- **Objective:** Hỗ trợ mẫu Excel cụ thể, kiểm soát lỗi và trùng lặp.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Backend/**/imports/; Backend/src/main/resources/db/migration/; docs/imports/; Backend/src/test/resources/
- **Backend changes:** Parse theo mapping, validate toàn bộ, preview staged có TTL, commit idempotent; không thực thi macro/formula.
- **Frontend changes:** Thiết kế upload/mapping/preview/errors, chưa cần rich spreadsheet editor.
- **Database changes:** Import batch/dedup/source metadata; atomic commit trong cap đã chốt.
- **API changes:** Tạo và xác nhận import preview; validation theo dòng, giới hạn tệp.
- **Business rules:** Không coi upload thành công là import xong; dòng case lỗi phải được báo rõ, không bị bỏ qua âm thầm.
- **Tests / bằng chứng cần có:** Ô gộp trong mẫu thật, Unicode tiếng Nhật/Việt, dòng trống, nhập trùng, sai định dạng và vượt giới hạn dữ liệu.
- **Dependencies:** S04-T01 + mẫu import.
- **Risk:** Mẫu Excel đa dạng, file lớn, formula injection khi export sau này.
- **Definition of Done riêng:** Import lặp không nhân bản; error row rõ; không partial write bất ngờ.

### S04-T03 — UI quản lý case

- **Feature:** UI quản lý case
- **Objective:** Nối TestSpecs và phần mô tả case với API; tách sửa định nghĩa khỏi ghi kết quả.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Frontend/src/app/pages/TestSpecsPage.jsx; Frontend/src/app/pages/TestRunnerGridPage.jsx; Frontend/src/app/features/test-cases/; Frontend/src/app/services/api/
- **Backend changes:** Điều chỉnh projections theo contract; không trả entity JPA trực tiếp.
- **Frontend changes:** Danh sách, tìm kiếm, chi tiết, lịch sử, xem trước dữ liệu nhập và phê duyệt theo quyền; giữ phong cách bảng hiện có.
- **Database changes:** N/A ngoài schema T01/T02.
- **API changes:** Case/import clients; pagination và filters.
- **Business rules:** UI tiếng Việt, nội dung gốc Nhật lưu để truy vết; đổi spec không đổi execution cũ.
- **Tests / bằng chứng cần có:** RTL/errors/empty, E2E import→review→case detail→revision; route ID invalid; build.
- **Dependencies:** S04-T01/T02.
- **Risk:** Trang lớn khó tách, sửa UI ảnh hưởng runner.
- **Definition of Done riêng:** Reload giữ dữ liệu, revision/truy vết hiển thị đúng, không còn mock cho case đã tích hợp.

## Demo và nghiệm thu sprint

**Review 28/09/2026:** kết luận DONE trong nhật ký 27/09 không còn hiệu lực. Khi đó chỉ biên dịch và chạy test cũ, chưa kiểm chứng migration/import thật. Dùng trạng thái và bằng chứng mới bên dưới.

Import preview chỉ rõ dòng lỗi; commit một lần không trùng; case revision cũ không đổi khi thêm bản dịch mới.

- [ ] Các task trong phạm vi đạt DoD riêng và [DoD chung](../06-execution-guide.md).
- [ ] Kiểm tra trọn luồng chọn file trên Chrome còn cần quyền file URL của extension.
- [x] API/database/UI liên quan khớp nhau; migration kiểm tra fresh + upgrade nếu có.
- [x] Nhật ký, STATUS.json, docs và các quyết định được cập nhật.
- [x] Chưa tự triển khai sprint kế tiếp.

## Nhật ký thực hiện

### 2026-09-27 — Nhật ký ban đầu (kết luận DONE bị mở lại sau review)

- **Task IDs:** S04-T01, S04-T02, S04-T03 (trạng thái: PLANNED -> DONE)
- **Tập tin tạo mới / chỉnh sửa:**
  - Database: `Backend/src/main/resources/db/migration/V4__create_test_case_library.sql`
  - Backend: `Backend/src/main/java/vn/syp/tms/testcase/TestCaseEntities.java`, `TestCaseRepositories.java`, `TestCaseDtos.java`, `TestCaseService.java`, `TestSuiteController.java`, `TestCaseController.java`, `ImportController.java`
  - Frontend: `Frontend/src/app/services/api/testCases.js`, `Frontend/src/app/pages/TestSpecsPage.jsx`, `Frontend/src/app/features/test-cases/test-cases.css`, `CreateSuiteDialog.jsx`, `CreateCaseDialog.jsx`, `ImportExcelDialog.jsx`, `CaseDetailModal.jsx`
- **Kiểm tra và kết quả:**
  - Backend compilation (`javac release 21` trên 55 file nguồn Java): **PASS** (BUILD SUCCESS).
  - Frontend test suite (`vitest run` 3 files, 25 tests): **PASS** (25/25 passed).
  - Frontend production build (`vite build`): **PASS** (1631 modules transformed, 0 errors).
- **Quyết định nghiệp vụ & kỹ thuật:**
  - Hỗ trợ lưu trữ song ngữ (VI dịch thuật & JP bản gốc nguồn) trong từng revision.
  - Test case revision là bất biến (`append-only`), sửa đổi tạo revision mới với `revision_no` tăng dần.
  - Phê duyệt (`approveRevision`) gắn thẩm quyền Admin/PM và lưu actor audit.
  - Import preview tạo staging batch có hạn dùng (TTL 24h), phân tích và gắn cờ lỗi từng dòng; xác nhận (commit) xử lý nguyên tử (all-or-nothing/idempotent).
- **Việc tiếp theo:** S05 — Đợt kiểm thử, phân công và ghi nhận thực thi (chờ yêu cầu từ người dùng).

### 2026-09-28 — Review và hoàn thiện luồng thật

- Nhánh `feature/sprint-03-04-review`, giữ checkpoint trong Git stash; chưa commit/push.
- Quyết định mẫu xlsx nội bộ, PM-only approval, Fix chờ retest được ghi trong ADR-004. Contract: `docs/api/test-cases.md`, `test-cases.openapi.json`.
- Sửa V4 chưa từng được áp dụng local (MySQL lúc bắt đầu chỉ V1/V2): đổi `row_number` thành `source_row_number`. V1/V2 giữ nguyên. Thêm V5 cho soft archive builds, audit nghiệp vụ và index dedup. V4/V5 nay đã chạy local: mọi thay đổi schema tiếp theo dùng V6+.
- BE: bật quét repository lồng nhau; khắc phục tạo project thiếu updated_by, scope membership, soft archive build, PM-only approval; immutable revision, expectedCurrentRevisionId, lịch sử đầy đủ, tìm kiếm/phân trang server. Khóa giao dịch theo project, audit cùng transaction.
- Excel: Apache POI 5.5.1 đọc file thật; template nội bộ có VI/JP; giới hạn 5 MiB/500 dòng/20 MiB giải nén, chặn công thức/macro/ô gộp/liên kết ngoài; lỗi giữ số dòng gốc. Preview TTL, owner scope, real checksum; commit all-or-nothing/idempotent, không ghi đè case.
- FE: tải mẫu/upload/preview/errors/commit, lịch sử đầy đủ, sửa VI/JP qua revision mới; role theo dự án; không mock fallback khi API lỗi; chặn response cũ sau đổi dự án; retry và pagination.
- Bằng chứng test và giới hạn browser xem `docs/reviews/2026-09-28-sprints.md`. Demo: `http://127.0.0.1:5173/#/tests`, dự án DEMO-S04; dữ liệu demo riêng do tác vụ tạo.
- T01/T02 có kiểm thử tích hợp; T03 giữ IN_REVIEW vì chọn file tự động trên Chrome bị chặn bởi cấu hình extension. Không coi kiểm thử API/RTL là đã chạy E2E upload trọn vẹn. S03 còn review chức năng cấu hình; chưa bắt đầu S05.

## Review tiếp ngày 30/09/2026

Bổ sung focus trap/Tab/Shift+Tab/Escape/restore focus cho dialog case/import, aria và bố cục vùng cuộn. RTL và hồi quy HTTP Excel–preview–commit tiếp tục được kiểm tra. Chrome xác nhận mở dialog, focus ban đầu và thông báo khi chưa chọn file. T03 vẫn IN_REVIEW vì chưa hoàn tất upload file trên browser; đã hỏi người dùng bật quyền truy cập file của extension hoặc tự chạy kịch bản. Không coi multipart HTTP là thay thế E2E UI. Chi tiết [review hoàn thiện](../../reviews/2026-09-30-review-completion.md).

### 03/10/2026 — Import nhận diện tiêu đề

03/10/2026 import theo tiêu đề hoàn tất phạm vi hai workbook khách: 128case/0lỗi trên browser native, mapping JSON giữ cột phụ và title kế thừa không đổi ô nguồn; template khách mới. FE225/225/build, BE20parser/export/verify và diagnostics0warning PASS; round-trip128x14 và155x14 PASS. Xem docs/reviews/2026-10-03-header-based-import.md. Ưu tiên hoàn tất import trước rồi tiếp tục yêu cầu khôi phục màn cũ/nút ba gạch/lịch sử/ghi kết quả; chưa thay đổi nghiệp vụ thực thi. Gate isolated integration/UAT giữ mở.
