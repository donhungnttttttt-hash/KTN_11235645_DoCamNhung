# Icon sửa và thu hồi

Theo yêu cầu, thay các nút hành động Sửa bằng Pencil ở kho máy, chi tiết dự án, danh mục, Note, Feature và Issue. Thu hồi thiết bị dùng Undo2 ở kho máy và bảng lịch sử dùng chung với màn thiết bị dự án. Giữ handler, quyền và disabled; bổ sung title/aria-label, icon 18px và vùng bấm 44px. Nội dung ô dữ liệu có thể sửa và nhãn cấp/thu hồi quyền tài khoản không thuộc nhóm nút hành động thiết bị này.

Giữ các thay đổi UI đã được yêu cầu trước đó: nút thêm thành viên ở chân bảng với icon cộng và màu xanh nhạt khi bật; nút bổ sung máy đặt cạnh phân trang và căn phải.

## Đồng bộ code và giải quyết conflict

Đã pull fast-forward từ 9487333 lên bf3971c, gồm quản trị hồ sơ tài khoản và chính sách thành viên mới. Lưu bản sửa UI trước pull trong stash 93adb62de5d77c29e7c82b7d6894d258c0e6346d, giữ bản sao này sau khi áp dụng. Giải quyết ba file conflict AdminProjectDetail, AdminProjectForm và admin-management.test.jsx. Giữ bộ chọn dùng chung, loại trừ thành viên theo projectId, vai trò cố định và ADMIN · Làm PM; chuyển footerAction sang projects/MemberPicker.jsx. Giữ icon, bố cục nút và nhãn Đã bàn giao của local. Không sửa backend so với commit vừa pull.

Kiểm chứng sau gộp: 1.221/1.221 test frontend trong 132 file đạt; build đạt (cảnh báo bundle 514,09 kB). Không còn file unmerged hoặc marker conflict trong source frontend/backend. Không chạy backend/database/migration, không commit/push; thay đổi UI vẫn ở working tree.

Skill áp dụng: frontend-ui-engineering cho icon và tên truy cập; kiểm tra hồi quy toàn frontend theo test runner hiện có. 1.203/1.203 test trong 129 file đạt, Vite build đạt. Còn cảnh báo bundle JS 506,98 kB vượt ngưỡng 500 kB. Không đo coverage mới, chưa quan sát toàn bộ màn hình bằng browser. Không đổi backend/database, không commit/push. Trạng thái source và kiểm thử frontend hoàn tất; nghiệm thu hình ảnh thực tế còn riêng.
