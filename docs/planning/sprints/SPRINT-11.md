# Sprint 11 — Triển khai thử nghiệm, bàn giao và đánh giá đề tài

### Cập nhật mới nhất 03/10/2026 — V12 và tài liệu Excel thật

03/10/2026 22:47–23:00: theo yêu cầu dùng Flyway tự cập nhật, đã backup native tms rồi restart backend để áp V12 thành công; restart lần nữa validate/up-to-date. API tài liệu hết404. Browser thật nhập workbook155case vào project1/document3, mở lưới/chi tiết revision, lọc NG3dòng, phân trang100+55, reload/menu/mobile PASS. Export API200, bản gốc giống bytes và bản hiện tại giữ155x14cell/type/style/hyperlink (39links). FE224/224/build PASS, BE14/14 parser/export/verify PASS. Coverage riêng TestDocumentPage: statements94.59%,branches83.2%,functions92.5%,lines98.59%. Còn isolated native integration/fresh migration, coverage BE API/service và UAT; không chạy destructive tests trên tms. Chi tiết docs/reviews/2026-10-03-test-documents.md.


### Cập nhật 03/10/2026 — Khôi phục tài liệu test theo Excel khách

Mở rộng S04 theo phê duyệt toàn bộ của người dùng: parser/export khách và nguồn14cột, V12 additive giữ56bảng, API tài liệu, UI tên file → lưới → chi tiết/revision. [Báo cáo](../../reviews/2026-10-03-test-documents.md), [spec](../../superpowers/specs/2026-10-03-test-documents-design.md), [plan/ledger](../../superpowers/plans/2026-10-03-test-documents.md) ghi rõ kỹ thuật và giới hạn.

ECC/using-superpowers/brainstorming/TDD/security/frontend/API/review/verification đã áp dụng. FE222tests/build PASS, BE65unit+final13parser/export PASS, nguồn thực tế155rows round-trip PASS; scopedFEcoverage4file đạt80% cả4chỉ số, BE API mới chưa có coverage vì chờ native integration. Eclipse136source/0warning. Fresh reviewer finding callback import sau unmount đã RED→GREEN; minor fixture legacy còn ghi lại. Browser dùng API mock xác minh desktop/mobile/Back/reload, chưa phải E2E persistence.

Blocker cụ thể: MySQL migrator chỉ có tms.*, schema tms_docstest_202610030001 chưa xuất hiện; user nói sẽ tạo qua Workbench. Không dùng tms cho test ghi/xóa, không tự tạo Docker. Còn kiểm chứng fresh/upgradeV12, six integration scenarios, E2E upload/export và cập nhật runtime sau khi đạt. S04/S11 giữ IN_REVIEW cùng gate UAT/pilot cũ; không tự commit/push/merge/deploy hoặc dừng server của người dùng.

Trạng thái theo [STATUS.json](../STATUS.json). Đã bắt đầu chuẩn bị kỹ thuật nội bộ ngày 30/09/2026 theo yêu cầu mở phạm vi của người dùng; UAT và triển khai thật vẫn có điều kiện riêng. Ước lượng ban đầu: **3–6 ngày công, cộng thời gian pilot**, chưa phải lịch cam kết.

## Mục tiêu

Chạy pilot có kiểm soát, hướng dẫn sử dụng/vận hành và đánh giá hiệu quả so với quy trình cũ.

## Phụ thuộc và điều kiện vào

S10 đạt DoD; S09 hoàn tất nếu mỗi bug phải lên Redmine; có môi trường và phạm vi dữ liệu được phép.

**Điều chỉnh phạm vi 30/09/2026:** người dùng yêu cầu làm những gì cần để tiến tới S11, tổng kiểm tra và nạp thêm dữ liệu. Cho phép thực hiện đóng gói, diễn tập local biệt lập, demo và tài liệu song song với các gate S10 còn mở. Quyền này không thay UAT người dùng, rule khách, quyền deploy hoặc quyền commit/push. Nhánh `feature/sprint-11-pilot` tạo từ `develop` tại `3355cfc`, giữ working tree các sprint trước chưa commit.

