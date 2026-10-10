# Hướng dẫn công việc theo file và QA

Cập nhật ngày 06/10/2026. Đây là hướng dẫn cho thiết kế F/Q đã duyệt, đang hoàn thiện mã nguồn và kiểm chứng. Chỉ sử dụng các chức năng mới sau khi backend tương ứng được chạy và Flyway V17/V18 đã áp dụng thành công; xem [các bước kiểm chứng/cập nhật database](database/file-work-qa-verification.md). Không xem hướng dẫn này là biên bản UAT. Trạng thái kiểm tra nằm trong [báo cáo triển khai](reviews/2026-10-06-fq-implementation.md), các bước nghiệm thu nằm trong [UAT F/Q](uat/file-work-qa.md).

## 1. Admin bàn giao dự án

Admin đăng nhập vào khu quản trị, tạo dự án và chọn PM, Tester, Dev cùng các máy vật lý ban đầu. Số người/máy được chọn là nguồn lực ban đầu, không phải hạn mức cấm bổ sung về sau. Mỗi máy chỉ được bàn giao cho một dự án tại cùng thời điểm. PM tiếp nhận dự án đã được cấp; PM không thay Admin tạo dự án hoặc điều chuyển kho máy toàn công ty.

PM kiểm tra thành viên, vai trò, danh mục build/môi trường/thiết bị kiểm thử và những máy đã được bàn giao. Máy vật lý thực tế và loại thiết bị trong cấu hình kiểm thử là hai thông tin có mục đích khác nhau: cấu hình mô tả phạm vi phải test, máy vật lý xác định thiết bị đã dùng.

## 2. PM nhập file và phân công

1. Vào **Quản lý kiểm thử → Thư viện test case**, nhập Excel và xem trước. Hệ thống nhận diện theo tên cột; file gốc và các cột bổ sung được lưu để đối chiếu. Ô “Đối tượng test” trống kế thừa dòng trước để tạo case, nhưng ô nguồn vẫn giữ trống. Xác nhận chỉ sau khi đã xử lý các lỗi được chỉ ra.
2. Mở tài liệu để kiểm tra nội dung. Kết quả nhập từ Excel hoặc chỉnh trên tài liệu là dữ liệu tài liệu; chúng không tự tạo kết quả chính thức của đợt kiểm thử.
3. Duyệt revision, chuẩn bị đợt/cấu hình/build. Tại **Công việc theo file**, PM xem trước phạm vi và giao các revision đã duyệt cho một Tester chính. Việc xem trước không tự kích hoạt đợt hoặc ghi kết quả.
4. Kích hoạt đợt qua luồng quản lý đợt hiện có. Tester chỉ bắt đầu khi đợt, phân công và nguồn lực đều hợp lệ.
5. Nếu phải đổi người, PM phân công lại cả nhóm. Không đổi riêng vài case rồi giả định nhóm vẫn có một người phụ trách: nhóm có phân công không nhất quán sẽ bị chặn bắt đầu.

Revision trong công việc đã giao được cố định. Sửa case gốc không âm thầm thay nội dung Tester đang thực hiện; PM cần chuẩn bị phạm vi mới phù hợp.

## 3. Tester nhận việc và ghi kết quả

Mở **Công việc theo file**, xem các file được giao, chọn file và build cần thực hiện. Chọn máy vật lý đang được bàn giao đúng dự án và đúng người nhận, phù hợp cấu hình. Khi bắt đầu thành công, server ghi người thực hiện, file, build và máy vào phiên làm việc; người dùng không nhập tên người khác để giả người thực hiện.

- **Bắt đầu:** tạo phiên đang làm trên máy đã chọn. Một máy không được đồng thời dùng cho hai phiên đang làm.
- **Tạm dừng:** giữ lịch sử phiên và kết quả, giải phóng quyền sử dụng máy đang làm. Khi tiếp tục, hệ thống kiểm tra lại phân công, máy và bàn giao.
- **Ghi kết quả:** OK được lưu theo luồng trực tiếp; NG cần thực tế đã xảy ra, P cần lý do. Chỉ thông báo thành công sau khi server đã lưu. PM quyết định NA theo policy hiện có.
- **Lịch sử:** xem các lần ghi và chứng cứ của đúng lượt; kết quả cũ không bị xóa khi ghi lần mới.
- **Hoàn tất:** chỉ khi hết Chưa chạy/P và mỗi NG hiện hành có BUG liên kết. Hoàn tất phiên không có nghĩa dự án đạt, bug đã đóng hoặc PM đã chốt đợt.

Một người có thể làm các file khác trên máy khác nếu các điều kiện đều hợp lệ. Khi máy bị thu hồi, tài khoản bị khóa hoặc phân công bị thay đổi, phiên cũ không cho phép tiếp tục ghi trái quyền. PM có thể hủy phiên với lý do; lịch sử vẫn được giữ.

Nếu gặp xung đột phiên bản, giữ nội dung đang nhập và tải dữ liệu mới để đối chiếu. Một bản nháp không được tự chuyển sang phiên/build/máy thay thế rồi gửi như thể vẫn thuộc ngữ cảnh cũ.

## 4. BUG và QA có hai luồng riêng

