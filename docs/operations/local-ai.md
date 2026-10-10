# Thiết lập nguồn AI local

Áp dụng cho React JavaScript + Spring Boot + MySQL native. Backend `127.0.0.1:8080`, Vite `127.0.0.1:5173` và MySQL `127.0.0.1:3307` là cấu hình máy bàn giao hiện tại; clone khác dùng cấu hình native của mình. Không tạo lại server, database, tài khoản, API key hoặc model để chạy helper này.

## Thiết lập ChatGPT cá nhân trên Windows

Chọn đúng tài khoản TMS riêng đang enabled. Helper truy vấn `identity_users` chỉ bằng SELECT, đối chiếu username chính xác rồi lưu ID bất biến. Không dùng tài khoản demo chung làm chủ kết nối cá nhân. Trên máy bàn giao, controller đã chọn `admin.local` (ID `cc166570-78be-4d67-b514-5cada01f3738`) khi cửa sổ chọn owner kết thúc mà chưa có phản hồi khác; đây là giả định vận hành được công khai, không phải consent OAuth.

Từ gốc repository:

```powershell
rtk proxy powershell -NoProfile -File scripts/Configure-LocalAi.ps1 -OwnerUsername admin.local -PlanOnly
rtk proxy powershell -NoProfile -File scripts/Configure-LocalAi.ps1 -OwnerUsername admin.local
```

Clone khác thay `admin.local` bằng username đã chọn. `-PlanOnly` đọc native config/owner và kiểm tra cấu hình, không ghi environment/vault, không mở OAuth và không gọi model. Có thể chỉ định `-VaultPath C:\Users\<you>\.tms-ai` cho lần thiết lập đầu; mặc định là `.tms-ai` dưới Windows user profile, ngoài checkout. Helper chỉ hỗ trợ Windows; môi trường khác dùng [contract cấu hình](../api/ai-providers.md) với owner-only permissions tương ứng.

Helper tạo UUID host ổn định và khóa AES gồm 32 byte ngẫu nhiên nếu chưa có kết nối; lưu vào **Windows User environment** của người chạy, không Machine scope, không file trong repo. Đây là kho cấu hình riêng của Windows user, không phải cơ chế chống người khác chạy code dưới cùng tài khoản Windows. Vault mới có owner-only ACL; directory/ancestor là junction hoặc symlink, path tương đối/UNC/drive-root/trong repo đều bị từ chối. Vault đã tồn tại phải có ACL hợp lệ; helper không sửa ACL hay nội dung của vault cũ. Vault có dữ liệu cần bộ owner/host/path/key gốc đầy đủ. Không xuất khóa/tokens ra terminal, log, git hoặc giao diện.

Chạy lại giữ nguyên owner, host, path và key. Cấu hình tồn tại ở Process/User/Machine hoặc native file được kiểm tra trước khi lưu; khác owner/key/path/host sẽ dừng để review, không tự thay connection. Sai key/host hoặc thiếu key cũ cũng dừng. Helper lưu enablement sau cùng, khôi phục các User values đã chạm nếu ghi thất bại; directory mới trống có thể còn lại, không xóa vault tự động. Giữ key riêng khỏi vault/database backup và giới hạn quyền truy cập bản sao. Mất key phải khôi phục cấu hình gốc hoặc xử lý reconnect có review, không tạo key thay để đọc ciphertext cũ.

Binding ứng dụng dùng `TMS_BIND_ADDRESS=127.0.0.1`. Không persist `SERVER_ADDRESS` ở Windows User vì ảnh hưởng Spring app khác. Generic `SERVER_ADDRESS`, app binding hoặc `SPRING_APPLICATION_JSON` có address xung đột khiến helper dừng; binding trong native file cũng được đối chiếu. JVM/command-line/Spring property sources khác vẫn chịu kiểm tra loopback bắt buộc ở backend; helper không sửa các overrides đó.

## Khởi động và giữ cấu hình API hiện có

