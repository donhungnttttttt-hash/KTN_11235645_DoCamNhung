# Thống nhất cỡ chữ và vùng cuộn bảng — 10/10/2026

## Yêu cầu và thay đổi

Theo yêu cầu giảm chữ phù hợp UI/UX trên toàn bộ màn hình, bảng nhiều cột phải cuộn ngang riêng thay vì ép cột hoặc kéo rộng trang.

- Chuyển 250 khai báo font-size trong các stylesheet sang thang chữ chung: chú thích 11px, bảng/điều khiển gọn 12px, nội dung 13px, tiêu đề khu vực 15px, tiêu đề trang 18px, thương hiệu 20px, KPI 24px tại root 16px. Token dùng rem, hỗ trợ zoom/cỡ chữ trình duyệt. Tailwind dùng cùng token. Những chữ 9–10px được nâng lên mức chú thích dễ đọc hơn.
- Áp dụng cho Admin, đăng nhập, menu dự án, tổng quan, công việc/QA, AI, danh mục/cài đặt, thư viện/tài liệu case, thực thi, retest, file-work, báo cáo và Redmine. Giữ kích thước chữ lưới Excel do người dùng tự chọn; avatar là ký hiệu trang trí có kích thước theo component.
- `TableScroll` thay 31 vùng bảng trong 26 file giao diện. Mỗi vùng có tên, focus bàn phím, cuộn riêng hai chiều, thanh cuộn 12px và chiều cao tối đa `min(65dvh,640px)`. Tiêu đề cột sticky. `ResizeObserver` theo dõi vùng chứa/nội dung để chỉ hiện hướng dẫn khi thực sự có cột tràn ngang; có xử lý resize và cleanup.
- Bảng công việc rộng tối thiểu 1600px, tiêu đề căn trái, ngày không bị bẻ dòng, avatar và tên người phụ trách cùng nhóm; giảm padding hàng. Case/suite tối thiểu 880/900px, tổng hợp dự án 1100px, so sánh Redmine 600px. Nội dung dài vẫn có thể xuống dòng trong cột.
- Kanban có vùng cuộn ngang riêng có tên và focus. Lưới Excel giữ cách cuộn chuyên biệt đang có. Bảng hai cột nhỏ trong dashboard/chi tiết giữ bố cục co giãn, không ép chúng thành bảng rộng.
- Trên màn hình nhỏ, ô nhập/select/textarea dùng 16px để tránh tự phóng to khi focus; vùng bấm chính giữ 44px. Giảm cỡ chữ không đồng nghĩa thu nhỏ vùng bấm.
- Không thay dữ liệu, API, trạng thái hay quyền nghiệp vụ.

Skill: `ui-ux-pro-max` (typography, responsive, vùng bấm, nhãn truy cập), `frontend-patterns` (component dùng chung, effect/cleanup). Dùng hướng dẫn trực tiếp; môi trường chưa có Python trong PATH để chạy công cụ tra cứu skill.

## Kiểm chứng

- RED → GREEN: hai test hành vi TableScroll ban đầu thất bại vì thiếu vùng có tên/focus và hướng dẫn overflow; ba test mới đều PASS, gồm thao tác nút con và cập nhật khi resize/unmount.
- `rtk proxy npm.cmd test`: **687/687 test, 61/61 file PASS**.
- Sau chỉnh cuối cho Kanban và độ rộng case/tổng hợp: chạy lại component TableScroll + work-items/admin/test-cases, **172/172 test, 25/25 file PASS**.
- Production build cuối PASS: JS 585.04kB. Cảnh báo chunk >500kB hiện hữu, không phải lỗi build. `git diff --check` PASS.
- Frontend cổng 5173 đã restart để nhận cấu hình Tailwind; xác nhận CSS đang chạy `.text-sm` dùng `var(--text-body)` thay cho giá trị cũ. Backend không cần thay/restart.

Browser Chrome với tài khoản Admin demo, không ghi dữ liệu nghiệp vụ:

| Nhóm màn hình | Kích thước và kết quả |
| --- | --- |
| Admin tổng quan, dự án, user, thiết bị, nhật ký | 375px, không tràn trang; bảng 12px cuộn riêng. Bảng dự án sau chỉnh cuối rộng 1100px trong vùng 288px. |
| AI đã chọn dự án | 375px, tiêu đề 18px/15px, không tràn trang; không gửi yêu cầu AI. |
| Công việc có 72 bản ghi | 1366/1024/375px; bảng 1600px, khung cao khoảng 482–511px. Tại 375px, ArrowRight cuộn tới tận cột Cập nhật (scrollLeft 1268px), cột cuối hiển thị đầy đủ. |
| Chi tiết công việc | 375px, dialog 349px, không tràn ngang bên trong, tiêu đề 15px/nội dung 12px. |
| Kanban | 1366/375px; nội dung khoảng 2908/2808px cuộn trong khung 1128/349px, không kéo rộng trang. |
| Báo cáo lỗi và dữ liệu nguồn | 1366/375px; bảng 12px, khung cuộn riêng kể cả danh sách dài. |
| Đợt/lượt kiểm thử và retest | 375px, bảng 780px cuộn trong vùng khoảng 320–326px; lượt kiểm thử dài vẫn có thanh ngang ở đáy khung giới hạn. |
| File-work | 375px, bảng 900px, trạng thái rỗng và bộ lọc không tràn trang. |
| Thư viện 120 case/sáu suite | 375px, bảng 880/900px, nội dung case đã tải, không ép nhỏ cột tiêu đề. |
| Thành viên, danh mục, thông tin dự án | 375px, không tràn trang; bảng 520px cuộn riêng. |
| Danh sách tài liệu và lưới Excel | 375px, danh sách 1100px; lưới 2117px cuộn trong 369px. Mở file bằng bàn phím thành công, giữ cỡ chữ lưới đang chọn 13px. |
| Form tạo dự án | 375px, ô nhập 16px/cao 44px, không tràn trang; chỉ mở xem, không submit. |
| Đăng nhập | Viewport đo thực tế 500px, tiêu đề 18px/ô nhập 16px, không tràn; không đăng xuất phiên Admin. |

Đã reset viewport sau kiểm tra. Kiểm tra trên Chrome desktop với thay đổi viewport không thay thế nghiệm thu trên thiết bị iOS/Android thật hoặc mọi trình duyệt. Chưa đo coverage; không chạy lại backend vì không đổi backend. Không coi kết quả này là bảo đảm mọi trạng thái dữ liệu/UI đều không còn lỗi. S11 và các gate nghiệp vụ/AI trước đó giữ nguyên.
