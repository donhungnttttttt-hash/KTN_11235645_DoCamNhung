# Môi trường trống và tự điền Issue — 15/11/2026

Người dùng báo dropdown môi trường hiện “Không tìm thấy tài nguyên” và môi trường của Issue trống trên máy local. Skill: systematic-debugging; tiếp tục nguyên tắc test-driven-development/verification-before-completion đã áp dụng.

## Điều tra

- Khi bắt đầu, 8080 và 5173 chưa có listener. Sau đó cả hai được khởi động trong lúc kiểm tra; script có guard của tác vụ không khởi động hoặc dừng tiến trình nào.
- Jar trong `Backend/target` có endpoint môi trường và migration V42; DB local đang V42, danh mục môi trường chưa có bản ghi.
- HTTP có đăng nhập qua 5173: Feature14/project3, môi trường, version và danh sách file đều 200. Môi trường trả `[]`; nguồn Issue có `environmentName: null`, `testVersionName: "1.4.1"`. Receipt chỉ chứa dữ liệu kiểm tra cần thiết tại `var/file-owners-20261114/environment-probe.json`.
- Vì vậy không tái hiện được 404 trong ảnh trên bản đang chạy. Chưa đủ bằng chứng kết luận backend cũ, sai scope hay nguyên nhân khác của phản hồi trước đó. Không đổi lỗi HTTP thành danh sách trống để che lỗi.
- Khi danh sách thực sự trống, component hiện “Chưa có môi trường”. Thêm kiểm tra 404 → Thử lại → 200/`[]`: lỗi được xóa và hiện nhãn trống đúng.

## Sửa Issue

Luồng mở form đã lấy `environmentName` từ context case. Phát hiện thêm lỗi thật: khi case ban đầu chưa có môi trường, sau đó được bổ sung môi trường và người dùng tải lại nguồn, bản nháp vẫn giữ ô trống.

Thêm regression `refreshes the case environment when it was not manually edited, without overwriting the issue draft`: thấy FAIL trước sửa, PASS sau sửa. Theo dõi việc sửa tay trường môi trường riêng; tải lại tự cập nhật giá trị nếu chưa sửa tay, giữ nguyên các trường nháp khác. Môi trường đã sửa tay được giữ nguyên, kể cả khi nguồn thay đổi. Bổ sung hướng dẫn chọn môi trường ở MT & Ver khi nguồn chưa có giá trị. Thiết bị vẫn độc lập.

Kiểm tra manual-preservation trước đây chỉ thay nội dung mà chưa bấm tải lại; đã bổ sung thao tác tải lại thực sự để kiểm chứng đúng tên test.

## Kiểm chứng

- 16/16 test tập trung PASS: `FeatureIssueForm.test.jsx`, `FeatureTestVersions.test.jsx`; log `var/environment-issue-green.log`.
- Production build PASS: `var/environment-issue-build.log`.
- Full frontend regression: **1.399/1.399 test, 152 file PASS**, `var/environment-issue-full.log`. Vite đang phục vụ module có bản sửa mới qua HTTP 200.
- `git diff --check` PASS.
- Không sửa backend/schema hoặc ghi dữ liệu nghiệp vụ lên main. Không đo coverage mới; số đo ngày 14/11 không được coi là coverage của lần sửa này.
- Chrome tab riêng đã thử mở đúng URL local; native pipe không khả dụng. Chưa kiểm tra giao diện bằng browser thật.
- Không commit/push.
