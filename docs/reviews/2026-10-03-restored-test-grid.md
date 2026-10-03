# Khôi phục màn tài liệu test case và nhánh system-design

## Phạm vi và nguồn thiết kế

Theo yêu cầu 03/10/2026, khôi phục tương tác từ `develop:Frontend/src/app/pages/TestRunnerGridPage.jsx` (cùng blob với `feature/Fontend-design`). Xem [truy vết](2026-10-03-original-test-grid-trace.md). Import theo tiêu đề đã kiểm chứng trước thay đổi này: [báo cáo import](2026-10-03-header-based-import.md).

- Nút ba gạch dưới ID mở **Hiển thị chi tiết / Hiển thị lịch sử / Sao chép URL**.
- Chi tiết có bảng nhãn xanh, Trước/Tiếp và đường vào quản lý nội dung/phiên bản hiện có.
- Lịch sử đối chiếu revision thật qua API, giá trị trước màu đỏ/gạch ngang, sau nền vàng; có lối mở lịch sử thực thi.
- Kéo hoặc dùng phím mũi tên tại cạnh tiêu đề để chỉnh độ rộng cột. Giữ bảng toàn chiều rộng, tiêu đề xanh, ID cố định, phân trang/tìm kiếm/tô màu/cỡ chữ.
- Ô iPad/kết quả mở luồng thực thi thật theo đợt và cấu hình. Kết quả lấy từ API, ghi bằng AttemptDialog hiện có; reload giữ lựa chọn xem bằng sessionStorage và tải lại dữ liệu server.
- Thành viên được phân công ghi OK/NG/P; chỉ PM được quyết định NA/khôi phục phạm vi khi đợt ACTIVE. Đợt đóng và người khác không được ghi. API vẫn enforce quyền/optimistic version.

Không sao chép hành vi vòng trạng thái giả trong prototype: Fix thuộc luồng sửa lỗi/retest; case dự thảo phải được PM duyệt và thêm phạm vi trước khi ghi. Excel nguồn, cột phụ M/N và export nguồn giữ nguyên; thay đổi thực thi không tự ghi đè kết quả tham khảo trong workbook. Sửa nội dung dùng phiên bản case hiện có, chưa khôi phục trình định dạng ô/inline editing chỉ lưu state của prototype.

## Kiểm chứng

- RED trước sửa: test menu ba gạch thất bại vì chưa có nút; GREEN sau nối giao diện/API.
- Frontend toàn bộ cuối **238/238 test (28 file) PASS**; suite tập trung cuối **32/32 PASS**. Build production PASS (1668 modules).
- Coverage 4 file TestDocumentPage, DocumentExecution, DocumentCaseDialog, CaseHistoryDialog: statements **91.26%**, branches **81.56%**, functions **86.13%**, lines **93.98%**. Đây là coverage phạm vi sửa, không phải toàn ứng dụng.
- Test lỗi lưu không hiển thị thành công giả; test phân trang run, người khác, đợt đóng, thiếu phạm vi, lỗi tải/retry, response trễ, revision diff, clipboard từ chối, deep link và điều hướng chi tiết PASS.
- Browser native: tài liệu khách 128 case mở menu/chi tiết Trước–Tiếp/lịch sử thật. Một bộ demo riêng `DEMO-GRID-1003` được tạo bằng API để kiểm tra ghi kết quả, không sửa kết quả khách hàng: project 4, document 5, cycle 6, run 242. Ghi OK lần #1; hiển thị Admin local, giờ dự án, build demo-grid-1; reload vẫn OK.
- Ảnh cục bộ (không đưa vào Git): `output/playwright/restored-test-grid.jpg`, `restored-case-detail.jpg`, `restored-case-history.jpg`, `restored-execution-history.jpg`.
- Không đổi backend/schema trong lần khôi phục này. Native đang Flyway V12; không tạo migration rỗng. Không chạy integration ghi/xóa vào schema đang dùng.
- Kiểm tra checkpoint: 508 file ứng viên ban đầu, đối chiếu 9 giá trị bí mật local không thấy trong file được theo dõi; `.env.*.local`, scratch, database/evidence/backup và build output vẫn bị ignore. `git diff --cached --check` toàn checkpoint báo khoảng trắng/CRLF của mã và tài liệu từ các sprint trước; không tự chuẩn hóa migration đã áp dụng hoặc sửa nội dung nguồn để che cảnh báo. Các file giao diện vừa khôi phục được kiểm tra riêng.

## Nhánh và việc tiếp tục

Nhánh **system-design** tạo từ HEAD hiện tại, mang nguyên code/tài liệu các sprint và tất cả thay đổi chưa commit trước đó. Theo yêu cầu tập hợp code, lưu checkpoint local trên nhánh này; không push/merge/deploy. AGENTS.md, README và STATUS.json ghi nhánh làm việc mới. Các phiên sau tiếp tục tại đây, không tự quay về nhánh sprint cũ.

Kế hoạch Sprint 00–11 và migration V1–V12 được giữ. S11 vẫn IN_REVIEW vì các gate isolated native integration/UAT/pilot chưa hoàn tất; checkpoint code không phải nghiệm thu toàn hệ thống. Đã đọc prompt-master (phạm vi chính là tối ưu prompt); dùng frontend-patterns, tdd-workflow và verification-loop cho triển khai/kiểm chứng thực tế.