**Hợp đồng triển khai nội bộ:** ADMIN tạo 1 PM + 4 Tester qua API; PM chuẩn bị project/catalog/case/cycle và triage; Tester ghi attempt/chứng cứ/retest đúng phân công. Seed chỉ dùng loopback, dự án DEMO-PILOT, giữ idempotency/version/audit và các điều kiện đóng bug đã chốt. Không thay schema, không nạp giả vào bảng vận hành hoặc gửi ticket ngoài. Chuẩn bị tối thiểu 120 case, 240 lượt, 72 công việc đủ 10 trạng thái; chạy lại không tạo trùng. Dữ liệu mẫu không phải rule hoặc kết quả khách thật. Xem [demo](../../uat/demo-data.md).

Đọc [discovery](../01-discovery.md), [business rules](../02-business-rules.md), [API](../05-api-contract.md), [database](../04-database-and-migrations.md) và [quy trình thực hiện](../06-execution-guide.md). Kiểm tra điều kiện tiên quyết bằng code và kết quả kiểm thử thực tế; không tự làm các sprint tiền nhiệm nếu chưa hoàn thành.

## Ngoài phạm vi

Không thay hạ tầng DevOps sản phẩm khách; không migrate toàn bộ dữ liệu thật hoặc publish public khi chưa được giao.

## Thứ tự task

### S11-T01 — Đóng gói và runbook triển khai

- **Feature:** Đóng gói và runbook triển khai
- **Objective:** Chuẩn bị artifact, cấu hình môi trường, health check, phục hồi và checklist phát hành.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/deployment.md; docs/operations/; compose.yaml; Backend/src/main/resources/application*.yml; Frontend/.env.example
- **Backend changes:** Build artifact, env secrets, migrator job trước runtime, readiness.
- **Frontend changes:** Cấu hình build/triển khai, API URL theo môi trường; không tự chuyển sang mock khi API lỗi.
- **Database changes:** Backup và migrate trước khi khởi động app; validate và kiểm tra phiên bản; chỉ rollback app khi schema còn tương thích.
- **API changes:** Release contract/schema version ghi rõ.
- **Business rules:** Chỉ triển khai khi người dùng cung cấp môi trường đích, credential và phạm vi; chuẩn bị artifact/cấu hình có thể xem xét trước.
- **Tests / bằng chứng cần có:** Cài staging từ môi trường sạch; diễn tập nâng cấp/phục hồi; smoke test health, auth và luồng chính.
- **Dependencies:** S10 và môi trường triển khai đích.
- **Risk:** Triển khai nhầm môi trường, làm hỏng DB thật, thiếu chính sách lưu giữ dữ liệu.
- **Definition of Done riêng:** Có artifact/runbook/checklist; deploy thật chỉ ghi DONE khi thực sự chạy/verify hoặc tách task có BLOCKED.

### S11-T02 — Pilot, hướng dẫn và nghiệm thu

- **Feature:** Pilot, hướng dẫn và nghiệm thu
- **Objective:** Chạy luồng mẫu theo vai trò và thu phản hồi có phạm vi.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/user-guide.md; docs/uat/pilot.md; docs/operations/support.md
- **Backend changes:** Sửa lỗi pilot trong scope; không mở feature mới.
- **Frontend changes:** Hướng dẫn đúng sáu mục menu; nhập case, chạy test, ghi bug, retest, báo cáo và lỗi thường gặp.
- **Database changes:** Chỉ dữ liệu ẩn danh hoặc đã được phép; cleanup theo retention.
- **API changes:** API docs khớp artifact phát hành.
- **Business rules:** Không dùng mô phỏng Redmine như tích hợp thật trong báo cáo.
- **Tests / bằng chứng cần có:** PM/tester/BrSE/customer scenarios; đối chiếu dữ liệu với nguồn.
- **Dependencies:** S11-T01; có người tham gia và thời điểm pilot được thống nhất.
- **Risk:** Thiếu quyền hoặc người nghiệm thu; đánh đồng demo với đưa vào sử dụng thật.
- **Definition of Done riêng:** Có biên bản kết quả, hạn chế, issue còn lại và phiên bản bàn giao.

