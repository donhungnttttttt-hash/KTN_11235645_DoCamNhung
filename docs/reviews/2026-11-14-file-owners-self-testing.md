# Phụ trách file, tự nhận test case và Issue bên phải

## Phạm vi đã thực hiện

- Đổi nút thành **Phân công test case**; nhận vùng case bằng danh tính phiên đăng nhập, bỏ chọn người. Hỗ trợ Admin tổng không có membership. Nhả vùng của chính mình, chặn nhận đè vùng người khác; API cũ cũng kiểm tra user ID.
- Dropdown checkbox chọn nhiều người phụ trách file cho PM/Admin. Lưu độc lập với phân công case, có optimistic lock, retry, giữ lựa chọn khi xung đột và xử lý thành viên ngừng hoạt động.
- Thành viên có quyền làm việc vẫn ghi Status dù không phụ trách file/case. Khách giữ phạm vi báo cáo; không mở quyền ghi hoặc quyền dự án khác.
- Cột Người test giữ người nhận/ghi kết quả đầu tiên; mọi lần xác nhận sau lưu người thực hiện trong lịch sử. Xuất Excel lấy đúng danh tính ban đầu.
- Status ban đầu 56 px; theo đính chính sau đó đổi **72 × 72 px**, bằng chiều rộng Lịch sử Status, nền toàn ô theo trạng thái và viền trong suốt. Unexecuted giữ màu bạc.
- Issue luôn ở **bên phải**, cách nút 8 px. Khi thiếu chỗ, bảng có khoảng trống cuối và cuộn ngang vừa đủ; không lật khung sang trái.
- V41 bổ sung quan hệ người phụ trách file và danh tính tài khoản cho phân công/lịch sử; giữ các migration cũ và backfill dữ liệu có sẵn.

## Kiểm chứng

- RED trước sửa: self-assignment/owners chưa có endpoint, người không nhận case bị chặn Status; sau đó tái hiện API cũ có thể nhận đè case Admin không có membership. Đã sửa và kiểm lại.
- Native MySQL cô lập: **26/26 FeatureIntegrationTest PASS**, Maven verify/package PASS tại `var/file-owners-20261114/final3/receipt.json`.
- Migration database mới và V40 → V41 có fixture cũ PASS: giữ người đầu tiên, current assignee, lịch sử, dòng case và audit; migrate lại không áp dụng thêm.
- Frontend: **510/510 test, 59 file PASS**; Vite build PASS. Coverage V8 của DocumentAssignments, DocumentOwners, TestingDocumentPage, CaseIssueAction: statements 89,44%; branches 82,36%; functions 84,56%; lines 93,71%. Đây không phải coverage toàn hệ thống.
- JDT: 392 source, 0 error, 7 warning có sẵn trong SystemAdminStartupTest; không phát sinh warning tại file sửa.
- `git diff --check` PASS. Build còn cảnh báo bundle >500 kB.

## Runtime và giới hạn

- Sao lưu native DB trước nâng phiên bản: `var/mysql-native/backups/2026-11-14T12-58-26-287Z-tms.sql` và manifest.
- Khởi động artifact đã verify trên local 8080 (khi kiểm tra không còn listener cũ), Flyway **V41**, health **UP**. Frontend local 5173 được mở lại. Không thay cấu hình credential, không đưa fixture lên main.
- Snapshot trước/sau migration giữ nguyên số lượng: 119 tài khoản, 11 dự án, 17 Feature, 27 batch, 1.887 dòng import, 1.799 test case, 967 phân công, 56 lịch sử phân công, 2.324 project audit; phân bố Status không đổi.
- Chrome chưa nghiệm thu trực tiếp: browser access host unavailable; native pipe cũng unavailable. Không khẳng định pixel parity hoặc browser E2E đã đạt.
- Kiểm tra đăng nhập HTTP bằng cấu hình bootstrap local trả 401; không đổi mật khẩu và không coi authenticated live smoke đã đạt. Kiểm thử quyền/API ở trên dùng database cô lập.
- Source IN_REVIEW cho nghiệm thu trình duyệt. Không commit/push. Yêu cầu sửa import theo file thực tế được tiếp tục trong checkpoint riêng.

Skills: api-design, tdd-workflow; tiếp tục frontend-ui-engineering và verification-before-completion của tác vụ bảng. Đã đọc computer-use để kiểm tra khả năng nghiệm thu, không điều khiển ứng dụng native.
