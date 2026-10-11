# Đồng bộ kết quả thực thi và kết quả tài liệu

Phạm vi bổ sung do người dùng yêu cầu ngày 11/10/2026, trên `system-design`. Không thay sprint hoặc thay mô hình phân quyền.

## Nghiệp vụ đã chốt

- Khi mở form ghi kết quả, chọn sẵn kết quả hiện tại OK/NG/P. Lượt chưa chạy yêu cầu người dùng chọn, không tự chọn NG.
- Ghi một lần thực thi mới cập nhật cột kết quả tài liệu (ví dụ iPad) của cùng case. Nếu có nhiều đợt/cấu hình, **lần ghi thực thi mới nhất của case** được dùng, theo xác nhận của người dùng. Thường là lần test thứ hai nhưng không bắt buộc.
- Bấm trực tiếp cột iPad vẫn tự lưu vòng Unexecuted → OK → NG → P → NA → Unexecuted; không sửa kết quả hoặc lịch sử thực thi.
- Cột Người test lần 2 hiển thị người, đợt và kết quả riêng của lượt được phân công. Kết quả này có thể khác cột iPad nếu người dùng sửa trực tiếp iPad hoặc một lượt khác ghi sau.
- Giữ nguyên ô nguồn và workbook gốc. Không áp dụng hồi tố lên dữ liệu đã có vì không thể suy ra người dùng muốn giữ kết quả tài liệu đã chỉnh tay hay ghi đè bằng lịch sử cũ.

## Đối chiếu code và cách sửa

`AttemptDialog` khởi tạo cố định NG, trong khi nhãn kết quả hiện tại đọc đúng dữ liệu run. Đây là sai giá trị mặc định của form. Kết quả tài liệu nằm trong `import_rows`, còn thực thi nằm trong `execution_attempts` và `run_items.latest_attempt_id`; trước thay đổi chưa có cập nhật kết quả tài liệu sau khi ghi thực thi.

Cập nhật các dòng import đã commit, đúng project và case, cùng transaction với lần thực thi mới. Tăng version kết quả tài liệu và ghi lịch sử để lần sửa dùng dữ liệu cũ nhận xung đột. Request lặp lại phải trả lần thực thi cũ, không ghi đè chỉnh sửa tài liệu mới hơn. Kết quả P giữ mã P theo schema hiện hành, không thêm migration.

Frontend tải lại tài liệu sau khi ghi thực thi từ ngữ cảnh tài liệu; mở lại trang tài liệu sau điều hướng luôn đọc server. Giữ bản nháp khi refresh sau xung đột. Bố cục popup phân biệt kết quả hiện tại và lần chạy mới, các nút có kích thước phù hợp màn hình nhỏ.

## Kiểm chứng

Test hành vi RED trước khi sửa và GREEN sau khi sửa; native integration chỉ chạy schema riêng. Bằng chứng và giới hạn kết luận cập nhật tại `docs/reviews/2026-10-11-execution-document-results.md`.