### S11-T03 — Đánh giá mục tiêu và tổng kết kỹ thuật

- **Feature:** Đánh giá mục tiêu và tổng kết kỹ thuật
- **Objective:** Đo mức giảm thiếu thông tin, giảm thao tác đồng bộ và độ khớp của báo cáo.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/evaluation.md; README.md; docs/planning/STATUS.json; docs/planning/backlog.md
- **Backend changes:** Ghi mức độ hoàn thiện domain/API/database và phạm vi kiểm thử; không thêm implementation ngoài sửa lỗi cần thiết.
- **Frontend changes:** Ảnh và luồng minh họa từ bản đã kiểm thử, nội dung tiếng Việt.
- **Database changes:** Danh mục schema/migration cuối; ghi rõ môi trường kiểm thử và dữ liệu mẫu.
- **API changes:** Phiên bản OpenAPI và ghi chú phát hành khớp code.
- **Business rules:** Không bịa số đo hoặc kết luận hiệu quả nếu chưa pilot; nêu baseline và cỡ mẫu.
- **Tests / bằng chứng cần có:** So sánh baseline/pilot: tỷ lệ ticket thiếu thông tin, thời gian ghi bug/retest, chênh lệch số liệu và số thao tác; kèm dữ liệu nguồn.
- **Dependencies:** S11-T02.
- **Risk:** Tuyên bố cập nhật thời gian thực hoặc dự báo ngày phát hành chính xác mà không có bằng chứng.
- **Definition of Done riêng:** Tài liệu bàn giao/đánh giá đủ để tái lập kết quả; sprint/task còn mở không bị gắn DONE.

## Demo và nghiệm thu sprint

Một người mới cài đặt theo README; chạy pilot end-to-end; có bằng chứng cho hướng dẫn backup/restore và quay lại phiên bản ứng dụng tương thích.

- [ ] Các task trong phạm vi đạt DoD riêng và [DoD chung](../06-execution-guide.md).
- [ ] Không task bị chặn hoặc kiểm tra chưa chạy bị ghi thành DONE.
- [ ] API/database/UI liên quan khớp nhau; migration kiểm tra fresh + upgrade nếu có.
- [ ] Nhật ký, STATUS.json, docs và các quyết định được cập nhật.
- [ ] Chưa tự triển khai sprint kế tiếp.

## Nhật ký thực hiện

### 30/09–01/10/2026 — S11-T01/T02/T03, kiểm tra toàn dự án

- PLANNED → IN_PROGRESS: tách migrator khỏi runtime release, build/manifest/checksum/runbook; diễn tập artifact với MySQL riêng và quyền runtime DML-only.
- Seed qua API: 120 case, 240 lượt, 72 công việc/32 bug, 10 trạng thái, rule/sổ tay/catalog/membership và retest có lịch sử. Backup trước ghi; nạp lại không tăng các số lượng nghiệp vụ.
- Audit local read-only: 56 bảng, 128 FK, 6 điều kiện domain; không có vi phạm. Dữ liệu demo không gửi sang Redmine.
- Tài liệu hướng dẫn, pilot/support và đánh giá đã thêm. Chưa đo baseline con người, chưa tự ký UAT.
- ECC: product-capability cho contract/phạm vi; tdd-workflow cho migration/journal; security-review cho secret/account/DDL và advisory; e2e-testing cho kiểm tra UI; verification-loop cho test/build/audit. Không đổi stack hoặc tự delegate.
- Phát hiện advisory Jackson mới trong lần quét lại, nâng BOM 2.21.7 và chạy lại regression/artifact; kết quả cuối, lỗi đã sửa và các gate chưa đạt tại [review S11](../../reviews/2026-09-30-sprint-11.md).
- Chưa commit/push/merge hoặc deploy máy chủ thật. Trạng thái cuối theo STATUS.json; không đánh dấu toàn S11 DONE khi còn nghiệm thu.

### 01/10/2026 — Review database và đổi hướng native MySQL

