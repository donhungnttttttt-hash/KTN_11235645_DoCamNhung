# Bàn giao trợ lý AI theo vai trò — 10/10/2026

Phạm vi mở rộng từ kết nối OpenAI sang sáu tác vụ cho Admin/PM/Tester/Dev theo yêu cầu người dùng. Nhánh `system-design`; API, UI và lưu tạm đã triển khai. Sinh nội dung bằng model thật còn chặn bởi số dư API, không coi mock test là nghiệm thu chất lượng AI.

Implementation commit `c9f1b7d` đã push `origin/system-design`; [PR #2](https://github.com/donhungnttttttt-hash/KTN_11235645_DoCamNhung/pull/2) mở vào `develop`. Không merge hoặc deploy.

Cập nhật nhãn ngày 10/10 theo yêu cầu người dùng: nút **Tạo bản nháp** đổi thành **Phân tích** cho mọi vai trò. Hướng dẫn sử dụng và selector trong test đã đồng bộ; `AiAssistantPage.test.jsx` 10/10 PASS, diff check PASS. Đây là sửa nội dung giao diện, không thay contract hoặc nghiệp vụ; không đo lại coverage toàn hệ thống. Áp dụng kiểm chứng theo `verification-loop`; giới hạn AI live phía dưới vẫn còn.

## Cập nhật bộ chọn dự án — 10/10/2026

- Theo yêu cầu mới: bỏ ô/nút tìm dự án bên ngoài, đưa tìm theo tên/mã vào dropdown. Tự lọc qua API sau 250 ms, giữ dự án hiện tại cho đến khi chọn; Escape/click ngoài/Tab đóng, hỗ trợ phím mũi tên/Enter, kết quả rỗng/lỗi/thử lại và phân trang trong hộp.
- Dùng chung cho AI, người dùng, thiết bị, bàn giao máy, nhật ký và phạm vi trang chi tiết dự án. Trang danh sách dự án vốn tắt tìm trong bộ chọn vẫn giữ select gốc và bộ lọc riêng.
- Kiểm thử browser phát hiện API trả 503 khi tìm tiếng Việt có dấu do `LOCATE` đối chiếu từ khóa Unicode với cột mã ASCII. Sửa chuyển cột mã sang UTF-8 trong truy vấn; giữ đối chiếu mã phân biệt hoa/thường, `%`/`_` là ký tự thường. Không sửa migration/schema hoặc contract.
- Áp dụng `frontend-patterns`, hồi quy RED → GREEN và `verification-loop`. Frontend: 4 test mới, tổng **682/682 PASS (60 files)** với 2 worker; build PASS (JS 582.27 KB, cảnh báo chunk >500 KB còn). Backend: **15/15 PASS**, gồm 8 native HTTP/integration và 7 service; regression Unicode quan sát 503 trước sửa, 200 và đúng kết quả sau sửa, có kiểm tra từ khóa không tồn tại và `%`/`_`.
- Native dùng schema riêng `tms_docstest_202610100007`, rollback fixture. Lần đầu runner thiếu location migration demo V20/V22 nên Flyway từ chối; chạy lại với `SPRING_FLYWAY_LOCATIONS=classpath:db/migration,classpath:db/demo` đúng schema đã có, không repair/xóa migration.
- Browser Chrome: mở/tìm mã/chọn bằng bàn phím, giữ lựa chọn khi tìm, Escape và áp dụng bộ lọc người dùng; viewport 375/768/1920 px, không tràn ngang, mục chọn tối thiểu 44 px, danh sách cuộn trong dropdown. Chưa kiểm tra bàn phím ảo hay thiết bị cảm ứng thật. Không gọi AI live. Không đo lại coverage trong lượt sửa này.
- Backend local đã khởi động lại với code mới lúc 08:09 ngày 10/10, PID34584/cổng8080, health `UP`; MySQL3307 `tms` vẫn V23, không có migration mới. Browser xác nhận tìm “thư viện” trả đúng DEMO-S04, “không tồn tại 12345” hiện kết quả rỗng thay vì 503. Bộ lọc người dùng chọn SYP-LAB-22-IOS hiển thị 34 tài khoản của dự án.

## Kết quả triển khai

- Admin rà soát dự án; PM soạn báo cáo tiến độ và gợi ý Tester cho file; Tester tổng hợp công việc cá nhân và hoàn thiện bug; Dev rà soát BUG/QA được giao và tìm ticket liên quan trong cùng dự án.
- Backend dựng context theo quyền hiện tại, không nhận prompt tự do từ browser. Chỉ dữ liệu cần thiết đi tới OpenAI; màn hình nói rõ bên nhận. Snapshot bị giới hạn được rút gọn theo request UTF-8 thực tế, giữ nguồn chính và cờ `truncated`.
- Flyway V23 bổ sung `ai_generated_drafts`. Bản nháp chỉ chủ sở hữu, hết hạn mặc định 7 ngày; generated JSON và text người dùng sửa riêng biệt, sửa có version. Không tự sửa nghiệp vụ, gán người hoặc công bố ticket.
- Retry cùng mã không tạo thêm lần gọi provider, kể cả nguồn đã đổi; kiểm tra quyền lại trước lưu và khi đọc cache. Chuyển ticket/thu hồi quyền chặn nội dung tương ứng. Lịch sử lọc quyền trước phân trang.
- Quota 20 request/dự án/ngày UTC trong database, thêm 20 lần/phút UTC/process tự phục hồi. Không tự retry mạng. Request bỏ dở sau 2 phút thành `AI_INTERRUPTED` khi đọc lại; disabled không tạo reservation.
- UI có nguồn đối chiếu, lịch sử, bản gốc, lưu sửa, sao chép, trạng thái quota/error. Giữ sửa chưa lưu qua đổi dự án/menu/bản nháp trong bộ nhớ phiên tài khoản; logout xóa bộ nhớ, reload có cảnh báo. API giữ nội dung đã lưu qua restart.

Contract: [API](../api/ai-assistance.md), [OpenAPI](../api/ai-assistance.openapi.json). Nghiệp vụ: [AI-ASSISTANCE](../product/AI-ASSISTANCE.md). [Spec](../superpowers/specs/2026-10-09-role-ai-design.md), [plan](../superpowers/plans/2026-10-09-role-ai.md).

## Kiểm chứng

| Kiểm tra | Kết quả và phạm vi |
| --- | --- |
| Backend `clean test -Dtest=Ai*Test,OpenAiConfigurationTest,OpenAiResponsesClientTest` | 48/48 PASS; HTTP transport local, lỗi/quota/output bounds, JSON/ref/schema, UTF-8 budget, minute reset, disabled/role/service |
| `Test-FileWorkQaNative.cjs tms_docstest_202610100007 fresh-migration NativeAiDraftTest` | 18/18 PASS; MySQL3307 schema riêng, provider mock; fresh V23, V22→V23 bảo toàn snapshot/workbook, replay migration, 6 tác vụ/4 role, CSRF, owner/scope/quota/TTL, idempotency race, revoke trong lúc generate, edit conflict, archived/abandoned, lọc quyền trước pagination |
| Frontend `npm run test:coverage -- --maxWorkers=2` | 678/678 PASS, 59 files; coverage statements 84.56%, branches 81.96%, functions 78.21%, lines 83.30% |
| Frontend `npm run build` | PASS; JS 577.99 KB, warning chunk >500 KB còn tồn tại |
| `Check-JavaDiagnostics.cjs` | 224 source files, 0 errors / 0 warnings, Eclipse JDT compiler exit 0 |
| Native runner unit tests | 11/11 PASS; giữ guard schema/selector, không nới quyền test trên `tms` |
| Contracts | Check-Contracts PASS; AI OpenAPI 5 paths/6 operations, unique IDs/local refs/CSRF. Chỉ kiểm tra cấu trúc; native HTTP tests kiểm tra hành vi riêng |
| Diff | `git -c core.safecrlf=false diff --check` PASS trước bàn giao |
| Browser local | Chrome đăng nhập thật `syp.lab.tester01`, `syp.lab.pm01`, `syp.lab.dev01`, `syp.demo.admin`: tác vụ đúng từng vai trò, Admin chọn dự án; danh sách rỗng giải thích rõ và chặn tạo khi thiếu target. Tester 375/768/1366 px, Admin 375/1366 px không tràn ngang; Tab có focus rõ, trang cuộn được. Không bấm generate live vì credit chưa đổi |

Một lần frontend chạy cùng native migration bị timeout 5000ms ở test result-grid cũ (677 PASS/1 timeout); chạy lại toàn bộ với 2 worker đã PASS, không bỏ test hoặc tăng timeout để che lỗi. Các regression mới đã quan sát RED trước fix: archive edit, abandoned request, lịch sử quyền, sửa chưa lưu, request Unicode lớn và quota theo phút. IDE ghi class vào `target`, nên Maven final chạy `clean` để tránh dùng class cũ. Không chạy lại toàn bộ bộ backend Testcontainers; coverage backend toàn hệ thống chưa đo trong lượt này. JaCoCo từ native suite riêng không đại diện coverage gộp unit/integration.

## Runtime local

- Trước cập nhật: dừng đúng TMS Java PID10252 đang nghe 8080; backup `var/mysql-native/backups/2026-10-09T17-53-33-780Z-tms.sql` và manifest SHA256, không kèm session rows.
- MySQL **127.0.0.1:3307 / tms** đã migrate V23 thành công. Backend PID42172 khởi động ngày 10/10 00:54, health HTTP200 `UP`. Bảng AI ban đầu 0 bản nháp; không seed output giả vào dữ liệu đang dùng.
- Đã bật `TMS_OPENAI_ENABLED=true` trong cấu hình local bị git-ignore; key giữ nguyên, không in/log/stage. Mẫu env cho người pull vẫn mặc định false để cấu hình riêng.
- Flyway cảnh báo MySQL9.7 mới hơn mức vendor đã kiểm thử; fresh/upgrade native thực tế PASS, không suy ra chứng nhận tương thích production.

## Review và quyết định

Áp dụng `prompt-master`, `brainstorming`, `writing-plans`, `ponytail`, `executing-plans`, `openai-docs`, `api-design`, `security-review`, `tdd-workflow`, `test-driven-development`, `frontend-patterns`, `verification-loop`, `requesting-code-review`, `verification-before-completion`, `finishing-a-development-branch`. Một reviewer độc lập cuối lượt theo executing-plans, không lặp vòng review vô hạn; parent sửa và kiểm chứng bằng regression.

- Bốn finding Important đã sửa: request Unicode vượt budget; mất sửa nháp khi đổi mục/phạm vi; lọc quyền sau LIMIT; quota process hết vĩnh viễn đến restart. Mở rộng fix giữ text khi đổi menu, xóa khi đổi tài khoản.
- Finding disclosure OpenAI ban đầu Minor được nâng thành Important vì người dùng cần biết nơi nhận dữ liệu; đã sửa trong UI.
- Minor giữ lại có chủ đích: model nhận ID ứng viên, tên người chỉ nằm ở nhãn nguồn hiển thị trên UI. PM vẫn đối chiếu được ID→người, hạn chế thêm dữ liệu cá nhân; có thể cải thiện cách trình bày citation theo tên ở lượt sau.
- Quyết định kỹ thuật: TTL 7 ngày cấu hình được; sáu tác vụ có scope và tìm kiếm nội bộ trước; không tự ghi nghiệp vụ; idempotency theo purpose+target, cần request mới khi muốn phân tích nguồn mới; quota process theo phút UTC. Nếu đổi nhu cầu, chỉnh contract/config thay vì ngầm thay quyền.
- Tiếp tục quyền bàn giao đã được người dùng cấp: commit/push system-design, cập nhật PR #2, không merge/deploy. Không yêu cầu lại phê duyệt chung chỉ vì skill có bước integration menu.

## Giới hạn và việc còn lại

**Chặn bên ngoài:** hai kiểm tra Responses API chung ngày 09/10 trả HTTP429 `credit_balance_exhausted / insufficient_quota`; không gửi dữ liệu dự án, không lặp gọi khi số dư chưa đổi. Cần bổ sung số dư OpenAI Platform rồi kiểm thử một tác vụ demo mỗi vai trò và người dùng đánh giá độ đúng/đủ/không bịa. Có key không có nghĩa API đã có credit.

Reviewer không kết luận chất lượng model live, khả năng chống mọi prompt injection, retention thực tế phía provider hoặc hiệu năng production. Code gửi `store:false`, validate refs/schema và không có tool tự thi hành; đây không phải bảo đảm output luôn đúng. Tìm ticket hiện là từ khóa nội bộ, chưa có web/repository retrieval; gợi ý Tester dựa tải công việc và máy, chưa có dữ liệu năng lực/lịch nghỉ. Chưa nghiệm thu Safari/thiết bị cảm ứng thật/tải lớn. S11 tiếp tục IN_REVIEW theo gate cũ.
