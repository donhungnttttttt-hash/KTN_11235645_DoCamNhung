# Mapping Redmine nội bộ — S09

Theo [ADR-009](../decisions/ADR-009-redmine-sandbox.md). Đây là cấu hình sandbox nội bộ được lựa chọn theo ủy quyền của người dùng ngày 30/09/2026; không phải quy tắc khách hàng. Chưa được coi là đã kiểm chứng cho đến khi có bằng chứng S09.

## Quyền và phạm vi dữ liệu

TMS là nguồn trạng thái bug/closure và execution. PM dự án yêu cầu công bố snapshot cụ thể; Tester chỉ xem trạng thái gửi. Server giữ credentials và endpoint được phép. Không tự tải lên chứng cứ, bình luận nội bộ, người theo dõi hoặc gửi thông báo ngoài. Dự án Redmine thử có tên rõ “TMS Sandbox”, không dùng ID dự án thật của khách.

| Dữ liệu TMS | Dữ liệu Redmine | Chủ sở hữu / quy tắc |
| --- | --- | --- |
| BUG | Tracker Bug nội bộ | Chỉ BUG có delivery, không gửi REQUEST/TASK |
| item_key + title | subject | PM công bố snapshot từ TMS |
| steps, expected, actual, build, environment, device, case/revision/attempt hoặc lý do ngoại lệ | description | Mẫu tiếng Việt nội bộ, giới hạn chiều dài, không nối payload bí mật |
| status_code | status_id | Mapping rõ 10 trạng thái dưới đây; remote không tự sửa TMS |
| HIGH/MEDIUM/LOW | priority_id | Tương ứng Cao/Trung bình/Thấp trong sandbox |
| UUID marker ổn định theo bug/binding | Custom field “TMS Correlation” | Dùng tìm lại CREATE chưa rõ kết quả; bật used-as-filter, không cho tác vụ khác đổi marker |
| Phiên bản công bố/checksum snapshot | Metadata delivery trong TMS | Phân biệt đã gửi bản cũ và bản hiện hành, không báo “đã đồng bộ” chỉ vì local đã lưu |
| remote id/status/updated time/fingerprint | Liên kết và quan sát đối chiếu | Chỉ đọc vào metadata; không dùng để tự pass/close |

## Trạng thái sandbox

| Mã nội bộ | Nhãn Redmine sandbox | Terminal |
| --- | --- | --- |
| open | Chưa xử lý | Không |
| progress | Đang xử lý | Không |
| recheck | SYP kiểm tra lại | Không |
| clarify | Xác nhận đặc tả / mức độ | Không |
| ready | Sẵn sàng xử lý | Không |
| planning | Lập kế hoạch | Không |
| resolved | Đã xử lý | Không |
| unreproducible | Không tái hiện | Có |
| wontfix | Không xử lý | Có |
| closed | Hoàn thành | Có |

Mã đã đối chiếu lookup V7; ID Redmine đọc từ server sandbox sau seed, không lấy ID ví dụ trong tài liệu làm mapping khách hàng.

## Tình huống cần người vận hành xử lý

Nếu CREATE không rõ kết quả và chưa tìm thấy marker, giữ UNCERTAIN; chỉ đối chiếu lại, không tự tạo lần hai. Nhiều ticket trùng marker hoặc remote đổi khác bản đã gửi là CONFLICT. Khi có conflict, PM xem local/remote và lý do; không có cơ chế last-write-wins âm thầm. Các lần gọi và kết quả được audit không chứa token hay raw error body.

Trước dùng Redmine khách hàng: đối chiếu version, quyền service account, project/tracker/custom field/priority/status, trường bắt buộc, workflow cho phép và authority từng field. Chưa có những dữ liệu đó thì chỉ bật sandbox, không tuyên bố production-ready.