Người dùng yêu cầu review, ERD và hướng dẫn Workbench; ưu tiên MySQL Windows thay yêu cầu Docker cho runtime. Giữ một schema tms, không sửa V1–V11 hoặc xóa dữ liệu. Có metadata/ERD, initializer native, cấu hình, backup và guide; xác thực/cutover 3307 còn chờ thao tác mật khẩu tại máy. Kiểm chứng và giới hạn tại [review](../../reviews/2026-10-01-database-native-mysql.md).

### 01/10/2026 — Xuất ảnh ERD theo mẫu

Người dùng yêu cầu ảnh có các bảng/cột/kiểu dữ liệu và PK/FK, thay cho trang web xem schema. Đã xuất [9 ảnh PNG/SVG](../../database/erd/images/README.md), gồm 1 ảnh đủ 56 bảng và 8 ảnh theo nhóm. Đối chiếu 514 cột/128 FK với metadata V11; có CSV khóa ghép và manifest. Áp dụng ECC verification-loop cho artifact, không thay FE/BE/schema hoặc nâng trạng thái nghiệm thu S11. Native MySQL/các gate còn lại giữ nguyên.

### 03/10/2026 — Review dư thừa database và giảm JSON history

Theo yêu cầu mới, đối chiếu 56 bảng với code/FK/index; bổ sung [giải thích từng bảng](../../reviews/2026-10-03-database-complexity.md) và công cụ census chỉ đọc. Đính chính application_info là khóa bootstrap Admin. Sửa WorkItemService để UPDATE history không lặp toàn bộ detail; thêm allowlist before/after có version, giữ lịch sử cũ.

ECC coding-standards/security-review/tdd-workflow/verification-loop: RED 2/3 test đúng finding, GREEN 3/3 WorkItemHistoryTest và Maven verify/package PASS; coverage lớp mới 100% line/branch/method/instruction, không phải toàn backend. Không chạy integration MySQL hoặc browser khi native chưa có credential/config và nguồn cũ chưa chạy; không tạo container hay thay migration. S11 vẫn IN_REVIEW với gate UAT/native trước đó. BL-12–15 ghi retention/DDL/đo tải còn lại; không commit/push/deploy.

### 03/10/2026 — Brainstorming audit fields và bảng trung gian

Theo yêu cầu `$brainstorming`, phân loại Architectural và rà 56 bảng/128 FK, JPA/JDBC writers. Đã có bảng trung gian cho các quan hệ N–M; thiếu audit ở một số bảng có thể sửa, phát hiện writer NA chưa cập nhật `work_items.updated_by`. [Review đủ từng bảng và phương án](../../reviews/2026-10-03-database-audit-fields-relations.md) đang chờ xem thiết kế; chưa sửa backend hoặc tạo V12. Không đánh dấu finding đã sửa.

Đã kiểm tra service MySQL97/port 3307, Workbench, thiếu `.env.mysql.local`; SHA-256 hai backup khớp manifest, initializer `-PlanOnly` PASS, ma trận đủ 56/56 bảng, mỗi FK có PK/UNIQUE đích đầy đủ trong snapshot. Cập nhật guide để dùng backup SQL sẵn có không phải bật Docker, có bước JDK/PATH. Chưa xác thực/import native, chưa có test hành vi/coverage mới. Skill: brainstorming, using-superpowers. Giữ nguyên các gate S11, không commit/push/deploy.

### 03/10/2026 — Xác nhận native backend và xử lý lỗi cấu hình khi chạy Maven

Sau thao tác Workbench/khởi tạo của người dùng, `.env.mysql.local` đã có, `tms` 3307 có dữ liệu. Log `mvn spring-boot:run` lỗi thiếu `TMS_DB_URL` vì chưa nạp env. Chạy script hiện có với JDK21: backend 8080/profile local, MySQL9.7.0, Flyway validate 11 migration/schema V11, readiness PASS. Audit read-only 56 bảng/2596 hàng/128 FK/6 domain checks không có vi phạm. Frontend 5173 đã có, kiểm tra HTML HTTP200. [Review](../../reviews/2026-10-03-native-startup.md).

