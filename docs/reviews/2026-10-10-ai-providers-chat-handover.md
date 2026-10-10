# Bàn giao nguồn AI và hội thoại riêng — 10/10/2026

Code nguồn/API/chat/UI đã triển khai trên `system-design`. Helper thiết lập local đã được review độc lập và chạy cho owner `admin.local`; backend8080 đã lên V25. Review tổng thể FR1–FR3 và minor FM1 đã sửa ở `f51a753`; review lại độc lập xác nhận không còn Critical/Important trong phạm vi này. Người dùng chốt giữ tính năng sau khi hủy yêu cầu hoàn tác; **chỉ push khi có yêu cầu rõ ràng mới**. Chưa gọi là liveAI PASS.

## Phạm vi và các sửa lỗi đã kiểm chứng

Provider gateway giữ API mặc định; ChatGPT dùng chủ sở hữu local duy nhất, vault AES-GCM ngoài repo, official OAuth/PKCE và kiểm chứng đúng model/version. Ollama chỉ nhận địa chỉ loopback đã cấu hình, không nhận URL browser. Credentials không vào MySQL/browser/API/log. Không tự retry billable hoặc chuyển provider. Private chat pin owner/provider/model/scope và TTL bảy ngày; recheck session/project/ticket/source trên đọc/reserve/final save, inference ngoài transaction, READY chỉ sau output hợp lệ và connection fence.

Các review trước đã sửa stale reconnect completion, partial SSE rồi failed, refresh/settlement contention, scope/history sau cycle closure và frontend delayed read/owner/project races. Settlement chỉ retry local persistence; output đang chờ commit vẫn trong memory, abrupt process termination có thể cần reconnect. Giới hạn này đã ghi ở [provider contract](../api/ai-providers.md).

Task4 helper [Configure-LocalAi.ps1](../../scripts/Configure-LocalAi.ps1) resolve owner chỉ đọc native DB; không đổi credential đã có, không paid probe/download/start server. Dùng `TMS_BIND_ADDRESS`, không persist generic Spring bind. [Start-Backend.ps1](../../scripts/Start-Backend.ps1) nạp whitelist AI theo **Process > User > selected local file**, giữ API key/enablement/model từ file hiện có và không chép API key vào User. Hướng dẫn vận hành ở [local-ai.md](../operations/local-ai.md).

## Automated evidence được kế thừa, không chạy lại suite đã PASS

| Phần | Bằng chứng đã chạy | Coverage thực đo và giới hạn |
| --- | --- | --- |
| Provider fix round2 `a4332b5` | Targeted Maven verify96 tests,0failure/error/skip; compile/package PASS. Root native provider18/18 trên schema riêng...0009, freshV24 và V22→V23→V24 upgrade. | AI package852/1215 lines70.1%,612/1206 branches50.7%; dưới80%, không phải whole-system. [review](2026-10-10-ai-providers-task-1-fixes-round-2.md) |
| Chat initial `2515d62` | Native chat17/17 trên...0008; native draft18/18 trên...0010; AI unit/provider109 rồi focused27 gồm14 case mới,123 unique cases. FreshV25/upgradeV24→V25 và legacy provenance PASS. | Bốn `AiChat*.java`: lines171/186=91.94%, branches118/142=83.10%, instructions94.32%, methods98.04%. [contract/evidence](../api/ai-chat.md) |
| Closed-cycle fix `0475b6f` | Behavioral native RED saved history404, GREEN18/18 trên owned...0008; completion-after-close denied, list/detail/same-key đọc được theo quyền. | Changed Store native-only: lines88/95=92.63%, branches44/56=78.57%; không thay coverage kết hợp bốn file ban đầu. |
| Frontend `d391b1c` | Initial scope39tests; full64files/713tests and production build PASS. | Historical whole tree statements85.10%, branches82.36%, functions79.45%, lines84.42%; functions dưới80%. |
| Frontend delayed read fix `7c4ec0` | Seven behavioral RED race cases; final scope5files/46tests and build PASS. Earlier full713 suite không chạy lại trong fix. | Current scoped statements83.45%, branches82.68%, functions82.60%, lines90.93%; changed AiChat90.43/85.20/87.80/92.79. Không tuyên bố coverage hiện tại toàn frontend. |

