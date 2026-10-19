Tích hợp hệ thống quản lý kiểm thử từ `system-design` vào `develop`: Admin tạo và bàn giao dự án; PM nhập/phân công file test case; Tester thực thi trên thiết bị được giao; Dev xử lý bug/QA; Tester retest và PM theo dõi, đóng công việc. Thay đổi bao gồm backend Spring Boot/MySQL, giao diện React, migration và tài liệu các sprint đã tập hợp trên nhánh.

## Phạm vi

- Backend, đăng nhập/session và phân quyền ADMIN/PM/DEV/TESTER; enforce membership, phạm vi dự án, version/xung đột, idempotency và audit tại server.
- Khôi phục màn danh sách file và bảng test case, menu chi tiết/lịch sử. Import nhận diện tiêu đề Excel, hỗ trợ dữ liệu nguồn/ô gộp theo quy tắc đã chốt; tự lưu kết quả tài liệu và xuất bản cập nhật, giữ chức năng tải file gốc riêng.
- Luồng phân công file, phiên làm việc và thiết bị; thực thi theo đợt/build, bug/QA, trả lời/xác minh, retest, bàn giao giữa vai trò và danh sách việc cần xử lý.
- Khu Admin: dashboard dự án, user/membership, kho từng máy và bàn giao/thu hồi, báo cáo tiến độ; lưu trữ/mở lại dự án có điều kiện, lý do và lịch sử.
- Cải thiện responsive, đồng bộ menu/bộ lọc, cuộn, trạng thái lỗi/loading và thao tác bàn phím. Sửa lỗi form Sửa/Bàn giao/Thu hồi mở ngoài vùng nhìn thấy ở cuối danh sách; hủy trở lại đúng nút xuất phát.
- Native MySQL và Flyway khi khởi động; cấu hình local/release, script kiểm thử/backup và tài liệu API, PRD, đặc tả, hướng dẫn và bằng chứng review.
- Demo local V20/V22: V22 thêm 100 tài khoản (3 PM, 20 DEV, 77 TESTER), 120 máy (30 mỗi nhóm iPad/iPhone/tablet Android/smartphone Android), 3 dự án và 24 lượt bàn giao. Không seed workbook, case hay kết quả giả trong V22.

Tại thời điểm tạo PR: 18 commit, 723 file thay đổi so với `develop`; head `d7b91d9`. Đây là PR tích hợp toàn nhánh, không chỉ phần seed V22.

## Database và cách chạy

- Core migration đến V21; V20/V22 nằm riêng ở `db/demo`, chỉ profile local nạp dữ liệu demo công khai. Release không tự cài các tài khoản demo. Migration tiếp theo dùng V23 trở lên.
- Sau pull, cấu hình database đã tồn tại và tài khoản có quyền migration trong `.env.mysql.local`, đặt `TMS_BOOTSTRAP_ENABLED=false` cho demo local, rồi khởi động backend để Flyway áp dụng. Không cần import SQL bằng tay; xem [README](../blob/system-design/README.md).
- Local bàn giao đã backup, khởi động lại backend8080, dùng native MySQL3307 và áp dụng V22. Hash 5.303 hàng cũ trên 65 bảng nghiệp vụ và 8 workbook nguồn giữ nguyên sau migration. Đây là bằng chứng local, không phải đã triển khai môi trường dùng chung.
- V22 chỉ thêm dữ liệu trong transaction. Trùng namespace hoặc Admin demo không hợp lệ thì migration dừng/rollback, không tự đổi quyền hay reset dữ liệu. Không dùng `clean`/`repair` để bỏ qua lỗi.
- Thông tin kết nối riêng, backup database, cookie/token và thư mục `var/` không nằm trong PR.

## Kiểm chứng gần nhất (08–09/10/2026)

| Phạm vi | Kết quả |
| --- | --- |
| Frontend toàn bộ sau sửa | 665/665 PASS, 57 files; build PASS |
| Coverage V8 frontend | 85.13% statements / 82.30% branches / 78.75% functions / 83.42% lines |
| Admin regression | 68/68 PASS, đã nằm trong bộ frontend trên |
| Native F/Q integration | 9/9 PASS trên schema riêng V19, service/MockMvc + MySQL |
| Native F/Q concurrency | 5/5 PASS trên schema riêng V19 |
| Native V22 migration | 1/1 PASS: fresh/core-local, V21→V22 giữ dữ liệu, kiểm tra 100 hash, role/FK/audit, replay không reset, collision rollback và Admin bị đổi quyền |
| Native runner guard | 10/10 PASS |
| Backend verify/package và Java diagnostics | PASS; 204 source, 0 errors / 0 warnings |
| HTTP preview V22 | 6 kịch bản PASS: phân trang/count, trường thiết bị, scope dự án, quyền, giao đồng thời/thu hồi/version cũ, chặn giao máy bảo trì |
| Bản local chính | Đăng nhập PM/DEV/TESTER, scope và Admin403/project404; đủ100user/120máy/3dự án; health200/UP |
| Browser Chrome | Danh sách/lọc/phân trang/focus và cuộn vùng bảng, viewport1366/768/375; UI5173 thấy120máy mới |

Các kiểm thử ghi/xóa fixture chạy trên schema riêng, không chạy trên database đang sử dụng. Số test trên thuộc các phạm vi khác nhau, không cộng các bộ chồng lặp thành tổng chất lượng. Không chạy lại toàn bộ backend suite trong đợt V22; bằng chứng các đợt trước giữ tại `docs/reviews/`. Lượt tạo PR này không thay code hoặc chạy lại kiểm thử đã đạt.

## Giới hạn còn mở

- S11 vẫn IN_REVIEW: cần UAT bốn vai trò qua giao diện với workbook của khách hàng; native/HTTP không thay nghiệm thu người dùng.
- Viewport Chrome chưa thay kiểm thử Safari/iPad/iPhone/Android thật, bàn phím ảo và zoom200% toàn hành trình.
- Chưa nghiệm thu lại toàn chuỗi browser mất mạng/hết phiên/hai tab, load100người đồng thời hoặc restoreV22 kèm chứng cứ trên môi trường đích.
- Bundle JS560.57kB (gzip158.22kB) còn cảnh báo >500kB. Native MySQL9.7 có cảnh báo ngoài phiên bản đã được Flyway hiện tại kiểm chứng; migration thực tế PASS, vẫn cần chốt cặp phiên bản cho production.
- Thông báo đã đọc/chưa đọc lưu bền và nhắc việc xuyên màn còn là phần mở; không coi polling hiện có là đã hoàn tất.

## Tài liệu review

- [Báo cáo kiểm nghiệm V22 và bằng chứng](../blob/system-design/docs/reviews/2026-10-09-verification-demo-v22.md)
- [Tài khoản, CSV thiết bị và cách dùng V22](../blob/system-design/docs/database/demo-v22.md)
- [Tiêu chí nghiệm thu khách hàng](../blob/system-design/docs/reviews/2026-10-08-customer-quality-gates.md)
- [PRD, đặc tả và traceability](../blob/system-design/docs/product/README.md)
- [Trạng thái sprint và phạm vi bàn giao](../blob/system-design/docs/planning/STATUS.json)