Sau review helper, controller khởi động lại **đúng** process backend của checkout này. Trước khi stop PID, xác minh listener8080 thuộc Java `TmsApplication` và classpath của workspace; không dừng Java theo tên hoặc dùng PID cũ. Frontend Vite đang hoạt động chỉ cần tải lại khi đổi backend. Helper không tự start/stop runtime.

```powershell
rtk proxy powershell -NoProfile -File scripts/Start-Backend.ps1
```

`Start-Backend.ps1` dùng `.env.mysql.local` (hoặc `.env` nếu chọn rõ `-LegacyDocker`) cho whitelist DB hiện có và whitelist AI riêng. **Thứ tự AI: Process > Windows User > file được chọn**. Giá trị Process/User rỗng được xem là chưa thiết lập; `false` là override có hiệu lực. Terminal cũ vẫn nhận User settings mới khi chạy script. Không import toàn bộ environment; không tải generic Spring address, biến cloud khác hoặc Java options từ file. Các giá trị API/model/timeout/rate-limit và retention/cap AI được nạp đúng allowlist, không gọi provider khi khởi động script và không đổi mặc định backend nếu chưa cấu hình.

API key đang có trong `.env.mysql.local` được đưa vào Process của backend, không in ra và không chép vào User registry. Helper không chỉnh file đó hay bật/tắt API/Ollama. Kiểm tra metadata qua giao diện cho biết **đã cấu hình**; điều này không chứng minh API có credit hoặc gọi live thành công. Không dùng `VITE_*`, browser storage hoặc URL để mang secret.

## Kết nối và kiểm chứng do người dùng thực hiện

1. Đăng nhập TMS bằng owner riêng, mở **Trợ lý AI → Kết nối và hạn mức** hoặc **Chat AI → Nguồn / phạm vi**. Chọn **ChatGPT cá nhân → Kết nối**.
2. Hoàn tất đăng nhập/consent ở trang chính thức trên cùng máy. TMS không xin mật khẩu hoặc tự cấp consent. Nếu popup bị chặn, dùng liên kết chính thức mà panel cung cấp; callback là listener loopback riêng, không proxy qua Vite.
3. Sau authorization, tải catalog model. Nếu thiếu quyền gói, chọn **Cấp quyền dùng gói ChatGPT** một cách chủ động. `AUTHORIZED` mới xác nhận luồng danh tính; không có nghĩa inference hoạt động.
4. Chọn model trong catalog và **Kiểm chứng model** khi muốn dùng hạn mức cho probe. Probe dùng dữ liệu tổng hợp cố định; timeout kiểm tra lại cùng key. Không chạy probe tự động từ script/test. Thành công chỉ xác nhận đúng connection version/model; đổi model cần kiểm chứng lại.
5. Tạo chat chung hoặc chọn scope dự án được phép. Chỉ READY là kết quả đã lưu hợp lệ. Pending/timeout dùng **Kiểm tra yêu cầu chat**, không gửi key mới tự động. Chat có nguồn phải đối chiếu nguồn và chất lượng trước khi dùng trong báo cáo.

Ollama là lựa chọn riêng: cài native server và model qua công cụ chính thức khi người dùng chọn; bật `TMS_OLLAMA_ENABLED=true` với literal `http://127.0.0.1:<port>` rồi khởi động lại backend/tải catalog. TMS không tự cài binary, server hay model. Hiện chưa có Ollama/model trên máy bàn giao, chưa nghiệm thu inference/hiệu năng native.

## Bằng chứng và việc còn lại

Xem [bàn giao ngày10/10](../reviews/2026-10-10-ai-providers-chat-handover.md). Worker chỉ tạo/test helper bằng mocks và directory tổng hợp dùng một lần; chưa ghi Windows User environment hay operational vault, chưa khởi động lại8080 và chưa OAuth/probe live. Controller review helper, kiểm tra bảo toàn dữ liệu, chạy helper/restart owned runtime và kiểm tra action kết nối là các gate tiếp theo. Consent, quyền gói, live inference/model quality và native Ollama cần người dùng/môi trường thật. Test fixture không chứng minh các gate đó.