Skill systematic-debugging/verification-before-completion; không sửa code/migration hoặc chạy test ghi/xóa trên native. Flyway warning phiên bản9.7 còn phải theo dõi; UI/chứng cứ, regression9.7 và các gate pilot chưa hoàn tất. S11 vẫn IN_REVIEW, không commit/push/deploy.

Tiếp tục kiểm chứng lúc 13:38: backend readiness PASS; frontend HTML200, proxy `/api/v1/system/status` trả200/UP/MySQL9.7.0/V11, proxy readiness trả200/UP. STATUS JSON, link tài liệu và diff check PASS. Backend chạy trong phiên terminal; frontend có sẵn được giữ. Chưa kiểm thử đăng nhập/UI nghiệp vụ trên native ở lần này.

### 03/10/2026 — Xử lý Java Problems của VS Code

Tái hiện toàn bộ main/test bằng compiler Eclipse của extension Java: 485 warning/124 source → 0 warning/0 error/125 source. Sửa import/biến không dùng, contract null ở JDBC/filter/repository và helper test, method reference tương đương, ownership của Testcontainers và API POI deprecated; giữ null analysis bật. Bổ sung checker có thể chạy lại, cấu hình Maven tự cập nhật. [Review và cách làm mới IDE](../../reviews/2026-10-03-java-problems.md).

ECC systematic-debugging/coding-standards/verification-loop/verification-before-completion; Maven verify/package 53 unit test PASS, kiểm tra native read-only UP/MySQL9.7.0/V11. Chưa chạy lại integration/database/browser; không suy ra ảnh Problems 502 đã được xác nhận về 0 hoặc coverage full suite từ kiểm tra này. Không thay FE/schema, không commit/push/deploy; S11 vẫn IN_REVIEW.

Tiếp tục lúc 19:58 theo ảnh còn 17 Problems: checker trước thiếu `potentialNullReference`; bật warning này và `nullReference=error` tái hiện đúng 16 cảnh báo nullable unboxing/session. Sửa bằng kiểm tra non-null cho kết quả bắt buộc có, không fallback bộ đếm throttle về 0; giữ SQL/quyền/nghiệp vụ. Checker đầy đủ 125 source/0 warning/0 error PASS; Maven verify/package 53 unit test PASS. Cảnh báo Maven còn yêu cầu IDE update project configuration; chưa xác nhận trực tiếp UI Problems=0. Cập nhật đính chính trong review, không dùng kết quả cũ để khẳng định đã xử lý đủ 502. Không chạy integration/database/browser, không thay schema hoặc commit/push/deploy.

### 03/10/2026 — Chạy đúng lệnh Maven với cấu hình native

Theo yêu cầu mới, sửa để `cd Backend` / `mvn spring-boot:run` hoạt động trực tiếp. RED: startup không có TMS/Spring env lỗi thiếu TMS_DB_URL; config test1/4 lỗi. Maven run mặc định local và local YAML import file native/dựng URL; không đổi profile mặc định hoặc secret của JAR release. GREEN: config4/4, tổng57 unit/verify/package PASS; compiler126 source/0 error/0 warning, JAR không chứa file secret. [Review](../../reviews/2026-10-03-direct-maven-startup.md).

Startup thật lúc20:07 bằng đúng lệnh, không nạp env: local/Tomcat8080/MySQL9.7.0/127.0.0.1:3307/tms/FlywayV11, readiness/system status HTTP200/UP. Không migration mới hoặc bootstrap tài khoản; dừng phiên verifier để giải phóng8080. ECC systematic-debugging/tdd-workflow/security-review/verification-loop, chưa test integration/browser/UAT hoặc full regression9.7. Không V12/commit/push/deploy; S11 vẫn IN_REVIEW.

