# Phụ thuộc runtime — Sprint 10

Ngày 30/09/2026. Nguồn máy quét là OSV, dữ liệu đầu vào lấy từ dependency tree Maven đã resolve, gồm thư viện bắc cầu runtime. Chỉ gửi tên package/version công khai; không gửi mã nguồn, cấu hình hoặc credential. Script xử lý pagination; lỗi mạng hoặc input trống trả mã 2, không coi là không có lỗi.

## Finding và bản vá

Scan đầu: **94 dependency, 4 package có tổng cộng 12 advisory**. Xem [JSON trước sửa](sprint-10-advisories-before.json). Đây là finding theo phiên bản, không phải bằng chứng khai thác thành công trên TMS.

| Nhóm | Trước | Sau, cấu hình tại Backend/pom.xml | Căn cứ |
| --- | --- | --- | --- |
| Commons Lang | 3.17.0 | 3.18.0 | [CVE-2025-48924 / thông báo Apache](https://lists.apache.org/thread/bgv0lpswokgol11tloxnjfzdl7yrc1g1): đệ quy không kiểm soát |
| Log4j BOM | 2.24.3 | 2.25.5 | [Apache Logging CVE-2026-49844](https://logging.apache.org/security.html#CVE-2026-49844): JSON MapMessage |
| Jackson BOM | 2.21.4 | 2.21.6 | [FasterXML GHSA-q4xh-88c3-wmh7](https://github.com/FasterXML/jackson-databind/security/advisories/GHSA-q4xh-88c3-wmh7) và các advisory cùng nhánh trong JSON scan |
| Tomcat | 10.1.55 | 10.1.60 | [Apache Tomcat security](https://tomcat.apache.org/security-10.html): bao gồm các fix mới công bố 23/09/2026; không chỉ dừng tại 10.1.58 theo ba advisory OSV |

Giữ Spring Boot 3.5.16/Java 21; override các property BOM để cùng họ thư viện dùng phiên bản tương thích, không nâng major. TMS dùng Spring Security/session, không cấu hình DIGEST/FORM authenticator của Tomcat; việc không dùng tính năng cụ thể không thay thế việc vá dependency. Không suppress finding để làm xanh báo cáo.

## Chạy lại

```powershell
# Trong Backend
rtk proxy .\mvnw.cmd -B -ntp dependency:list '-DincludeScope=runtime' '-DoutputFile=target/runtime-dependencies.txt'
# Từ gốc repo
rtk proxy node scripts/Check-BackendAdvisories.cjs
```

API nguồn và thứ tự kết quả/pagination theo [OSV querybatch](https://google.github.io/osv.dev/post-v1-querybatch/). Kết quả ghi `Backend/target/security/runtime-advisories.json`. Khi có finding, script trả 1 để yêu cầu triage; không tự quyết định applicability hay tự nâng dependency.

Scan sau sửa ngày 30/09/2026: **94 dependency, 0 package có advisory được OSV báo cáo**, xem [JSON sau sửa](sprint-10-advisories-after.json). Regression/runtime phải xem review S10; scan không thay thế test tương thích. Phạm vi scan không bao gồm dependency test, Maven plugins, JDK, OS hoặc image container. Npm audit FE ngày 30/09/2026: 294 dependency, không có advisory được báo cáo. Không nguồn advisory nào chứng minh phần mềm hoàn toàn không có lỗ hổng.