Backend test schemas là native loopback3307 có tên `tms_docstest_202610100008`, ...0009, ...0010, tách biệt schema đang sử dụng. Những schema test đã chứa dữ liệu test; không tự reset/reuse. MySQL9.7 vượt phiên bản8.1 Flyway hiện công bố đã test; các migration thực tế trên máy PASS không thay tuyên bố compatibility chính thức. Mockito future-JDK warning và Vite >500kB chunk advisory còn được ghi nhận; lint/typecheck frontend riêng NOT_CONFIGURED.

## Controller HTTP/browser fixture acceptance

Controller chạy fixture đã migrateV25 trên `tms_docstest_202610100011`: backend8081, Vite5174 proxy cùng origin và fake Ollama11435. Browser fixture dùng `localhost` để tách host cookie khỏi runtime chính `127.0.0.1`. Kết quả là output tổng hợp, không phải Ollama native hoặc live AI.

- HTTP với bốn role đăng nhập thật của fixture: provider metadata, private persisted chat, replay/intent conflict, CSRF, provider failure và legacy analysis chọn OLLAMA PASS.
- Browser: selector nguồn phía trên Tác vụ; chat chung và chat dự án lưu/reload history; sources/nhãn tác vụ, copy, minimize/Escape focus, unsent text/navigation PASS. Post-fix delayed send/minimize/reopen giữ READY mới PASS.
- Actual measured CSS374×812,374×500 short viewport,1024×768 và1366×800 phù hợp, composer16px trên mobile; screenshots được controller xem. Giới hạn1366/CDPtimeout ban đầu trong report frontend đã được thay bằng kiểm tra thành công này và viewport đã reset.
- Controller xác nhận kết thúc: **10 synthetic provider calls**, **7 READY + 2 FAILED chat turns**, maximum serialized provider request **2961 bytes**. Đây là mẫu acceptance có phạm vi, không chứng minh mọi request/performance hoặc model quality.
- Controller đã stop các owned fixture listeners8081/5174/11435 và đóng fixture tab. Không khởi tạo/reset fixture lần nữa. Runtime chính8080/5173 còn nguyên tại thời điểm kiểm tra này.

## Task4 helper RED→GREEN và self review

Test feature đầu tiên thất bại vì helper/module chưa tồn tại; đây là missing-module RED, không phải behavior assertion. Regression chạy actual configuration prefix của Start-Backend tại base `7c4ec082f0b7b29fc370f7e73836843096d8b059` trong directory tổng hợp tái hiện **native file API credentials bị bỏ qua**: 1behavior test FAIL. Cùng test với source mới PASS; không launch Maven/backend/DB/provider hoặc ghi registry. Regression native-file app binding cũng FAIL trước sửa vì helper che `0.0.0.0` bằng User setting; sau sửa từ chối trước mutation.

```text
rtk proxy node scripts/local-ai/start-loader.test.cjs --legacy 7c4ec082f0b7b29fc370f7e73836843096d8b059  # expected behavioral FAIL
rtk proxy powershell -NoProfile -File scripts/Configure-LocalAi.test.ps1                       # 27 PASS
rtk proxy node --test scripts/local-ai/start-loader.test.cjs scripts/local-ai/resolve-owner.test.cjs  # 4 PASS
```

27 PowerShell cases mock User/Process/Machine writes/owner lookup; actual path/ACL checks chỉ dùng disposable synthetic temp directory, ciphertext tổng hợp được giữ nguyên. Chúng kiểm tra precedence, no-secret output, native-file/API preservation, immutable owner/host/path/key, PlanOnly, invalid/incomplete existing settings, rollback, conflicting generic/app/JSON bind, case-insensitive repo boundary, absolute local path, owner-only creation và refusal của permissive existing vault. Node4cases kiểm tra actual startup prefix và SELECT-only hex-encoded exact username, missing/disabled/ambiguous/malformed results, invalid input. Coverage helper **NOT_MEASURED**, không suy80% từ31case PASS. Một test ACL setup dùng Set-Acl phát sinh SeSecurityPrivilege trên directory đã có; test đã chuyển sang .NET Directory.SetAccessControl, final26 rồi27case PASS, không né assertion.

