# Khách: bỏ Báo cáo, gợi ý AI Nhật–Việt

## Quyết định và thực hiện

Yêu cầu 15/11/2026 thay thế phạm vi trước: khách nhận báo cáo riêng từ đội dự án, không xem trong portal. Gợi ý AI trên portal cần theo ngôn ngữ đang chọn và đổi qua lại được.

- Xóa mục Báo cáo và nút mở báo cáo trên Tổng quan. Portal còn năm mục. Báo cáo của quản lý vẫn giữ nguyên.
- Backend từ chối GET list/summary/detail/download của management-reports đối với GUEST; chỉ còn dashboard và danh sách dự án được chia sẻ. Kiểm tra thành viên dự án vẫn ở service.
- Một lần sinh AI trả hai nội dung `ja`/`vi` dựa trên cùng chứng cứ. Hệ thống lưu cùng revision và factsKey; chuyển ngôn ngữ không phát sinh request AI.
- Kiểm tra cấu trúc, hai bản không rỗng, giới hạn đầu ra, ký tự Nhật ở bản Nhật, không nhận HTML/link hoặc dữ liệu dư. Đây là kiểm tra cấu trúc/ngôn ngữ cơ bản, không phải chứng minh tự động hai bản tương đương về ngữ nghĩa.
- Gợi ý cũ dạng text được sinh lại một lần khi worker chạy. Nếu chưa đủ hai bản thì không hiển thị nhầm ngôn ngữ. Lỗi provider hiển thị trạng thái chưa sẵn sàng; không có nội dung giả thay thế.
- Giữ việc hết hạn sau 24 giờ, đối chiếu factsKey/severity/evidence và giới hạn một lần thử mỗi rủi ro mỗi giờ. Chuyển legacy READY sang bản mới được một lần thử ngay, thất bại vẫn bị giới hạn lần sau.

## Contract và dữ liệu

`GET /api/v1/projects/{id}/management-reports/dashboard`: mỗi phần tử advice thêm `texts: {ja,vi}` hoặc `{}` nếu thiếu/hết hiệu lực. `text` tiếp tục là bản Việt cho consumer nội bộ; không chứa JSON thô. Frontend chọn `texts[language]`, tuyệt đối không fallback bản Việt khi đang Nhật.

Cột TEXT `project_dashboard_risks.ai_text` lưu JSON hai ngôn ngữ; đọc tương thích dữ liệu cũ và đánh dấu chờ sinh lại. Không đổi schema/Flyway; không sửa migration cũ. Gợi ý hợp lệ mới vẫn là thông tin AI tự động, không tự thay Status/nghiệm thu/chi phí.

## Bằng chứng

- Red trước sửa: hai test UI thất bại vì còn gợi ý tiếng Việt và thiếu bản Nhật.
- 15 backend test PASS trên MySQL test cô lập: lưu/đọc hai bản, loại cặp thiếu hoặc sai định dạng, nâng gợi ý cũ một lần, giới hạn retry, không lộ gợi ý khác revision, quyền Khách bị chặn báo cáo trong khi quản lý vẫn tải được.
- Chrome thật trên backend local: AI trả đủ hai bản cho T11-15, chuyển Nhật → Việt → Nhật đúng nội dung; năm mục menu, không có Báo cáo. GET list/summary/detail/download trả `[403,403,403,403]` cho Khách. Không lỗi JavaScript, desktop1600×1000 và mobile390×844 không tràn ngang.
- Backend local đã nạp artifact mới, health UP, giữ V45. Tạo bản launcher/artifact riêng `var/workspace-ui-browser/language-runtime`, giữ artifact trước.
- Frontend build PASS, còn cảnh báo bundle >500kB. Lần chạy full đồng thời Maven có một test timeout và một lỗi dây chuyền; chạy riêng file đó đạt21/21, lần full giảm còn 2 worker đạt **1.437/1.437 test ở159file**. Kiểm tra cuối về gợi ý cũ khác factsKey:9/9 PASS.
- Coverage chưa đo riêng cho thay đổi này.

Bằng chứng local (ignored): `var/workspace-ui-browser/guest-bilingual-live.json`, `guest-bilingual-ja.png`, `guest-bilingual-vi.png`, `guest-bilingual-mobile.png`.

Skill: api-design; giữ quy trình test hành vi và kiểm chứng đã áp dụng. Không commit/push trong tác vụ này.

- Kiểm tra bổ sung UnifiedAccessJourneyNativeTest:4/4 PASS; tổng backend19 test không skip. git diff --check PASS. Hoàn tất, không còn bước nghiệm thu mở trong phạm vi này.
