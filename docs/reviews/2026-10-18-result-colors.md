# Đồng nhất màu kết quả kiểm thử — 18/10/2026

Người dùng đã đổi 5 màu ở biểu đồ Admin và yêu cầu áp dụng cho các màn hình liên quan. Thực hiện trên `system-design`; giữ các sửa màu của người dùng làm chuẩn.

## Bộ màu và nơi chỉnh sau này

Nguồn duy nhất tại [global.css](../../Frontend/src/app/styles/global.css), khối `:root`, bắt đầu từ dòng 35:

| Kết quả | Biến CSS | Màu | Chữ trên nền màu |
| --- | --- | --- | --- |
| OK | `--color-result-ok` | `#0dd44c` | Đen |
| NG | `--color-result-ng` | `#b60202` | Trắng |
| P | `--color-result-pending` | `#f8f835` | Đen |
| Chưa chạy / Unexecuted / NOT_RUN | `--color-result-not-run` | `#161c25` | Trắng |
| NA | `--color-result-na` | `#7a7a7c` | Đen |

Mỗi màu có biến `-text` tương ứng để giữ tương phản. Các ô tô màu nền trong bảng tài liệu dùng sắc độ nhạt suy từ cùng biến màu bằng `color-mix`; nút kết quả giữ màu đặc đã chọn. Nhãn và giá trị trạng thái không thay đổi.

## Các vị trí đã cập nhật

- `features/admin/admin.css`: 5 thanh phân bố kết quả, màu thanh tiến độ theo lựa chọn hiện tại của người dùng.
- `styles/global.css`: biến màu, KPI dùng chung và các utility trạng thái kiểm thử.
- `features/reports/reports.css`: KPI ở Tổng quan kiểm thử, Quản lý tiến độ, Tổng hợp & Phân tích; bỏ các màu ghi đè cũ, thanh tỷ lệ dùng màu OK.
- `features/test-execution/execution.css`: huy hiệu OK/NG/P/NOT_RUN/NA ở danh sách, popup, lịch sử và những màn dùng component `Result`.
- `features/file-work/file-work.css`: nút/huy hiệu thực thi theo file, bổ sung kiểu hiển thị NOT_RUN.
- `features/test-cases/test-documents.css`: số lượng trong thư viện, nút iPad/Excel và nền tô màu kết quả. Thêm selector `td-count-p` đúng với class thực tế; trạng thái NA/Unexecuted có màu riêng. Ô bị khóa vẫn giữ màu kết quả và đường viền đứt để phân biệt.
- `features/retest/retest.css`: PASS/FAIL dùng màu OK/NG tương ứng; nhãn chờ xác minh dùng nhóm màu chưa có kết quả.

Tổng cộng 7 file CSS. Không đổi JS, API, dữ liệu kết quả hoặc quyền thực hiện. Trạng thái công việc BUG/QA, thông báo thành công/lỗi và nhãn legacy Fixed không bị gán thành 5 kết quả kiểm thử này.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Regression FE ở admin/reports/test-execution/test-cases/file-work/retest | **425 test / 39 file PASS**, exit 0. |
| `npm run build` sau thay đổi cuối | **PASS**, Vite 6.4.3; 1729 module. Cảnh báo kích thước chunk hiện có vẫn xuất hiện. |
| `git diff --check` | **PASS**, chỉ thông báo chuyển LF/CRLF. |
| Dashboard thật trên Chrome | 5 màu computed đều đúng RGB tương ứng; dùng tài khoản demo, không sửa kết quả nghiệp vụ. |
| Mẫu hiển thị dùng CSS/component thật | **42 mẫu / 0 lệch màu**, gồm Admin, KPI báo cáo, huy hiệu đợt, file, ô tài liệu thường/bị khóa, số lượng thư viện, utility và PASS/FAIL. |
| Tương phản chữ/nền của mẫu có chữ | Thấp nhất **4,90:1**. Không suy thành chứng nhận WCAG cho toàn sản phẩm. |
| Ảnh bằng chứng | [Bảng màu thực tế trong Chrome](../../var/result-colors-2026-10-18/result-palette.png). |

Artifact tại `var/result-colors-2026-10-18/`: bản CSS trước sửa, danh sách edit, computed styles của Dashboard và 42 mẫu trong `browser-colors.json`, ảnh PNG, bản sao trang kiểm tra. Trang mẫu chỉ dùng dữ liệu tổng hợp, không có API ghi dữ liệu; hai file tạm dưới Frontend đã xóa sau khi chụp. Không khởi động lại server đang chạy của người dùng. Tab kiểm tra đã đóng sau thao tác đăng xuất.

Mẫu kiểm tra xác nhận CSS và một số component thật; không phải bằng chứng UAT mọi trang, mọi dữ liệu và trình duyệt. Không thêm test mô phỏng lại các khai báo CSS cho thay đổi màu có thể hoàn nguyên. Không chạy backend suite hoặc đo lại coverage vì không đổi backend hay hành vi JS.

Skill áp dụng: `design-system` → token màu theo ý nghĩa, tham chiếu dùng chung và màu chữ tương phản. Review tự thực hiện. Giữ S11 IN_REVIEW; chưa commit/push/merge/deploy.
