# Số liệu nội bộ — phiên bản internal-v1

Áp dụng ADR-008. Đơn vị là lượt case/cấu hình trong đợt (run item), không phải số test case duy nhất hoặc số attempt.

| Đại lượng | Định nghĩa |
| --- | --- |
| T | Tổng run item trong bộ lọc đợt; không lấy đợt nháp |
| NA | Run item có quyết định loại khỏi phạm vi hiện hành của PM |
| D | T − NA |
| OK / NG / P / Chưa chạy | Kết quả mới nhất của mỗi run không NA; không có attempt là Chưa chạy |
| Tiến độ thực thi | (OK + NG) / D × 100 |
| Tỷ lệ đạt | OK / D × 100 |
| Bug liên quan | ID bug duy nhất liên kết với run trong phạm vi; không nhân lên theo liên kết N:N |
| Chờ xác minh | Bug liên quan đang ở trạng thái Đã xử lý; không đổi kết quả execution |

D = 0 trả tỷ lệ null và hiển thị “Chưa có phạm vi áp dụng”. Tổng OK + NG + P + Chưa chạy = D. NA giữ nguyên attempt cũ và không được tính vào các nhóm kết quả áp dụng.

Lọc build giữ nguyên phạm vi case/cấu hình, lấy attempt mới nhất **trên build được chọn**; run chưa chạy build đó là Chưa chạy. Không chọn build lấy attempt mới nhất trên mọi build. Trạng thái bug và quyết định NA là trạng thái hiện hành, không phải truy vấn lịch sử tại một thời điểm tùy chọn. `asOf` là thời điểm đọc snapshot nhất quán của báo cáo; ngày nhóm attempt theo múi giờ dự án. Số lần thực thi được ghi riêng, không cộng vào số run.

Ví dụ T=6, NA=1, OK=2, NG=1, P=1, Chưa chạy=1: D=5; thực thi 60%, đạt 40%. Hai lần chạy cùng một run chỉ đóng góp một kết quả; hai run cùng liên kết một bug chỉ đóng góp một bug.

## Quyết định phạm vi và chốt đợt

Chỉ PM dự án, dự án còn hoạt động, được ghi NA hoặc đưa run trở lại phạm vi với lý do và version. Chỉ áp dụng trong đợt ACTIVE. Mỗi quyết định được lưu nối tiếp; pointer hiện hành không sửa/xóa attempt. Loại một run khỏi phạm vi làm hết hiệu lực phạm vi retest hiện hành của các bug chưa đóng chứa run đó; giữ build sửa để PM xác nhận lại phạm vi. Quyết định đóng bug trong quá khứ không bị viết lại.

PM chốt đợt ACTIVE với lý do, version; không còn NOT_RUN/P trong phạm vi áp dụng, mọi NG hiện hành đã có bug. Khi còn NG, bug chưa đóng hoặc yêu cầu retest OPEN liên quan, bắt buộc ghi nhận tồn đọng. Chốt không có nghĩa tất cả bug đã được sửa. Lưu snapshot điều kiện, người và thời điểm cùng quyết định. Đợt CLOSED khóa ghi execution, phân công và NA. PM mở lại với lý do; không thay thời điểm kích hoạt ban đầu hoặc ghi lại kết quả cũ.

Retest chưa xong ở đợt CLOSED giữ nguyên để đối chiếu; không nhận kết quả mới cho đến khi PM mở lại đợt. Chốt đợt không xóa PASS đã xác minh hợp lệ. Dữ liệu lịch sử vẫn được thành viên nội bộ xem.

## API và báo cáo

`POST /projects/{p}/run-items/{id}/scope-decisions`: `excluded`, `reason`, `expectedVersion`; GET cùng đường dẫn trả lịch sử có phân trang.

`POST /projects/{p}/test-cycles/{id}/decisions`: `action` CLOSE/REOPEN, `reason`, `outstandingReason`, `expectedVersion`; GET cùng đường dẫn trả lịch sử có phân trang.

Mọi ghi dùng project lock trước đọc, optimistic version, transaction; quyền kiểm tra server, ADMIN toàn cục không thay PM dự án. Retry với version cũ trả 409 để người dùng đối chiếu, không tự tạo quyết định thứ hai. Báo cáo và XLSX chỉ cho thành viên nội bộ, cùng công thức/bộ lọc, có tổng hợp và nguồn để đối chiếu; không tự gửi ra ngoài.