Tiếp tục lúc 20:17 theo yêu cầu chạy thử hai lệnh: backend đã khởi động bằng `mvn spring-boot:run` và giữ chạy tại 8080; chạy `npm run dev` trong Frontend, Vite sẵn sàng tại 5173. Đường dẫn tồn tại là `D:\DCN\KTN_11235645_DoCamNhung`, không phải `D:\DCN\KTN\_11235645\_DoCamNhung`. Kiểm tra qua proxy frontend: readiness trả UP; `/api/v1/me` trả HTTP401 UNAUTHENTICATED đúng với request chưa đăng nhập, không còn ECONNREFUSED. Lỗi trước xảy ra khi backend chưa nghe 8080; proxy không cần sửa. Giữ cả hai tiến trình để người dùng dùng thử. Skill systematic-debugging/verification-before-completion; không thay code/schema, không chạy lại regression hoặc đo coverage cho lần kiểm tra tiến trình này. S11 vẫn IN_REVIEW.

Sau đó đã dừng hai tiến trình theo yêu cầu người dùng; xác nhận chỉ MySQL 3307 còn lắng nghe. Theo yêu cầu đặt mật khẩu web riêng cho `admin.local`, cập nhật duy nhất hash tài khoản ADMIN đang hoạt động bằng PBKDF2 hiện có, tăng lock_version, thu hồi session của tài khoản và ghi audit LOCAL_PASSWORD_RESET trong cùng transaction. Mật khẩu yêu cầu không khớp trước thay đổi, khớp hash đọc lại sau cập nhật; commit thành công. Không ghi mật khẩu vào tài liệu/source, không đổi credential MySQL hoặc chính sách tạo tài khoản chung. Mật khẩu bootstrap cũ chỉ là cấu hình khởi tạo, không phản ánh mật khẩu đã reset. Skill security-review/systematic-debugging/verification-before-completion; chưa kiểm thử đăng nhập HTTP sau reset, không tự khởi động lại các server vừa được yêu cầu dừng; không đo coverage cho thao tác dữ liệu local này.

### 03/10/2026 — Cấp hai tài khoản tester local theo yêu cầu

Tạo `syp_admin01`, `syp_admin02`, tên hiển thị `Syp_admin01`, `Syp_admin02`, role TESTER/enabled và can_create_users=false. Dùng mật khẩu cố định do người dùng chỉ định cho hai tài khoản local; băm PBKDF2 có salt độc lập, không thay validation tạo tài khoản chung (12 ký tự) hoặc credential MySQL. Transaction gồm tạo tài khoản và USER_CREATED audit; không ghi đè tài khoản có sẵn, không tự cấp membership dự án.

Áp dụng security-review và verification-before-completion: đọc lại hash/quyền PASS; đăng nhập HTTP bằng đúng tên viết hoa người dùng yêu cầu PASS cho cả hai (backend chuẩn hóa chữ thường); GET /me xác nhận TESTER, không quyền users; GET /users trả403 cho cả hai; đăng xuất phiên kiểm chứng PASS. Dùng backend/frontend người dùng đang chạy, không khởi động/dừng tiến trình. Không đổi schema/code nghiệp vụ, không đo coverage cho thao tác cấp tài khoản local; S11 vẫn IN_REVIEW.

### 03/10/2026 — Khảo sát mẫu Excel khách và luồng tài liệu test

Người dùng yêu cầu import/export theo workbook thật và khôi phục danh sách file → bảng test case. Dùng using-superpowers, brainstorming (Architectural), spreadsheets để đọc file; tìm lại bố cục hai màn trong Git. Xác nhận 1 sheet/155 dòng/A:N, ID số và 39 hyperlink; importer hiện chỉ nhận mẫu nội bộ nên chặn. Người dùng duyệt giữ M/N dưới dạng nguồn, chưa tính tiến độ; cách tiếp nhận kết quả cũ cột I đang hỏi. [Bằng chứng khảo sát](../../reviews/2026-10-03-customer-excel-discovery.md).

Chưa sửa code ứng dụng/schema, chưa chạy test/build hoặc đo coverage. Đang chuẩn bị thiết kế cụ thể để người dùng xem theo brainstorming; chưa là spec/plan được duyệt, không commit/push/deploy. S04/S11 giữ IN_REVIEW và các gate cũ vẫn còn.

### 03/10/2026 — Thống nhất điều hướng bằng menu con sidebar

