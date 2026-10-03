# Vận hành công bố Redmine

Phạm vi đã chọn: sandbox riêng, [ADR-009](../decisions/ADR-009-redmine-sandbox.md). TMS là nguồn trạng thái của bản nội bộ. Chưa có quyền/mapping tracker khách; không dùng kết quả sandbox để tự mở production.

## Cấu hình và dữ liệu

Hướng dẫn chạy tại [redmine-sandbox.md](redmine-sandbox.md). Endpoint và API key chỉ cấu hình ở máy chủ, mapping JSON theo ID dự án TMS; không nhận URL/key từ payload người dùng. HTTPS bắt buộc ngoài loopback. Không theo redirect, timeout kết nối 3 giây, toàn phản hồi 10 giây, body tối đa 1 MiB. Log không ghi header bí mật hoặc body lỗi Redmine.

V10 gồm binding duy nhất theo bug/marker/instance-ticket, outbox có snapshot bất biến và một job hoạt động cho mỗi binding, nhật ký lần gửi/thử lại có actor/lý do. Không lưu API key trong database. Mapping được chụp tại lần liên kết đầu; đổi host hoặc mapping không tự chuyển ticket cũ sang nơi khác.

PM mở chi tiết bug, kiểm tra thông tin rồi nhập lý do công bố. 202 là đã ghi hàng đợi; chỉ `DELIVERED` sau khi đọc lại khớp mới được hiển thị “Đã đối chiếu khớp”. Không gửi comment, chứng cứ, watcher hoặc email nội bộ. Phần mô tả tự tạo chứa tiêu đề đầy đủ, bước tái hiện, mong đợi/thực tế và ngữ cảnh bug; subject tối đa 255 Unicode code points.

## Xử lý theo kết quả

| Kết quả | Thao tác |
| --- | --- |
| QUEUED / RUNNING | Chờ worker; giao diện tự tải lại khi đang mở. Không gửi yêu cầu thứ hai |
| RETRY_WAIT | Lỗi đọc/429/5xx chưa ghi; tối đa 5 lần mỗi chu kỳ, backoff tăng dần và Retry-After giới hạn 1–3600 giây |
| FAILED | Kiểm tra quyền/mapping/dịch vụ; PM nhập lý do và thử lại cùng snapshot, hoặc công bố bản hiện tại |
| UNCERTAIN | Có thể Redmine đã nhận lệnh. Chỉ đối chiếu theo marker; tìm 0 ticket không phải bằng chứng để tạo lần hai |
| CONFLICT | Xem bản đã công bố và bản quan sát. PM xác nhận fingerprint hiện hành + lý do trước khi công bố lại; worker đọc lại ngay trước PUT |
| DELIVERED | Đã đọc lại khớp tại thời điểm ghi nhận. Sửa trực tiếp Redmine sau đó chỉ được phát hiện khi PM yêu cầu đối chiếu hoặc công bố lần tiếp theo |

401/403/422 là từ chối rõ ràng, không gửi vòng lặp tự động. Worker kiểm tra lại PM còn hoạt động và dự án chưa lưu trữ trước HTTP. Mỗi job được nhận bằng transaction ngắn, gọi HTTP ngoài transaction rồi ghi kết quả theo lease; worker cũ không được ghi đè worker đã nhận lại. CREATE có cờ bền vững trước khi gọi mạng; crash/timeout/5xx/phản hồi bất thường buộc đối chiếu. Không tự reset cờ khi chưa chứng minh provider đã từ chối yêu cầu.

Ticket có tham chiếu Redmine nhập tay bị chặn công bố tự động để tránh tạo trùng. Chưa cung cấp thao tác tự nhận liên kết cũ: cần đối chiếu project/tracker/marker/quyền riêng trước kế hoạch chuyển dữ liệu. Không sửa SQL hoặc xóa binding để vượt qua chốt chống trùng.

Nếu có nhiều ticket cùng marker hoặc một external ID đã gắn bug khác, dừng ghi và kiểm tra nguồn. Không chọn ngẫu nhiên ticket đầu tiên. Nếu cần sửa metadata có dữ liệu thật, lập phương án có backup và kiểm chứng riêng; không xóa lịch sử lần gửi.

## Giới hạn cần giữ rõ

REST Redmine 7.0.1 chuẩn không cung cấp conditional PUT theo `lock_version` trong JSON. GET trước và sau PUT phát hiện thay đổi quan sát được, nhưng vẫn có khoảng đua giữa GET và PUT. Không tuyên bố đảm bảo atomic CAS bên ngoài. Bản dùng chung cần quy định ownership từng trường hoặc mở rộng provider trước khi cam kết chống mọi cập nhật đồng thời.

Sandbox project là private; service account không admin và chỉ có view/add/edit issues + đặt riêng tư cho ticket do mình tạo. Assertion `is_private` sau ghi là bắt buộc vì Redmine có thể bỏ qua trường không đủ quyền. Trước tracker thật phải xác nhận project visibility, role và template với chủ hệ thống; chưa có nghiệm thu khách hàng.

Backup phải gồm DB TMS, DB Redmine, file evidence và bí mật cấu hình ở nơi được bảo vệ. Không commit các `.env*.local`, mapping thực tế, SQL dump, khóa TLS hoặc API response chứa thông tin nội bộ. Diễn tập restore thuộc S10.
