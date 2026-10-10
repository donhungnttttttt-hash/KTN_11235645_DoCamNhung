# Tài liệu Excel và bảng test case — 03/10/2026

Trạng thái: **V12 đã áp dụng trên native tms, luồng nhập và xem tài liệu thật đã kiểm chứng**. S04/S11 giữ IN_REVIEW cho các kiểm thử độc lập và UAT còn lại. Người dùng đã duyệt thực hiện; không cần xin lại phê duyệt chung.

## Cập nhật 03/10/2026 — Flyway native và màn bảng chi tiết

- Người dùng yêu cầu migration tự cập nhật khi chạy backend. Đã thực hiện trên MySQL Windows `127.0.0.1:3307/tms` sau backup `var/mysql-native/backups/2026-10-03T15-45-56-164Z-tms.sql` (655494 bytes,56 CREATE TABLE,SHA-256 khớp manifest). Backup có DDL session nhưng bỏ dữ liệu session.
- Nguyên nhân404: backend cũ chạy trước khi có controller tài liệu; schema còn V11. Restart áp `V12__retain_test_document_sources.sql` thành công lúc22:47; vẫn56bảng. Restart sau sửa export xác nhận schema up-to-date, readiness200. Không sửa V1–V11, không cần tạo lại database hoặc chạy initializer.
- Màn chi tiết đã mở rộng toàn chiều ngang, menu thu vào nút mở, tên file trên thanh xanh, toolbar gọn, các ô xuống dòng/liên kết, tô màu kết quả nguồn, lọc kết quả, phân trang và chỉnh cỡ chữ. Giữ modal chi tiết/revision thật và phân biệt dữ liệu nguồn với kết quả thực thi TMS.
- Browser dùng API/MySQL thật: nhập file khách155case/0lỗi vào Demo thư viện kiểm thử (project1), document3; thư viện giữ tên file gốc. Đã xem Case101/revision, lọc NG còn3, trang2 có55/155, reload và mở menu; desktop1920x1080/mobile390x844. Case nhập vẫn draft; không tự tạo lịch sử chạy/bug/NA. Tài liệu cũ1 vẫn đọc được.
- Xuất gốc/hiện tại qua API đều200. Phát hiện ô vắng bị biến thành chuỗi rỗng; thêm assertion thất bại rồi sửa. Đối chiếu file xuất thực tế: original bytes bằng nhau,155x14 ô giữ value/type/style/hyperlink,39links. Browser đã bấm xuất nhưng sự kiện lưu file không được công cụ xác nhận; không coi đó là download UI end-to-end PASS.
- Kiểm tra mới nhất: backend14/14 parser/export tests và Maven verify PASS; frontend224/224 tests/27files, build PASS. Hai test mới tái hiện thiếu filter/paging trước khi sửa. Test101x14ô có timeout5s khi chạy song song, tăng riêng timeout15s; không đổi assertion. Coverage riêng TestDocumentPage:94.59% statements,83.2% branches,92.5% functions,98.59% lines; không phải coverage toàn FE/BE.
- Legacy integration fixture đã bổ sung sheet_nameNULL/mapping_version1.0/JSON không sourceCells; compile PASS, chưa chạy vì chưa có schema test riêng. Fresh migration, permission/concurrency/rollback integration và coverage service/controller vẫn còn. User không phải tạo schema test để dùng app; schema riêng chỉ dành cho các bài test có ghi/xóa fixture.
- Ảnh thật: `output/playwright/test-document-live-desktop.jpg`, `test-document-live-mobile.jpg`. URL: http://127.0.0.1:5173/#/tests/documents/3. Giữ backend8080 và frontend5173 hoạt động; dừng preview giả5174.
- Skills: brainstorming (phạm vi giao diện đã duyệt), systematic-debugging, tdd-workflow, frontend-patterns, receiving-code-review, verification-before-completion. Giữ S04/S11 IN_REVIEW do gate còn lại; không commit/push/merge/deploy.

## Hành vi đã triển khai

