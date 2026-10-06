# Nghiệm thu công việc theo file và QA

Ngày 06/10/2026; bổ sung F01–F05/Q01–Q03 đã duyệt trong [PRD](../product/PRD.md) và [đặc tả](../product/SYSTEM-SPECIFICATION.md). Đây là kịch bản nghiệm thu, **chưa phải kết quả đã chạy**. Theo dõi implementation tại [báo cáo F/Q](../reviews/2026-10-06-fq-implementation.md).

## Điều kiện và cách ghi kết quả

- Dùng schema MySQL native test riêng; runner phải từ chối `tms`. Không tạo/xóa fixture trong database đang sử dụng.
- ADMIN, PM, Tester A/B, Dev A/B là các tài khoản khác nhau; mỗi actor có session riêng. Có hai dự án để kiểm tra scope.
- ADMIN gán một PM, hai Tester, hai Dev vào dự án; bàn giao ít nhất hai máy vật lý tương thích với cấu hình kiểm thử. Ghi mã tài sản để đối chiếu, không chỉ tên loại thiết bị.
- PM import workbook có nhiều dòng, ô nguồn trống kế thừa tiêu đề, cột phụ và nội dung nhiều dòng; giữ bản gốc và SHA-256 trước thử nghiệm. Tạo revision được duyệt/chưa duyệt và hai build/cấu hình để kiểm tra pin.
- Các lệnh thay đổi role, máy hoặc tài nguyên dùng API hợp lệ hiện có. Chưa có endpoint archive/unarchive dự án; không giả một nút archive trong UAT. Có thể kiểm tra project đã archived bằng fixture được quản lý trên schema test riêng.
- Mỗi dòng dưới đây mặc định **NOT_RUN**. Người thực hiện ghi actor, build/schema version, ngày giờ, thao tác, expected/actual, PASS/FAIL, ảnh hoặc requestId đã bỏ cookie/credential, và ticket khi FAIL. Test unit/compile không thay thế kết quả này.

## Giao file và thực thi

