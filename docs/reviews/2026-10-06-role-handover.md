# Bàn giao tài khoản, cảnh báo Java và kiểm thử theo vai trò

Ngày 06/10/2026. Nhánh `system-design`. Người dùng yêu cầu tạo tài khoản đúng vai trò, tự kiểm thử, bàn giao và push. Báo cáo này bổ sung cho [review F/Q](2026-10-06-fq-final-review.md); không thay kết quả kiểm thử chưa chạy thành PASS.

## Tài khoản bàn giao

Đã tạo qua API thật trên MySQL native, không ghi tài khoản trực tiếp bằng SQL:

| Tên đăng nhập | Vai trò hệ thống | Mục đích |
|---|---|---|
| `handover.admin` | ADMIN | Dashboard tổng, dự án, nhân sự, kho máy |
| `handover.pm` | PM | Điều hành dự án, duyệt case, phân công, retest, đóng lỗi |
| `handover.tester` | TESTER | Thực thi, ghi nhận BUG/QA, kiểm thử lại |
| `handover.dev` | DEV | Xác minh, xử lý ticket được giao, trả lời QA |

Mật khẩu bàn giao được lưu riêng tại `scratch/handover/role-accounts.local.json`, ngoài Git; thông tin đăng nhập được gửi trực tiếp cho người dùng. API tạo tài khoản yêu cầu tối thiểu 12 ký tự. Không sửa mật khẩu tài khoản cũ `admin.local`, `syp_admin01`, `syp_admin02`.

Ba tài khoản PM/TESTER/DEV đã được ADMIN gán vào dự án demo có sẵn `DEMO-PILOT` (ID 3), đúng vai trò dự án. Giữ nguyên thành viên và dữ liệu cũ. Chưa tạo phiên kiểm thử hoặc ghi kết quả giả vào các case có sẵn.

## Kết quả đã chạy

| Phạm vi | Kết quả | Bằng chứng |
|---|---|---|
| JDT khớp 7 cảnh báo trong ảnh | PASS: 7 → 0 warning, 0 error, 191 source Java | `scratch/handover/before-jdt`, `after-jdt` |
| Regression bốn suite file/session/execution/QA | PASS: 140 test, 0 fail/error/skip | `scratch/handover/task-1-maven.log` |
| Review riêng bản sửa null | Approved; không đổi nghiệp vụ hoặc tắt cảnh báo | `scratch/handover/task-1.diff` |
| Tạo và đăng nhập 4 vai trò | PASS qua HTTP thật | `scratch/handover/role-checks.json` |
| Quyền API quản trị | PASS: ADMIN được đọc; PM/Tester/Dev nhận 403; anonymous 401 | Tổng 28 kiểm tra cùng artifact |
| Membership và đọc dữ liệu dự án | PASS: gán ba vai trò, đăng nhập lại, danh sách dự án đúng vai trò; 12 GET trả 200 | `scratch/handover/project-role-checks.json` |
| Chống truy cập vượt quyền | PASS: 7 kiểm tra thiếu CSRF / dự án khác / tự nâng quyền | `scratch/handover/negative-role-checks.json` |
| Browser Admin | PASS: tài khoản mới mở dashboard tổng, 4 dự án/13 tài khoản từ database thật | `scratch/handover/admin-dashboard.png` |
| Browser PM/Tester/Dev | PASS: đăng nhập, dashboard DEMO-PILOT tải dữ liệu; Dev có nút tạo công việc bị vô hiệu hóa | `scratch/handover/{pm,tester,dev}-dashboard.png` |
| Structural API contract | PASS | `scripts/Check-Contracts.cjs` |
| Full offline backend sau sửa projection | PASS: 396 test / 39 suite, không skip | `scratch/handover/backend-full-result.json` |
| Contract/runner/demo helpers | PASS: 40 test | Node test runner, 06/10/2026 |
| JDT cuối cùng sau bổ sung regression | PASS: 192 source, 0 error / 0 warning | `scratch/handover/projection-final-clean-jdt` |

JUnit/JDT trên là kết quả chạy lại trong tác vụ này. Full FE 612 test là kết quả đợt review F/Q trước, xem [báo cáo nguồn](2026-10-06-fq-implementation.md); tác vụ này không đổi frontend. Không suy ra coverage từ số test; coverage toàn hệ thống chưa đo. Mockito có thông báo dynamic agent của công cụ, không phải cảnh báo source Java.