- Quản lý kiểm thử → Thư viện test case mở danh sách file theo tên gốc. Bấm file mở `/tests/documents/{id}` với 14 cột, cuộn ngang, tìm nội dung, ID mở chi tiết/revision thật. `/tests/cases` giữ thư viện case/nhóm cũ; các route đợt kiểm thử không đổi.
- Bộ nhập nhận mẫu khách đã cung cấp và mẫu TestCases nội bộ; preview trước commit, lỗi từng dòng, chống nhập lặp checksum khách trong dự án. Case nguồn ID1 không xung đột giữa các file vì có mã nội bộ theo batch/dòng.
- Giữ M/N và kết quả/tester cũ dưới dạng nguồn, không tạo lịch sử thực thi/NA/bug/user. Xuất bản hiện tại cập nhật B/C/D/G/K từ revision; tải gốc trả nguyên bytes. Case nội bộ cũ không có binary được dựng lại theo mẫu TestCases.
- V12 chỉ thêm hai cột và hai index vào import_batches; dùng mapping_version hiện có, **không thêm bảng**. Schema mục tiêu vẫn 56 bảng. Các migration V1–V11 không sửa.
- API đọc/export chỉ cho thành viên dự án, chỉ hiện COMMITTED; preview khác người không trở thành tài liệu. Quyền import/approve hiện có vẫn được enforce ở backend.

[Spec](../superpowers/specs/2026-10-03-test-documents-design.md), [plan/ledger](../superpowers/plans/2026-10-03-test-documents.md), [contract](../api/test-documents.md).

## Bằng chứng giai đoạn trước 22:47 (lịch sử)

| Kiểm tra | Bằng chứng |
| --- | --- |
| Parser customer RED → GREEN | Ban đầu từ chối sheet khách vì yêu cầu TestCases; sau sửa đọc ID số/Unicode/xuống dòng và cột bổ sung. Regression thêm duplicate ID, formula M/N, cột vượt A:N, hyperlink file |
| Parser/export unit | 13/13 PASS (CustomerWorkbookTest, DocumentWorkbookTest, TestCaseWorkbookTest); bao gồm numeric ID/styles/hyperlink, ô mới bắt đầu `=` vẫn là string, hyperlink ô thay đổi bị gỡ |
| File khách thực tế | Đọc → xuất → đọc lại 155 dòng, mọi source cell/type/style bằng nhau; 39 hyperlink, 33 styles; title/steps/expected không trống, title/sourceReference nằm trong giới hạn service. Không nhập file khách vào dự án thật |
| Backend unit regression | 65/65 PASS, Maven verify/package; không chọn bộ Testcontainers hoặc native integration khi chưa có schema test |
| Frontend | 222/222 PASS, 27 file; `npm run build` PASS |
| Coverage FE | Chỉ TestDocumentsPage/TestDocumentPage/ImportExcelDialog/documentDownload: 96.01% statements, 82.5% branches, 96.29% functions, 100% lines. Không đại diện toàn frontend |
| Browser | Playwright/Chrome, API được mô phỏng trong phiên kiểm tra: file → grid → case detail, Escape, Back, reload và bố cục 1280/390px. Ảnh `output/playwright/test-documents-library.png`, `test-document-grid.png`, `test-document-mobile.png`. Không phải bằng chứng upload/commit/export qua MySQL thật |
| Contract/whitespace | Check-Contracts PASS (các contract S03–S10 hiện có, không coi là OpenAPI validator cho API mới); git diff --check PASS |
| Java diagnostics | Eclipse 136 source files, 0 error/0 warning; không tắt null analysis. 39 cảnh báo contract trong code/test mới đã được sửa |
| Coverage BE sau suite parser | TestCaseWorkbook line94.37/branch72.5%; CustomerWorkbook92.31/75.56%; DocumentWorkbook96.15/95.45%. Service/controller tài liệu0% vì chưa chạy native integration; không tuyên bố gate backend đạt80% |

Lưu ý kiểm chứng: test export mới ban đầu RED do chưa có lớp triển khai; một số FE mới RED do module chưa tồn tại. Không gọi hai kết quả đó là assertion hành vi. Test unsafe hyperlink ban đầu tạo sai fixture (thêm link bên cạnh link có sẵn); đã sửa fixture gỡ link cũ trước. Kiểm thử đồng bộ giữ source checksum/bytes và permission DB vẫn chưa được chạy.

