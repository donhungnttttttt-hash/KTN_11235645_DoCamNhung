# Vận hành và hỗ trợ nội bộ

Tài liệu đi cùng [triển khai](../deployment.md), [phục hồi](recovery.md) và [hướng dẫn người dùng](../user-guide.md). Chưa có SLA, lịch trực, retention hoặc RPO/RTO production được phê duyệt.

| Triệu chứng | Kiểm tra / xử lý |
| --- | --- |
| Không đăng nhập được | Kiểm tra backend/readiness, tài khoản enabled và giới hạn đăng nhập; không in password/session vào log |
| Không thấy dự án hoặc bị 404 | Kiểm tra membership active; Admin toàn cục không tự được đọc mọi dự án |
| Bị 403 khi phân công/đóng bug | Dùng PM đúng dự án; không nâng quyền Tester để vượt lỗi |
| 409 khi lưu | Tải lại phiên bản, giữ bản nháp để đối chiếu; không ghi trực tiếp SQL |
| Excel lỗi | Đối chiếu sheet/cột, mã nhóm, số dòng, công thức, kích thước; staging quá hạn phải tải lại |
| Runtime release không ready | Kiểm tra job migration và checksum; không bật Hibernate update hoặc Flyway repair để chạy tiếp |
| Tải chứng cứ lỗi | Đối chiếu volume/ACL/dung lượng và metadata; không đổi đường dẫn thành URL công khai |
| Redmine UNCERTAIN | Đối chiếu marker/ticket trên sandbox được phép trước retry; không tự clear create_attempted |
| Seed bị gián đoạn | Đối chiếu bước pending trong journal với API; bảo toàn dữ liệu đã commit, không reset DB |

Thu thập phiên bản artifact/schema, thời gian UTC, requestId, actor/role cần thiết, project/work-item ID và bước tái hiện. Không gửi dump/log chứa credential hoặc tệp khách hàng ra dịch vụ khác. Người vận hành xử lý hạ tầng; PM xác nhận nghiệp vụ/phạm vi; Admin quản lý tài khoản và quyền cấp riêng.

Các lệnh local không ghi dữ liệu:

```powershell
rtk proxy powershell -NoProfile -File scripts/Check-System.ps1
rtk proxy node scripts/Audit-LocalDatabase.cjs
```

Audit database dùng runtime account và transaction chỉ đọc, kiểm tra FK cùng sáu điều kiện domain; đây không thay schema review, antivirus hoặc pentest. `Backup-Local.ps1` là checkpoint **chỉ DB**; phục hồi đầy đủ cần cả chứng cứ, cấu hình và quy trình ở recovery.md.
