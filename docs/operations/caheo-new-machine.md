# Dùng Caheo AI trên máy khác

Code hỗ trợ Caheo đã nằm trên nhánh `system-design`, gồm backend Responses API, loader cấu hình, chat theo phạm vi dự án và gợi ý báo cáo văn bản. `git pull` đồng bộ source, không đồng bộ API key, biến môi trường hoặc file `.env.mysql.local` của máy khác.

## Vì sao hiện gpt-4.1-mini?

Khi không có override, `OpenAiConfiguration` mặc định model `gpt-4.1-mini`, endpoint OpenAI và AI bị tắt. Mẫu `.env.mysql.example` cũng dùng các giá trị này. `AiProviderGateway` vẫn trả tên model cấu hình kể cả khi nguồn chưa sẵn sàng; tên xuất hiện trong dropdown không có nghĩa AI đang kết nối thành công.

Ảnh ngày 25/10 hiển thị gpt-4.1-mini và nguồn/model chưa sẵn sàng, phù hợp với cấu hình mặc định hoặc cấu hình chưa đủ. Chưa truy cập máy đó nên chưa xác định chính xác biến nào thiếu/bị ghi đè. Một hội thoại cũ còn giữ model lúc tạo cũng có thể tiếp tục hiển thị model cũ.

## Cấu hình trên máy chạy backend

1. Pull nhánh `system-design`. Giữ các thông số database đang dùng trong `.env.mysql.local` ở thư mục gốc repository; chỉ cập nhật phần AI dưới đây, không thay cả file bằng cấu hình máy khác.

```dotenv
TMS_OPENAI_ENABLED=true
TMS_OPENAI_BASE_URL=https://caheoai.com/v1
TMS_OPENAI_MODEL=gpt-5.6-luna
TMS_OPENAI_TIMEOUT_SECONDS=30
OPENAI_API_KEY=
```

Điền key Caheo hợp lệ vào `OPENAI_API_KEY` trực tiếp trong file local. Dòng trống ở trên là chỗ cần nhập, không phải cấu hình hoạt động. Không đưa key vào Git, frontend/VITE_*, ảnh chụp hoặc URL.

2. Khởi động lại backend qua loader có sẵn, từ thư mục gốc repository:

```powershell
rtk proxy powershell -NoProfile -File scripts/Start-Backend.ps1
```

Dừng đúng backend của dự án đang chiếm cổng trước khi chạy lại. Script sử dụng cấu hình database/migration hiện có của máy đó như các lần khởi động bình thường; không xóa database hoặc reset Flyway để sửa AI.

Đính chính sau đối chiếu source: profile `local` trong `Backend/src/main/resources/application-local.yml` đã có `spring.config.import` đọc `../.env.mysql.local` theo working directory Backend (hoặc đường dẫn `TMS_LOCAL_CONFIG_FILE`). Vì vậy Maven/IDE trực tiếp **có thể đọc file này khi bật đúng profile và đường dẫn**. Nếu không bật `local`, working directory khác hoặc có override, cấu hình có thể không được nạp như mong đợi. Script Start-Backend vẫn là đường chạy chuẩn vì nạp whitelist AI/DB và đặt profile rõ ràng.

3. Loader ưu tiên **Process > Windows User > file local**. Nếu vẫn hiện 4.1, kiểm tra các override `TMS_OPENAI_MODEL`, `TMS_OPENAI_BASE_URL`, `TMS_OPENAI_ENABLED` ở terminal/IDE/Windows User. Không cần in giá trị key ra terminal. Đồng thời xác nhận frontend đang gọi đúng backend vừa khởi động lại.
4. Tải lại trang, mở Cấu hình AI. Nguồn API của hệ thống phải hiện `gpt-5.6-luna` và sẵn sàng theo cấu hình. Tạo **hội thoại Mới** để dùng model mới; hội thoại cũ giữ nguyên nguồn/model đã tạo.
5. Gửi một câu chào để xác minh kết nối thực tế. Metadata sẵn sàng chỉ chứng minh có cấu hình, không xác minh số dư/quyền model/mạng. Nếu provider trả lỗi thì kiểm tra lỗi đó, không coi đổi nhãn model là đã sửa kết nối.

## Kiểm chứng bàn giao 25/10

- Fetch `origin/system-design` thành công; nhánh remote đã có code Caheo trong lịch sử `953c588` và các cải tiến AI tại `77b05e8`.
- Test loader `node --test scripts/local-ai/start-loader.test.cjs`: 1/1 PASS; kiểm tra nạp endpoint/model/key giả từ file mà không ghi registry hoặc gọi model.
- `.env.mysql.local` được Git ignore. Không chép key thực vào bản bàn giao; không gọi AI có tính phí để kiểm tra vấn đề cấu hình máy khác.
- Không thay default toàn hệ thống sang Caheo: endpoint, key và model phải cùng nhà cung cấp và được thiết lập rõ cho từng backend.

## Đối chiếu thực tế ngày 03/11/2026 trong Arena

Trên máy kiểm tra hiện tại, loader xác định cả `TMS_OPENAI_ENABLED`, Base URL, model, timeout và key đều đến từ file local; không có Process/Windows User ghi đè các trường này. Metadata chỉ ghi key có tồn tại, không ghi giá trị. Chưa kiểm tra trực tiếp cấu hình máy khác.

Hai yêu cầu chẩn đoán riêng dùng nội dung tổng hợp, không gửi dữ liệu dự án, không lưu phía provider (`store:false`) và không tự gửi lại:

| Lần kiểm tra | Giới hạn output | Kết quả |
| --- | --- | --- |
| Kiểm tra tối thiểu, 15:00:27 UTC | 64 token | HTTP200 sau5.995 giây, `completed`, không thu được `output_text` dùng được |
| Đối chiếu cấu trúc với mức cấu hình hiện tại, 15:01:20 UTC | 1536 token | HTTP200 sau19.322 giây, `completed`, trả message/assistant/output_text hợp lệ là câu trả lời `OK` |

Deadline cả hai yêu cầu là30 giây; không đổi model, cấu hình timeout hoặc key. Bằng chứng local: `var/arena-followup/ar04-live-synthetic-20261103/receipt.json` và `var/arena-followup/ar04-live-shape-20261103/receipt.json`. Lần đầu không lưu cấu trúc phản hồi chi tiết nên chưa kết luận nguyên nhân thiếu text; khác biệt hai lần không đủ chứng minh do giới hạn token. Lần sau xác nhận inference phản hồi được tại thời điểm kiểm tra, không bảo đảm các lần sau đều nhanh, báo cáo dự án chính xác hoặc máy khác có cùng cấu hình. Timeout30 giây quan sát trước đó vẫn là một kết quả thực tế, không bị xóa bởi lần thành công này.

### Kiểm tra báo cáo thực tế 03/11/2026

Sau hai probe tổng hợp ở trên, một lần bấm **Tạo gợi ý AI** trên Chrome riêng với project/Feature synthetic đã chạm deadline30 giây: thời gian30,270s, HTTP200 bao `state=FAILED`, `failureCode=AI_TIMEOUT`. Không retry tự động. Như vậy kết quả probe “OK” không chứng minh tạo báo cáo ổn định. Luồng lưu văn bản thủ công/mở lại/tải xuống vẫn đạt; phần READY dùng response stub được ghi riêng, không coi là live. Receipt `var/arena-followup/ar04-browser-verified-20261103/receipt.json`. Không đổi model/deadline/key/cấu hình main; nguồn live chỉ bật tạm trên18081 rồi tắt lại. Máy khác chưa kiểm chứng.
