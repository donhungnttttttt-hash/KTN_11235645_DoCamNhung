# Kiểm nghiệm khách hàng và dữ liệu demo mở rộng — 08/10/2026

Người dùng yêu cầu thực hiện kiểm nghiệm rồi bổ sung 30 iPad, các nhóm iPhone/tablet/smartphone và khoảng 100 user. Làm trên `system-design`; giữ dữ liệu đang dùng. Mục tiêu dữ liệu: thêm đúng 100 tài khoản (3 PM, 20 DEV, 77 TESTER), không tính các tài khoản cũ. Đã hỏi số lượng ba nhóm máy còn lại, mặc định đề xuất 30 mỗi nhóm (120 máy).

## Phạm vi thực hiện

1. Kiểm nghiệm frontend hiện hành, backend native theo luồng và tình huống lỗi; ghi kết quả thật, không coi kiểm thử phần mềm là UAT người dùng hoặc thiết bị thật.
2. Migration V22 chỉ ở `db/demo`, profile local tự nạp; release không cài tài khoản công khai. Thêm dữ liệu, không UPDATE/DELETE hoặc sửa migration cũ. Không seed file test case hay kết quả giả.
3. Namespace riêng `syp.lab.*` / `SYP-LAB-22-*`; tài khoản có tên demo, PBKDF2 salt riêng, không cấp quyền tạo user cho PM. Ba dự án mới có membership đúng quyền; cấu hình QA/build/đợt nháp để PM nhập file và thực hành. Giữ Admin demo hiện có làm actor nếu hợp lệ; thiếu/sai Admin phải dừng migration.
4. Thông tin máy gồm mã tài sản, serial giả lập duy nhất, model, hệ điều hành/phiên bản, tình trạng và ghi chú cấu hình/vị trí/phụ kiện. Android tablet/smartphone dùng type ANDROID hiện hữu, phân biệt mã/model/ghi chú, không đổi phân loại nghiệp vụ đã chốt. Có máy dự phòng, bàn giao, bảo trì, ngừng dùng.
5. Kiểm tra fresh/upgrade/restart/collision rollback, đăng nhập và quyền, tìm kiếm/phân trang, bàn giao/thu hồi; thử ghi trên schema riêng. Chỉ sau khi đạt mới backup và áp dụng dữ liệu đã yêu cầu lên local `tms`, kiểm tra giữ nguyên bản ghi cũ/workbook.
6. Bàn giao tài khoản, danh sách máy và báo cáo PASS/FAIL/NOT_RUN; commit/push theo quyền đã có. S11 vẫn IN_REVIEW cho UAT và môi trường thật.

Skills: `tdd-workflow`, `security-review`, `verification-loop`; giữ stack React JavaScript + Spring Boot + MySQL/Flyway. Không tăng coverage bằng test chỉ đếm dòng; migration phải xác minh hash đăng nhập, FK, phân bổ, audit và bảo toàn nguồn.

## Hoàn tất ngày 09/10/2026

Không nhận lựa chọn số lượng khác, đã thực hiện mặc định30mỗi nhóm như thông báo. V22 đã áp dụng local sau backup;100user/120máy/3dự án,65bảng với5.303hàngcũ và8workbookgiữnguyên. FullFE665/665, Admin68/68, nativeFQ9/9/concurrency5/5/migration1/1, HTTPpreview6kịch bản, JDT204source0error0warning và buildPASS. Sửa lỗi focus form kho máy bằng RED→GREEN, browser1366/768/375PASS trong phạm vi. Xem [báo cáo và giới hạn](../reviews/2026-10-09-verification-demo-v22.md); vẫn chưa ký UAT toàn sản phẩm.
