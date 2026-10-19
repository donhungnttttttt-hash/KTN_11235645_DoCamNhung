# Số liệu Feature và lịch sử internal-v1

## FixReports — contract hiện hành trong source ngày 19/10/2026

Phần này thay công thức run/cycle bên dưới cho luồng Feature mới. Xem [contract FixReports](../api/fixreports-contract.md), [tài liệu test](../api/test-documents.md) và [báo cáo quản lý](../api/reporting.md). Đây là mô tả source/contract, không xác nhận migration đã áp dụng vào database sử dụng hoặc UAT đạt.

| Đại lượng Feature/file | Định nghĩa hiện hành |
| --- | --- |
| total | Số case của file COMMITTED, đang hoạt động trong Feature đang hoạt động, đúng project; không nhân theo người được giao |
| OK / NG / P / NA / Unexecuted | Năm Status hiện hành, loại trừ nhau trên từng bản case độc lập; không có Fixed trong luồng mới |
| tested | OK + NG + P + NA, tương đương Status khác Unexecuted |
| executionPercent | tested / total ×100; mẫu số **bao gồm NA** |
| File rỗng | total=0, tested=0, tiến độ0; UI ghi chưa có case, không suy ra hoàn thành hoặc nghiệm thu |

Ví dụ **2 Unexecuted +1 OK +1 P +1 NA =3/5 =60%**. P và NA đều là kết quả đã ghi; NA không còn là quyết định loại run khỏi mẫu số của luồng mới. Không dùng tỷ lệ đạt hoặc số lần đổi Status làm tiến độ. 100% thực thi không đồng nghĩa toàn bộ OK, khách hàng nghiệm thu hay đủ điều kiện phát hành.

Status, nội dung, phân công và lịch sử thuộc đúng bản file/case trong Feature. Cùng workbook tại A/B không chia sẻ mutable case. Đổi assignee giữ Status; hai cột người test đầu/gần nhất phản ánh phân công, còn actor ghi kết quả lấy từ lịch sử. File/Feature/report/AI dùng cùng công thức và identity hiện hành. Retest thủ công theo case/Issue, không thêm cycle/run/build/device/session làm gate ghi; không tự biến NG thành OK khi Issue chuyển trạng thái.

Sửa báo cáo Markdown từ “10 lỗi” thành “8 lỗi” chỉ sửa văn bản đã lưu; tổng Issue, Status và phân công vẫn lấy dữ liệu nghiệp vụ. Không dùng nội dung báo cáo đã chỉnh làm nguồn thống kê. Dữ liệu chuyển đổi có reset Status/phân công theo quyết định đã chốt; không suy ra người test hay lịch sử mới từ nhãn nguồn Excel. Migration/repair và chứng minh bảo toàn dữ liệu được theo dõi riêng, không suy số phiên bản hoặc trạng thái main DB từ tài liệu này.

### Bổ sung 19/10/2026 — R03/R07: KPI Admin hiện hành

Admin overview và bảng dự án dùng `metricDefinitionVersion=feature-cases-v1`: đếm mỗi import row có case trong file COMMITTED/Feature chưa lưu trữ đúng một lần, từ Status hiện tại. Không dùng run/cycle/attempt làm nguồn KPI hiện hành. Bug mở/chờ xác minh chỉ lấy Issue context chưa xóa mềm, Feature và file tùy chọn còn hoạt động; work-item lịch sử không có context không vào KPI mới.

Milestone giữ metadata/lịch sử; phạm vi cảnh báo hiện hành chỉ gồm BUG/QA còn hoạt động đã có `work_items.milestone_id` rõ ràng. Không tự gán milestone cho Feature hoặc suy ra hạn mới; cycle/Task cũ không tạo cảnh báo quá hạn đang hoạt động. [Báo cáo và quyền lịch sử](../api/reporting.md).

## Lịch sử trước FixReports — internal-v1/run-cycle

Phần dưới giữ định nghĩa và bằng chứng các sprint cũ; không phải công thức cho Feature mới. Public legacy writes bị nghỉ dùng theo [file-work](../api/file-work.md); báo cáo run cũ chuyển sang thông báo410 sau kiểm tra quyền quản lý, không tiếp tục cung cấp tổng hợp cho Tester/DEV.

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
