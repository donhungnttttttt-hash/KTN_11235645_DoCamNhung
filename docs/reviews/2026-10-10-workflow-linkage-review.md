# Review liên kết dữ liệu và UI — 10/10/2026

## Kết luận và nguyên nhân

Các lỗi UI trong ảnh được xác nhận. Dropdown dự án bị chuyển về native select riêng ở `/admin/projects`; bộ lọc file tách thành hai container và pager đợt luôn xuất hiện; drawer chi tiết chưa có thao tác phóng to.

File không mất khỏi database. Đối chiếu MySQL native 3307 và HTTP backend 8080, DEMO-PILOT (project 3) có **4 COMMITTED documents, 252 dòng đã map vào case, 0 file-work groups**. Màn cũ chỉ gọi danh sách nhóm được phân công nên trống. 240 run items có sẵn thuộc dữ liệu đợt cũ, không đồng nghĩa 252 case vừa nhập đã được giao. Báo cáo thực thi dùng run items ở đợt không còn DRAFT, không dùng số dòng Excel làm mẫu số.

## Thay đổi

- AdminProjectDropdown luôn có tìm theo tên/mã ở trang dự án.
- FileWorkPage gom 5 bộ lọc thành một hàng khi đủ chiều rộng; ô desktop 180 × 36 px, mobile tự xuống dòng; pager lọc đợt chỉ hiện khi nhiều trang và dùng nút ngắn có aria-label.
- ImportedDocuments gọi cùng API test-documents với thư viện, có phân trang, loading/error/retry; hiển thị trước khi có phân công. Admin/PM/người có `canReadAll` thấy nguồn, chỉ quyền `canCreate` hiện Giao file. Tester giới hạn vẫn dùng danh sách được giao.
- Giao file từ dòng nguồn chọn sẵn document ID và focus form. Xem tài liệu đi tới `/tests/documents/:id`. Không tự ghi phân công hoặc thêm quyền PM cho ADMIN.
- Ticket drawer có phóng to/thu nhỏ, giữ nội dung đã nhập và state con; nút đóng luôn ở header.
- Bộ kiểm thử native F/Q chuyển yêu cầu schema integration từ V19 sang V26, phù hợp entity tác giả revision hiện tại. Bộ migration lịch sử V16→V19 giữ nguyên.
- Thêm `scripts/Audit-WorkflowLinks.cjs`, chỉ đọc dữ liệu và xuất thống kê, không xuất workbook/nội dung cá nhân/credential.

## Đối chiếu các liên kết

| Luồng | Bảng / nguồn truy vấn | Bằng chứng |
|---|---|---|
| Excel → thư viện | import_batches → import_rows.target_case_id → test_cases → test_case_revisions | HTTP list/detail và import integration |
| Nguồn → phân công | file_work_groups.document_id; file_work_group_items nối import_row, revision, run_item, cycle/configuration | Test mới nhập Excel thật, duyệt revision, giao file; cùng documentId xuất hiện trong API |
| Phân công → thực thi | run_items; file_work_sessions; execution_attempts; latest_attempt_id | Native F/Q start/pause/resume/complete, kết quả và source preservation |
| Kết quả NG → BUG → retest | work_item_execution_links; bug_coverage_items; retest_requests; bug_verification_attempts | FULL_CASE/BUG_ONLY, đóng lỗi, lịch sử và nguồn không bị ghi đè |
| QA → nguồn/trả lời/xác nhận | qa_details; qa_answers; qa_confirmations | Native QA lifecycle, answer-version, reopen/reassignment và quyền hiện hành |
| Báo cáo | ReportingService join project/cycle/revision/configuration/member; latest attempt hoặc latest theo build | Source review; F/Q kiểm tra export giữ pinned revision và đúng build |

