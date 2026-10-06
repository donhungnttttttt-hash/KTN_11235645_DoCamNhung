# Bàn giao theo vai trò — 06/10/2026

Người dùng đã yêu cầu tạo tài khoản Admin/PM/Tester/Dev, tự kiểm thử, sửa 7 cảnh báo Java, bàn giao và push lên system-design.

## Giới hạn chung
- Giữ các thay đổi ADMIN/FQ đã review; không làm lại nhiệm vụ DONE.
- Không reset, clean hoặc chạy fixture phá dữ liệu trên tms. Kiểm thử migration dùng schema riêng.
- Được tạo tài khoản và commit/push system-design; không merge, force-push hay triển khai ngoài máy này.
- Không đưa mật khẩu, cấu hình local hoặc dữ liệu khách hàng lên Git.

## Task 1: Sửa cảnh báo null Java
Tái hiện 7 cảnh báo potential null trong FileWorkSessionService, QaService, FileWorkExecutionTest, FileWorkServiceTest, FileWorkSessionTest, QaServiceTest bằng JDT có potentialNullReference bật. Sửa null flow thực sự, không tắt warning/suppress. Giữ hành vi, chạy các test liên quan và chẩn đoán lại. Lưu bằng chứng và diff so với working tree trước sửa. Không commit riêng vì các file thuộc đợt ADMIN/FQ chưa commit; controller sẽ commit toàn bộ sau review.

## Task 2: Tài khoản và kiểm thử thực tế
Kiểm tra quyền native hiện tại, dùng schema riêng để kiểm thử migration khi quyền cho phép. Chuẩn bị backup trước migration live. Tạo tài khoản thử nghiệm có vai trò tương ứng, kiểm thử API quyền và luồng nghiệp vụ; ghi rõ kiểm thử đã chạy và phần chưa chạy. Không suy diễn compile thành nghiệm thu runtime.

## Task 3: Bàn giao và push
Cập nhật hướng dẫn/PRD/đặc tả/STATUS bằng kết quả thực tế; kiểm tra diff, secrets và build/test cần thiết. Commit và push system-design, kiểm tra remote SHA.

## Kết quả 06/10/2026
- Task 1 hoàn tất, review Approved: 7 cảnh báo sửa xong; JDT cuối 192 source / 0 lỗi / 0 cảnh báo.
- Task 2 tài khoản và kiểm tra quyền hoàn tất: 4 tài khoản, PM/Tester/Dev vào DEMO-PILOT, 47 kiểm tra HTTP, browser đăng nhập đủ 4 vai trò. Phát hiện/sửa thêm lỗi 500 khi gán thành viên do projection MySQL; regression RED/GREEN, review Approved; 396 test offline PASS.
- Task 2 migration/full F/Q còn chặn bởi quyền MySQL: root cấu hình trả 1045, chưa có schema riêng. Đã backup; không chạy fixture phá dữ liệu trên tms hoặc ghi PASS không có bằng chứng.
- Task 3 bộ tài liệu/kiểm tra đã hoàn thiện, code tập hợp tại commit `2a0ace7`; báo cáo đầy đủ tại docs/reviews/2026-10-06-role-handover.md. Trạng thái push được đối chiếu remote trong bước bàn giao cuối. Native UAT không vì push mà tự chuyển DONE.
