# Backend: báo cáo AI thành văn bản có thể chỉnh sửa

Phạm vi: luồng `ManagementReportGenerator` và các adapter AI cần thiết để trả văn bản; không đổi API lưu báo cáo, cấu hình, migration, quyền hoặc trạng thái case/issue. Không thực hiện restart, gọi provider thật, commit hay push trong subtask này.

## Nguyên nhân và sửa chữa

- Luồng cũ ép báo cáo thành JSON gồm 5 trường, giới hạn từng trường và sourceRefs; plain Markdown bị transport/validator từ chối trước khi đưa vào editor.
- Thêm cờ `markdownReport` rõ ràng trong task nội bộ, chỉ bật tại generator báo cáo quản trị. Cùng purpose `PM_PROGRESS_REPORT` ở tác vụ khác vẫn dùng JSON nghiêm ngặt.
- OpenAI/ChatGPT gửi `text.format.type=text`, `tools=[]`, `tool_choice=none`; prompt yêu cầu câu trả lời cuối là văn bản, không dùng công cụ và khoảng 150–250 từ. Ollama bỏ schema output cho riêng báo cáo.
- Giữ envelope hoàn tất, vai trò assistant, usage, timeout/body/rate limit và lỗi provider. Từ chối tool call đơn lẻ hoặc kèm văn bản; không chạy bất kỳ lệnh nào do model trả về.
- Ghép các phần output_text hợp lệ theo thứ tự, không thêm ký tự phân cách; tác vụ JSON vẫn từ chối nhiều phần output_text.
- Báo cáo phải là văn bản không rỗng, tối đa 12.000 ký tự và wrapper JSON tối đa 65.536 byte. Nội dung được giữ nguyên; wrapper `{markdown,sources}` chỉ là nháp AI tạm. Lưu báo cáo nghiệp vụ vẫn là thao tác riêng của người dùng.
- Nháp JSON cũ `{answer,sources}` tiếp tục đọc được, không tái gọi provider khi replay cache.

## Skill → cách áp dụng → bằng chứng

- `test-driven-development` + `writing-good-tests.md` → tái hiện qua adapter HTTP và service thật trước khi sửa → 3 lần RED dưới đây; không mock parser/adapter/generator.
- `api-design` → giữ contract preview `{state,markdown}`, quyền/project scope và lỗi chuẩn; endpoint save/get không đổi → test quyền, replay, create/edit/get/download trong schema test riêng.

## Bằng chứng

- `backend-red.log`: 9 test, 3 failure đúng dự kiến vì Markdown thuần bị từ chối ở OpenAI/ChatGPT/Ollama; sau sửa `backend-green.log`: 81/81.
- `backend-no-tools-red.log`: 12 test, 4 failure đúng dự kiến: thiếu tool_choice ở 2 adapter; mixed tool call bị nhận sai ở Responses/Ollama. `backend-no-tools-green.log`: 86/86.
- `backend-multipart-red.log`: 3 test, 2 failure đúng dự kiến với hai output_text; structured-mode guard vẫn pass.
- `backend-native.json`, `backend-native.log`: 4/4 integration test trên `tms_docstest_2060e04c986c` V33, provider tắt. Test mới chứng minh READY Markdown → preview không tạo report → chỉnh text → lưu → mở lại đúng nội dung; các test cũ giữ quyền/project scope, xung đột phiên bản, download, case/issue không đổi.
- `backend-offline.log` 664/664 và `backend-offline-final.log` 669/669 là checkpoint trước multipart; không xem là bằng chứng mã cuối.
- `backend-offline-complete.log` / `.json`: mã cuối sau multipart và prompt ngắn đạt **672/672 test trong 76 suite, 0 fail/error/skip**, Maven verify và package đạt lúc 22:46:58 ngày 19/10/2026. `backend-final-receipt.json` ghi hash 8 file sản phẩm, 3 file test và JAR. Chưa đo phần trăm coverage riêng cho thay đổi này.

Kiểm chứng provider thật và Chrome thuộc root; không suy ra từ fixture. Không khẳng định toàn bộ hệ thống đã qua UAT.
