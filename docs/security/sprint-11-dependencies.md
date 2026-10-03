# Quét lại dependency trong Sprint 11

Lần quét OSV lúc 2026-09-30 16:56 UTC phát hiện hai advisory mới trên `jackson-databind 2.21.6`, sau lần kiểm tra buổi sáng S10. Kết quả trước sửa: [JSON](sprint-11-advisories-before.json). Nguồn công bố được kiểm tra trực tiếp từ nhà duy trì:

- [GHSA-cxp5-3px4-pw24 / CVE-2026-91777](https://github.com/FasterXML/jackson-databind/security/advisories/GHSA-cxp5-3px4-pw24): xử lý forward reference trong model có `JsonIdentityInfo` có thể gây chi phí CPU tăng bậc hai.
- [GHSA-wv8q-qhhj-9h54 / CVE-2026-91776](https://github.com/FasterXML/jackson-databind/security/advisories/GHSA-wv8q-qhhj-9h54): cache type ID không biết có thể tăng không giới hạn khi bật polymorphism cùng default implementation.

Cả hai nêu **2.21.7** là bản vá của nhánh 2.21. `Backend/pom.xml` nâng Jackson BOM đồng bộ 2.21.6 → 2.21.7, giữ nguyên Java/Spring Boot và major Jackson. Tìm trong mã ứng dụng không thấy `JsonIdentityInfo`, `JsonTypeInfo` hoặc bật default typing; đây chỉ là đánh giá cấu hình hiện tại, không chứng nhận toàn bộ dependency không thể chạm đường lỗi.

Regression trước bản vá đã dừng có chủ đích, không tính là PASS. Chạy lại full suite, resolve runtime dependency tree, quét OSV và thử lại artifact trên MySQL mới. Kết quả cuối ghi tại [review S11](../reviews/2026-09-30-sprint-11.md). Gói `s11-local-check` trước vá chỉ là bằng chứng bước đầu, không dùng làm gói bàn giao cuối.

Scanner chỉ gửi tên package/version công khai. Phạm vi Maven runtime không bao gồm plugin build, test dependency, JDK, OS/container image hoặc pentest; các tầng đó vẫn phải kiểm tra ở hạ tầng đích. `npm audit` được chạy riêng cho frontend.
