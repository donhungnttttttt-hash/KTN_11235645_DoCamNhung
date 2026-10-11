# Deep source review — work items, QA, reporting, AI, integrations

Ngày kiểm tra: 11/10/2026. Phạm vi phân công `work-ai` trong `deep-review-inventory.json`.

Đã đọc đầy đủ **86/86 file production, 11.287 dòng** (đếm dòng trống cuối file), và 25 file test liên quan. Danh sách file, hash SHA-256, khoảng dòng đã đọc và danh sách test chưa đọc đầy đủ nằm trong `deep-review-work-ai.json`. Không dùng số test PASS để kết luận mọi tổ hợp trạng thái đã được kiểm thử.

Nguồn kiểm kê có 323 khai báo control/form/input trong phạm vi này. Kiểm kê hành động riêng ghi 188 khai báo button/form/disclosure/click, trong đó 137 ở file reachable và 51 ở file không được route dùng. Đây là số khai báo source, không phải số nút đang hiển thị hoặc bằng chứng bấm mọi nút. `Button`/`IconButton` mặc định `type="button"`; submit của form được khai báo riêng.

## Lỗi mới xác nhận và sửa

| Mã | Tình huống thực tế và nguyên nhân | Sửa và kiểm chứng |
|---|---|---|
| WA-1 | Upload chứng cứ thứ 100 đã được nhận, nhưng client mất phản hồi; gửi lại chính file đó bị chặn bởi `ATTACHMENT_LIMIT` trước bước tìm bản trùng. | `EvidenceService`: giữ kiểm tra quyền và nội dung trước; tìm bản đã nhận theo actor/hash/name trước giới hạn số lượng. Bản mới ở giới hạn vẫn bị từ chối. RED 39 test: 1 lỗi đúng tình huống; GREEN `QaEvidenceTest,EvidenceContentTest`: 39/39. Không tạo file/audit trùng. |
| WA-2 | `runProbe` thêm `GENERATING` vào object lưu trong RAM và xóa verification trước khi lưu vault. Nếu ghi vault thất bại thì chưa có provider call, nhưng retry cùng key trả `GENERATING` mãi. | `ChatGptConnectionService`: sửa trên deep copy và chỉ thay trạng thái RAM qua `persist(next)` sau ghi thành công. RED xác nhận cả mất verification, replay sai và provider chưa chạy; GREEN `ChatGptConnectionServiceTest`: 28/28. Retry dùng cùng key chạy đúng 1 lần, replay sau thành công không gọi lại. Provider/vault dùng mock. |
| WA-3 | Queue chấp nhận quyền Admin toàn quyền, nhưng worker chỉ nhận active membership có project role PM. Admin với inactive attribution MEMBER bị từ chối; ngược lại global DEV còn membership PM có thể được worker gửi. | `RedmineWorker.allowed`: kiểm tra enabled + project chưa archived; cho ADMIN, hoặc non-DEV có active project PM. Dùng lại gate này khi claim và ngay trước write. RED native 7 test: 2 failure đúng hai chiều sai quyền. GREEN `NativeRedminePermissionTest`: 7/7. Queue, worker và đọc trạng thái chạy SQL thật trong schema kiểm thử V29; RedmineClient mock, không gửi bên ngoài. |

WA-3 còn kiểm tra active PM, inactive PM, đổi sang MEMBER, disabled Admin và archived project. Hai trường hợp cho phép đi tới `DELIVERED`; năm trường hợp bị thu hồi dừng với `PUBLISH_PERMISSION_REVOKED` và không gọi remote.

Fixture cũ của `RedmineIntegrationTest` được sửa cho đúng ý nghĩa quyền: tài khoản ngoài dự án là PM thông thường; test thu hồi PM chuyển actor sang PM trước queue. Không giữ kỳ vọng 404/thu hồi membership dành cho global ADMIN. Suite Testcontainers này được đọc nhưng không chạy trong lượt native; bài native mới kiểm chứng gate thật tương ứng.

