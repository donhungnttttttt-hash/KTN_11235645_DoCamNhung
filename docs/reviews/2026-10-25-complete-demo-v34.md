# Flyway V34 — bộ demo đầy đủ cho luồng hiện tại

Ngày kiểm chứng: 25/10/2026. Baseline: `f97645c`, nhánh `system-design`.

Người dùng yêu cầu thêm migration và push để máy khác có dữ liệu chạy thử, sau đó chốt **bộ demo đầy đủ**, dùng mật khẩu demo mới và loại dữ liệu riêng/bí mật. Không sao chép database đang sử dụng. Không triển khai Arena, không đổi trạng thái nghiệm thu S11/FR-12.

## Thay đổi

- Thêm [V34__complete_local_demo.java](../../Backend/src/main/java/db/demo/V34__complete_local_demo.java) và helper [Demo34Workbook.java](../../Backend/src/main/java/db/demo/Demo34Workbook.java). Cả hai nằm trong `db.demo`, dùng cùng location demo đã có của profile local. Helper giữ định dạng fixture riêng, không gọi service nghiệp vụ có thể thay đổi ở phiên bản sau.
- Giữ nguyên **33 migration V1–V33**: kiểm tra Git blob của từng file với baseline, không sửa, xóa, đổi tên hoặc repair lịch sử cũ.
- Thêm 6 tài khoản đủ 4 role, 2 dự án, 4 Feature, 8 XLSX/80 case, 32 Issue, 4 ghi chú, 4 báo cáo, 6 thiết bị/4 bàn giao. Có danh mục, mốc thời gian, sổ tay, phân công đầu/lần 2, lịch sử kết quả và trao đổi Issue. [Hướng dẫn và tài khoản](../database/demo-v34.md).
- Status ban đầu: 30 OK, 10 NG, 6 P, 8 NA, 26 UNEXECUTED. Mobile đã ghi 38/40 case; Web đã ghi 16/40. Báo cáo mẫu ghi rõ đây là số lúc khởi tạo, không tự cập nhật theo các thao tác sau đó.
- Sửa initializer native còn kiểm tra cứng **56 bảng/V12** và chỉ gọi job migration chính. Nó nay bật `TMS_MIGRATION_INCLUDE_DEMO=true` cho riêng tiến trình khởi tạo local, migrate/validate đầy đủ, kiểm tra không có migration thất bại; khôi phục biến môi trường sau khi chạy. Job release mặc định vẫn loại demo.
- Cập nhật README và hướng dẫn MySQL: tách máy mới với máy đã có schema/cấu hình, giữ biên bản V11/V12 dưới nhãn lịch sử, giải thích seed một lần và giới hạn chuyển local/release.

## Bảo toàn dữ liệu và quyền riêng tư

Namespace mới `syp.demo34.*`, `TMS-DEMO34-*`; không tái sử dụng dự án `SPIDER-PLUS` thật. Không UPDATE tài khoản/dự án có sẵn. Hai UPDATE trong migration chỉ nối revision vào case/resource vừa tạo trong cùng transaction.

Toàn bộ V34 là DML trong transaction; dùng savepoint nếu Flyway đã mở transaction. Trùng namespace dừng trước khi thêm dữ liệu. Lỗi cuối migration rollback cả fixture. Không dùng `INSERT IGNORE`, clean, drop hoặc repair để che va chạm. Flyway có thể giữ bản ghi migration thất bại để quản trị viên đối chiếu; migration không tự xóa bản ghi đó.

Mật khẩu công khai `TmsDemo34!2026` chỉ dành cho demo local, mỗi tài khoản có PBKDF2 salt riêng. Không có API key, credential thật, chat/kết quả AI riêng, session, login throttle, Redmine binding/outbox, file/chứng cứ khách hàng trong fixture. Workbook được tạo bằng POI từ chuỗi giả lập; không gọi AI, Redmine hoặc dịch vụ ngoài.

Test chỉ tạo schema mới và tài khoản giới hạn quyền trên server native. Không chạy Spring lifecycle, cleanup job, API nghiệp vụ hay migration trên database main. Không restart backend/frontend. Các schema test được giữ riêng làm bằng chứng, không nhập vào main; cấu hình test và file provisioning nằm dưới `Backend/target`, bị Git ignore.

## Kiểm chứng thực tế

| Kịch bản | Kết quả và bằng chứng |
| --- | --- |
| RED trước khi có V34 | Test native yêu cầu 34 migration, thực tế chỉ có 33: thất bại đúng thiếu chức năng. `red-native.xml/.txt` |
| Fresh local, source cuối | **PASS**, 34 migration; xác nhận graph/roles/hash mật khẩu, nội dung 8 workbook, đọc file qua service, tải gốc, xuất lại và parse thành công; Status, tên hai lượt Tester và lịch sử khớp. `fresh-native.xml/.txt` |
| Nâng cấp V33 → V34 | **PASS**, thêm đúng 1 migration. Snapshot hash từng hàng ở mọi bảng trước/sau xác nhận dữ liệu cũ, mật khẩu/thiết bị đã chỉnh và dự án ngoài demo giữ nguyên. `upgrade-native.xml/.txt` |
| Chạy lại sau khi người dùng sửa | **PASS** trong fresh và upgrade: 0 migration, giữ nguyên mật khẩu mới, trạng thái tài khoản, ghi chú và thiết bị đã sửa; so khớp tất cả hàng |
| Release với V34 đã biên dịch | **PASS**, 31 migration chính, version cuối V33; không có lịch sử V20/V22/V34, tài khoản hoặc dự án demo; chạy lại 0 migration. `release-native.xml/.txt` |
| Lỗi muộn và rollback | **PASS**, cố ý trùng serial `DEMO34-IPAD-01` ở bước inventory sau khi tạo graph. Xác nhận đúng duplicate-serial exception, toàn bộ hàng cũ giữ nguyên, không còn user/project V34 hoặc phần fixture dang dở. Log Flyway ERROR trong test này là lỗi được cố ý tạo. `collision-native.xml/.txt` |
| Cấu hình, identity/session, workbook regression | **21/21**, 5 suite, 0 failure/error/skip; Maven **verify/package PASS** bằng Java21 |
| PowerShell initializer/helper | **4/4 Node test**, gồm chấp nhận version tương lai, chặn summary lỗi/rỗng, không echo input nhạy cảm và PlanOnly không ghi/kết nối |
| Java IDE diagnostics | **325 source, 0 error, 0 warning** bằng Eclipse JDT; không tắt null analysis |
| Migration cũ và whitespace | 33/33 Git blob giữ nguyên; `git diff --check` PASS |