## Review và xử lý

Fresh reviewer đọc feature theo 5 trọng tâm trong plan: không phát hiện thêm lỗi critical, có một finding important về callback import sau khi chuyển dự án/unmount. Đã tái hiện bằng deferred commit rồi sửa generation guard, test PASS. Test phân trang phát hiện timer debounce khởi tạo trả page về 0 sau bấm nhanh; đã sửa chỉ debounce khi keyword thực sự đổi, test PASS. Nhập từ thư viện case cũ đã được kiểm thử chuyển tới ID commit trả về (khác preview khi bị nhập trùng).

Finding minor giai đoạn đầu về fixture legacy đã được sửa theo cập nhật trên; phần chạy integration vẫn còn. Reviewer không kết luận MySQL/Flyway/transaction từ static review, không kết luận browser thật từ unit test; các gate này được giữ bên dưới. Những thay đổi sprint khác trong working tree nằm ngoài review này.

## Kiểm thử độc lập còn chờ (không chặn chạy ứng dụng)

Native MySQL tại 127.0.0.1:3307 có migrator chỉ được cấp tms.*; credential quản trị trước đó bị 1045, không thử đoán/reset. Người dùng trả lời **sẽ tạo schema test trong Workbench**, chưa xác nhận đã tạo. Kiểm tra chỉ đọc gần nhất vẫn schema tồn tại = 0. Không chạy test ghi/xóa trên tms, không tạo container thay thế.

Người dùng chạy trong Workbench bằng tài khoản quản trị:

```sql
CREATE DATABASE IF NOT EXISTS tms_docstest_202610030001 CHARACTER SET utf8mb4;
GRANT ALL PRIVILEGES ON tms_docstest_202610030001.* TO 'tms_migrator'@'127.0.0.1';
```

Sau khi schema/grant có thật:

1. Kiểm tra quyền bằng `rtk proxy node scratch/check-doc-access.cjs`, chuẩn bị config local bằng `rtk proxy node scratch/configure-doc-tests.cjs` (không in bí mật).
2. Trên schema **rỗng** đó chạy NativeDocumentMigrationTest với TMS_TEST_FRESH_MIGRATION=true: V11→V12 giữ dòng cũ, clean đúng schema test do lượt này tạo rồi fresh V1–V12, validate/restart. Test từ chối schema có bảng sẵn, không chạy vào tms.
3. Chạy TestDocumentIntegrationTest: import/commit/doc/export, hai file ID1, duplicate pending previews, invalid all-or-nothing, quyền/membership, revision, legacy. Kiểm chứng MySQL/JPA MEDIUMBLOB và câu SQL thực tế; đo lại coverage BE gồm API/service.
4. E2E backend/frontend riêng dùng schema test: upload → preview → commit → tên file → grid → revision → export/reimport, Tester và reload. Không dùng ảnh mock ở trên để thay bước này.
5. V12 đã được áp dụng theo yêu cầu tiếp theo của người dùng và có backup; không cần áp lại hay chạy initializer. Khi đủ schema riêng, bổ sung kết quả các bài test còn thiếu và cập nhật STATUS.

Skills đã áp dụng: using-superpowers, brainstorming (ủy quyền đầy đủ), spreadsheets (khảo sát nguồn), writing-plans/executing-plans, test-driven-development/tdd-workflow, api-design, frontend-patterns, security-review, systematic-debugging, playwright, requesting-code-review, verification-loop/verification-before-completion. Không coi việc đọc skill là đã hoàn thành các kiểm thử đang chờ.

Các quyết định kỹ thuật: giữ working tree hiện tại vì code sprint nền chưa commit; tái sử dụng COMMITTED import batches thay cho thêm bảng vì mẫu có một sheet (mở rộng nhiều sheet cần thiết kế tiếp); dùng mapping_version tránh cột phân loại trùng chức năng. Không tự đưa kết quả Excel thiếu context thành tiến độ TMS. Đổi các quyết định này sau này cần migration/mapping tương ứng, không âm thầm đổi nghĩa dữ liệu đã nhập.
