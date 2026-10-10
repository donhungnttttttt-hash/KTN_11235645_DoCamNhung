# Hiệu năng Sprint 10

Ngày 30/09/2026. Quy mô giả định đã thông báo: **1.000 test case, 20 đợt × 500 lượt, 10.000 lượt/attempt và 1.000 bug liên kết NG**. 20 user nội bộ khác nhau, cookie/session riêng, Hikari pool 5. Dataset ẩn danh trong MySQL Testcontainers 8.4.8; không thêm dữ liệu tải vào DB demo. Chưa có SLA hoặc quy mô production được người dùng chốt.

`PerformanceProbe#measureLoad` chạy opt-in, không tự tăng thời gian mọi lần unit test:

```powershell
# Từ gốc repo, Docker hoạt động
rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests 'PerformanceProbe#measureLoad'
rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests 'QueryProbe#diagnose'
```

Ba endpoint work-items, test-cycles và reports/summary được đo 100 request mỗi endpoint, 20 phiên đồng thời × 5 request nối tiếp; 3 lần warmup báo cáo. Thời gian bao gồm HTTP, session, MySQL, serialize JSON và đọc body ở client. P50/P95/max theo mẫu, status/error count và môi trường trong `target/performance/sprint-10.json`. File được ghi cả khi có phản hồi lỗi; chỉ PASS khi mọi response 200 và mẫu số/bản ghi đúng. Không đo rendering, không phải soak test hoặc SLA.

Môi trường Windows 11, Java 21.0.9, MySQL 8.4.8 Docker Desktop, JVM thấy 16 CPU, max heap khoảng 3,86 GiB, JaCoCo bật. Fixture batch SQL có FK/check hoạt động; không khẳng định seed qua từng thao tác UI. Không đo nhiều project rất lớn, write contention, build-filter stress hoặc export 5.000 dòng đồng thời. QueryProbe chạy SQL thật và EXPLAIN ANALYZE cùng bind values, lưu kế hoạch không chứa credential.

## Finding và sửa

Lần đầu có 500/503 khi hết kết nối chờ 3 giây. `DEBUG=release` thừa kế vô tình bật debug Spring. Start-Backend tắt mặc định, có `-DebugLogging`; Test-Backend tắt DEBUG/TRACE trong thời gian test rồi khôi phục. `SessionAccountFilter` hiện trả 503 an toàn khi không mở được transaction, không đăng xuất user do sự cố tạm thời.

[Baseline trước tối ưu](sprint-10-before.json) có 30/100 lỗi báo cáo. Fixture ban đầu 10 đợt × 1.000 chưa đúng giới hạn 500 lượt/đợt ở service, nên **không dùng nó làm A/B nghiêm ngặt** với số đo sau. Fixture đã sửa thành 20 × 500.

Chuyển đếm sang SQL và LIMIT ở cuối query vẫn không đủ: [lần trung gian](sprint-10-intermediate.json), đúng 20 × 500, còn 42/100 lỗi, P95 6.415 ms. [EXPLAIN ANALYZE trước sửa cuối](sprint-10-query-plans-before.json) cho thấy join chi tiết vẫn chạy qua 10.000 dòng trước LIMIT; join tên user quá sớm cũng nhân lượng lookup. Probe chẩn đoán này có 3 user fixture, khác 23 user sau khi tạo 20 phiên đo tải; không coi thời gian query đơn lẻ là latency tải đồng thời.

Bản sửa cuối lấy trang trong derived table trước join case/revision/catalog, aggregate theo cycle/assignee và ngày/executor trước khi join tên. Giữ snapshot REPEATABLE_READ, build selection, NA và công thức; không cache, không tăng pool/cap và không thêm index/migration thiếu căn cứ. Regression kiểm tra 60 lượt, hai người, hai trang 50/10, page vượt phạm vi và build filter.

Lần đo ngay sau sửa trước khi vá dependency: **300/300 HTTP 200**, báo cáo P50 1.429 ms, P95 1.740 ms, max 2.471 ms; log debug của test context trước còn ảnh hưởng nên không dùng làm số đo cuối.

## Kết quả cuối trên dependency đã vá

`scripts/Test-Backend.ps1 -Tests 'PerformanceProbe#measureLoad,QueryProbe#diagnose'`: **2 tests PASS, BUILD SUCCESS, mã kết thúc 0** ngày 30/09/2026. DEBUG/TRACE tắt, cùng Hikari 5. [JSON kết quả](sprint-10-after.json) và [EXPLAIN ANALYZE cuối](sprint-10-query-plans-after.json); log `scratch/s10-final-probes.log` được ignore.

| Endpoint | HTTP 200 / tổng | P50 ms | P95 ms | Max ms | Request/giây |
| --- | --- | --- | --- | --- | --- |
| Công việc, 50 dòng | 100/100 | 445 | 562 | 619 | 43,92 |
| Đợt kiểm thử, 20 dòng | 100/100 | 360 | 412 | 421 | 54,88 |
| Báo cáo, 10.000 lượt | 100/100 | 1.504 | 1.910 | 2.124 | 12,43 |

Phép đo trước đó trên cùng bản vá cũng đạt 300/300, P95 báo cáo 1.850 ms. Wrapper PowerShell lần đó coi cảnh báo stderr của RTK là lỗi dù hai test đã qua; đã sửa để giữ exit code native và chạy lại thành công như bảng trên. Không coi một giá trị nhanh nhất là cam kết. Không suy mức cải thiện hoặc SLA từ mẫu ngắn, khác JVM warmup/OS scheduling.

Các truy vấn report không gọi DB theo từng dòng ở Java. `ProjectService.list/listMembers` vẫn có truy vấn theo membership, cần đo riêng khi scope nhiều thành viên; không tuyên bố đã loại hết N+1 của ứng dụng. Export vẫn có cap 5.000, UI cap 10.000; cần thu hẹp đợt khi vượt cap.
