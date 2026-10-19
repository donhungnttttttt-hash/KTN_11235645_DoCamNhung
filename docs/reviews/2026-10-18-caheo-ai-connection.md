# Kết nối Caheo AI — 18/10/2026

## Yêu cầu và kết quả

Người dùng cung cấp key để thử AI trong TMS, xác nhận Caheo AI qua ảnh có Base URL `https://caheoai.com/v1`, chọn dòng GPT 5.6 Luna. Đây là quyền cấu hình và chạy thử provider này; không thay cấu hình Codex, ChatGPT cá nhân, mua credit hoặc commit/push. Nhánh giữ `system-design`, baseline HEAD `caf075a`, S11 giữ IN_REVIEW. Các sửa màu/startup và tài liệu trước đó trong working tree được giữ nguyên.

Đã xác thực key qua `GET https://caheoai.com/v1/models` HTTP 200, danh sách có `gpt-5.6-luna`. Một lần gọi Responses API bằng chính client Java production nhận kết quả hợp lệ theo schema. Sau khởi động lại backend, API nguồn AI của phiên ADMIN hiển thị model này ở **API của hệ thống**, enabled=true/available=true. Có thể thử ngay sau khi tải lại trang. Đây là kiểm chứng kết nối, không phải nghiệm thu chất lượng mọi tác vụ AI.

