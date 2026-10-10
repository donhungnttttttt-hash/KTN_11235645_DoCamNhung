# Contract Redmine — S09

Trạng thái 30/09/2026: contract trước implementation T02/T03. Provider sandbox đã kiểm chứng; endpoint TMS dưới đây chưa được coi là có cho tới khi tests/STATUS ghi bằng chứng. Quyết định [ADR-009](../decisions/ADR-009-redmine-sandbox.md), [mapping](../integrations/redmine-mapping.md), [sandbox](../operations/redmine-sandbox.md).

## Actor, cấu hình và dữ liệu

Prefix `P=/api/v1/projects/{projectId}`. Session và active membership bắt buộc. Thành viên đọc, chỉ PM dự án yêu cầu publish/retry/reconcile; ghi cần CSRF. ADMIN toàn cục không thay PM. Dự án archive chỉ đọc. TMS giữ authority; remote đóng không tự đóng bug/pass case.

Endpoint/API key được cấu hình tại máy chủ, không nhận URL/key trong request. Mapping theo project từ file vận hành được chỉ định, có checksum; worker kiểm tra mapping/instance lúc dispatch. File mẫu không có API key. Credentials truyền header, HTTP chỉ cho loopback sandbox; đích khác yêu cầu HTTPS; không theo redirect. Connection timeout 3 giây, request timeout 10 giây, response cap 1 MiB.

## Endpoint đã triển khai

| Method | Path | Nội dung |
| --- | --- | --- |
| GET | `P/integrations/redmine` | Cấu hình công bố đã lọc bí mật, configured/canManage, mapping ID; không làm health diagnostic |
| GET | `P/work-items/{id}/redmine` | Binding, snapshot lần gửi/quan sát, delivery hiện hành, lịch sử attempt và quyền; version/sourceVersion giúp phân biệt bản cũ |
| POST | `P/work-items/{id}/redmine-deliveries` | `{expectedVersion, requestKey, reason, observedFingerprint?}`; 202 sau khi snapshot/outbox commit, chưa phải gửi thành công |
| POST | `P/redmine-deliveries/{id}/retry` | `{expectedVersion, reason}`; thử lại job được phép, ghi audit; không dùng để tạo lại khi outcome chưa rõ |
| POST | `P/work-items/{id}/redmine-reconciliations` | `{expectedVersion, requestKey, reason}`; 202, worker chỉ đọc và đối chiếu, không tự ghi remote |

Schema tại [redmine.openapi.json](redmine.openapi.json), nối vào [OpenAPI chính](openapi.yaml). 401/403/404 theo session/quyền/project; 409 khi version cũ, job chưa xử lý xong, mapping đổi, đã có link nhập tay hoặc chưa có cấu hình; 422 khi payload không hợp lệ/không phải BUG. Error chỉ có code/message đã chuẩn hóa, không raw response body hoặc credentials. `state` trả tối đa 20 delivery và 50 sự kiện gần nhất; `deliveredPayload`/`observedPayload` là object đã parse, không phải chuỗi JSON. Retry giữ snapshot/actor/lý do công bố gốc và bổ sung sự kiện RETRY_REQUESTED với actor/lý do mới.

## Bất biến delivery

- Một binding cho mỗi bug; UUID correlation ổn định, uniqueness remote issue theo instance. Binding lưu snapshot cấu hình định tuyến không có secret; không âm thầm chuyển một binding sang server/project khác.
- Payload công bố là snapshot phiên bản bug tại lúc PM yêu cầu, gồm subject/description chuẩn hóa/status/priority/custom marker. Không có evidence/comment/identity secret. Request key trùng với body khác bị 409; key/body giống trả job cũ.
- Outbox có lease, version, số lần thử, thời điểm thử tiếp và operation. Claim/finalize là transaction ngắn; gọi HTTP ở ngoài transaction. Worker kiểm tra actor còn active PM và project chưa archive trước dispatch.
- Job RUNNING hết lease chuyển sang đối chiếu; không tự phát lại CREATE. Timeout, 5xx hoặc response thành công hỏng/thiếu id đều có thể đã tạo phía ngoài, phải UNCERTAIN trước khi tìm marker.
- Tìm marker phải lọc project và mọi status (kể cả closed). Một kết quả thì đọc lại, đối chiếu project/tracker/marker/nội dung rồi mới xác nhận; nhiều kết quả là CONFLICT. Không tìm thấy sau một lần đọc không đủ cho phép CREATE lần hai.
- 401/403/422 là lỗi cấu hình/quyền/validation có thông báo sạch; 429 đọc Retry-After có giới hạn và backoff. Retry tự động tối đa 5 lần mỗi chu kỳ, khoảng chờ tăng dần; thao tác PM mới được mở chu kỳ thử lại có audit.
- UPDATE cần đối chiếu remote với bản đã công bố/quan sát trước. Khi khác, hiện CONFLICT. PM chỉ yêu cầu công bố lại sau khi xem snapshot khác biệt và gửi đúng fingerprint đã xem, kèm lý do. Worker đọc lại trước gửi; remote thay đổi tiếp thì từ chối. Đọc lại sau PUT để xác nhận payload thực tế.
- Redmine chuẩn không trả lock_version trong REST issue JSON 7.0.1: preflight/postflight không phải CAS atomic, còn khoảng race giữa GET/PUT. Nêu rõ giới hạn; không tuyên bố chống mọi cập nhật đồng thời ở provider. Không dùng dữ liệu remote để tự sửa trạng thái TMS.

Trạng thái UI tiếng Việt cho QUEUED/RUNNING/RETRY_WAIT/UNCERTAIN/DELIVERED/FAILED/CONFLICT. “Đã gửi” gắn phiên bản và thời điểm; khi local đổi phải báo bản hiện hành chưa công bố. Người dùng có thể mở ticket ngoài nhưng không tải chứng cứ nội bộ qua URL public.

## Kiểm chứng bắt buộc

MySQL: fresh/upgrade V10, uniqueness/FK, rollback, duplicate request, worker đồng thời và lease recovery. Adapter: provider contract, 401/403/422/429/5xx, timeout sau tạo, response quá lớn/sai JSON/redirect, exact marker và project, no token logs. UI: PM/Tester, trạng thái chưa cấu hình, publish polling/refresh, retry/uncertain/conflict, đổi project/response cũ, liên kết ngoài và bảo toàn TMS state. Sandbox: tạo/cập nhật/chỉ một marker, đối chiếu remote sửa, không đổi execution.
