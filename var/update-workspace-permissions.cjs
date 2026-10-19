const fs=require('fs');const p='docs/business/permissions.md';let s=fs.readFileSync(p,'utf8');
s=s.replace('# Quyền nội bộ — Sprint 02',`# Quyền nội bộ

## Quyền xem của quản trị tổng — 10/10/2026

Theo yêu cầu sửa lỗi Admin thấy dự án tại quản trị nhưng workspace trống: ADMIN đang hoạt động được liệt kê và đọc mọi dự án trong Không gian dự án, kể cả khi không có membership. Phạm vi đọc gồm công việc/QA, tài liệu đã import, case/revision, đợt/run/lịch sử, file được giao, báo cáo, danh mục, thành viên và máy bàn giao. Hàng việc cần xử lý của Admin quan sát là toàn dự án; bộ lọc cá nhân vẫn chỉ lấy đúng người.

Quyền xem không tạo membership, không tự gán PM/Tester và không cho phép ghi kết quả, nhập file, phân công hoặc chuyển trạng thái nghiệp vụ. ProjectSummary.projectRole vẫn null nếu không có membership; UI thể hiện chế độ xem. ADMIN có membership thật tiếp tục theo quy tắc hiện có. Các lệnh chỉ PM, executor, Dev được giao hoặc Tester tạo QA vẫn kiểm tra vai trò/người được giao như trước.

Tài khoản PM/Tester/Dev chỉ đọc các dự án có membership active. Resource ID vẫn phải thuộc projectId trên URL; Admin không được đọc resource của dự án B bằng URL của A. Preview import chưa commit vẫn thuộc người tạo. Tài khoản bị khóa/thu hồi quyền không được dùng quyền Admin cũ. Xem [báo cáo kiểm chứng](../reviews/2026-10-10-admin-workspace-read.md).

Các mục lịch sử bên dưới áp dụng cùng cập nhật quyền đọc này; không mở rộng quyền ghi.`);
const replacements=[
 ['ADMIN ngoài membership chỉ có API quản trị, không được dùng quyền PM nghiệp vụ ngầm.','ADMIN ngoài membership có quyền quản trị và quyền đọc workspace toàn hệ thống; không có quyền PM nghiệp vụ ngầm.'],
 ['Đọc case/suite cần membership đang hoạt động. ADMIN ngoài dự án cũng bị từ chối; gỡ thành viên chặn cả đọc và ghi ngay request tiếp theo.','Đọc case/suite cần membership đang hoạt động hoặc global ADMIN hiện hành. Gỡ thành viên chặn quyền ghi; PM/Tester/Dev bị gỡ cũng mất quyền đọc.'],
 ['Thành viên active của chính dự án; ADMIN ngoài dự án không được đọc','Thành viên active của chính dự án hoặc global ADMIN hiện hành'],
 ['ADMIN ngoài dự án không tự được xem hoặc ghi resource nghiệp vụ dự án.','ADMIN ngoài dự án được đọc resource nghiệp vụ theo cập nhật 10/10/2026, không tự có quyền ghi.'],
 ['Quyền đọc tài liệu/case/xuất của workspace vẫn yêu cầu membership hiện hành; quyền quản trị tổng không trở thành quyền nghiệp vụ dự án.','Quyền đọc tài liệu/case/xuất của workspace cho phép membership hiện hành hoặc ADMIN đang hoạt động; quyền quản trị tổng không trở thành quyền ghi nghiệp vụ dự án.'],
];
for(const [a,b] of replacements){if(!s.includes(a))throw Error(a);s=s.replace(a,b);}fs.writeFileSync(p,s);