| ID | Actor và thao tác | Kết quả cần quan sát |
| --- | --- | --- |
| FQ-F01 | ADMIN tạo dự án và chọn PM, Tester, Dev, máy ban đầu | PM nhận đúng dự án; user giữ role riêng; một máy không bị bàn giao đồng thời cho hai dự án. Không đặt quota về sau. |
| FQ-F02 | PM import workbook, bấm tên file | Mở tài liệu nguồn đúng tên; thứ tự/cột phụ/ô nguồn trống được giữ. Kết quả nhập Excel không tự trở thành kết quả execution. |
| FQ-F03 | PM mở Công việc theo file và preview file/cycle/config/Tester | Hiển thị approved/unapproved/archive/duplicate và limits rõ ràng; không tự bỏ dòng hoặc tự activate cycle. |
| FQ-F04 | PM xác nhận preview hợp lệ rồi retry cùng requestKey | Một nhóm, cùng run IDs/revision pins/assignee, không tạo trùng; history không nhân đôi. |
| FQ-F05 | PM gửi preview/version cũ sau thay đổi scope | Báo conflict; không tạo nhóm một phần hoặc giao sai revision. |
| FQ-F06 | Tester A/B mở Công việc của tôi | Mỗi người thấy file được giao cho mình; đọc danh sách không tự bắt đầu phiên hay ghi kết quả. |
| FQ-F07 | Tester A bắt đầu với build và máy được bàn giao, tương thích cấu hình | Có phiên DOING, executor thật, mã máy/allocation/build pin; tên người và trạng thái làm việc hiển thị cho PM. |
| FQ-F08 | Chọn máy ngoài dự án, đã thu hồi hoặc không tương thích | Server từ chối, không sinh phiên; giữ lựa chọn nhập để người dùng sửa. Không đoán tương thích từ tên hiển thị. |
| FQ-F09 | Hai Tester đồng thời bắt đầu trên cùng máy; đồng thời bắt đầu cùng nhóm | Chỉ một phiên DOING thắng mỗi máy/nhóm; bên còn lại nhận lỗi rõ. Không silently overwrite người thực hiện. |
| FQ-F10 | Tester pause rồi resume | PAUSED không được ghi attempt; resume giữ nguyên máy/allocation/build. Đổi máy/build cần PM cancel và mở phiên mới. |
| FQ-F11 | Bấm OK; ghi P với lý do và NG với actual result | Attempt lưu server, đúng run/revision/build/session/máy/actor; reload vẫn còn. NG cần liên kết BUG của đúng attempt. |
| FQ-F12 | Request lỗi mạng, retry chính xác; requestKey cũ nhưng body khác | Retry không tạo thêm attempt/history; đổi body cùng key bị conflict. Không báo đã lưu khi server chưa chấp nhận. |
| FQ-F13 | Giữ bản nháp NG/P rồi phiên được thay thế/refresh | Draft giữ ngữ cảnh cũ và bị khóa gửi; chỉ chuyển sang phiên hiện hành bằng thao tác xác nhận riêng, chưa tự ghi kết quả. |
| FQ-F14 | PM phân công lại khi DOING/PAUSED; sau cancel thì phân công lại | Không giao lại xuyên phiên mở; sau cancel dùng version/lý do và cập nhật authority trên run. Executor quá khứ không đổi. |
| FQ-F15 | Gỡ membership/đổi role/disable account/thu hồi máy trước gửi hoặc replay | Guard hiện hành từ chối; key cũ không vượt quyền. PM vẫn có lối cancel phiên theo policy, không sửa lịch sử cũ. |
| FQ-F16 | Mở run đã thuộc nhóm từ màn execution cũ hoặc tài liệu nguồn | Thao tác execution bình thường chuyển đúng màn nhóm; không gọi legacy record. Lịch sử chỉ đọc vẫn mở được và không có lệnh ghi. |
| FQ-F17 | Cập nhật revision hoặc chọn build khác | Execution view giữ revision đã pin và kết quả đúng build; không hiển thị kết quả build khác như kết quả hiện hành. |
| FQ-F18 | Xuất Excel thực thi sau lưu attempt; so sánh file gốc | Workbook xuất có nội dung pin và kết quả/actor/time/máy hiện hành; bản gốc/hash không đổi. Các cột nguồn ngoài scope không bị giả thành đã test. |
| FQ-F19 | Complete khi còn NOT_RUN/P, hoặc NG chưa có BUG đúng attempt | Server từ chối complete; khi scope hợp lệ thì COMPLETE. COMPLETE file không tự đóng BUG hoặc khẳng định release đạt. |
| FQ-F20 | PM loại NA theo policy cycle | NA có lý do/quyền/lịch sử; không cho Dev/Tester tự dùng NA để vượt scope. UI/count/export nhất quán. |

## BUG, Dev và retest

| ID | Actor và thao tác | Kết quả cần quan sát |
| --- | --- | --- |
| FQ-B01 | Tester tạo/liên kết BUG từ NG hiện hành, kể cả file PAUSED | Dùng quyền metadata công việc hiện hành; liên kết đúng attempt, không suy quyền từ canRecord/canAssign. Dev không được tạo BUG qua lối này. |
| FQ-B02 | PM giao BUG cho Dev A; Dev B thử sửa ticket đó | Dev A được xác minh/xử lý ticket được giao; Dev B bị từ chối. Dev không ghi test result hoặc tự đóng lỗi. |
| FQ-B03 | Dev báo xử lý xong và build sửa; PM mở hàng chờ | Hàng chờ dùng BUG, vòng/build/coverage hiện hành; resolved không tự được tính là đã Tester xác minh. |
| FQ-B04 | PM xác nhận coverage, tạo request và giao Tester | Request đúng coverage/build; chưa có assignment không được giả hiện là ASSIGNED. |
| FQ-B05 | Tester xác minh FULL_CASE PASS/FAIL và BUG_ONLY | FULL_CASE ghi attempt chính thức đúng pin/provenance; BUG_ONLY chỉ xác minh BUG, không thay verdict toàn case. |
| FQ-B06 | Tester FAIL rồi Dev sửa lại/build mới | Vòng cũ không đủ đóng lỗi; FAIL cũ không làm sai hàng chờ khi có coverage mới hợp lệ. |
| FQ-B07 | PM đóng khi coverage còn pending/FAIL; sau đủ PASS thì đóng | Guard cũ từ chối chưa đủ; chỉ PM đóng theo current coverage. Không tính duplicate request/history thành nhiều coverage item. |
| FQ-B08 | Filter/page hàng chờ bàn giao | State filter áp trước pagination/totals; link tới đúng ticket; QA không lọt vào số liệu BUG. |