Toàn database sử dụng: **73 bảng, 179 FK, 6 kiểm tra domain có sẵn, không phát hiện vi phạm**. Bổ sung 7 kiểm tra logical mapping revision/run/group/import/BUG/QA: không vi phạm. Đây là kiểm tra tính nhất quán ở snapshot; không chứng minh mọi quy tắc nghiệp vụ hoặc mọi nhánh source đều đã đúng.

So sánh thêm SYP-DEMO-20 (project 5): 2 documents, 88 dòng, 2 nhóm file và 88 run items; cả tài liệu và phân công hiển thị đúng trong UI PM. Các project chưa nhập file cho kết quả 0 phù hợp database.

## Kiểm chứng

- RED trước sửa: thiếu trigger searchable của admin, thiếu nút phóng to, thiếu tài liệu nguồn trước phân công. GREEN sau sửa.
- Frontend: **68 files / 740 tests PASS**; sau bổ sung focus form chạy lại **83 file-work tests PASS**. Build PASS, vẫn có advisory bundle >500 kB.
- MySQL isolated `tms_docstest_202610100016`, native 3307: TestDocumentIntegrationTest **9 PASS**; NativeFileWorkQaIntegrationTest **10 PASS**; NativeFileWorkQaConcurrencyTest **5 PASS**, không skip. Schema mới tạo trống trước chạy; dữ liệu fixture giữ trong schema riêng.
- Test mới `realExcelImportBecomesAssignableSourceAndKeepsItsRunAndResultLinks`: upload/commit workbook qua HTTP MockMvc → tài liệu hiện nhưng nhóm chưa có → PM duyệt → tạo nhóm → API list theo document có nhóm → Tester start/lưu OK → SQL xác minh chuỗi source row/case/revision/run/attempt; workbook gốc giữ nguyên.
- Runner guard: **12 PASS**, có RED→GREEN khi nâng yêu cầu integration V26; không tự nâng cấp database dùng thật.
- Backend unit/guard: **206 PASS** trong FileWorkService/Execution/Session, QA/Handoff, RetestExecution, ReportingLimit và NativeFqDatabaseGuard; không skip.
- Browser Chrome: tìm PILOT trong dropdown; Admin thấy đúng 4 file/107+77+13+55 case; PM project 5 thấy 2 nguồn/2 nhóm; nút Giao file điền sẵn document 10. Không submit nghiệp vụ vào `tms`.
- 1366×768: cả 5 controls có cùng y=248, mỗi ô rộng 180 px. 390×844: document không tràn ngang; bảng nguồn client335/scroll540 và bảng nhóm client351/scroll900 có overflow-x:auto.
- Ticket DEMO-PILOT-32: 780 px → 1366 px toàn viewport → 780 px; mobile width390/scroll389. Component test xác minh nội dung nhập không mất khi toggle.
- `git diff --check`: PASS. Chưa commit hoặc push.

Artifact local: `var/demo/database-audit.json`, `var/ui-audit/workflow-links.json`, `var/ui-audit/workflow-http.json`, `var/ui-audit/native-current-workflow.log`, Surefire reports. Không đưa credential/config local vào tài liệu.

Skills đã áp dụng: `ui-ux-pro-max` (layout/typography/responsive/accessibility), `frontend-patterns` (state/resource identity và React), `api-design` (truy vết contract/phạm vi), `verification-loop` (red/green, build, native/browser). `prompt-master` đã đọc ở yêu cầu trước, là skill tối ưu prompt, không thay thế kiểm thử code/UI.

## Giới hạn còn lại

Chưa nghiệm thu mọi tổ hợp quyền/dữ liệu trên mọi màn hình hoặc thiết bị thật/Safari. Chưa đo lại coverage toàn sản phẩm; số test PASS không suy ra phần trăm coverage. Không gọi AI thật, không thay đổi các quyết định phân công của PM. Backend production logic và migration không đổi trong riêng lượt sửa linkage/UI này. S11 giữ IN_REVIEW để người dùng UAT; không tuyên bố hệ thống hết mọi lỗi.
