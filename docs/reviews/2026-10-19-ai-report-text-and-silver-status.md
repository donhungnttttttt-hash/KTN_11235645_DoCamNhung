# Báo cáo AI dạng văn bản và Unexecuted xám bạc — 19/10/2026

## Nguyên nhân và phạm vi

Lỗi nằm ở bước nhận gợi ý AI, trước khi lưu báo cáo. Luồng cũ yêu cầu JSON gồm title, summary, observations, suggestedActions, missingInformation và kiểm nguồn; Markdown bình thường bị từ chối. Trong khi đó, API lưu báo cáo đã lưu `markdown` nguyên văn, không cần draftId hoặc cấu trúc AI.

Thử trực tiếp nguồn Caheo đang cấu hình bằng dữ liệu hoàn toàn tổng hợp còn phát hiện nguyên nhân thực tế thứ hai: HTTP200/completed nhưng output là function_call yêu cầu chạy lệnh, không có văn bản báo cáo. Không thực thi lệnh, không đưa arguments vào bản soạn. Sau khi gửi `tools:[]`, `tool_choice:none` và chỉ dẫn rõ chỉ viết báo cáo, cùng model trả assistant/output_text hợp lệ. Bằng chứng ba lần thử có giới hạn nằm trong `provider-probe-sequence.json`; không gửi dữ liệu dự án thật trong các probe này.

## Kết quả triển khai

- Riêng màn báo cáo dùng chế độ văn bản/Markdown. Không còn yêu cầu mô hình tạo JSON nghiệp vụ rồi mới chuyển thành báo cáo. Mặc định của các tác vụ AI khác vẫn là structured JSON.
- OpenAI-compatible và ChatGPT tắt gọi công cụ cho chế độ báo cáo; Ollama bỏ định dạng JSON. Giữ kiểm tra hoàn tất, refusal, response lỗi, giới hạn dung lượng và quyền. Không chấp nhận câu trả lời chỉ chứa hoặc trộn lệnh công cụ.
- Ghép các phần văn bản hợp lệ theo đúng thứ tự trong phản hồi báo cáo, không tự thêm dấu phân cách. Tác vụ JSON vẫn giữ kiểm tra một phần output_text. Prompt hướng dẫn viết khoảng 150–250 từ; không thay hạn mức hoặc cấu hình model.
- Bản gợi ý được kiểm tra không rỗng, tối đa12.000 ký tự và giới hạn byte của kho nháp; lưu trong wrapper Markdown kèm nguồn do server tạo. Nháp JSON cũ vẫn xem được.
- Nội dung AI đi vào ô Markdown nếu bản soạn trống và chưa bị sửa trong lúc chờ. Nếu người dùng đang viết, giữ nguyên bản soạn và cho bấm Đưa vào bản soạn. Không tự lưu báo cáo hoặc sửa Status case/Issue.
- Lưu báo cáo dùng chính nội dung đã chỉnh sửa và tiêu đề đang nhập. Thông báo lỗi AI được tách khỏi lỗi lưu: AI chưa trả về nội dung hợp lệ không có nghĩa bản nhập tay bị từ chối lưu.
- Toàn bộ palette Unexecuted/Chưa chạy/NOT_RUN trong giao diện tham chiếu `--color-result-not-run: #c0c0c0`, chữ `#333333`; chip ở bảng case có nền bạc thực. Biểu đồ Admin dùng cùng token. Tương phản chữ/nền6,94:1; các màu kết quả khác giữ nguyên. Nền highlight hàng vẫn là tint bạc, không tô cả hàng đặc. Không chỉnh định dạng của workbook gốc.

## Skill → việc áp dụng → bằng chứng

| Skill | Áp dụng | Bằng chứng |
|---|---|---|
| test-driven-development + writing-good-tests | Tái hiện lỗi transport và lỗi thông báo, giữ test hành vi | RED provider plain text3nguồn; RED no-tool/mixed tool; RED thông báo2; logs tương ứng |
| api-design | Chế độ report explicit, mặc định structured không đổi; cache cũ và lỗi provider | Kiểm thử gateway/client/controller và native save/get |
| frontend-patterns | Giữ nháp khi AI lỗi/đang chờ, create/edit/reopen qua client và CSRF thật | Frontend59test liên quan; test mới AI→sửa→lưu→mở lại |
| frontend-ui-engineering | Palette chung, nền bạc và chữ tối, giữ các trạng thái khác | Inventory9CSS,24test có sẵn, Chrome computed RGB |
| code-review-and-quality | Review độc lập save/Markdown/rendering/adapter/compatibility | Agent read-only xác nhận textsave nguyên văn, structured và nguồn giữ giới hạn |
| verification-before-completion | Hồi quy, build, kiểm source/runtime và báo đúng giới hạn | Full frontend, backend receipts và source hash |
| computer-use | Chrome hiện có, màu trên màn thật và luồng tạo gợi ý | browser-evidence.json, ảnh nếu capture thành công |

