# Sprint 10 — Kịch bản nghiệm thu nội bộ

Ngày 30/09/2026. Dữ liệu ẩn danh, không có dữ liệu khách. Đây là hồ sơ kiểm chứng kỹ thuật; **chưa có chữ ký UAT của PM/BrSE/khách hàng**.

## Luồng xuyên suốt

`SystemJourneyTest.xlsxToAssignedNgBugFullRetestClosureAndReportUsesRealSessions` chạy qua HTTP thật, cookie/session JDBC, CSRF và MySQL Testcontainers:

1. Admin tạo dự án, phân quyền thành viên; PM dự án chuẩn bị nhóm và catalog.
2. Tải mẫu XLSX, nhập multipart, preview rồi commit hai lần: chỉ một case/revision.
3. Tester không được duyệt; PM duyệt revision trước khi phân công vào đợt.
4. Tester được giao ghi NG; PM không được ghi hộ lượt không được giao; retry giữ một attempt, version cũ bị 409.
5. Tạo bug từ NG, retry không trùng; tải chứng cứ, download dạng attachment; người ngoài dự án bị 404.
6. PM ghi build đã sửa; kết quả NG vẫn còn. PM xác nhận đầy đủ phạm vi, giao FULL_CASE retest.
7. Tester PASS, retry không tạo trùng; PM đóng bug và chốt đợt; Tester không đóng được bug.
8. Báo cáo đạt 100%, không còn bug mở trong phạm vi, vẫn giữ attempt NG cũ; XLSX có 5 sheet, không có ô công thức.
9. Diễn tập sao lưu dữ liệu/chứng cứ và khôi phục trên database khác theo [runbook](../operations/recovery.md).

HTTP regression không thay thế thao tác browser. Luồng UI đã kiểm tra riêng tại review [S07](../reviews/2026-09-29-sprint-07.md), [S08](../reviews/2026-09-30-sprint-08.md), [S09](../reviews/2026-09-30-sprint-09.md). Browser upload trọn vẹn, bàn phím và responsive vẫn cần ghi kết quả riêng, không suy từ HTTP PASS.

## Gate trước nghiệm thu toàn hệ thống

| Mục | Trạng thái |
| --- | --- |
| Quyền Admin/delegated PM tạo tài khoản; Tester bị chặn | Có regression `IdentityIntegrationTest` |
| Rule nội bộ S04–S09 | Đã chốt ADR; mẫu/luồng khách thật chưa xác nhận |
| Thành viên, ruleset, sổ tay S03 | Đã bổ sung UI/API/version/audit, demo desktop và regression; kết luận kỹ thuật xem review mới/STATUS |
| Upload XLSX bằng browser S04 | Giữ IN_REVIEW; HTTP multipart đã kiểm tra |
| Keyboard/mobile toàn luồng | Chưa chạy đầy đủ |
| Redmine sandbox | PASS S09; mapping/credential/quyền tracker khách còn thiếu |
| Kịch bản PM/BrSE chạy và ký UAT | Chưa có người nghiệm thu và lịch pilot |

Người nghiệm thu cần ghi actor, phiên bản, ngày, dữ liệu, bước thực hiện, kết quả quan sát và lỗi tìm thấy. Chỉ đóng mục có bằng chứng; không đánh dấu tất cả PASS từ một video/demo.

## Bổ sung kiểm chứng settings và dialog

Xem [review hoàn thiện](../reviews/2026-09-30-review-completion.md). Dự án DEMO-REVIEW-0930 chỉ dùng dữ liệu nội bộ riêng. Đã thao tác trên Chrome: tạo dự án, thêm tài khoản đã có, tạo/sửa môi trường, tạo hai revision sổ tay và đọc lại, tạo quy tắc DEMO/draft. Dialog Excel có focus ban đầu và lỗi thiếu file; full upload vẫn chưa nghiệm thu. RTL kiểm tra focus trap/Escape/restore; chưa suy ra toàn chuỗi keyboard hoặc mobile PASS.

### Kịch bản browser còn phải ghi kết quả

1. Trong dự án demo có nhóm mã AUTH, vào Thư viện test case → Nhập Excel → Tải mẫu nội bộ.
2. Chọn file đã tải, Xem trước kết quả; đối chiếu cột VI/JP và dòng nguồn, không có lỗi.
3. Xác nhận nhập, đọc chi tiết case/revision và reload; dữ liệu phải giữ nguyên, gửi lại không tạo trùng.
4. Thử file sai mã nhóm và tệp chứa công thức: preview báo lỗi, không commit từng phần.
5. Dùng bàn phím cho luồng này, sau đó kiểm tra màn hình nhỏ: nhãn/nút không bị che, bảng cuộn trong vùng, không mất dữ liệu nhập.

Ghi phiên bản app, actor, ngày, kích thước màn hình, kết quả từng bước và lỗi. Người dùng/PM xác nhận UAT riêng; chưa có chữ ký nghiệm thu.
