# Sửa chat Caheo và phản hồi khi gửi — 18/10/2026

## Kết quả

Đã sửa lỗi chat báo kết quả AI không hợp lệ và ô nhập giữ nội dung tới khi response kết thúc. Chrome với backend thật đã gửi `Helo` bằng Enter: ô nhập trống ngay, câu hỏi hiện ngay và trạng thái **AI đang trả lời…** xuất hiện. Sau đó nhận được **“Xin chào! Tôi có thể giúp gì cho bạn?”** từ `gpt-5.6-luna`; thu nhỏ/mở lại đọc được và bản nháp tiếp theo vẫn giữ nguyên. Backend bản sửa đang chạy cổng8080, readiness HTTP200; JVM PID7000, launcher25296. Giữ nhánh `system-design`, S11 IN_REVIEW; không commit/push/merge/deploy.

## Nguyên nhân đã xác nhận

1. Probe `{ok:true}` ở tác vụ kết nối trước chỉ kiểm chứng transport/schema đơn giản, chưa kiểm chứng contract chat. Với đúng prompt/schema chat cũ và câu chào tổng hợp, Caheo trả HTTP200/status=completed, một assistant/output_text, nhưng JSON có trường `answer` thay vì `text`. Metadata ID/model/token hợp lệ. `AiChatService.validateOutput` từ chối object sai trường là đúng. Chỉ dẫn cũ nói chung “plain text answer”, chưa nêu rõ field trong instructions; không thể suy việc truyền strict schema là provider chắc chắn thực thi nó.
2. `AiChat.jsx` chỉ cập nhật câu hỏi sau khi `chatSend` resolve; chỉ xóa composer khi READY và nội dung hiện tại bằng nội dung đã gửi. Vì vậy cả lúc tạo thread lẫn inference đều chưa có câu hỏi tức thời; FAILED giữ nguyên ô nhập như ảnh. Cách so sánh chuỗi còn có thể xóa bản nháp mới nếu người dùng gõ lại cùng nội dung.

## Sửa chữa

- `AiChatService.java`: chỉ dẫn yêu cầu một JSON object có đúng field `text`, có ví dụ rõ; cấm field `answer`, markdown fences và field khác. Giữ nguyên strict schema/validation, kiểm quyền, hạn mức, provenance và lưu READY trong transaction. Không đổi adapter hoặc chấp nhận payload sai schema để che lỗi.
- `AiChat.jsx`: lưu bản gửi cục bộ trước mọi await, xóa composer ngay, hiển thị câu hỏi/trạng thái chờ, chặn gửi đôi và tự cuộn. Khi nhận turn, thay preview bằng dữ liệu server; không xóa bản đang soạn ở lúc nhận response. FAILED có nút **Gửi lại tin nhắn** tạo request key mới tường minh. Timeout/network/HTTP5xx chưa xác định kết quả giữ original request/key để kiểm tra. Không tự retry provider.
- Lỗi trước khi nhận turn: khôi phục câu hỏi vào composer trống; nếu có bản nháp mới, giữ câu hỏi cũ riêng với nút gửi lại. Fresh/owner/session guards và phiên bản đọc chi tiết giữ nguyên. Không đổi API DTO, database/migration, quyền, màu hoặc các sửa trước trong working tree.
- Bổ sung regression trong `AiChatServiceTest.java`, `AiChat.test.jsx`, và live test opt-in riêng `AiChatLiveConnectionTest.java`; cập nhật hướng dẫn/contract. Live test mặc định bị tắt, chỉ chạy khi `TMS_AI_CHAT_LIVE_TEST=true`; không thêm cuộc gọi có tính phí vào suite thường.

## Kiểm chứng mới