Skills: `tdd-workflow` cho RED/GREEN; `security-review` cho env/vault/SQL/bind/secret review; `verification-loop` cho check và báo giới hạn. Đây là self review của worker trong phạm vi helper/tài liệu; không thay whole-change review cuối của controller. Không thay migration, backend provider/business behavior hoặc frontend trong Task4.

Recovery trước commit giữ nguyên implementation và xác nhận lại 27 PowerShell + 4 Node PASS; actual startup prefix tại base vẫn có một behavioral FAIL như dự kiến. `rtk proxy node scripts/Check-Contracts.cjs` PASS (structural contracts/routes/DTO constraints và 52 tài liệu local links; không phải full OpenAPI/HTTP), `rtk git diff --check` PASS. Không chạy lại các suite backend/frontend đã có bằng chứng ở trên. Coverage helper vẫn NOT_MEASURED.

## Vận hành local và gate còn lại

Task4 review độc lập trên `860d5f8` APPROVE: không có Critical/Important; RTK báo thiếu hook là advisory công cụ, không phải lỗi sản phẩm. Controller chạy `Configure-LocalAi.ps1 -OwnerUsername admin.local -PlanOnly` rồi cấu hình thật thành công. Key/vault/host riêng nằm ngoài repository, cấu hình API trong file local được giữ; không persist generic `SERVER_ADDRESS`.

Controller xác minh PID/classpath backend cũ, restart đúng backend8080 bằng script có `WindowStyle Hidden`. Flyway áp dụng V24/V25; health HTTP200 UP, runtime mới PID8400. Đối chiếu hash các cột/bản ghi cũ trước/sau: **66 bảng, 6.055 bản ghi cũ, 0 bảng bị thay đổi dữ liệu cũ** (không tính Flyway và session/login). Frontend5173 giữ nguyên. Log vận hành local `var/ai-local-backend-20261010.log`, không đưa log/secret vào git.

Anonymous metadata trả401 đúng yêu cầu. Đăng nhập owner bằng credential bootstrap cũ và mật khẩu browser lưu sẵn không được chấp nhận; không đoán thêm hoặc reset mật khẩu. Đã mở tab `http://localhost:5173/#/admin/ai` và yêu cầu người dùng đăng nhập `admin.local`. Vì vậy action kết nối trên runtime chính và official OAuth/live probe còn **PENDING_USER_LOGIN**, không gọi PASS từ fixture.

User phải hoàn tất official authorization/consent, chọn catalog model và chủ động probe trước khi dùng ChatGPT; entitlement/plan allowance/live inference/schema/quality còn riêng. Ollama chưa cài binary/server/model; không tự download. API insufficient_quota ngày09/10 là lịch sử, không được tự gọi lại hay suy balance hiện tại. Review độc lập cuối và sửa lỗi được ghi ở báo cáo riêng. Không push khi chưa có yêu cầu rõ ràng mới từ người dùng; không merge/deploy. Các gate UAT/pilot/đích triển khai thật của S11 không được đóng bởi test fixture này.

## Quyết định triển khai và chi phí nếu cần đổi