Tài liệu provider được đối chiếu tại [Caheo AI Docs](https://caheoai.com/docs); kết luận chạy thành công dựa trên probe thực tế, không chỉ dựa vào tài liệu.

## Thay đổi

| File | Nội dung |
| --- | --- |
| `Backend/src/main/java/vn/syp/tms/ai/OpenAiConfiguration.java` | Thêm endpoint server-only từ `TMS_OPENAI_BASE_URL`; giữ constructor sáu tham số và default OpenAI. Chỉ HTTPS, host chính xác OpenAI/Caheo, cổng mặc định/443, path `/v1` hoặc `/v1/`; chặn userinfo/query/fragment và host/đường dẫn khác. Lỗi cấu hình không chứa đầu vào nhạy cảm. |
| `Backend/src/main/java/vn/syp/tms/ai/OpenAiResponsesClient.java` | Constructor production dùng endpoint đã kiểm tra. Giữ không redirect, không retry tự động, timeout tối đa 30 giây, giới hạn request/response và lỗi được che dữ liệu. |
| `scripts/local-ai/LocalAi.ps1` | Nạp Base URL cùng cấu hình AI hiện có; giữ thứ tự Process > Windows User > file, không ghi registry. |
| `.env.mysql.example` | Mẫu endpoint mặc định và ví dụ Caheo/model; không chứa key thật. |
| `OpenAiEndpointConfigurationTest.java`, `OpenAiLiveConnectionTest.java`, `scripts/local-ai/start-loader.test.cjs` | Regression endpoint, loader và probe opt-in cho endpoint đã cấu hình. |

Không đổi frontend, quyền, API nghiệp vụ hoặc migration trong tác vụ kết nối này. Provider code vẫn là `OPENAI_API`, nhãn giao diện **API của hệ thống**; tên này không có nghĩa request hiện được gửi tới OpenAI. Đích thực tế local đã cấu hình là Caheo.

## Cấu hình local và bảo vệ key

Các giá trị không bí mật được lưu cùng key tại `.env.mysql.local` (Git ignored):

```dotenv
TMS_OPENAI_ENABLED=true
TMS_OPENAI_BASE_URL=https://caheoai.com/v1
TMS_OPENAI_MODEL=gpt-5.6-luna
TMS_OPENAI_TIMEOUT_SECONDS=30
```

`OPENAI_API_KEY` được nạp vào backend, không in ra báo cáo/log hoặc đưa vào biến `VITE_*`. Bản cấu hình cũ được giữ ngoài repo tại `C:\Users\admin\.tms-ai\tms-config-before-caheo-2026-10-18.env`; cả file hiện tại và bản sao đều có ACL owner-only, chặn kế thừa, đã kiểm tra owner và reparse point trước khi ghi. Không sửa kho ChatGPT cá nhân. Không có override key/base/model ở Process hoặc Windows User của launcher tại lúc chạy.

## Kiểm chứng mới

| Kiểm tra | Bằng chứng / kết quả |
| --- | --- |
| TDD endpoint | Trước sửa 12 trường hợp không hợp lệ FAIL; sau sửa tổng 16 invocation PASS, gồm default OpenAI và ba dạng URL Caheo hợp lệ. |
| TDD startup loader | RED 1 trước khi thêm biến Base URL; GREEN 1 sau sửa. Chạy lại cuối tác vụ exit 0; fixture không mở DB/backend/provider và không ghi registry. |
| Hồi quy AI offline | Maven `verify` với `vn.syp.tms.ai.*Test,!vn.syp.tms.ai.OpenAiLiveConnectionTest`: 149 test, 0 failure/error/skipped, BUILD SUCCESS; có package và JaCoCo. Outer PowerShell/tool trả exit 1 khi redirect log, khác kết quả Maven; không coi mã wrapper này là exit 0. Surefire và Maven log xác nhận test PASS. |
| Live opt-in | `OpenAiLiveConnectionTest`: 1 test, 0 failure/error/skipped, BUILD SUCCESS; script ghi riêng exitCode=0. Nội dung tổng hợp kiểm tra `{ok:true}`, không có dữ liệu dự án. Provider báo 2.428 input token/22 output token. Không gọi lại sau thành công. |
| Backend | Xác nhận PID 19444 là TMS trước khi dừng; launcher mới PID 6032, JVM mới PID 27440, cổng 8080. Startup 16:49 ngày18/10, readiness HTTP 200 UP; schema `tms` up-to-date, không migration mới. |
| Metadata tích hợp | Demo ADMIN đăng nhập HTTP 200; `GET /api/v1/ai/providers` HTTP 200 trả `OPENAI_API`, available=true, model `gpt-5.6-luna`; đăng xuất HTTP 204. Không tạo chat, ghi kết quả test hoặc chạy fixture trên `tms`; login/logout có audit thông thường. |
| Kiểm tra cuối | `git diff --check` exit 0; `scripts/Check-Contracts.cjs` exit 0 (structural, không thay thế HTTP verification); `.env.mysql.local` được Git ignore. Scan 893 file trong source/backend/frontend build/scripts/docs/tasks và artifact mới: không có key người dùng. |

Lệnh kiểm tra chính từ gốc repo:

```powershell
rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests 'vn.syp.tms.ai.*Test,!vn.syp.tms.ai.OpenAiLiveConnectionTest'
rtk proxy node --test scripts/local-ai/start-loader.test.cjs
```

Live probe chỉ chạy khi có opt-in `TMS_OPENAI_LIVE_TEST=true` và file cấu hình server; không đưa secret lên command line. Artifact local tại `var/caheo-connection-2026-10-18/`, log hồi quy tại `var/caheo-ai-green.log`, log RED tại `var/caheo-endpoint-red.log`. `probe-exit.json` và `runtime-api-proof.json` không chứa key.

JaCoCo từ lượt 149 test, lưu trước khi báo cáo khác bị ghi đè: `OpenAiConfiguration` 100% line, branch 41/44 = 93,18%; `OpenAiResponsesClient` line 87/90 = 96,67%, branch 77/94 = 81,91%. Đây là hai class được sửa, không phải coverage toàn backend. Không chạy lại FE suite vì không sửa FE; số test màu trước đó là bằng chứng tác vụ khác.

## Cách thử và giới hạn

1. Tải lại trang TMS sau khi backend đã khởi động lại.
2. Mở **Chat AI** hoặc **Trợ lý AI**, chọn **API của hệ thống**, model **gpt-5.6-luna**.
3. Tạo hội thoại mới để dùng model mới; hội thoại cũ giữ nguyên nguồn/model đã tạo. Có thể bắt đầu bằng câu hỏi ngắn không chứa thông tin dự án.

Nhãn UI “Đã cấu hình API · chưa xác nhận live” là mô tả trạng thái cấu hình chung; hệ thống chưa lưu chứng nhận live theo từng key/provider. Probe đã xác nhận kết nối tại thời điểm báo cáo, không bảo đảm quota/mạng/provider về sau. Không thay nhãn này bằng trạng thái thành công giả.

Chưa chạy browser UI riêng cho thay đổi backend này, chưa thử toàn bộ tác vụ theo vai trò hoặc đánh giá chất lượng tiếng Việt/snapshot dự án. Giới hạn hiện có vẫn áp dụng: tối đa 30 giây, output token cấu hình tối đa 2.048, request 16 KB/response 64 KB, rate/daily limits; không tự retry khi timeout vì request có thể đã tính phí. Không kết luận toàn bộ button hoặc chức năng hệ thống đã được nghiệm thu từ probe này. Không commit/push/merge/deploy.

Skill đã dùng: `tdd-workflow` cho RED→GREEN endpoint/loader, `security-review` cho server-only secret, đích request, redirect và lỗi; tự review phạm vi diff, không có agent review độc lập trong tác vụ này.