| Kiểm tra | Kết quả |
| --- | --- |
| RED frontend | Ba regression mới đều FAIL trên code cũ; 21 test hiện có PASS. |
| RED backend | Test contract trong instructions FAIL; lượt26test có25PASS/1FAIL. |
| Hồi quy frontend | **890 test/82 file PASS**, chạy full với coverage; 127,56giây. Lượt focused trước đó48test/3filePASS. |
| Hồi quy backend AI | **151 test, 0 failure/error/skipped**, Maven verify/package/JaCoCo BUILD SUCCESS; script ghi riêng exitCode=0. Không chạy fixture lên `tms`. |
| Live sau sửa | `AiChatLiveConnectionTest` qua đúng `OpenAiResponsesClient`, prompt/schema và validation chat production: 1PASS, explicit exitCode=0, 2.586 input/20 output token theo provider. Không Spring/DB/dữ liệu dự án. |
| Browser tích hợp | Demo ADMIN, Chrome1536×730, nguồn API của hệ thống/gpt-5.6-luna, Trao đổi chung, thread#3. Một câu chào có câu trả lời, không alert, không trùng câu hỏi; thu nhỏ/mở lại vẫn đọc được. Không thực hiện thao tác ghi case/kết quả/thiết bị/dự án. Hội thoại/audit đăng nhập được lưu qua luồng ứng dụng bình thường. |
| Bản nháp khi chờ | Gõ “Tin tiếp theo chưa gửi” sau Enter; lúc READY và sau mở lại vẫn giữ nguyên, nút gửi đã mở lại. Sau kiểm tra đã xóa bản nháp thử này. |
| Build | `rtk proxy npm run build` PASS; cảnh báo chunk JS>500KB hiện có, không phải lỗi build. |
| Kiểm tra cuối | `git diff --check` và `scripts/Check-Contracts.cjs` PASS (structural). Scan1.067file source/frontend build/scripts/docs/tasks/artifact mới không có key; backend readiness200 UP sau kiểm tra. |

Ba cuộc gọi provider trong tác vụ này: một request tổng hợp tái hiện lỗi, một live test sau sửa, một câu chào từ UI. Không tự lặp cuộc gọi khi đã thành công, không gửi snapshot dự án hoặc mua credit. Các kết quả test/coverage tác vụ trước không được tính làm lần chạy mới ở đây.

Lệnh chính:

```powershell
rtk proxy npm run test:coverage -- --maxWorkers=2 --coverage.reportsDirectory=../var/caheo-chat-2026-10-18/frontend-coverage
rtk proxy npm run build
rtk proxy powershell -NoProfile -File var/caheo-chat-2026-10-18/Run-Regression.ps1
```

Hai lệnh npm chạy tại `Frontend`; regression runner gọi Maven verify, chọn AI tests và loại hai live class. PowerShell ngoài cùng trả1 khi redirect native stderr của RTK (dòng “No hook installed” thành NativeCommandError); log Vitest vẫn xác nhận890PASS và có báo cáo coverage, Maven/probe có file exit riêng=0. Không báo mã wrapper này là0 hoặc coi cảnh báo đó là lỗi ứng dụng.

## Coverage thực đo

| Phạm vi | Statements / Instructions | Branches | Functions / Methods | Lines |
| --- | --- | --- | --- | --- |
| Toàn frontend cấu hình V8 hiện hành | 87,15% | 84,28% | 81,84% | 87,01% |
| `AiChat.jsx` | 92,37% | 86,85% | 91,01% | 93,84% |
| `AiChatService` (151 AI unit tests) | 77,13% instructions | 82,14% | 84,62% | 88,75% |

Không suy coverage toàn backend từ một class. Không thêm test chỉ để tăng tỷ lệ các nhánh ngoài phần sửa; các giới hạn native/UAT của S11 vẫn riêng.

## Bằng chứng và giới hạn

Artifact local tại `var/caheo-chat-2026-10-18/`: `diagnostic-shape.json` chỉ có cấu trúc/usage, `live-probe.log`, `probe-exit.json`, `backend-regression.log`, `regression-exit.json`, `frontend-regression.log`, `frontend-coverage/coverage-summary.json`, `backend-ai-coverage.xml`, `browser-proof.json`, `chat-ready.png`, log/runtime backend. `var/caheo-chat-red.log` giữ RED backend. Key không được in hoặc ghi vào source/artifact này.

`browser-proof.json` xác nhận ngay sau Enter: input rỗng, câu hỏi/pending hiện, nút gửi khóa; sau mở lại có một câu hỏi, câu trả lời, bản nháp tiếp và nút gửi mở. UI chưa streaming từng token; đã cải thiện phản hồi tức thời và hiển thị đang trả lời. Kiểm chứng live là câu chào, không nghiệm thu tất cả tác vụ dài hoặc chất lượng phân tích dự án. Chưa test mobile/screen reader/thiết bị thật riêng trong tác vụ này. Model vẫn có thể trả dữ liệu sai về sau; hệ thống tiếp tục từ chối output sai thay vì lưu kết quả không hợp lệ.

Skill: `debugging-and-error-recovery` để tái hiện/phân lớp/giữ bằng chứng, `tdd-workflow` cho RED→GREEN và regression. Tự review scope/diff; không có agent review độc lập. Bản cấu hình Caheo và key server-only từ tác vụ trước giữ nguyên.