## Kiểm chứng

- Frontend targeted **59/59**, toàn bộ **1.202/1.202 trong129 file**, build PASS. Source frontend đóng băng trong lượt full suite; kết thúc22:42:57 giờ Việt Nam. Không có lệnh lint riêng; coverage mới NOT_MEASURED.
- Backend cuối **672/672 test trong 76 suite**, không failure/error/skip; verify và package PASS sau sửa multipart text. Trong đó 17 test dành cho báo cáo dạng văn bản. **4/4 integration test** lưu/mở lại, quyền và bảo toàn case/Issue đạt trên schema riêng `tms_docstest_2060e04c986c` V33. Review độc lập đã xác nhận finding multipart được sửa, không còn blocker trong phạm vi review. Coverage riêng chưa đo.
- Provider live synthetic: hai lần textmode chưa chặn tools nhận function_call, lần có no-tool nhận HTTP200/completed/assistant text303ký tự, đúng số liệu mẫu. Đây là bằng chứng kết nối API đang cấu hình, không chứng minh mọi provider/model đều hoạt động live.
- Native chỉ dùng schema test riêng; không sửa fixture trên main. Kiểm lưu và mở lại Markdown không đổi case/Issue được thực hiện trên test cô lập.
- Chrome main: màu ở biểu đồ Admin và phân bố báo cáo là RGB192,192,192; chip Unexecuted ở bảng case cùng màu, chữ RGB51,51,51. Screenshot bảng case timeout hai lần; xác nhận màu dựa trên DOM, không ghi là đã chụp được.
- Sau restart, bấm **Tạo gợi ý AI** một lần với dự án demo hiện có qua nguồn Caheo/model đang cấu hình: có pending, sau đó báo tạo thành công, **1.360 ký tự** điền vào editor, tiêu đề giữ nguyên và **Lưu báo cáo bật**. Danh sách báo cáo vẫn trống vì chưa bấm lưu trên main. Giữ tab bản soạn cho người dùng xem; kích thước Chrome đã trả về mặc định. Ảnh `report-live-success.png` chụp được editor/nút lưu/xem trước ở kích thước mặc định; chụp ở viewport thử và ảnh crop timeout, không coi những lần đó là ảnh thành công.
- Luồng lưu/mở lại được kiểm chứng bằng integration test cô lập và frontend client thật với HTTP giả lập; không ghi báo cáo kiểm thử vào database main. Gọi AI trên main có tạo nháp AI tạm theo luồng ứng dụng.
- Chất lượng câu chữ AI vẫn cần người dùng duyệt. Bản thử nêu đúng 1/370 case, NG 1 và chưa chạy 369; phần thời điểm giữ giờ UTC 15:48:24 nhưng gắn nhãn Asia/Ho_Chi_Minh thay vì quy đổi thành 22:48:24. Đây là giới hạn nội dung còn ghi nhận, không xem lần thử này là nghiệm thu độ chính xác của mọi câu báo cáo.
- Chưa đo screen reader/touch thật hoặc UAT mọi role/state. Test HTTP local của ChatGPT/Ollama không thay cho gọi provider thật.

## Bảo toàn và evidence

Evidence nằm tại `var/ai-report-silver-2026-10-19/`: source-before/after, frontend log/JSON, silver audit/inventory, backend logs/receipts, provider probe sequence và browser evidence. Không ghi key vào artifact hoặc thay cấu hình/key/model.

Đối chiếu SHA-256 của 688 file source ban đầu: 672 file giữ nguyên, 16 file sửa đúng phạm vi báo cáo/màu/test, thêm 1 test backend; không xóa file. Giữ các thay đổi từ những đợt trước. Backend 8080 được khởi động lại có kiểm tra danh tính tiến trình: PID 26980 → 27068, health UP; frontend 5173 PID 15612 giữ nguyên. Flyway xác nhận `tms` vẫn V33, không có migration cần chạy; hash cấu hình local không đổi. Journal restart nằm tại `var/uiux-dashboard-testing-2026-10-19/backend-report-text-restart.json`.

Giữ các thay đổi có sẵn, không migration/dependency, không commit/push/merge/deploy. S11/FR-12 giữ IN_REVIEW; các gate trước đó không tự đóng bởi task này.
