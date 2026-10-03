# Ảnh ERD database hiện tại — Flyway V11

Bộ ảnh tĩnh theo yêu cầu ngày 01/10/2026: nền xanh nhạt, tên bảng, **đầy đủ cột và kiểu MySQL**, ký hiệu PK/FK và đường nối. Không cần mở web hoặc chạy ứng dụng để xem.

- **[Ảnh tổng thể đủ 56 bảng (PNG)](00-toan-bo-56-bang.png)** — phóng to để đọc.
- [Ảnh vector tổng thể (SVG)](00-toan-bo-56-bang.svg) — phóng to không vỡ chữ.
- [Tải trọn bộ PNG/SVG (ZIP)](../tms-database-images-v11.zip).

## Ảnh chi tiết theo nhóm

| Nhóm | Bảng trong nhóm | Ảnh PNG |
| --- | ---: | --- |
| Danh tính và đăng nhập | 6 | [Xem ảnh](01-danh-tinh-dang-nhap.png) |
| Dự án và cấu hình | 13 | [Xem ảnh](02-du-an-cau-hinh.png) |
| Thư viện test case và nhập Excel | 5 | [Xem ảnh](03-thu-vien-test-case-excel.png) |
| Thực thi kiểm thử | 9 | [Xem ảnh](04-thuc-thi-kiem-thu.png) |
| Công việc và bug | 10 | [Xem ảnh](05-cong-viec-bug.png) |
| Retest và đóng lỗi | 7 | [Xem ảnh](06-retest-dong-loi.png) |
| Tích hợp Redmine | 3 | [Xem ảnh](07-tich-hop-redmine.png) |
| Nền tảng kỹ thuật | 3 | [Xem ảnh](08-nen-tang-ky-thuat.png) |
| **Tổng** | **56** | **514 cột, 128 ràng buộc FK** |

Ảnh nhóm có **bảng xanh đầy đủ cột** và **bảng xám tham chiếu ngoài nhóm chỉ hiện các cột khóa liên quan**. Bảng xám có thể xuất hiện ở nhiều ảnh, không phải bảng hoặc database mới. Mỗi FK nằm trong ảnh nhóm của bảng con; không vẽ thêm các quan hệ giữa hai bảng xám.

## Cách đọc và giới hạn

- `PK`: khóa chính; `FK`: cột thuộc khóa ngoại. Một cột có thể thuộc nhiều FK.
- `UQ`: unique riêng một cột. Không gắn UQ lên từng cột của unique ghép để tránh hiểu sai.
- `NULL`: cho phép NULL. Cột không có ký hiệu này là NOT NULL; không đồng nghĩa chuỗi rỗng bị cấm.
- `AI`: tự tăng; `GEN`: cột được MySQL tính tự động.
- Đường có chân quạ ở bảng con: tối đa nhiều hàng; hai vạch: đúng một; vòng tròn: tùy chọn. Cardinality suy từ nullable và unique trong schema, không thay cho điều kiện nghiệp vụ.
- **Một đường là một ràng buộc FK**, kể cả FK ghép. Đường nối vào một cột đại diện để tránh 251 đường chồng chéo; [foreign-keys.csv](foreign-keys.csv) ghi đầy đủ 128 tên constraint và từng bộ cột cha–con. SVG có tooltip mapping. Ví dụ một FK `(project_id, work_item_id)` không được hiểu thành hai FK độc lập.
- Đây là ERD vật lý. Không tự thêm FK cho các liên kết chỉ tồn tại trong Java/session/JSON. Đọc DDL/migrations khi cần CHECK, DEFAULT, index ghép hoặc quy tắc ON DELETE.

Nguồn: [schema.json](../schema.json), trích từ MySQL đang dùng lúc **00:38 ngày 01/10/2026, giờ Việt Nam**; một schema `tms`, Flyway V11. 55 bảng ứng dụng (gồm bảng kỹ thuật) và một bảng `flyway_schema_history`. Không có dữ liệu hàng, password hash hay credential trong bộ ảnh. [Manifest](manifest.json) lưu SHA-256 metadata và số lượng theo ảnh để đối chiếu.

## Tạo lại ảnh

Tại gốc repo, công cụ vẽ được cài riêng vào thư mục scratch (không thêm dependency cho FE/BE):

```powershell
rtk proxy npm install --prefix scratch/erd-renderer --no-audit --no-fund @viz-js/viz@3.31.0 sharp@0.35.5
rtk proxy node scripts/Render-DatabaseImages.cjs
rtk proxy powershell -NoProfile -Command "Compress-Archive -Path docs/database/erd/images/* -DestinationPath docs/database/erd/tms-database-images-v11.zip -Force"
```

Script chỉ đọc metadata, không kết nối/sửa MySQL và không chạy container. Cần xuất lại metadata sau khi có migration mới bằng công cụ đã có trong repo trước khi tạo ảnh. Công cụ layout [Viz.js](https://viz-js.com/api/) và xuất PNG [sharp](https://sharp.pixelplumbing.com/api-constructor/); nguồn quyết định bảng/cột/FK luôn là metadata local.
