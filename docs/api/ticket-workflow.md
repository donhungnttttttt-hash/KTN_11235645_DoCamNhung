# Ticket Bug/QA — contract triển khai 03/11/2026

Contract mục tiêu của [kế hoạch được triển khai](../superpowers/plans/2026-11-03-ticket-workflow.md). Trạng thái nghiệm thu và sai khác thực tế ghi ở [báo cáo](../reviews/2026-11-03-ticket-workflow-implementation.md); không coi tài liệu contract là bằng chứng chạy thành công.

OpenAPI mở rộng: [ticket-workflow.yaml](ticket-workflow.yaml). Khi chuyển QA thành Bug, giữ ID/nội dung/trao đổi cũ; bằng chứng chưa có vẫn để thiếu. Ngoại lệ này chỉ áp dụng chuyển QA ở server, không cho phép tạo Bug mới thiếu dữ liệu bắt buộc.

## Dữ liệu và phân quyền

Giữ `work_items.id/item_key` và quan hệ Feature/file/case. `version` là số khóa lạc quan; `testVersionId/testVersionName` là bản phần mềm được test. `ticketState` và `closureReason` xác định ý nghĩa nghiệp vụ, không suy kết thúc từ chữ “Đóng”.

| state | reason | boardColumn | Kết thúc |
| --- | --- | --- | --- |
| SPEC_CONFIRM | null | spec | Không |
| NEW | null | new | Không |
| IN_PROGRESS | null | progress | Không |
| WAITING_CONFIRM | null | verify | Không |
| CLOSED | PROCESSED | processed | Không; chờ tester |
| CLOSED | FIXED | fixed | Có |
| CLOSED | CANNOT_REPRODUCE | cannot_reproduce | Có |
| CLOSED | WONT_FIX | wont_fix | Có |
| CLOSED | UNSUPPORTED | unsupported | Có; chỉ QA |

QA chỉ dùng SPEC_CONFIRM và CLOSED/UNSUPPORTED, hoặc chuyển chính ticket sang BUG/NEW. Bug không dùng SPEC_CONFIRM/UNSUPPORTED. Các trạng thái cũ chưa xác định được giữ ở nhóm đối soát `legacy`, không tự coi là FIXED.

Thành viên active USER/PM được đọc và bình luận trong dự án; ADMIN có quyền quản trị. GUEST và người ngoài dự án không truy cập nội dung ticket. SPEC_REVIEWER/BUG_COORDINATOR là trách nhiệm dự án, không đổi role tài khoản. Người bình luận không tự được sửa trạng thái/phân công. Server trả capability và allowedTransitions dựa trên dữ liệu/quyền hiện hành, kiểm lại khi ghi.

## Luồng ghi

- Tạo từ case: context lấy bản thực thi đã lưu trên đúng row; server ghi snapshot, không tin version tự nhập phía client. Kiểm sourceRevisionId/sourceResultVersion để phát hiện thay đổi trong lúc soạn.
- Tiêu đề từ case dùng `[Đối tượng test][Tên file][No/ID case]` và phần mô tả được nhập thêm; loại Bug/QA là trường riêng. Trường nguồn thiếu được ghi rõ, không dùng tên Feature để giả làm đối tượng test. Thuật ngữ No/ID còn chờ xác nhận, hiện dùng mã tham chiếu case đã có.
- Nếu tiền tố quá dài, giao diện rút gọn phần hiển thị xuống tối đa 200 đơn vị UTF-16 bằng dấu `…`, giữ đầu/đuôi mỗi phần và báo rõ việc rút gọn. Tiêu đề đầy đủ vẫn tối đa 300; còn ít nhất 99 đơn vị cho mô tả. Dữ liệu nguồn, mã liên kết và bản lưu bằng chứng giữ đầy đủ, không bị rút gọn theo tiêu đề.
- Trạng thái lúc tạo: QA mặc định Xác nhận spec; Bug mặc định Chưa xử lý và được chọn trạng thái khác trong `initialTransitions` do server trả cho người tạo/người nhận hiện tại. Chọn Đóng cần lý do; trạng thái khác mặc định cần mô tả giải thích. API tạo kiểm lại cùng policy khi lưu.
- Tạo Bug monkey: không có case thì không sinh case link giả; nội dung/version nhập thủ công. Không bắt metadata mới để làm mất lịch sử cũ.
- Giao việc: người nhận phải còn active/enabled, thuộc đúng dự án và đúng trách nhiệm ở bước hiện tại. Trước khi chọn người xử lý, Bug đi qua đầu mối PM Dev; QA qua BA/BrSE.
- Đóng/PROCESSED hoặc WAITING_CONFIRM: người xác nhận nhận thông báo; vẫn giữ dấu vết người xử lý. Mặc định người xác nhận là người tạo, quản lý có thể chọn thay.
- Đóng/FIXED, CANNOT_REPRODUCE hoặc mở lại: người xác nhận/quản lý thực hiện. Mở lại xóa lý do đóng ở bản hiện hành, giữ lịch sử và chuyển về NEW.
- Comment + trạng thái + người nhận: cùng transaction, `expectedVersion` và UUID `requestKey`; gửi lại cùng key/payload chỉ tạo một sự kiện/thông báo. Key dùng cho nội dung/người khác trả 409.
- Tạo hoặc đóng ticket không tự đổi kết quả OK/NG/NA/P/UNEXECUTED của case.