Người dùng gọi brainstorming và đã duyệt thiết kế bounded bằng “sửa giao diện được rồi”. Dùng mẫu Bảng công việc cho Tổng quan (2 mục), Quản lý kiểm thử (3 mục) và Cài đặt dự án (5 mục); giữ 3 menu đơn còn lại. Sidebar dùng cùng cấu hình nhóm, chỉ mở một nhóm, đánh dấu mục hiện tại, hỗ trợ thu gọn/bàn phím/mobile. Bỏ các hàng tab điều hướng tương ứng khỏi dashboard, thư viện/cycle/runner/retest và settings. Cài đặt có URL riêng cho members/rules/handbook; catalogs dùng URL cũ; giữ kiểm tra quyền hiện có. Các bộ lọc và chế độ nội dung trong trang vẫn ở nội dung; toolbar thư viện được bố trí lại để chữ không bị ép xuống nhiều dòng.

Skill: brainstorming (đã duyệt), frontend-patterns, tdd-workflow, playwright, verification-loop/verification-before-completion. RED: 20 test nhóm menu thất bại trước khi sửa; 2 settings deep-link thất bại; bổ sung regression 2 route board detail/new trước khi sửa nhận diện mục đang chọn. GREEN: `npm test -- --coverage --coverage.include=src/app/components/Sidebar.jsx --coverage.include=src/app/features/projects/ProjectSettingsPage.jsx --coverage.reportsDirectory=coverage/navigation --reporter=dot` — 203/203 tests, 26 files. Coverage chỉ hai file: 92.42% statements, 97.1% branches, 82.6% functions, 91.3% lines; không đại diện toàn frontend. `npm run build` PASS; diff whitespace check các file tracked đã sửa PASS. Dự án không có script lint/TypeScript, không báo đã chạy hai kiểm tra này.

Chrome dùng ứng dụng thật/MySQL native: đăng nhập Admin local, chuyển 3 mục kiểm thử, Back/reload, 5 mục settings và reload /settings/members, 2 mục tổng quan, thu gọn rồi mở nhóm khác PASS. Kiểm tra tại 1100×800, 800×760 và 390×844; mobile mở/chọn mục/đóng/Escape PASS. Ảnh local trong `output/playwright/sidebar-tests-desktop.png`, `sidebar-tests-narrow.png`, `sidebar-settings-desktop.png`, `sidebar-mobile.png` (được gitignore cùng snapshot CLI). Lần mobile probe đầu timeout do Vite HMR đã đóng menu; mở lại và chạy lại PASS. Console ban đầu có 401 trước đăng nhập và favicon404 hiện hữu, không coi là lỗi JavaScript mới hoặc đã sửa. Không chạy thao tác ghi nghiệp vụ trong browser ngoài login/session; không thay BE/schema/quyền, không commit/push/deploy. S11 vẫn IN_REVIEW theo gate UAT/pilot còn lại.

### 03/10/2026 — Import nhận diện tiêu đề

03/10/2026 import theo tiêu đề hoàn tất phạm vi hai workbook khách: 128case/0lỗi trên browser native, mapping JSON giữ cột phụ và title kế thừa không đổi ô nguồn; template khách mới. FE225/225/build, BE20parser/export/verify và diagnostics0warning PASS; round-trip128x14 và155x14 PASS. Xem docs/reviews/2026-10-03-header-based-import.md. Ưu tiên hoàn tất import trước rồi tiếp tục yêu cầu khôi phục màn cũ/nút ba gạch/lịch sử/ghi kết quả; chưa thay đổi nghiệp vụ thực thi. Gate isolated integration/UAT giữ mở.


### 03/10/2026 — Khôi phục màn test case, chuyển nhánh system-design

Theo phản ánh ô kết quả chưa thao tác được: thay thanh hướng dẫn đầu bảng bằng dialog khi bấm ô; giữ case qua lựa chọn đợt/cấu hình và báo thiếu phạm vi ngay tại dialog. TDD RED2/GREEN, focused11/11, browser lưu OK→P→reload→OK có lịch sử trên demo PASS. Xem `docs/reviews/2026-10-03-result-cell-dialog.md`; không tự tạo scope/duyệt case hoặc sửa quy tắc quyền.