## QA riêng

| ID | Actor và thao tác | Kết quả cần quan sát |
| --- | --- | --- |
| FQ-Q01 | Tester hoặc PM tạo QA từ file/case/run, không có NG | QA có identity/key riêng, question và source context nhất quán; không bắt actual result/fixed build. IDs ngoài project hoặc mâu thuẫn bị từ chối. |
| FQ-Q02 | PM giao QA cho Dev A; Dev start/request-info | Status canonical theo command typed; Dev B và global Dev mang membership cũ PM/Tester không được vượt quyền. |
| FQ-Q03 | Creator bổ sung thông tin | Question gốc không bị ghi đè; body vào history/comment. Comment không tự thành answer. |
| FQ-Q04 | Dev A trả lời rồi creator Tester xác nhận đúng answer/version | Answer/confirmation bất biến, actor/time/generation đúng; không sinh OK attempt hoặc retest BUG. |
| FQ-Q05 | Dev thay answer hoặc PM đổi Dev; creator xác nhận answer cũ | Current pointers cập nhật; answer cũ còn đọc trong lịch sử nhưng không đủ confirm/close. Giao lại cùng Dev là versioned no-op, không xóa answer. |
| FQ-Q06 | PM close thường và close exception | Close thường cần confirmation hiện hành; exception phải được chọn rõ và có lý do, không tạo confirmation Tester giả. |
| FQ-Q07 | PM reopen QA đã closed | Generation mới, clear current answer/confirmation, giữ lịch sử; lệnh/answer vòng cũ không đủ hoàn tất vòng mới. |
| FQ-Q08 | Gửi QA qua generic create/edit/transition/batch/Redmine/retest/link endpoints | Typed guard từ chối; batch có QA không thay đổi một phần các item khác. Không được đổi QA thành BUG hoặc bỏ subtype. |
| FQ-Q09 | Comment/evidence với old Dev, creator đã gỡ, closed QA hoặc key cũ | Current writer guard trước replay/file mutation; đọc/download vẫn same-project. Tham chiếu evidence có policy rõ theo contract thực tế, không giả attachment syntax. |
| FQ-Q10 | Mở list/board/dashboard với BUG và QA resolved | QA dùng label/capability riêng, không kéo thả qua generic transition; BUG/retest counters không cộng QA đã trả lời. |

## Giao diện và kết luận

Kiểm tra desktop và viewport 390/320 px: cuộn chuột ở bảng dài/modal, cuộn ngang có bounded region, sticky header, nội dung nhiều dòng; bàn phím Tab/Enter/Escape, focus về lỗi/field và dialog; loading/empty/403/404/409/retry giữ draft; đổi project khi request còn chạy không hiển thị dữ liệu dự án cũ. File download có tên an toàn, đúng XLSX và không báo thành công cho response lỗi.

Biên bản cuối cần tách source/unit/build, native migration/FK/concurrency, browser và người dùng nghiệm thu. Chỉ ghi PASS cho bước thực sự đã chạy. Không coi approve thiết kế hoặc danh sách test source là chữ ký nghiệm thu/pilot.
