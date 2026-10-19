const fs=require('fs');
function append(path,text){if(fs.readFileSync(path,'utf8').includes(text.trim().split('\n')[0]))throw Error('Already present');fs.appendFileSync(path,'\n'+text.trim()+'\n');}
append('docs/product/DATA-DICTIONARY.md',`## Bổ sung V21 — quyết định vòng đời dự án

Bảng project_lifecycle_decisions (không thay projects.archived_at):

| Cột | Ý nghĩa / ràng buộc |
| --- | --- |
| id | BIGINT tự tăng, khóa chính |
| project_id | FK projects.id; phạm vi lệnh và lịch sử |
| action | ASCII phân biệt hoa thường, ARCHIVE hoặc REOPEN |
| reason | VARCHAR(2000), không trống sau trim; lý do người thực hiện |
| expected_version | Phiên bản dự án khi xác nhận, không âm |
| result_version | expected_version + 1; unique cùng project_id |
| request_key | ASCII VARCHAR(100), unique cùng project_id; service kiểm tra 8–100 ký tự chữ/số/gạch dưới/gạch ngang |
| payload_hash | SHA-256 của action/version/lý do chuẩn hóa; kiểm tra retry |
| actor_id | FK identity_users.id; tài khoản ADMIN hiện hành lúc lệnh được nhận |
| decided_at | DATETIME(6) UTC, thời điểm quyết định |

Chỉ thêm bản ghi; không endpoint sửa/xóa quyết định. GET history không trả request_key hoặc payload_hash. Dự án tăng lock_version và ghi project_audit trong cùng transaction. Lệnh lặp cùng actor/payload trả trạng thái hiện hành; lệnh khác dùng lại key bị 409. Archive không xóa dòng ở bảng nghiệp vụ con.`);
append('docs/product/TRACEABILITY-UAT.md',`## Bổ sung nghiệm thu vòng đời dự án — V21

| Mã | Kịch bản khách hàng | Kết quả mong đợi |
| --- | --- | --- |
| L21-01 | PM/Tester/Dev gọi trực tiếp archive/reopen | 403; Admin bị vô hiệu hóa không dùng quyền từ phiên cũ |
| L21-02 | Admin kiểm tra dự án còn phiên/máy/ticket/đợt có việc/retest/outbox chờ | Số blocker đúng, hướng xử lý rõ, không xác nhận được; server kiểm lại cả khi UI checklist đã cũ |
| L21-03 | PM hoàn tất hoặc không xử lý TASK/REQUEST/IMPROVEMENT | Có lý do/version/history; Tester/Dev bị chặn; BUG/QA không đi tắt |
| L21-04 | Admin lưu trữ dự án đủ điều kiện | Một quyết định và audit; dự án chỉ đọc; đọc/xuất hồ sơ còn hoạt động theo quyền |
| L21-05 | Timeout sau ghi, thử lại cùng lệnh; Admin khác mở lại giữa hai lần | Không nhân đôi quyết định; replay không đảo ngược trạng thái mới hơn |
| L21-06 | Tạo đợt/cấp máy/ghi nghiệp vụ cạnh tranh với archive | Khóa hiện hành giải quyết thứ tự; không ghi nghiệp vụ mới khi đã archive |
| L21-07 | Mở lại dự án có lý do | Cho làm việc theo quyền hiện hành; không cấp máy hoặc tự mở lại ticket |
| L21-08 | Redmine failed/uncertain/conflict trước archive | Có cảnh báo không chặn; hiểu rằng cần mở lại trước khi đối chiếu/thử lại |
| L21-09 | Tester lưu rồi mở lịch sử trong lúc phản hồi chậm; inbox polling/mất mạng | Giữ case/focus phù hợp; không giành focus từ thao tác mới; quyền bị thu hồi xóa bản đọc cũ |
| L21-10 | Modal ở 375/768/1366 và tên dự án dài, chưa lưu form thành viên | Không tràn toàn trang; control dễ bấm; nháp không mất khi chuyển vòng đời |

Kết quả kiểm thử kỹ thuật và giới hạn ghi tại [đánh giá lần hai](../reviews/2026-10-08-customer-reassessment.md). Các dòng này là kịch bản để khách hàng thực hành; không tự đánh dấu đã được người dùng thật nghiệm thu.`);
