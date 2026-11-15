# Thống nhất tên Đợt kiểm thử — 15/11/2026

## Phạm vi

Theo yêu cầu người dùng, đổi nhãn Feature thành Đợt kiểm thử trên giao diện: danh sách, bộ lọc, tạo/sửa, file test case, thông tin nguồn Ticket, version/môi trường, phạm vi AI, báo cáo và thông báo backend. Bản Nhật dùng テストサイクル.

Giữ nguyên định danh kỹ thuật, API/routes, tên trường, bảng dữ liệu và migration. Không sửa nội dung lịch sử hoặc văn bản do người dùng đã nhập. Không thay đổi nghiệp vụ hay dữ liệu dự án.

Skill áp dụng: frontend-patterns, theo React JavaScript hiện có.

## Kiểm chứng

- Frontend: 1.444/1.444 test PASS trong 162 file.
- Backend native cô lập: 17 test PASS, không skip, gồm AdminAuditLabelsTest, FeatureWorkbookExportTest, FeatureIssueServiceTest, FeatureIssueContextNativeTest, TestVersionsNativeTest.
- Build frontend PASS; còn cảnh báo kích thước bundle lớn hơn 500 kB.
- Chrome thật: bộ lọc “Đợt kiểm thử / Tất cả Đợt kiểm thử”, danh sách, form tạo và màn file hiển thị đúng; không lỗi JavaScript, không ghi dữ liệu dự án.
- git diff --check PASS. Chưa đo coverage riêng.

Trong lúc chạy kiểm tra, sửa hai kỳ vọng test cũ tại TestVersionsNativeTest cho đúng hành vi đã được chốt trước đó: cột xuất Excel hiện là “MT & Ver”; case đã dùng version bị ẩn vẫn giữ được version lịch sử. Test cũng xác nhận case khác không được chọn version đã ẩn. Không thay đổi implementation version.

## Runtime và bằng chứng

Backend local đã khởi động bằng artifact mới, health UP. Flyway xác nhận schema V46 đã cập nhật, không chạy migration mới.

Bằng chứng cục bộ, không đưa vào Git:

- var/workspace-ui-browser/test-cycle-labels-tests.json
- var/workspace-ui-browser/test-cycle-label-runtime/browser-check.json
- var/workspace-ui-browser/test-cycle-label-runtime/ticket-filter.png
- var/workspace-ui-browser/test-cycle-label-runtime/create-cycle.png
- var/workspace-ui-browser/test-cycle-label-runtime/cycle-files.png
- Backend/target/unified-access-verification/last-test.log

Chưa commit/push; các thay đổi trước đó trong workspace được giữ nguyên.
