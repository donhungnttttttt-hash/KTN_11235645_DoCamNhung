# Chuẩn bị dự án và giao việc kiểm thử

Luồng dữ liệu: **dự án → thành viên / cấu hình / máy → file Excel → case đã duyệt → đợt và phạm vi giao → phiên kiểm thử trên build → kết quả → bug/QA → retest**.

## Ai thao tác

- ADMIN tổng có toàn quyền nghiệp vụ. PM quản lý nội dung, cấu hình, duyệt/giao case, đợt và điều phối ticket trong dự án. Quản trị tài khoản, membership và kho máy vẫn tập trung ở ADMIN.
- Tester thực thi phần được giao và test lại. Dev xử lý BUG/QA theo phân công. ADMIN có thể thực hiện các thao tác này, hệ thống ghi nhận đúng tài khoản thực hiện.
- Trạng thái **đợt** do Admin/PM quản lý. Trạng thái **phiên file** đi theo bắt đầu/tạm dừng/hoàn thành; kết quả **từng case** do người thực thi lưu. Nhập file không tự tạo phiên, phân công hoặc kết quả đã chạy.

## Thêm thành viên và máy cho dự án đã có

1. Vào **Quản trị → Dự án → chọn dự án**.
2. Ở **Thêm thành viên**, tìm tài khoản, chọn vai trò rồi **Lưu thành viên đã chọn**. Người đã là thành viên không được chọn lại; sửa vai trò trong bảng hiện tại. Nếu một người lưu lỗi, thông báo nêu tên người đó; phần đã lưu được cập nhật, nút lưu tiếp tục với phần còn lại.
3. Ở **Máy vật lý của dự án**, bấm **Bổ sung máy vào dự án**, chọn máy sẵn sàng. Chọn **Người nhận chung → Áp dụng cho N máy đã chọn** để điền nhanh, hoặc điền riêng từng máy ở phía dưới. Mỗi máy có người nhận/ngày trả/ghi chú riêng. Bấm **Bàn giao máy đã chọn** để lưu; thiếu người nhận sẽ có thông báo và nút **Điền người nhận còn thiếu** đưa tới ô cần điền. Chờ thông báo đang bàn giao/thành công; nếu lỗi một phần, những máy chưa lưu được giữ lại.
4. Nếu chưa có máy, mở **Kho / nhập máy mới**. Ví dụ mã `IPAD-01`, loại iPad, model và phiên bản hệ điều hành theo máy thực tế. Sau đó quay lại dự án để bàn giao. Máy đang được dự án khác giữ phải thu hồi trước.

## Thêm thiết bị kiểm thử và build

- **Cấu hình dự án → Danh mục → Thiết bị**: khai báo mã, tên và hệ điều hành cần kiểm, ví dụ tên `iPad / iPadOS`, hệ điều hành `iPadOS`. Đây là loại cấu hình, không phải mã máy trong kho.
- **Danh mục → Môi trường**: thêm môi trường như QA/staging theo dự án thực tế.
- **Danh mục → Bản build**: nhập nền tảng tương ứng (`iOS`, `iPadOS` hoặc `Android` cho phiên file có máy vật lý), nhãn phiên bản và số bản build, ví dụ `1.2.0`, `162`. Ghi dữ liệu thật; các ví dụ này không tự được thêm vào dự án.
- Màn chuẩn bị đợt có liên kết trực tiếp tới từng danh mục. Sau khi thêm, quay lại đợt và bấm **Tải lại**, rồi chọn môi trường, thiết bị và build để **Thêm cấu hình**.

Phiên file có máy vật lý hiện hỗ trợ iPad/iPhone/Android; OS của cấu hình, máy và nền tảng build phải tương thích. Nếu cấu hình có model/phiên bản OS cụ thể thì máy cũng phải khớp. Cấu hình cũ `Chrome / Windows` và build `WEB` vẫn phục vụ luồng thực thi case thông thường, chưa phải cấu hình hợp lệ cho phiên file có máy vật lý. Không đổi nhãn dữ liệu cũ để lách kiểm tra này.

## Giao file và khoảng case

1. Nhập một hoặc nhiều file tại **Thư viện test case**. File đã nhập xuất hiện trong thư viện và phần tài liệu nguồn của **Công việc theo file**.
2. Mở **Đợt kiểm thử** ở trạng thái bản nháp, thêm cấu hình chạy, chọn **Theo file Excel**. Hoặc mở **Công việc theo file → Giao file**.
3. Chọn tên file, cấu hình và Tester. Nhập `1-35` để chọn ID case từ 1 đến 35 trong file; có thể nhập `1-10,15,20-35`. Đây là ID ở cột ID của file, không phải số dòng Excel hoặc số database. Nguồn có ID chữ dùng mục **Xem / chọn case thủ công**.
4. Nếu còn case chưa duyệt, Admin/PM bấm **Duyệt … case đã chọn**. Duyệt thất bại không để lại một phần case đã duyệt trong cùng lệnh.
5. Bấm **Kiểm tra trước khi giao**, kiểm tra số lượng và thông báo, rồi **Tạo nhóm file**.
6. Có thể tạo nhóm tiếp theo của cùng file cho Tester khác với khoảng khác, ví dụ `36-70`. Case đã nằm trong cùng đợt/cấu hình không được giao trùng; muốn đổi người thì dùng giao lại phạm vi hiện có.
7. Admin/PM kích hoạt đợt. Tester mở nhóm được giao, chọn máy được bàn giao hợp lệ và build để bắt đầu phiên. Phiên và kết quả chỉ xuất hiện sau khi thực hiện các thao tác này.

## Cột test lần 2

Admin/PM chọn **Giao test lần 2** trên dòng tài liệu, duyệt phiên bản nếu cần, chọn đợt/cấu hình/Tester và ghi chú. Đây là phân công tạo lượt thực thi thực sự, không chỉ ghi tên vào ô Excel. Tester cập nhật kết quả ở lượt được giao sau khi đợt hoạt động.

Khi ghi kết quả từ đợt, cột iPad nhận **kết quả thực thi mới nhất của case**, thường là từ người test lần 2. Nếu một lượt khác ghi sau, cột iPad nhận kết quả mới đó. Cột Người test lần 2 vẫn hiển thị kết quả riêng của lượt được giao. Bấm trực tiếp ô iPad chỉ sửa kết quả tài liệu, không sửa kết quả/lịch sử trong đợt. Form ghi kết quả mở theo OK/NG/P hiện tại; lượt chưa chạy yêu cầu chọn kết quả. Mỗi lần lưu tạo bản ghi lịch sử mới.
