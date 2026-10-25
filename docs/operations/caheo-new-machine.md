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

Chạy riêng `mvn spring-boot:run` không tự đọc `.env.mysql.local`; khi chạy từ IDE/Maven trực tiếp phải truyền các biến môi trường tương đương vào cấu hình chạy.

3. Loader ưu tiên **Process > Windows User > file local**. Nếu vẫn hiện 4.1, kiểm tra các override `TMS_OPENAI_MODEL`, `TMS_OPENAI_BASE_URL`, `TMS_OPENAI_ENABLED` ở terminal/IDE/Windows User. Không cần in giá trị key ra terminal. Đồng thời xác nhận frontend đang gọi đúng backend vừa khởi động lại.
4. Tải lại trang, mở Cấu hình AI. Nguồn API của hệ thống phải hiện `gpt-5.6-luna` và sẵn sàng theo cấu hình. Tạo **hội thoại Mới** để dùng model mới; hội thoại cũ giữ nguyên nguồn/model đã tạo.
5. Gửi một câu chào để xác minh kết nối thực tế. Metadata sẵn sàng chỉ chứng minh có cấu hình, không xác minh số dư/quyền model/mạng. Nếu provider trả lỗi thì kiểm tra lỗi đó, không coi đổi nhãn model là đã sửa kết nối.

## Kiểm chứng bàn giao 25/10

- Fetch `origin/system-design` thành công; nhánh remote đã có code Caheo trong lịch sử `953c588` và các cải tiến AI tại `77b05e8`.
- Test loader `node --test scripts/local-ai/start-loader.test.cjs`: 1/1 PASS; kiểm tra nạp endpoint/model/key giả từ file mà không ghi registry hoặc gọi model.
- `.env.mysql.local` được Git ignore. Không chép key thực vào bản bàn giao; không gọi AI có tính phí để kiểm tra vấn đề cấu hình máy khác.
- Không thay default toàn hệ thống sang Caheo: endpoint, key và model phải cùng nhà cung cấp và được thiết lập rõ cho từng backend.