## Ma trận module và đường thao tác đã đọc

| Module | Đường thao tác / liên kết đọc từ source | Đối chiếu biên và kết luận |
|---|---|---|
| Work item create/edit/detail | Chọn loại/context NG/revision; submit create/edit; tải detail, comment/history; comment; chuyển trạng thái/batch; tham chiếu ngoài; refresh; mở rộng ticket. FE gọi workItems API → Controller/Service → membership, expectedVersion, request key → work_items, bug_details, history/comments/references → detail readback. | Đọc `WorkItemForm`, `WorkItemDetail`, `TransitionDialog`, `ProjectData` và toàn bộ 5 file BE. Đối chiếu draft/key khi thất bại, 409 cần tải bản hiện hành, pending/close, QA tách luồng, DEV allowedTransitions. Không thấy lỗi mới xác nhận ở các đường này. Test đã đọc gồm workItems, WorkItemDetail, ordinary-lifecycle, lifecycle và developer permission. |
| Kanban và tổng quan | Click ticket, menu di chuyển, kéo thẻ, gập/mở cột; status/milestone navigation, mở rộng nội dung hoạt động, xem thêm. | `BoardPage` kiểm tra canTriage, loại QA và terminal trước chuyển; màn thật dùng callback root-owned. `HomePage` dùng milestone ID, status counts từ caller. Root kiểm tra WorkBoardPage/ProjectOverview/routing. Không kết luận props mẫu/local fallback là DB live. |
| Attachment | Chọn file, tải lên, xóa, tải xuống, retry tải danh sách. API → kiểm tra work/QA writer → validated bytes/hash/storage → attachment metadata/audit. | Xác nhận và sửa WA-1. Đọc nội dung, cleanup và file ownership/security guard. Nút retry danh sách sau unknown upload là bước đọc lại hợp lệ, không tự coi là nút no-op. |
| QA | Tạo câu hỏi, pin context, sửa nội dung, đổi người phụ trách, trả lời, đồng ý/mở lại/hủy, refresh/conflict. Controller → QaService typed authority/version → work_items + qa data/history. | Đọc cả form/panel và service/dto/controller. Các thao tác dùng current rights và version; lỗi field/top summary, pending và giữ draft. Không gán status generic cho QA. Không xác nhận lỗi mới. |
| Handoff | Lọc, tải lại, page; xem tổng hợp/đi đến bug/retest/filework. GET → quyền dự án → tính trạng thái theo dữ liệu nguồn. | Đọc panel, controller, service và HandoffServiceTest; trạng thái tổng hợp dựa facts, không phải bảng trạng thái độc lập. Retest/filework do agent testing kiểm tra. |
| Reports | Chọn cycle/build, tải báo cáo, export workbook. API → project membership → snapshot scope → metrics/workbook + export audit. | Đọc page/CSS và toàn bộ 4 file BE. Dữ liệu và workbook cùng bộ lọc; cell kiểu chuỗi cho dữ liệu người dùng. Transport download/buffered response do root sửa/kiểm chứng. Không xác nhận lỗi mới riêng ở báo cáo. |
| Authentication UI | Đăng nhập, đổi mật khẩu, hiện/ẩn mật khẩu, đăng xuất, refresh phiên. | Đọc AuthProvider/Boundary/AccountMenu/CSS và auth test; pending/generation/context và lỗi API được đối chiếu. BE identity do agent admin sở hữu. Không thay rule tài khoản. |
| AI drafts/chat | Chọn provider/model/context; tìm nguồn; generate/retry; lịch sử; edit/save/discard draft; copy; chat gửi/retry/history/delete; mở/đóng/cài đặt launcher. API → current project/owner quyền + snapshot/context budget → draft/chat store và provider gateway → readback. | Đọc toàn bộ FE AI và 27 file BE AI, gồm controller/store/cleanup/provider HTTP. Request key, stale selection, owner isolation, timeout/error mapping được đọc. Không gọi paid/live AI; không suy ra provider thực tương thích từ mocks. |
| AI connection | Connect/callback, cancel/revoke, models, verify/probe; vault persistence và verification/version. | Xác nhận/sửa WA-2. OAuth/security loopback và token revalidation được đọc; chỉ unit mocks và localhost test harness, không OAuth thật. |
| Redmine | Expand/load/refresh; publish/reconcile/retry; review conflict fingerprint; external link/history. API → manager gate → outbox/binding → worker claim/remote/finalize. | Đọc Panel/tests, cả 8 file BE, test integration. FE pending/failed refresh/current authority giữ theo bản sửa root. Xác nhận/sửa WA-3. Lease fence, unknown-create không tự tạo lại, current-authority gate được đối chiếu source; không gửi ticket thật. |

