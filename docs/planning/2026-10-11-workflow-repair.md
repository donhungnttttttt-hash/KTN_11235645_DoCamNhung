# Rà soát và sửa luồng dự án → file → thực thi

Yêu cầu 11/10/2026; nhánh `system-design`; không commit/push/merge/deploy. Đây là phạm vi mở rộng do người dùng yêu cầu, không đổi trạng thái nghiệm thu S11.

## Bài toán được đối chiếu lại

TMS phải nối được dự án, thành viên, thiết bị, build, file Excel, phân công, kết quả, bug và retest. ADMIN tổng có toàn quyền nghiệp vụ theo quyết định 10/10; PM điều phối trong dự án; Tester thực hiện phần được giao; Dev xử lý ticket. Màn hình phải chỉ ra cách bổ sung dữ liệu còn thiếu và xác nhận lưu thành công từ server.

Phân công phải bắt đầu bằng **tên file**, không bắt người dùng chọn hàng trăm case riêng lẻ. Khoảng `1-35` có nghĩa các ID case 1 đến 35 trong file (không phải dòng vật lý Excel). Có thể chia phần khác không trùng trong cùng file/đợt/cấu hình cho Tester khác. Không lấy hậu tố mã nội bộ làm ID một cách ngầm định. ID nguồn không thuần số hoặc trùng số cần thông báo và cho chọn thủ công. Case nháp cần thao tác duyệt hàng loạt rõ ràng, không ngầm duyệt khi mở màn hình.

Thiết bị cấu hình (model/môi trường kiểm thử) và máy tài sản bàn giao vẫn là hai dữ liệu khác nhau, nhưng cần điều hướng rõ và bổ sung máy ngay từ dự án. Build được quản lý trong danh mục của chính dự án; không tự sinh build/máy giả vào dữ liệu đang sử dụng.

## Phát hiện đã xác nhận từ source

| ID | Vấn đề | Hướng sửa | Trạng thái |
|---|---|---|---|
| W1 | ScopeSetup liệt kê case toàn dự án theo trang, case nháp bị khóa | Chọn file trước, khoảng ID, xem trước và duyệt phạm vi; giữ luồng case nhập tay có nhãn rõ | DONE |
| W2 | uq_fw_group_source và service chặn phân chia cùng file/cấu hình | Migration nối tiếp, giữ khóa chống trùng run và transaction/idempotency | DONE |
| W3 | Chọn lại thành viên cũ, lưu một phần và phản hồi nằm ngoài vùng nhìn thấy | Đối chiếu user candidate/version, backend và UI; test lỗi trước sửa | DONE |
| W4 | ProjectDevices chỉ đọc bảng, không có nút bàn giao | Thêm thao tác trong chi tiết dự án, dùng API kho máy hiện có | DONE |
| W5 | Cấu hình thiết bị/build ở màn khác, thiếu hướng dẫn tại điểm sử dụng | Thêm liên kết đúng danh mục, empty/loading/error/action rõ ràng | DONE |
| W6 | Bộ lọc checkbox và tên dự án lệch hàng; chat đè nội dung | Sửa component/CSS dùng chung, rà routes và bảng/popup | DONE |
| W7 | PRD còn mô tả Admin không có quyền, không phản ánh quyết định mới | Cập nhật baseline nghiệp vụ và bản đồ liên kết chức năng sau đối chiếu | DONE |

## Kiểm chứng bắt buộc

- Regression RED → GREEN cho lỗi chức năng; kiểm tra phạm vi, quyền và kết quả thật.
- Chia hai khoảng của cùng file cho hai Tester; chặn trùng/thiếu/ID không rõ, dữ liệu đổi đồng thời, retry không tạo trùng.
- Kiểm thử backend/Flyway trên schema riêng; không fixture vào `tms`. Nếu áp migration local: backup và kiểm tra giữ dữ liệu trước/sau.
- Frontend full tests/build, contract, compiler, audit FK/liên kết và kiểm tra thao tác trên browser. Báo giới hạn kiểm tra thực tế, không coi số test PASS là nghiệm thu mọi UI.
- Đọc/đối chiếu code theo tất cả module đang được router dùng; ghi findings, mức xác nhận và việc còn lại. Không tuyên bố đã kiểm từng tổ hợp màn/role khi chưa thực hiện.

## Kết quả 11/10/2026

W1–W7 hoàn tất trong phạm vi sửa và kiểm chứng tại [báo cáo workflow](../reviews/2026-10-11-workflow-repair.md). Local V29, dữ liệu cũ giữ nguyên; 791 test FE, 547 unit BE, 99 hồi quy có native, migration nâng cấp/fresh và JDT 0 lỗi/0 cảnh báo PASS. Các lượt test có suite trùng, không cộng số. Browser xác nhận chọn file và khoảng 1-35; các thao tác ghi được kiểm tra trên schema riêng. S11 giữ IN_REVIEW cho UAT/thiết bị thật/NFR production. Hướng dẫn dùng tại [dự án → kiểm thử](../user-guides/project-testing-workflow.md). Không commit/push/merge/deploy.
