# Bộ dữ liệu demo S11

Dự án **DEMO-PILOT · DEMO · Kiểm thử phát hành 1.2** nằm trong MySQL local đang chạy. Chọn dự án này ở thanh đầu trang sau khi đăng nhập. Toàn bộ nội dung tổng hợp, không phải dữ liệu hoặc xác nhận của khách hàng.

| Nội dung | Số lượng |
| --- | ---: |
| Tài khoản mới | 1 PM + 4 Tester |
| Thành viên dự án | 6, gồm Admin local |
| Nhóm test case | 6 |
| Test case | 120: 108 đã duyệt, 12 bản nháp |
| Đợt kiểm thử | 4: 1 đóng, 2 đang chạy, 1 nháp |
| Cấu hình | 8, phân bố Web/Windows và iPad/iPadOS |
| Lượt case/cấu hình | 240: 200 thuộc đợt đã kích hoạt, 40 thuộc nháp |
| Công việc | 72: 32 bug, 40 task/yêu cầu/cải tiến |
| Chứng cứ và bình luận | 32 ảnh giả lập + 32 bình luận |
| Yêu cầu retest | 10: có đang chờ, PASS và FAIL |
| Hướng dẫn | 3; rule INTERNAL_DEMO đã xuất bản |

Đủ 10 trạng thái: Chưa xử lý 11; Đang xử lý 13; SYP kiểm tra lại 9; Xác nhận đặc tả/mức độ 9; Sẵn sàng xử lý 10; Lập kế hoạch 8; Đã xử lý 4; Không tái hiện 2; Không xử lý 2; Hoàn thành 4.

Báo cáo ban đầu: 200 lượt đã kích hoạt, NA 8, mẫu số áp dụng 192; OK 132, NG 28, P 16, Chưa chạy 16. Tiến độ `(132+28)/192 = 83,33%`; tỷ lệ đạt `132/192 = 68,75%`. 24/32 bug còn mở, 4 chờ xác minh. Khi người dùng thực hành, dữ liệu và các số này sẽ thay đổi hợp lệ.

## Nạp và kiểm tra

Từ 01/10/2026 ưu tiên [MySQL native](../database/mysql-workbench.md). Chuyển database đã có bằng backup/import để giữ ID, journal và chứng cứ; chưa cutover server 3307. Audit mặc định native, chỉ dùng `--legacy-docker` khi chủ động kiểm tra nguồn cũ. Các lệnh Backup-Local bên dưới thuộc môi trường container trước đây; backup native dùng `rtk proxy node scripts/Backup-Database.cjs`.

```powershell
rtk proxy powershell -NoProfile -File scripts/Backup-Local.ps1 -Label before-demo
rtk proxy node scripts/Seed-Demo.cjs
rtk proxy node scripts/Audit-LocalDatabase.cjs
```

Chạy tại gốc repository, API local đang hoạt động. Script đọc admin bootstrap từ `.env` để xác thực; account creation luôn qua API ADMIN. PM demo không được cấp quyền tạo tài khoản. Mật khẩu ngẫu nhiên nằm riêng trong `.env.demo.local` bị Git bỏ qua; Admin hiện có cũng truy cập được dự án. Không chia sẻ file này hoặc đưa vào gói bàn giao.

Seed đi qua API thật, session/CSRF/quyền/version/audit; không INSERT trực tiếp bằng SQL, không thêm dữ liệu demo vào Flyway. Chỉ chấp nhận HTTP loopback, không theo redirect. Không cấu hình binding Redmine cho dự án demo. Các ảnh là placeholder 1×1 có chú thích, không được dùng làm chứng cứ thật.

Để thực hành bằng PM hoặc Tester, tự xem credential riêng trong terminal bằng `rtk proxy powershell -NoProfile -File scripts/Show-DemoLogin.ps1 -Role pm` hoặc `-Role tester1` (có tester1–tester4). Kết quả có mật khẩu, không chụp/chia sẻ. Seed không đổi mật khẩu Admin local.

`var/demo/journal.json` lưu các bước đã được server xác nhận; chạy lại bỏ qua các bước đó, không reset dữ liệu người dùng đã sửa. Đã chạy lại để đối chiếu số lượng không tăng. Nếu mạng đứt ở bước ghi, journal giữ `pending` và dừng: kiểm tra server trước khi phục hồi journal, không xóa journal để chạy lại toàn bộ. `seed.lock` ngăn hai seed cùng lúc; chỉ bỏ lock sau khi chắc chắn tiến trình seed cũ đã dừng. Nếu project tồn tại mà journal mất, script từ chối nhận đó là dự án mới.

Seed có kiểm tra kích thước bộ dữ liệu cố định; nếu đã thêm/bớt dữ liệu để thực hành thì không chạy lại để “sửa” các con số. Dùng audit đọc độc lập. Trường hợp khởi tạo giữa chừng lỗi cần đối chiếu từng bước đã commit, không drop/reset database.

Kết quả local ở `var/demo/verification.json`, `database-audit.json`, `report.xlsx`. Các bản tổng hợp không chứa credential tại [demo-dataset.json](demo-dataset.json), [database-audit.json](database-audit.json). Không nạp giả vào các bảng outbox/session/audit để làm đầy; chúng phát sinh theo hoạt động thật. Không tự xóa dữ liệu/backup theo thời hạn chưa được chốt.