## API

Cookie session và CSRF cùng origin như API hiện tại. Guest không được thêm vào allowlist internal endpoints. Các lỗi giữ cấu trúc BusinessException hiện hành: 401 phiên, 403 quyền, 404 tài nguyên ngoài phạm vi, 409 xung đột/lưu trữ, 422 dữ liệu/người nhận/trạng thái không hợp lệ.

| Endpoint | Mục đích |
| --- | --- |
| GET `/api/v1/projects/{p}/issues/context` | Nguồn case hiện tại, preconditions/steps/expected và version thực thi của row |
| GET `/api/v1/projects/{p}/issues/options?type=BUG&assigneeMembershipId=123` | Người nhận đầu mối và các trạng thái ban đầu hợp lệ; assigneeMembershipId không bắt buộc |
| GET/POST `/api/v1/projects/{p}/issues` | Danh sách có filter/column và tạo ticket |
| GET/PUT `/api/v1/projects/{p}/issues/{id}` | Chi tiết và sửa nội dung |
| POST `/api/v1/projects/{p}/issues/{id}/actions` | Comment, chuyển trạng thái, phân công hoặc xác nhận QA là Bug, lưu chung |
| GET `/api/v1/projects/{p}/issues/{id}/comments` | Bình luận, gồm comment đi kèm action |
| GET `/api/v1/projects/{p}/issues/{id}/history` | Lịch sử nội dung, loại, trạng thái, phân công và comment |
| GET `/api/v1/projects/{p}/issues/board` | Tổng số chín cột và legacy theo toàn bộ bộ lọc |
| GET `/api/v1/projects/{p}/ticket-responsibilities` | Danh sách thành viên và trách nhiệm điều phối |
| PUT `/api/v1/projects/{p}/ticket-responsibilities/{membershipId}` | Quản lý cập nhật trách nhiệm, không thay role |
| GET `/api/v1/me/ticket-notifications` | Thông báo của chính người gọi, có phân trang/unreadCount |
| PUT `/api/v1/me/ticket-notifications/{id}/read` | Đánh dấu đã đọc thông báo của chính người gọi |

Action body mục tiêu:

```json
{
  "body": "Đã xử lý trên bản được ghi trong bình luận; nhờ kiểm tra lại.",
  "state": "CLOSED",
  "closureReason": "PROCESSED",
  "expectedVersion": 3,
  "requestKey": "12121212-3434-4545-8989-121212121212"
}
```

Các field có thể gửi thêm: `assigneeMembershipId`, `verifierUserId`, `convertToBug`. Field vắng mặt nghĩa là giữ nguyên. Không dùng null để vô tình xóa phân công. Action chỉ có body thì giữ nguyên workflow/assignment; action không có thay đổi và body rỗng bị từ chối.

Khôi phục đầu mối cho Bug cũ: quản lý chọn rõ một người đủ điều kiện điều phối. Lựa chọn vẫn được gửi nếu trùng người đang nhận nhưng khác `coordinatorMembershipId` (kể cả đầu mối đang thiếu); giao diện giải thích và yêu cầu xác nhận. Bình luận không chọn lại người nhận vẫn bỏ qua trường phân công. Không tự suy đoán đầu mối khi migration.

Create options trả thêm `initialTransitions:[{state,closureReason,columnId,label}]`. Chưa chọn người nhận: chỉ trạng thái mặc định. Người nhận còn hợp lệ: mặc định và các lựa chọn mà người tạo được phép dùng. Người nhận vừa bị thu hồi: trả danh sách đầu mối hiện tại và `initialTransitions:[]`; UI giữ nháp và yêu cầu chọn lại, không âm thầm đổi trạng thái. Đây là kiểm tra hỗ trợ giao diện; POST vẫn kiểm quyền/người nhận ở thời điểm ghi.

Board trả `{columns:[{id,label,count}],legacyCount,totalItems}`; tổng chín cột cộng legacy bằng tổng tập phù hợp. List `column` dùng cùng predicate với counts. Tổng không phụ thuộc page/size; counts không lấy từ `items.length`.

## Thông báo và lịch sử

Thông báo chỉ có sau giao dịch thành công, lưu DB và giữ qua reload. Có thông báo khi đổi người nhận hoặc bàn giao xác nhận; không sinh mỗi lần tải trang hoặc comment thường. Không tự thông báo cho chính người giao. Quyền đọc kiểm tra lại sau khi người nhận bị khóa/rời dự án. Không gửi email/Slack hoặc dữ liệu ra ngoài.

Migration mới bảo toàn ticket IDs, source links và lịch sử cũ. Cập nhật current Feature context không viết lại version/bằng chứng lỗi cũ. Báo cáo và điều kiện lưu trữ dự án coi PROCESSED là chưa nghiệm thu; ngoại lệ Admin có lý do vẫn là quy tắc riêng.
