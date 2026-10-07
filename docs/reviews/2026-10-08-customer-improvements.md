# Cải tiến sau đánh giá khách hàng — 08/10/2026

## Kết quả và phạm vi

Triển khai trên `system-design` theo yêu cầu cải thiện cả Frontend/Backend. Không đổi quyền Admin/PM/Tester/Dev, trạng thái execution, cách tính tiến độ hoặc ba nguồn Excel đã được duyệt. Không có schema mới; backend local đã khởi động lại trên cổng 8080, MySQL native 3307/tms giữ V20.

| Nhu cầu | Thay đổi đã kiểm chứng |
| --- | --- |
| PM biết thiếu gì trước khi giao file | API preparation đếm tài liệu/case duyệt/Tester/cấu hình đợt nháp/máy/nhóm; checklist liên kết đúng màn. Thu gọn khi đã có nhóm để không chiếm danh sách đang vận hành. Preview/create vẫn kiểm tra điều kiện cụ thể. |
| Tester hiểu ngữ cảnh đang làm | Tên môi trường, thiết bị logic và build trong list/detail; thông tin phiên đã lưu trình bày bằng nhãn nghiệp vụ. |
| Đọc và thao tác trên màn nhỏ | Chế độ từng case mặc định ở màn ≤900px, chọn case/trước/tiếp, chung API/quyền/history với bảng. Giữ case và cách xem qua lưu/làm mới. Sửa nút trước/tiếp bị ép hẹp tại 375px. |
| Biết việc cần xử lý/bàn giao | Route `/dashboard/actions`, FILE/QA/BUG/RETEST từ dữ liệu hiện hành; PM xem dự án, Tester/Dev theo ownership. Refresh mỗi phút khi tab visible, retry lỗi, tự điều chỉnh trang khi công việc đã xử lý rời queue. |
| Tìm đúng dự án | Bộ chọn Admin tìm tên/mã trên server; giữ lựa chọn ngoài kết quả và phân trang. Bố trí control thành hàng rõ ràng, không ép tìm kiếm vào một cột hẹp. Màn danh sách dự án dùng ô tìm có sẵn, tránh thêm ô tìm trùng. |
| Phân biệt bản Excel | File tài liệu đã sửa có hậu tố `-cap-nhat.xlsx`; file gốc giữ tên. Tooltip nêu xuất toàn tài liệu; guard dữ liệu chưa lưu và export execution đúng build được giữ. |
| Kiểm tra chất lượng Java khi repo lớn | Sửa script diagnostics dùng Java argument file sau khi command line Windows vượt giới hạn; không tắt null analysis hoặc hạ mức cảnh báo. |

Hộp việc là read model, không ghi lịch sử đã đọc và không gửi thông báo ra ngoài. Số mục không phải số bug/case duy nhất: một BUG và yêu cầu retest của nó là hai loại việc khác nhau. Phạm vi chi tiết và phân quyền tại [contract](../api/file-work.md); PRD mục 18 và [kế hoạch](../planning/customer-improvements-2026-10-08.md) đã cập nhật.

## Bằng chứng kiểm thử mới trong đợt này