**BUG:** từ NG hiện hành tạo bug với bước tái hiện, mong đợi/thực tế và lần chạy chính xác. PM phân loại và giao Dev. Dev chỉ xử lý bug được giao, ghi thông tin sửa/build và trả lại để PM chuẩn bị retest. Việc Dev báo đã sửa không tự đổi NG thành OK. PM xác định đầy đủ coverage và giao retest; Tester thực hiện. FULL_CASE ghi một lần execution chính thức, BUG_ONLY chỉ xác minh bug. PM đóng lỗi theo các điều kiện hiện có.

**QA:** dùng khi cần hỏi hoặc làm rõ, không bắt buộc có NG. QA có thể gắn tài liệu/nhóm/lượt/revision cùng dự án. Tester hoặc PM tạo câu hỏi; PM giao Dev. Dev bắt đầu xác minh, yêu cầu bổ sung hoặc gửi câu trả lời. Người Tester đã tạo QA xác nhận đúng câu trả lời hiện hành; PM kết thúc sau xác nhận. Nếu PM phải kết thúc ngoại lệ, phải chủ động chọn ngoại lệ và ghi lý do, không tạo xác nhận giả.

Câu trả lời và xác nhận được giữ thành lịch sử bất biến. Đổi Dev, trả lời lại hoặc mở lại làm mất hiệu lực xác nhận cũ đối với câu trả lời hiện hành. Bình luận/chứng cứ hỗ trợ trao đổi, không thay câu trả lời hoặc xác nhận chính thức. QA không được kéo cột Kanban để bỏ qua những bước này. QA phát hiện lỗi thì tạo BUG riêng; không tự đổi loại QA, tạo NG, retest hay đóng BUG.

## 5. PM theo dõi và bàn giao lại

PM đối chiếu các nhóm file, người được giao, phiên đang làm/tạm dừng, build, máy và kết quả. Hàng chờ bàn giao bug dựa trên coverage/yêu cầu/kết quả retest hiện hành, không coi tất cả bug “Đã xử lý” là đã giao Tester hoặc đã đạt. Các trạng thái hàng chờ giúp mở đúng bug để chuẩn bị retest, theo dõi hoặc đóng; chúng không tự phát sinh yêu cầu và không thay quyền kiểm tra ở lệnh đóng bug.

Dùng các bộ lọc **Tester theo dõi**, **Đợt theo dõi**, **Build theo dõi** để lọc trên server. Đổi bộ lọc đưa danh sách về trang đầu; có thể chuyển trang danh sách đợt mà vẫn giữ đợt đã chọn. **Được giao cho tôi** luôn dùng người đăng nhập hiện hành, khóa bộ lọc Tester trong chế độ này.

Mỗi dòng hiển thị tỷ lệ thực thi/đạt của build ghi trên dòng, thời điểm bắt đầu phiên mới nhất, cập nhật nhóm và hoạt động đã lưu gần nhất (gồm kết quả chính thức trên các build và chuyển trạng thái phiên). Thời gian theo múi giờ dự án; dùng **Làm mới** để lấy snapshot mới. “Không có mẫu số” không phải 0%. Mốc kế hoạch/hạn lấy từ đợt: “Chưa có mốc kế hoạch” hoặc “Chưa có hạn” thể hiện dữ liệu còn thiếu; hạn là ngày lịch, không đổi theo múi giờ.

Build đã lưu trữ vẫn xuất hiện ở **Build hiển thị** để đọc/xuất lịch sử, không dùng để bắt đầu phiên mới. Nếu phần kết quả không tải được, PM còn quyền hiện hành vẫn có thể **Hủy phiên** DOING/PAUSED với lý do. Việc hủy không xóa kết quả đã lưu.

Tiến độ dự án đối chiếu hạn mốc/đợt; nếu thiếu kế hoạch thì báo thiếu dữ liệu. PM bổ sung báo cáo và lý do chậm theo luồng báo cáo dự án, không suy nhanh/chậm chỉ từ tỷ lệ case đã chạy.

## 6. Chọn đúng bản Excel

| Chức năng | Dữ liệu được tải |
| --- | --- |
| Tải file gốc | Workbook nguồn đã nhập, giữ nguyên để đối chiếu |
| Xuất tài liệu | Dữ liệu tài liệu hiện hành, gồm trạng thái tham khảo đã lưu trên tài liệu |
| Xuất execution theo file | Nội dung revision đã giao và kết quả chính thức của build được chọn, cùng ngữ cảnh người/phiên/máy và thời điểm chụp dữ liệu |

Không dùng kết quả nguồn/annotation để thay kết quả execution. Khi xuất execution, kiểm tra build và thời điểm trong file; một kết quả ở build khác không được ngầm coi là kết quả build đang xem.

## 7. Kiểm tra trước khi sử dụng chính thức

Thực hành luồng Admin → PM → Tester → Dev → Tester → PM trên schema test đã được cấp quyền, theo [kịch bản UAT](uat/file-work-qa.md). Kiểm tra cả phiên hết hạn, mất quyền, đổi phân công/build, thu hồi máy và thao tác lặp. Không chạy fixture ghi/xóa lên schema đang dùng. Test đơn vị, review code và ảnh preview không thay kết quả chạy API/MySQL hoặc xác nhận của PM/Tester.