1. Giữ request đồng bộ giới hạn25s cho nguồn mới, API tối đa30s, dùng lại request key khi chưa rõ kết quả. Tránh worker trùng; tác vụ chậm sẽ báo timeout và có thể cần async worker trong tương lai.
2. Metadata kết nối/probe/hạn mức local nằm trong vault mã hóa ngoài MySQL; nội dung AI vẫn ở MySQL. Mất key/cài lại hoặc process chết trước khi commit token xoay vòng có thể phải kết nối lại.
3. Dự án lưu trữ/đợt file đã đóng vẫn cho chủ sở hữu có quyền hiện tại đọc lịch sử; không cho tạo hoặc hoàn tất inference mới. Nếu khách hàng muốn đóng là thu hồi cả quyền đọc, cần thay chính sách này.
4. Sau khi nhận token refresh xoay vòng, nếu không kiểm chứng được danh tính thì yêu cầu kết nối lại và vô hiệu hóa token cũ. Cách này tránh dùng lại token đã bị tiêu thụ; chi phí là có thể phải đăng nhập lại sau lỗi mạng ở bước kiểm chứng.

## Kết quả cuối sau review

- [Review tổng thể](2026-10-10-ai-providers-final-review.md), [bản sửa và bằng chứng](2026-10-10-ai-providers-final-fixes.md), [review lại có phạm vi](2026-10-10-ai-providers-final-re-review.md): FR1/FR2/FR3/FM1 đã xử lý. FM2 định dạng code UI và FM3 kích thước bundle/coverage còn là việc cải thiện không chặn tính năng; không suy đủ coverage từ test PASS.
- Backend **82 case liên quan PASS qua các lần chạy cuối** (55 case và 27 case chạy lại sau sửa fixture Mockito); native **22 chat/phiên + 18 draft PASS** trên schema riêng...0012. Đã tái hiện thực tế bốn ca chat/draft × xóa/đổi session, account version không đổi, rồi xác nhận FAILED/no content/401 sau sửa.
- Frontend cuối **64 file/721 test PASS**, build PASS; test provenance 11/11. Kiểm thử browser cuối trên runtime chính đăng nhập `syp.demo.admin`: ba nguồn nằm trên Tác vụ, mở khung chat, đọc bản API cũ và đổi lựa chọn sang ChatGPT vẫn giữ nhãn API/model đúng trong kết quả/lịch sử. Không bấm Phân tích/Gửi hoặc gọi model thật. Lựa chọn đã trả về API mặc định.
- Backend đã được khởi động lại với code đã kiểm chứng, PID13944 tại8080, health HTTP200 UP,25 migration hợp lệ. Đối chiếu cuối trước login demo: **69 bảng/6.060 bản ghi cũ/0 bảng thay đổi**. Đây là kiểm tra bổ sung sau snapshot V23→V25 ban đầu, không thay số liệu66bảng/6.055bản ghi ở trên. Frontend5173 hoạt động. Log runtime `var/ai-reviewed-backend-20261010.log` ngoài git.
- So khớp hai secret thực đang cấu hình (API key và vault key) với lịch sử/diff PASS; không có file config local/vault/key/var được track. Không in secret. RTK no-hook và LF/CRLF là advisory công cụ.
- Không thực hiện push/merge/deploy. PR#2 cũ đã được merge trước phần mở rộng này; không coi PR đó là nghiệm thu hay phát hành phần code local hiện tại. Remote `system-design` vẫn ở `66eeaf0` khi kiểm tra cuối.

Phần review chưa đánh giá được giữ nguyên thành gate rõ ràng: quyền gói/consent/model thật của ChatGPT; runtime/model/chất lượng Ollama; UAT/pilot toàn sản phẩm; đánh giá tải/hạ tầng và inventory dependency đầy đủ. Triển khai hosted/chia sẻ token hoặc settlement phân tán ngoài phạm vi personal-local. Chính sách đọc lịch sử archive giữ theo quyết định số3. Không phần nào được gọi PASS từ fixture.

Các log/brief tạm trong workspace của kế hoạch được dọn sau khi ghi bằng chứng và quyết định vào các tài liệu đã track; chúng không phải tài liệu bàn giao lâu dài. Code, cấu hình local, vault, log runtime và các schema test được giữ. Người dùng vẫn cần đăng nhập `admin.local` ở tab localhost5173, rồi tự hoàn tất consent/probe để nghiệm thu ChatGPT; tài khoản demo không sử dụng kết nối cá nhân này.