- Viết các test hành vi thất bại trước sửa: preparation chưa có API, server search chưa nối, single-case chưa tồn tại; queue chưa có API; bản xuất cập nhật chưa đổi tên; mất layout/case sau lưu; phân trang queue bị kẹt sau khi xử lý xong mục cuối. Sửa rồi chạy lại GREEN.
- Frontend toàn bộ: **632/632 PASS, 52 files**. V8 coverage: statements **84.67%**, branches **81.57%**, functions **78.09%**, lines **82.89%**. Sau điều chỉnh tránh ô tìm trùng: Admin **49/49 PASS**. Coverage là số đo của lần full run trước điều chỉnh trình bày cuối, không suy từ số test.
- Backend unit/service/workbook liên quan: **108/108 PASS**. Native MySQL rollback integration **9/9 PASS**, gồm hai biến thể FULL_CASE/BUG_ONLY, session/attempt/idempotency, QA handoff, original workbook không đổi và execution export đúng build. Bổ sung API queue BUG assigned Dev → resolved rời Dev queue; RETEST assigned Tester → submit rời queue; phân trang/current membership/global DEV/archive/invalid filter. Một lần test bổ sung dùng nhầm principal mặc định của Spring Test đã thất bại; sửa fixture dùng `SessionPrincipal` đúng ứng dụng và chạy lại đủ 9/9.
- Schema test duy nhất dùng trong integration: **tms_docstest_202610060003**, baseline V19; runner xác nhận tên/schema/version trước chạy. Không ghi fixture vào database `tms`. Không cần migration mới cho read models.
- Frontend production build và backend verify/package PASS. JS bundle vẫn khoảng **547 kB / 154 kB gzip**, còn cảnh báo chunk >500 kB; chưa tuyên bố đạt mục tiêu tải trang production.
- Eclipse/JDT **197 source files, 0 errors, 0 warnings**. Contract regression **27/27 PASS**; structural checker đối chiếu 19 file-work + 14 QA/handoff operations và tham chiếu/schema/DTO PASS. Checker không thay HTTP hoặc full OpenAPI validator.
- Browser thật Chrome/local API: PM checklist và inbox; tên file/context đúng; 375px chọn case → làm mới vẫn giữ lựa chọn; 768px checklist thu gọn, filter không tràn trang; 1366px inbox/Admin. Admin tìm `SYP-DEMO`, chọn iPad rồi tìm `SYP-DEMO-WEB` vẫn giữ đúng iPad và bốn user của dự án đó. Control được đo cao ≥44px, không tràn ngang toàn trang trên các màn đã kiểm tra. Bảng dữ liệu rộng vẫn cuộn trong vùng riêng.

Ảnh bằng chứng:

- [Từng case 375px](evidence/customer-improvements-2026-10-08/file-case-375.jpg).
- [Bộ chọn Admin 375px](evidence/customer-improvements-2026-10-08/admin-project-search-375.jpg).
- [Bộ chọn Admin 1366px](evidence/customer-improvements-2026-10-08/admin-project-search-1366.jpg).
- [Hộp việc Tester 1366px](evidence/customer-improvements-2026-10-08/tester-inbox-1366.jpg): chỉ một file đúng Tester 01; PM thấy hai file trong cùng dự án. Tester không vào được khu Admin, dùng liên kết về không gian dự án. Đã đăng xuất tài khoản kiểm thử và bỏ override viewport.

Lệnh tái kiểm chứng:

```powershell
cd Frontend
rtk proxy npm test -- --coverage
rtk proxy npm run build
cd ..
rtk proxy node scripts/Test-FileWorkQaNative.cjs tms_docstest_202610060003 integration NativeFileWorkQaIntegrationTest
rtk proxy node scripts/Check-JavaDiagnostics.cjs
rtk proxy node --test scripts/Check-FqContracts.test.cjs
rtk proxy node scripts/Check-Contracts.cjs
```

## Chưa ký nghiệm thu toàn sản phẩm

- Archive/kết thúc dự án: đang chờ quyết định về blocker/ngoại lệ của việc tồn. Chưa thêm lệnh đóng/mở lại, tự đóng ticket hay tự thu hồi máy.
- Notification có lưu sự kiện/đã đọc, cảnh báo ngoài màn đang mở, lưu bộ lọc yêu thích và đánh giá SLA cá nhân chưa thuộc phần đã triển khai. Không suy người dùng đã phê duyệt policy nhận thông báo cụ thể.
- UAT/pilot có người sử dụng thật, cảm ứng/bàn phím ảo, trình duyệt ngoài Chrome, dữ liệu 300+ dự án và tải đồng thời/RPO/RTO production chưa được nghiệm thu trong đợt này. Không gọi viewport giả lập là kiểm thử thiết bị thật hoặc hứa hết mọi lỗi.
- PM queue gom việc hiện hành, chưa thêm bảng cảnh báo mọi loại quá hạn/thiếu máy tự động; các mốc và tiến độ đã có vẫn là nguồn theo dõi hiện hành.
- S11 giữ **IN_REVIEW**. Không merge `develop` hoặc deploy production.

Skills đã áp dụng: `api-design`, `security-review`, `frontend-patterns`, `ui-ux-pro-max`, `tdd-workflow`, `verification-loop`, `ponytail`. Đã đọc `prompt-master`; dùng yêu cầu triển khai trực tiếp, không thay bằng prompt. Python CLI của UI skill không có trong PATH nên áp dụng hướng dẫn responsive/touch/accessibility trong skill làm fallback.
