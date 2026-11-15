# Giao diện Khách: tiếng Nhật và tiếng Việt — 15/11/2026

## Phạm vi đã thực hiện

- Bộ chọn `日本語 / Tiếng Việt` ở thanh trên của khu vực Khách. Mỗi lần mở mới hoặc reload luôn mặc định tiếng Nhật; đổi tab/dự án giữ lựa chọn trong phiên giao diện hiện tại.
- Dịch sáu mục menu, biểu đồ, chú giải, cảnh báo số liệu, trạng thái tải/lỗi, bộ chọn dự án, tài khoản và hồ sơ cá nhân. Số/ngày dùng locale tương ứng, múi giờ dữ liệu giữ nguyên.
- Dùng context riêng cho Khách; component dùng chung ngoài context tiếp tục tiếng Việt. Không đổi quyền, API, cách tính chi phí hay dữ liệu.
- Tên dự án/Feature/người dùng, báo cáo đã công bố và nhận xét AI giữ nguyên ngôn ngữ gốc. Giao diện Nhật ghi chú nguyên văn; đây chưa phải tính năng dịch tự động báo cáo/AI.
- Header/menu vẫn cố định, chỉ vùng nội dung cuộn; bộ chọn ngôn ngữ phù hợp desktop/mobile.

## Kiểm chứng

- Đã có red test cho mặc định tiếng Nhật và chuyển ngôn ngữ trước implementation.
- Toàn bộ frontend: **1.434 test / 158 file PASS**. Sau đó thêm kiểm tra báo cáo song ngữ: **4/4 PASS**, gồm giữ nội dung gốc, giữ báo cáo đang mở và không fetch lại khi đổi ngôn ngữ.
- Build production PASS (còn cảnh báo kích thước bundle trên 500 kB).
- Kiểm tra dictionary: không thiếu key t() dạng chuỗi ở các component đã tích hợp.
- Chrome thật, profile riêng: đăng nhập Khách, sáu tab tiếng Nhật, chuyển tiếng Việt, reload về Nhật, mở báo cáo và hồ sơ; desktop 1600×1000 và mobile 390×844. Không có lỗi JavaScript; không tràn ngang. Menu không dịch chuyển khi nội dung cuộn, window.scrollY=0.
- Kiểm tra số tiền quản lý ×5 không phụ thuộc nhãn đã dịch; chuyển locale không đổi dữ liệu/tính toán.
- Coverage chưa đo riêng cho thay đổi này.
- Bằng chứng local: `var/workspace-ui-browser/guest-language-evidence.json`, ảnh `guest-japanese-*`, `guest-vietnamese-desktop.png` (ignored).

## Trạng thái

DONE cho ngôn ngữ giao diện. Local frontend 5173 đã hiển thị; backend V45 và database không đổi. Chưa commit/push trong tác vụ này.

Skill áp dụng: frontend-patterns, tdd-workflow, verification-loop.
