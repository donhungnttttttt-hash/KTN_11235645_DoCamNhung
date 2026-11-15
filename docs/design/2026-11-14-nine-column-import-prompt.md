# Prompt triển khai import 9 cột

Target: Codex. Theo yêu cầu người dùng dùng skill prompt-master rồi thực hiện ngay trong repository hiện tại.

```text
Sửa import Excel của Feature trong repository hiện tại, nhánh system-design, stack React JavaScript + Spring Boot + MySQL/Flyway.

Chỉ lấy dữ liệu của 9 trường: ID, No, Đối tượng test, Điều kiện tiên quyết, Các bước test, Quan điểm test, Hạng mục xác nhận, Kết quả mong đợi, Ghi chú thiết kế. Nhận diện theo tiêu đề được hỗ trợ; giữ nguyên thứ tự dòng và tọa độ nguồn. Bỏ qua các cột ngoài danh sách ngay khi đọc dữ liệu, trước kiểm tra nội dung. Giữ ô nội dung trống và toàn bộ case có ID hợp lệ.

Sau import, giao diện gồm 9 cột trên cộng Version test, Status, Issue, Người test của web. Không lấy dữ liệu Status, Version, người test hoặc ticket từ các cột dư trong Excel. Giữ file gốc nguyên byte để tải lại.

Tái hiện bằng file người dùng cung cấp; sửa parser, validation và reader/export liên quan trực tiếp. Giữ giới hạn quyền, ID, dung lượng và kiểm tra an toàn workbook; không đánh giá công thức. Không sửa dữ liệu cũ hay migration cũ.

Viết test thất bại trước sửa. Kiểm thử trường hợp cột dư, đổi thứ tự/tiêu đề có khoảng trắng, ô nội dung trống, trường được chọn không hợp lệ, và preview → commit → đọc → export bằng file thực tế trên database cô lập. Báo kết quả và giới hạn đã kiểm chứng. Không tự commit/push.
```

Prompt dành cho agent có quyền sửa source và chạy lệnh; kiểm tra đường dẫn/phạm vi khi dùng lại trong môi trường khác.