Theo yêu cầu tiếp theo, đã sửa con lăn chung bằng cách gỡ Lenis bắt wheel ở window và dùng native scroll. RED6/GREEN8, coverage App.jsx100%; browser xác minh bảng hai chiều, modal chi tiết/phiên bản và trang thư viện. Skill tdd-workflow; báo cáo `docs/reviews/2026-10-03-native-wheel-scroll.md`. Giữ nguyên gate IN_REVIEW, không BE/schema/commit/push.

Final regression sau bổ sung kiểm tra lỗi: **238/238 test, 28 file PASS**. Coverage phạm vi sửa và build giữ kết quả bên dưới.

Theo yêu cầu người dùng, tập hợp code và kế hoạch các sprint lên `system-design`; từ nay tiếp tục trên nhánh này. Đã khôi phục menu ba gạch/chi tiết/lịch sử và thao tác ô kết quả nối API. Browser native ghi OK trên bộ demo riêng, lịch sử và reload PASS. FE full232/232 rồi focused32/32/build PASS; coverage phạm vi sửa 91.26 statements /81.56 branches /86.13 functions /93.98 lines. Xem `docs/reviews/2026-10-03-restored-test-grid.md`. Giữ IN_REVIEW cho gate isolated integration/UAT/pilot; không đổi BE/schema, không push/merge/deploy. Skill: đọc prompt-master; áp dụng frontend-patterns, tdd-workflow, verification-loop.

### 04/10/2026 — Review chức năng và cải thiện UI

Theo yêu cầu rà soát và cải tiến, đã sửa ba dialog thực thi (focus/Escape), dialog chồng nhau, tải lại lịch sử giữ bản nháp, khóa input khi lưu, title theo route; chỉnh contrast/sidebar/nút/form kết quả và nhận diện TMS. Full FE256/256 tests30files/build PASS; coverage hai file hành vi 97.14% lines, 85.84% branches. Browser đọc các màn chính và đo 320/768/1024/1440px, cuộn dialog thật, Escape/trả focus PASS. Chi tiết phát hiện, skills và bằng chứng tại [review 04/10](../../reviews/2026-10-04-functionality-ui-review.md). Còn importer từ chối merged cells, yêu thích chỉ lưu trong phiên; chưa kết luận toàn hệ thống đạt chuẩn. S11 giữ IN_REVIEW với gate isolated integration/UAT/pilot; không BE/schema/commit/push.

### 04/10/2026 — Rà soát UI/UX tiếp và bàn giao system-design

Theo yêu cầu tiếp theo, sửa menu/focus/drawer, deep-link tài liệu, modal Tab, tải/retry/đổi case, khóa draft, responsive và nút; bỏ nút yêu thích chưa lưu. Full **271/271 test, 33 file PASS**, build PASS. Coverage 6 file thay đổi: 93,84% statements / 87,66% branches / 90,54% functions / 96% lines. Có RED→GREEN và browser thật 320/390/1440px, dialog chiều cao480px. Xem [báo cáo UI/UX](../../reviews/2026-10-04-ui-ux-audit.md). Người dùng đã yêu cầu commit/push `system-design` cho tác vụ này; không merge/deploy. S11 vẫn IN_REVIEW, còn importer ô gộp và gate integration/UAT/pilot; không chứng nhận toàn hệ thống hết lỗi.

### 04/10/2026 — Review code/API và nhập Excel

Đã xử lý merged presentation cells giữ nguồn/export, lỗi HTTP client timeout/JSON/session, mapping HTTP400/405/415, cải thiện preview Excel/focus/lọc lỗi/scroll mobile. FE276/276, BE76/76 database-independent, build/verify và Java diagnostics136source0warning PASS; browser workbook Scale57dòng0lỗi. Backend native đã restart. Xem [báo cáo](../../reviews/2026-10-04-code-api-import-review.md). Người dùng cho phép commit/push system-design; S11 giữ IN_REVIEW cho isolated integration/UAT/pilot, không merge/deploy.