## Lỗi phát hiện khi bàn giao

API gán thành viên dự án từng trả HTTP 500 `UnsupportedOperationException`; request `72969669-ca2a-41a4-b373-4947a1305d80`. MySQL trả biểu thức `archived_at IS NOT NULL` dạng số; Spring projection không tự đổi số sang boolean. Đã bổ sung so sánh số tường minh trên getter, giữ nguyên SQL `FOR UPDATE` và quy tắc từ chối dự án lưu trữ. Regression dùng projection thật đã tái hiện lỗi trước sửa và PASS sau sửa; 18 test liên quan PASS, review Approved. **Đã kiểm tra lại API thật: gán PM/Tester/Dev thành công và đọc lại đúng vai trò.** Kiểm thử đồng thời native vẫn chưa chạy.

Bản JAR kiểm chứng: `Backend/target/fq-final-maven/tms-backend-0.1.0-SNAPSHOT.jar`, SHA-256 `91c53c1c41163091f10e91154ea22a055be09d5eceb1a409252c80362625de2e`, build lúc `2026-10-06T01:17:47.533Z`.

## Database và ranh giới kiểm chứng

- Đã đọc lại database `127.0.0.1:3307/tms`: Flyway V16. Tài khoản migrator chỉ có quyền trên `tms`, chưa có quyền schema test.
- Theo yêu cầu “bạn tự chạy nhé”, đã thử tài khoản root cấu hình để tạo `tms_docstest_202610030001`; MySQL từ chối xác thực **1045 (28000)**. Không đoán thêm mật khẩu hoặc đổi root.
- Đã tạo backup native `var/mysql-native/backups/2026-10-06T01-09-39-750Z-tms.sql` và manifest SHA-256. Session rows không nằm trong backup; DDL đầy đủ.
- API xác minh dùng bản JAR mới ở cổng 18080, Flyway tắt riêng cho tiến trình kiểm tra quyền/tài khoản V16; đây không phải bản triển khai hoàn chỉnh F/Q. Frontend kiểm chứng cổng 15175 proxy tới API thật, không dùng fixture response.
- **Chưa chạy** migration fresh/upgrade V17/V18 và trọn luồng phiên máy → BUG/QA → Dev → retest trên schema riêng. Cần quyền quản trị MySQL hợp lệ hoặc schema được cấp trước. V17/V18 vẫn chưa áp vào `tms`.
- [Hướng dẫn native](../database/file-work-qa-verification.md), [38 kịch bản UAT](../uat/file-work-qa.md) và phần kiểm thử đồng thời còn thiếu giữ trạng thái chưa nghiệm thu.

## Tài liệu vận hành và nghiệp vụ

- [PRD](../product/PRD.md)
- [Đặc tả hệ thống](../product/SYSTEM-SPECIFICATION.md)
- [Traceability và UAT](../product/TRACEABILITY-UAT.md)
- [Hướng dẫn Admin](../admin-guide.md)
- [Hướng dẫn công việc theo file / QA](../file-work-qa-guide.md)
- [Chạy ứng dụng với MySQL native](../database/mysql-workbench.md)

Truy cập sau khi backend mới chạy trên cổng ứng dụng: `http://127.0.0.1:5173/`. ADMIN vào dashboard quản trị; PM/Tester/Dev chọn `DEMO-PILOT`. Nếu đổi từ ADMIN sang vai trò khác và URL còn `#/admin`, màn từ chối có liên kết **Về không gian dự án**. Phân quyền này đã kiểm tra trong browser. Metadata thật: PM tạo/triage; Tester tạo nhưng không triage; Dev không tạo/triage.

Đã đăng xuất và dừng các tiến trình xác minh riêng 18080/15175. Listener người dùng 8080/5173 vẫn giữ nguyên; **backend 8080 chưa được thay bằng bản mới**. Không để tiến trình tạm với Flyway tắt tiếp tục phục vụ như bản chính.

Commit/push `system-design` được thực hiện theo yêu cầu của người dùng, gồm phần ADMIN/FQ đã review và hai bản sửa trong báo cáo này; không merge vào `develop`, không force-push. Kết quả remote SHA được xác minh và báo trực tiếp sau push. Các giới hạn native nêu trên vẫn là việc cần hoàn tất để nghiệm thu, không được xóa khỏi bàn giao vì đã push code.