## Source cũ không đang dùng

`features/work-items/IssueForm.jsx` và `features/work-items/IssuesPage.jsx` được đọc đầy đủ nhưng không reachable từ app entry hiện tại (đối chiếu `deep-review-reachability.json`). Các form này dùng local callbacks và dữ liệu mẫu; RichEditor/StatusSelect/MultiSelect chỉ được import bởi những màn đó. Không ghi chúng như bằng chứng nút live đã lưu database. Không xóa hoặc đưa lại các màn mẫu vào route trong lượt sửa này.

`data.js` được đọc đầy đủ: dữ liệu mẫu và nhãn; màn thực nhận dữ liệu qua API/root caller. Phần CSS được đọc đầy đủ, không tự thay thiết kế khi chưa có lỗi tái hiện.

## Bằng chứng mới

- `deep-evidence-red.log` → `deep-evidence-green.log`: 39/39, tests dùng mock + thư mục tạm.
- `deep-probe-red.log` → `deep-probe-green.log`: 28/28, provider/vault mock.
- `execution-document-deep-redmine-red-behavior.log` → `execution-document-deep-redmine-green.log`: 7/7, MySQL schema test V29 và fixture rollback.
- `execution-document-deep-redmine-red.log`: lần đầu fixture mapping thiếu status hợp lệ, được giữ riêng; **không** dùng như RED hành vi.
- Root đang chạy combined verification/coverage/JDT sau khi nhả Maven. Tỷ lệ coverage cuối lấy từ bằng chứng root; không suy ra từ 74 test PASS trên ba nhóm ở đây.

## Ponytail review — chỉ ghi nhận độ phức tạp, không áp dụng

- `WorkItemDetail` kết hợp nhiều request/detail panel và trạng thái local; có thể tách từng action controller sau khi giữ các test conflict/context. Không thay đổi trong lượt này.
- `ChatGptConnectionService` kết hợp OAuth, token refresh, model cache, probes, vault và callback listener; ranh giới trạng thái RAM/persistence cần giữ rõ. WA-2 được sửa nhỏ, không viết lại toàn service.
- `work-items.css` 1.870 dòng giữ cả CSS prototype không dùng và CSS chung đang dùng; xóa theo selector riêng cần đối chiếu build/routes. Không làm cleanup diện rộng trong sửa lỗi.

## Skill và giới hạn

Áp dụng code-review-and-quality, frontend-patterns, backend-patterns, TDD, security-review, verification-loop; ponytail-review chỉ cho mục complexity. Các skill và AGENTS/planning đã được đọc trước khi dùng. Bắt đầu từ test thất bại cho ba lỗi hành vi, rồi sửa nhỏ và chạy lại. Không đổi nghiệp vụ, migration, main database, commit/push hoặc gửi dữ liệu ra dịch vụ ngoài.

Phần review source được phân công đã hoàn tất; không còn lỗi **đã xác nhận** chưa xử lý trong 86 file production này. Điều đó không phải cam kết mọi trạng thái runtime, thiết bị trình duyệt hoặc dịch vụ bên ngoài đều đã được kiểm chứng. Root tổng hợp phần admin/identity/devices, test execution/retest/filework và shared/routing/API riêng.