Artifacts native và receipt tổng hợp nằm ở `Backend/target/demo34-verification/`; `final-receipt.json` chứa SHA-256 source cuối, kết quả bốn mode và kiểm tra migration cũ. JDT: `Backend/target/java-diagnostics/diagnostics.json`. JUnit của 5 suite offline: `Backend/target/surefire-reports/`. Không commit các artifact runtime/configuration này.

Hai vòng kiểm tra trung gian đã phát hiện và sửa: test đọc ô XLSX trống phải dùng DataFormatter thay vì dereference cell null; fixture sổ tay phải dùng `GUIDE` và plain text đúng UI. Review bổ sung snapshot Issue đầy đủ, tách CREATE → UPDATE phân công → STATUS → COMMENT, version tương ứng; sắp lịch sử phân công theo thứ tự thời gian vì màn hình phân trang theo ID. Các kết quả PASS cuối đều chạy sau các sửa này.

## Skill đã áp dụng

| Skill | Dùng cho việc gì | Kết quả/bằng chứng |
| --- | --- | --- |
| `brainstorming` | Làm rõ “đầy đủ dữ liệu”, đối chiếu luồng Feature hiện tại | Người dùng chốt demo giả lập, mật khẩu mới, loại dữ liệu riêng; không phục hồi luồng run/retest đã nghỉ |
| `tdd-workflow` | Viết test thiếu V34 và regression initializer trước khi sửa | Native RED 33/34; Java config RED 2/4; Node RED 4/4; các vòng GREEN cuối nêu trên |
| `security-review` | Kiểm phạm vi seed, public demo credentials, query, quyền schema test và preservation | Không export main; prepared statements; salt riêng; local/release tách; test guard schema rỗng/loopback và rollback có kiểm chứng |
| `code-review-and-quality` | Review độc lập migration đối chiếu schema, service và UI | Bắt/sửa GUIDE, nội dung sổ tay, snapshot/history/version và timeline phân công; không còn finding bắt buộc mở trong phạm vi này |
| `verification-loop` | Kiểm native, hồi quy, JDT, đóng gói và diff trước commit | 4 mode native + 21 test Java + 4 test Node PASS; JDT sạch; V1–V33 nguyên vẹn |

## Tái chạy kiểm tra

```powershell
rtk proxy node --test scripts/Initialize-NativeMySql.test.cjs
rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests "MigrationCommandConfigurationTest,IdentityPolicyTest,SessionAccountFilterTest,TestCaseWorkbookTest,DocumentWorkbookTest"
rtk proxy node scripts/Check-JavaDiagnostics.cjs
```

Native test cần **mỗi mode một schema mới trống** tên `tms_demo34_test_` + 12 ký tự hex trên loopback, user chỉ có quyền trên các schema đó. Cấp `TMS_TEST_DEMO_URL`, `TMS_TEST_DEMO_USER`, `TMS_TEST_DEMO_PASSWORD` qua môi trường riêng, không viết credential vào source/log; đặt `TMS_TEST_DEMO_MODE` lần lượt `fresh`, `upgrade`, `release`, `collision`. Trong Backend chạy `rtk proxy .\mvnw.cmd -Dtest=NativeCurrentDemoMigrationTest test`. Test từ chối schema không đúng mẫu hoặc không rỗng; không có nhánh clean/drop.

## Giới hạn

- Đây là bộ demo tổng hợp, không phải snapshot toàn bộ dữ liệu thật hoặc cơ chế đồng bộ liên tục giữa máy. Ngày tương đối, ID và salt có thể khác; nội dung/kịch bản và số lượng khởi tạo đồng nhất.
- Test service đọc/xuất workbook mock cổng kiểm quyền `ProjectService.requireReadAccess`; không coi đó là HTTP authorization hay browser UAT. Không chạy lại toàn bộ frontend/backend suite ngoài phạm vi thay đổi.
- Initializer được kiểm qua cấu hình Java, helper PowerShell và PlanOnly; chưa chạy end-to-end script tạo schema tên `tms` trên máy mới. Bốn đường Flyway đã chạy thật trên schema cô lập.
- Chưa tổng hợp coverage cho migration từ tất cả các mode. JaCoCo của lần verify cuối chỉ chứa 21 test offline; không suy tỷ lệ coverage từ số test PASS.
- Main chưa được áp dụng V34 trong tác vụ này. Người dùng cần pull source và khởi động backend local theo hướng dẫn để nạp migration; không chạy lại initializer trên database đã có.

Hoàn tất phần source, tài liệu và kiểm chứng của yêu cầu V34; commit/push theo yêu cầu người dùng. S11/FR-12 vẫn IN_REVIEW, Arena vẫn PLANNED.
