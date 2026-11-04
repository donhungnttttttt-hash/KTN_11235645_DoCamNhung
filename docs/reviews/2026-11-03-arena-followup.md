# Triển khai phần còn lại Arena — 03/11/2026

**Đã hoàn thành triển khai và kiểm chứng kỹ thuật theo phạm vi ghi nhận; review toàn diff đã chấp thuận.** Xem [báo cáo kết quả hiện tại](2026-11-03-arena-final.md). Các phần nhật ký bên dưới giữ nguyên checkpoint và lỗi từng thời điểm, không thay thế kết quả cuối. Baseline `ba2ccb5` trên `system-design`. Người dùng cho phép triển khai phần còn lại; không tự commit/push/merge hoặc nâng main trong chiến dịch này. [Điều chỉnh theo quyết định mới](../planning/2026-11-03-arena-execution-adjustments.md) ưu tiên mô tả vai trò/workflow cũ trong kế hoạch 25/10.

## Theo dõi công việc

| Task | Trạng thái | Đầu ra/bằng chứng hiện có |
| --- | --- | --- |
| AR-00 | DONE | Review độc lập Approved; Node 12/12, Java guard 6/6, native Feature 15/15, không skip. Schema mới `tms_docstest_54fa8a56466a`, core V39; receipt `var/arena-followup/ar00-native-feature-final-20261103/receipt.json`. |
| AR-01 | DONE | Review Approved; FE82/offline46/native6, Chrome cấp/thu quyền, tài khoản/thành viên/hồ sơ đạt theo receipt; D05 mobile avatar chờ AR10. |
| AR-02 | DONE | Review độc lập Approved; FE112/offline30/native21 PASS. Chrome xác nhận Excel đủ24 dòng/400 style, Status/version riêng, lọc ngày và phục hồi trang; chờ baseline AR10. |
| AR-03 | DONE | Review Approved; FE101/offline9/native39 PASS, Chrome luồng QA→Bug/xác nhận/retry PASS theo receipt; U26 và final baseline còn mở. |
| AR-04 | DONE | Review Approved; FE136/offline145/native35; Chrome báo cáo/khớp số liệu/Ticket đạt. AI báo cáo live timeout30,270s; final baseline chờ. |
| AR-05 | DONE | Review Approved; FE48/runner15/native5; Chrome hai-tab409/đối chiếu giữ nháp/explicit save/history và USER đọc đạt. |
| AR-06 | DONE | Review độc lập và hai vòng sửa đã giải quyết đủ hai Important. Offline16/16, native20/20, runner13/13 và sáu migration1/1 đều không skip; matrix cấu trúc/checksum đạt. U17/U18 trình duyệt thuộc AR-07/10; U26 đã duyệt khôi phục Monkey/file, triển khai AR12 trước AR10. |
| AR-07 | DONE | Review Approved, FE36/36; Chrome kiểm opt-in/409/hard blocker thiết bị/mất phản hồi→mở lại→retry/PM403/320px. Còn baseline cuối và phần browser mở rộng AR-10. |
| AR-08 | DONE | Implementation được review Approved; FE33/33, backend6/6. Chrome Admin kiểm409 giữa hai tab giữ nháp; PM tạo/công bố được, USER chỉ xem và ba API ghi trả403. U19 còn kiểm lại baseline cuối/responsive trong AR-10. |
| AR-09 | DONE | Review độc lập Approved; 77 kiểm thử không skip. Restore thật 95 bảng +1 view, toàn bộ ID/nội dung/blob khớp, 240 FK không mồ côi; RPO/RTO chưa có ngưỡng. |
| AR-12 | DONE | Review Approved; native19/FE60; Chrome khôi phụcMonkey/file, giữdữliệu/lịch sử/blocker/replay; D07 cuối24/1→0aggregate→restore24/1 PASS. |
| AR-10 | DONE | Review task Approved; FE1359preD08+24affected, offline307/native138 composite;119action entries, final4role/D05/D07/D08 checks. Broadreview Approved, explicit NOT_RUN scopes in final report. |
| AR-11 | DONE | Chuẩn bị truy vết/gate; chưa ký UAT. |

## Skill đã áp dụng

- `using-superpowers` / `subagent-driven-development` → tách task, đối chiếu kế hoạch với quyết định đã duyệt, chuẩn bị brief/ledger và review độc lập từng task → artifacts trong `.superpowers/sdd/2026-10-25-arena-followup/` (local, không đưa bí mật/log thô vào Git).
- `api-design` / `security-review` → đối chiếu contract archive, quyền Admin tổng hiện tại, retry/version và phạm vi hai blocker được miễn → giữ additive contract của AR-06; không tự miễn hard blocker hoặc thay Ticket policy.
- `using-git-worktrees` → kiểm tra `.git`/common-dir và branch; áp dụng chỉ dẫn người dùng giữ workspace `system-design`, cô lập build/database/storage thay vì đổi branch.
- AR-00: `tdd-workflow` / `security-review` / `verification-loop` → kiểm tra fail-closed cho manifest, schema, storage và các suite bị skip; RED/GREEN và native receipt được reviewer đối chiếu hash source/JAR. Chi tiết local: `AR-00-report.md`, `AR-00-review.md` trong workspace SDD.
- AR-08: `frontend-patterns` / `tdd-workflow` / `verification-loop` → giữ state/quyền/payload cũ, thay diễn đạt phạm vi; RED11/GREEN33 ca FE, hai unit suite backend6/6 → `var/arena-followup/ar08-20261103/` và `AR-08-report.md`. Coverage riêng RulesPanel: statements87,93%, branches84,44%, functions81,81%, lines91,30%; không phải coverage toàn frontend.
- AR-06: `api-design` / `security-review` / `tdd-workflow` / `verification-loop` → DTO additive, canonical snapshot, quyền hiện hành, transaction/replay, guard migration và kiểm tra hai connection → offline16, native18, runner13, sáu đường migration. Receipt cuối `var/arena-followup/ar06-native-final-02/receipt.json`, matrix `ar06-migration-matrix.json`, tổng hợp hash/coverage `ar06-final-evidence.json`. Coverage native riêng service: lines100%, branches72,7%; snapshot lines96,3%, branches93,8%. Không gọi đây là coverage toàn backend hoặc đã đạt80% branches cho service.
- AR-06 vòng sửa1: native20/20 (13 integration, 7 race), không skip; receipt `var/arena-followup/ar06-fix1-native-01/receipt.json`, tổng hợp `ar06-fix1-evidence.json`. Product/migration không đổi nên không chạy lại matrix. Source SHA-256 `9350fd7ae183012ea257218a1cc25c6d3491f0ade714535d90eebc63a18caf81`; JAR `2063e4a6734fe77cd6b08bec97d574e888e93a9b3b7a1fa5a23faa9a6a99f8b8`. Số20 thay cho18 ở lần chạy trước, không cộng các lần chạy thành38.
- AR-06 vòng sửa2: hai mô tả422 trong OpenAPI được quote để dấu phẩy không làm YAML tách thành khóa rỗng. SnakeYAML2.4 RED→GREEN4/4, contract/diff đạt; review scoped xác nhận đã sửa, không có Critical/Important mới. Evidence `var/arena-followup/ar06-fix2/evidence.json`; không chạy lại backend/native vì chỉ đổi tài liệu.
- AR-07: `frontend-patterns` / `security-review` / `tdd-workflow` / `verification-loop` → opt-in theo snapshot, khóa quyền/nháp khi gửi, retry nguyên payload/key, lịch sử an toàn → RED14 lỗi ban đầu, thêm RED riêng cho null readiness và xác nhận cũ bị giữ khi refresh; cuối36/36 GREEN (27 component, 9 fetch-stub integration), review Approved. Coverage chưa đo; không gọi fetch-stub là kiểm thử backend thật.
- Chuẩn bị AR-10: `browser-testing-with-devtools` → áp dụng nguyên tắc profile riêng và phân biệt DOM/console/HTTP với unit tests. Không có Chrome DevTools MCP; `cua_repl.createBrowserTab` trả `browser access host is unavailable`. Fallback bằng Playwright1.60.0 đã có trong npm cache, mở Google Chrome156.0.8078.74 headless với profile mới trong evidence-dir rồi đóng thành công. Receipt `var/arena-followup/chrome-probe-20261103/receipt.json`; mới xác nhận công cụ, **chưa nghiệm thu ứng dụng**. Không truy cập profile cá nhân hoặc điều khiển toàn desktop.

## AR-00 đã kiểm chứng

- Node runner: 12/12, không fail/skip; controller chạy lại `rtk proxy node --test scripts/Test-CurrentWorkflowNative.test.cjs` để xác nhận kết quả trước khi chốt (1,806 giây). Đây là cùng 12 ca, không cộng thành 24 ca.
- Java guard: 6/6; native `FeatureIntegrationTest`: 15/15. Năm suite native còn lại thuộc các task tiếp theo, chưa chạy trong AR-00.
- Receipt cuối gắn source SHA-256 `46c2cb8102d9c533c9e0af32c862d8eaaa7129172fd5a228e43b69f7aa15b572` và JAR SHA-256 `47193cf5cc9634e5c1198ccbf1c585d35e467c2b5426fdc56df8923692cb644f`. Reviewer đối chiếu đủ chín file của task và baseline thực thi.
- Review không có Critical/Important. Ghi nhận Minor: một số đoạn validation dài; tên một test Java rộng hơn assertion; cảnh báo Flyway/MySQL và Mockito/JVM cần theo dõi. Chưa suy ra coverage từ số PASS.
- Lần RED ban đầu dùng lệnh trong kế hoạch cũ ghi build vào `Backend/target`; các lần sau chuyển sang bản sao build cô lập. Không restart backend hoặc migrate database main.

## Bằng chứng và giới hạn ban đầu

- Build phục vụ provision: JDK21/Maven wrapper, `package -DskipTests` trên bản sao từ `git archive ba2ccb5 Backend`: PASS, 21,790 giây. Đây là build, không phải test PASS.
- Fresh core V39: 36 migration trong location core, bao gồm SQL và Java; không chạy các version thuộc demo. Receipt ghi server UUID, từng version/script/checksum và SHA-256 artifact. Bước này chưa chứng minh runner/Java guard hoặc U01 hoàn tất.
- Chuẩn bị AR-06: sáu schema mới riêng biệt đã tạo trên native3307 và xác minh bằng Flyway-only, không Spring startup: fresh core/demo rỗng; coreV33 (31 migration), demoV34 (34), coreV39 (36), demoV39 (39). Manifest/receipt riêng ở workspace SDD `archive-provision/targets.json`; test migration sẽ tạo fixture có ID thuộc test **sau guard**, chụp inventory trước và sau nâng V40. Đây là chuẩn bị baseline, chưa là PASS migration V40.
- AR-06: sáu đường fresh core/demo, upgrade core33/demo34/core39/demo39 → V40 đều có XML1/1 không skip. Fresh core có37 migration, demo40. Controller đối chiếu history/source snapshot rồi tạo manifest integration mới, giữ manifest ban đầu. Toàn bộ39 file migration baseline vẫn nguyên SHA-256; matrix xác nhận cấu trúc/checksum cùng profile và các projection dữ liệu cũ được giữ. Main `tms` được đọc kiểm tra riêng vẫn V39 (`var/arena-followup/main-history-readonly-20261103.json`).
- Sai sót lệnh build AR-06 ban đầu tạo bản sao `src/.mvn/pom.xml/mvnw.cmd/target` ở root repository. Đã kiểm tra đường dẫn tuyệt đối, thời điểm tạo, trạng thái không tracked và byte nguồn; 533 file do lần build đó tạo được chuyển vào `var/arena-followup/ar06-accidental-root-build/` kèm inventory, không xóa/đè file có trước. Các build sau chạy trong thư mục cô lập bằng Node child process; không restart backend main.
- Chưa chạy toàn ma trận U01–U26; không lấy PASS của phần tài khoản/Ticket trước đó để điền kết quả Arena.
- G01–G06 (mẫu khách, Redmine, policy khách, evidence, tải/RPO/RTO, người ký/live) vẫn OPEN. G07/U26 đã tái hiện Ticket Monkey xóa mềm và Ticket trong file ẩn vẫn chặn archive nhưng không còn đường xử lý trên UI; đang chờ người dùng chọn cách khôi phục/giữ nghĩa vụ. Không tự miễn blocker và không ngăn phần độc lập đã được phép.
- Coverage chỉ đo riêng RulesPanel và các lớp AR-06 nêu trên; chưa đo toàn hệ thống. Human UAT, cross-browser và provider live chưa chạy; main vẫn giữ runtime trước chiến dịch.

## Chrome U19 trên dữ liệu riêng

- Runtime riêng `127.0.0.1:5175` → backend18081, schema `tms_docstest_6a90347461ce`; không đổi backend8080/frontend5173. Chrome156.0.8078.74 headless, Playwright1.60.0, profile mới.
- Admin: tạo bộ quy tắc bằng bàn phím, lưu nháp, hủy không gửi publish, chấp nhận đúng thông báo phạm vi cũ; hai tab tranh công bố trả409, giữ nháp và tải lại phiên bản hiện hành. Receipt `var/arena-followup/ar08-browser-20261103/receipt.json`.
- PM: tạo và công bố phiên bản4 qua UI. USER: nhìn thấy lịch sử đầy đủ, không có nút sửa; API tạo bộ/tạo nháp/công bố đều403, history không đổi sau ba yêu cầu bị từ chối. Receipt `var/arena-followup/ar08-browser-roles-20261103/receipt.json`; ảnh USER đã được xem trực tiếp để kiểm tra bố cục.
- Không có pageerror. Console ghi401 khi chưa đăng nhập và một404 chưa ghi được URL ở lượt PM; cần truy vết resource URL trong AR-10, không tuyên bố console sạch. Runtime hiện dùng artifact migration AR-06 trước lần sửa nhỏ về warnings; vì vậy đây là nghiệm thu sớm phần Rules độc lập, chưa thay cho kiểm thử toàn chuỗi trên artifact cuối.

## Chrome U17/U18 và lỗi refresh đã sửa

- Runtime riêng đã đổi sang JAR AR-06 qua native20/20, hash `2063e4a...`, sau khi kiểm tra đúng PID/command line/port18081 và hash toàn bộ source chính. Không chạy migration hoặc đổi runtime main. Receipt `var/arena-followup/browser-runtime-20261103/backend-reviewed-ar06.json`.
- UI ban đầu có checkbox xuống dòng và lỗi trắng trang khi readiness trở về null trong lúc dialog đang mở. Lỗi được tái hiện bằng kiểm thử thay API prop, không coi là lỗi chỉ do HMR. Đã giữ dialog mode độc lập, bảo toàn lý do và bỏ opt-in khi nhận snapshot thay thế; 36 ca cuối qua và Chrome sau reload không còn pageerror.
- Dự án thử8 chỉ có cycle cũ7: mặc định chưa chọn, nhập lý do vẫn chưa gửi được, Space chọn checkbox mới cho gửi. Thay version dự án rồi gửi trả409, lý do giữ nguyên và checkbox bỏ chọn.
- Bàn giao thiết bị synthetic131 làm xuất hiện hard blocker, ẩn ngoại lệ và khóa submit. Thu hồi thiết bị xong mới cho xác nhận lại. Các hard blocker khác đã được kiểm native/component; chưa bấm từng loại trong lượt Chrome này.
- Mô phỏng mất phản hồi **sau server200 thật**, mở lại dự án qua API rồi bấm thử lưu lại: hai payload/key giống hệt, trạng thái cuối vẫn hoạt động. Database chỉ có1 ARCHIVE +1 REOPEN, đúng1 audit mỗi thao tác; hash cycles/runs/retests trước/sau cùng `6d994d5245996fa7561733e729bc19d469a38419f3a7a6f4a494375c9fefd90e`.
- PM bị chặn ở route Admin và API readiness/archive403. Dialog ở viewport320×640 nằm trong màn hình, có thể cuộn đến nút và đóng bằng Escape; ảnh đã xem trực tiếp. Đây là emulation CSS, chưa kiểm browser zoom200%/thiết bị thật.
- Receipt `var/arena-followup/ar07-browser-20261103/receipt.json`, source component `d832b700...`; full baseline AR-10 và human UAT còn mở. Console404 của lượt trước đã xác định là `/favicon.ico`, đưa vào kiểm tra resource AR-10;401 trước đăng nhập và network failure được cố ý tạo có ghi riêng.

## Truy vết kết luận Arena

Phát hiện trong Chrome (chưa kết luận nguyên nhân): **ARENA-D01**, tổng quan dự án vẫn hiển thị các nhãn/cột trạng thái cũ trong phần nói về Bug/QA hiện hành. Evidence `var/arena-followup/ar08-browser-20261103/project-overview-observation.txt` và PNG cùng thư mục. AR-04 sẽ đối chiếu nhãn/số liệu/link với fixture Ticket V39; không suy ra số liệu sai chỉ từ nhãn. AR-10/U22 kiểm lại sau xử lý.

- **ARENA-D02 — đã sửa trong AR-07:** refresh readiness lúc hộp lưu trữ mở có thể đọc null và làm trắng trang; RED/GREEN và Chrome sau sửa đã nêu ở trên.
- **ARENA-D03 — cần tái hiện có kiểm soát:** ngay sau login rồi mở deep link `projectId=9`, UI giữ dự án1 và kẹt ở thông báo đang chọn dự án; chọn thủ công được. Lần chuyển9→8 tiếp theo hoạt động. Chưa kết luận mọi deep link đều lỗi; AR-02 kiểm race giữa tải dự án ban đầu và đổi URL. Evidence `var/arena-followup/ar02-browser-preflight-20261103/deep-link-stuck.json`, ảnh và `deep-link-second.json`.
- **ARENA-D04 — đã tái hiện trên artifact, chờ AR-02 sửa:** workbook hợp lệ dùng `inlineStr`, 24 dòng, nhập thành công. Sau ghi case81=NG/version1, export ghi giá trị vào `<v>` nhưng giữ `t="inlineStr"` và `<is><t>` trống ở ô Status/version/người test. Đọc theo loại ô vẫn ra trống; ô ngày mới dùng shared string đúng. Giữ `exported-current.xlsx`/`export-inspection.log` và input để thêm kiểm thử export→đọc lại. File gốc tải xuống có SHA-256 khớp input; export vẫn đủ24 dòng từ trang đầu20 dòng.
- Chrome sớm U04/U06/U08/U12: tạo Feature10 tại dự án thử9, nhập doc9/row81–104, phân công hai nhóm12 case cho USER1/USER2; User thường sửa case được giao, không sửa case của người khác; OK→NG có version/ngày/tác giả trong history. Receipt `var/arena-followup/ar02-browser-preflight-20261103/receipt.json` ghi `DEFECT_FOUND`, không dùng để đánh toàn bộ AR-02 PASS.

| Phát hiện | Cách xử lý trên hệ thống hiện tại | Task / nghiệm thu | Trạng thái bằng chứng |
| --- | --- | --- | --- |
| F1: thiếu nghiệm thu toàn chuỗi | Chạy luồng Feature → file → phân công → Status → Ticket → báo cáo trên cùng baseline, tách kết quả tự động/Chrome/UAT | AR-00–11 / U01–26 | AR-00 đạt; chuỗi còn lại đang thực hiện |
| F2: quyết định cho khách hàng | Giữ quy tắc nội bộ đã duyệt; không dùng chúng làm cam kết khách khi chưa có mẫu và người xác nhận | AR-11 / G01–06 | OPEN; không chặn kiểm thử synthetic |
| F3: giới hạn export 5.000/10.000 run cũ | Thuộc báo cáo legacy; kiểm API nghỉ và export Feature hiện hành, không tăng giới hạn tùy ý | AR-03/04 / U12, U20, G05 | Chờ hồi quy; chưa xác nhận tải khách |
| F4: iPad khác execution | Kiểm Status/version/ngày của đúng row trong Feature và tính độc lập các bản workbook; không phục hồi hai nguồn ghi cũ | AR-02/04 / U06, U08, U09, U12 | Chờ bằng chứng hiện hành |
| F5: inbox cũ trống | Không khôi phục inbox legacy. Giữ notification Ticket V39 đã duyệt, kiểm Ticket/hard blocker đúng trạng thái kết thúc | AR-03/06 / U11, U18, U26 | Chờ kiểm thử; không suy ra dự án hoàn tất từ board trống |
| F6: PM không tạo tài khoản trên web | Kiểm đường AccountMenu hiện có; PM được cấp quyền chỉ tạo USER theo quyết định mới, thu quyền phải chặn phiên/nháp đúng hợp đồng | AR-01 / U02, U03, U23, U24 | Có implementation nền; chưa chứng nhận lại trong Arena |
| F7: người xác nhận QA | Giữ workflow Ticket V39 và trách nhiệm chỉ định cho USER/PM; không phục hồi answer-confirm cũ | AR-03 / U10, U11, U20 | Chờ bằng chứng hiện hành |
| D: Rules phiên bản/pin | Giữ lịch sử/policy cũ và làm rõ phạm vi trên UI | AR-08 / U19 | Code review/automated và Chrome Admin/PM/USER đạt; baseline cuối/responsive chờ AR-10 |
| D: sổ tay, NA/khôi phục, đóng/mở lại | Kiểm revision conflict, Status P/NA và archive có snapshot; không ghi lại workflow cũ | AR-02/05/06/07 / U08, U09, U16–18 | Chờ bằng chứng |
| D: evidence và artifact | Đối chiếu bytes/hash/metadata và restore trên target riêng, giữ endpoint nghỉ | AR-02/09 / U12, U20, U21 | Chưa restore; không coi backup thành công là restore đạt |
| Bổ sung: AI và blocker bị ẩn | Tách timeout local/provider; tái hiện Ticket bị ẩn/xóa mềm trước khi xin quyết định riêng nếu bế tắc | AR-03/04/06 / U25, U26 | U26 đã tái hiện, chờ quyết định phục hồi; U25 chưa kiểm |

## AR-01 kiểm thử quyền và thành viên

- Đã tái hiện người có membership cũ inactive với role không tương thích vẫn xuất hiện trong danh sách thêm nhưng không lưu được. Sửa loại trước count/phân trang và báo rõ lỗi lookup; giữ nguyên membership/role lịch sử.
- Kiểm tự động cuối: frontend82, backend46, native6 và runner14 đều PASS, không skip. Native xác minh thu/cấp quyền và phiên, USER-only creation, CSRF, duplicate, thêm thành viên đồng thời, đổi ID/tên/mật khẩu trên tài khoản synthetic giữ lịch sử.
- Fixture security test cũ thiếu collaborator được sửa riêng; không sửa security sản phẩm. Lần native đầu thiếu Admin slot2 thất bại ở setup; chỉ điền slot trống bằng fixture riêng, giữ nguyên slot1. Các lỗi setup và RED sản phẩm được ghi riêng.
- Receipt cuối var/arena-followup/ar01-native-final-20261103/receipt.json, source bfafffe7c1ef0669d7557a379835b1560fe949052cc467a80b731b7947f9fa70, JAR 5780da3363daea6d9b3744a789993f362309aeb712fbcb2bb5a9d85a573ca95b. Review độc lập đang chạy; Chrome U02/U03/U23/U24 chưa nghiệm thu. Coverage chưa đo; chưa full-suite/build frontend.

## Chrome U02/U03/U23/U24 trên bản AR-01 đã review

- Backend thử18081 dùng JAR 5780da33..., Java PID32396; giữ schema/storage riêng. Admin cấp quyền200, PM phiên cũ401, đăng nhập lại mở form ngoài Admin bằng bàn phím. Form chỉ tạo USER; trùng ID409 giữ nội dung và focus lỗi, bấm hai lần lúc pending chỉ1POST201, chưa tự thêm dự án; CSRF sai403.
- Thu quyền trước gửi nháp làm request401; đăng nhập lại cùng PM không còn entry/dialog. PM không có quyền tạo tài khoản vẫn thêm được USER có sẵn. Danh sách loại thành viên hiện tại, vẫn cho người đã ở dự án khác; lỗi mạng một người giữ đúng lựa chọn chưa lưu, thử lại200 và chỉ thêm người đó.
- Admin sửa ID/tên và đặt lại mật khẩu tài khoản synthetic; identity và membership220/version0/roleUSER giữ nguyên. Phiên/ID/mật khẩu cũ401, thông tin mới đăng nhập được. Hồ sơ cá nhân tự sửa tên/email/điện thoại/chức danh/phòng ban được đọc lại đúng, ID/loại tài khoản readonly; giữ/hủy nháp hoạt động.
- Phát hiện **ARENA-D05**: ở375px, khối upload avatar/helper tràn122px dù hộp hồ sơ nằm trong viewport; cần sửa CSS và kiểm lại ở AR10. Footer vẫn cuộn tới được. Ảnh/DOM được xem trực tiếp.
- var/arena-followup/ar01-browser-20261103/receipt.json ghi rõ giới hạn: bộ chờ công cụ dùng nhầm PATCH thay vì PUT đã làm reset Node REPL, mất network trace ban đầu. Không gửi lại thao tác đã thành công; giữ các quan sát công cụ/ảnh/readback và mở Chrome mới đọc lại hồ sơ. Trace lượt phục hồi được ghi ngay ra file, không có pageerror. Không coi đây là toàn bộ nghiệm thu U22/baseline cuối hoặc human UAT.

- **ARENA-D06 — chờ AR-05 sửa:** Chrome hai tab sổ tay tại project9/handbook3: A tạo revision4(v2)200, B409, server giữ đúng2 revision và bản thắng, nháp B còn. Nhưng thông báo yêu cầu tải lại trong khi form chỉ có Lưu/Hủy, danh sách/chi tiết vẫnv1; thiếu đường tải bản hiện hành mà giữ nháp. Receipt var/arena-followup/ar05-browser-preflight-20261103/receipt.json; chưa đánh U16 PASS.

## AR-02 sửa Excel và phân trang

- Đã sửa ARENA-D04 bằng cách xóa giá trị ô thay đổi trước khi ghi text mới, giữ style/nội dung cột khác và bytes file gốc. Regression export→POI đọc lại xác nhận header Status, version/người thực hiện và đủ24 dòng từ workbook inlineStr hợp lệ.
- Hai test RED xác nhận xóa/ẩn mục cuối trang làm kẹt Trang2/1; danh sách Feature và file giờ điều chỉnh về trang còn dữ liệu. D03 ba thứ tự phản hồi được kiểm có kiểm soát đều qua trên code hiện có; chưa khẳng định đã tìm/sửa nguyên nhân quan sát Chrome ban đầu.
- FE112, offline backend30, native21 đều PASS/0skip; build Vite riêng PASS. Race thật hai connection5029/5030 có200/409 và một lịch sử phân công. Receipt var/arena-followup/ar02-native-verified-20261103/receipt.json, JAR 72b12e35..., source c2bbcfe9.... Review độc lập đang chạy; kiểm lại artifact bằng Chrome còn chờ.
- Fixture FeatureIntegrationTest cũ còn DELETE toàn registry đã được thay bằng đọc hai Admin hiện có và assert giữ nguyên trước mọi lần native của AR02; không thực hiện reset. Không sửa migration. Coverage DocumentWorkbook riêng offline97,22%line/88,89%branch; native riêng72,22%line/66,67%branch; không cộng hai báo cáo hoặc suy toàn dự án.

## AR-02 kiểm chứng Chrome sau sửa

Receipt `var/arena-followup/ar02-browser-verified-20261103/receipt.json`, Chrome156 riêng tại5175/18081, artifact72b12e35…/schema thử riêng; main giữ nguyên. Xuất từ trang2 và khi lọcNG đều đủ24 case, cùng nội dung, giữ400 style của các ô gốc; tải file gốc khớp SHA-256 đầu vào. ARENA-D04 đã sửa và kiểm lại bằng parser XLSX, không chỉ kiểm tên file.

USER1 đổi NG→P→NA→Unexecuted→OK→NG, năm request200 tạo đúng năm history; Unexecuted xám bạc và tiến độ0%, các trạng thái đã test là1/24. Đổi version riêng case81 tạo đúng một history, giữ Status/ngày/23 dòng khác và độc lập lựa chọn đầu bảng. Xóa khỏi danh sách hoạt động bằng archive Feature cuối trang2 tự trở lại1/1; khoảng ngày ngược báo lỗi và giữ danh sách. Browser chưa kiểm trang cuối của danh sách file (component regression đã kiểm).

Đăng nhập trực tiếp deep link dự án9 thành công trong lượt này; chưa đóng ARENA-D03 vốn xảy ra gián đoạn. Ảnh cuối đã xem; browser kiểm thử đã đóng. Chưa phải nghiệm thu toàn bộ U04–U12 hoặc human UAT.

## AR-03 Ticket hiện hành và Chrome

Kiểm thử tập trung: FE101/offline9/native39, không skip; chỉ ba file test đổi, không sửa policy sản phẩm. Fixture native dùng lại hai Admin đã đăng ký và kiểm không thay đổi; 48 row AR02 được giữ nguyên. Review độc lập Approved, không có Critical/Important; đã bổ sung đầy đủ cảnh báo Flyway/MySQL9.7 vào report.

Chrome riêng dùng cùng artifact sản phẩm AR02: USER1 tạo QA33 từ case81 (version2/ngày03-11), giao USER2 có trách nhiệm spec/điều phối; thông báo dẫn đúng dự án/Ticket. USER2 chuyển cùng ID sang Bug rồi Đang xử lý→Đóng/Đã xử lý, vẫn chờ xác nhận. USER1 xác nhận Đã sửa, mới finalized. Stale409 giữ nháp; tải lại rõ ràng giữ nội dung; một bình luận đã commit nhưng mất phản hồi gửi lại cùng payload/key trả200, tổng vẫn tăng đúng một. 24 kết quả case không thay đổi, badge vẫn tính Ticket đã đóng, link đúngcase81; Kanban chín cột và danh sách/bộ lọc khớp API. Receipt `var/arena-followup/ar03-browser-20261103/receipt.json`; không thay thế nghiệm thu toàn bộ U10/U11/U20, bốn loại tài khoản hoặc human UAT.

## AR-04 báo cáo và AI: kết quả triển khai chờ review

Đã tái hiện và sửa D01: tổng quan dùng chín cột Ticket, link theo column và chỉ đếm các lý do đã kết thúc; Đã xử lý vẫn chờ xác nhận. Báo cáo phân nhóm state/reason để không gộp Đã xử lý với Đã sửa, giữ nhãn riêng cho lịch sử. Phạm vi file hoạt động chỉ ảnh hưởng số liệu hiển thị; không miễn hard blocker U26.

AI_TIMEOUT phân biệt deadline thực sự với HTTP408/5xx; không tăng timeout hay tự gửi lại. Nháp thủ công/nhắn tin vẫn được giữ. Lượt cuối FE136, offline145, native35 đều PASS/0skip, build PASS. Coverage FE bốn file thực đo95.56%statement/90.66%branch; không suy toàn hệ thống. Artifact5f3bcfa0… và report chi tiết AR-04-report.md tại workspace SDD; Chrome baseline cuối và review còn chờ.

Nguồn Caheo đã phản hồi synthetic hợp lệ một lần trong19.322 giây; một lần probe64token trước đó trả200 nhưng không có text dùng được. Chưa kết luận nguyên nhân hoặc độ ổn định/tính đúng dữ liệu dự án/máy thứ hai. Xem docs/operations/caheo-new-machine.md và hai receipt live ngày03/11.

Giới hạn bảo toàn fixture: một lượt native cũ của task đã gọi purge draft hết hạn trên toàn database kiểm thử riêng trước khi phát hiện setup này. Không có inventory trước nên không khẳng định mọi draft đủ điều kiện xóa đều thuộc lượt đó; không khôi phục đoán. Test đã sửa để cleanup thực chạy trong transaction rollback và kiểm toàn bộ draft ngoài fixture không đổi; các lượt sau PASS. Không chạy thao tác này trên main tms.

## AR-04 — kiểm chứng Chrome trên artifact đã review

Review độc lập **Approved**; FE136/offline145/native35, không skip. Chrome riêng xác nhận Feature31 **3/5=60%**, toàn dự án9 **4/29=13,79%** và danh mục21 Feature không mất khi lọc. Tổng quan dùng chín cột Ticket, Đóng–Đã sửa1 dẫn đúng danh sách một Ticket; đã xem ảnh bố cục.

Caheo thật tạo báo cáo mất **30,270 giây**, trả `FAILED/AI_TIMEOUT`; UI báo đúng và vẫn nhập/lưu tay được. Báo cáo5 lưu201, mở lại/tải xuống đúng từng ký tự, thẻ script là văn bản. Phản hồi READY được **mô phỏng rõ ràng ở browser** để kiểm luồng điền→sửa→lưu báo cáo6→mở/tải; không dùng nó làm bằng chứng AI live. Hai tab sửa báo cáo6 trả200/409, server giữ bản thắng v1 và tab thua giữ nháp. Năm case nguồn giữ nguyên. Receipt `var/arena-followup/ar04-browser-verified-20261103/receipt.json`. Provider đã tắt lại ở backend18081; main không đổi. Quyền bốn tài khoản/toàn chuỗi và human UAT còn bước cuối; AI live báo cáo chưa đạt.

## AR-05 — Sổ tay revision và phục hồi nháp

Sửa nhỏ HandbookPanel: sau409 phải tải phiên bản hiện tại để đối chiếu, giữ nháp, chỉ thay expected revision sau GET thành công và chỉ ghi khi người dùng bấm Lưu. Read lỗi/không còn quyền/lưu trữ đều không tự ghi. FE48/48, runner15/15, native MySQL5/5, không skip; review độc lập Approved. Coverage HandbookPanel branch91,57%/line100%; backend service không đổi, focused branch50%, không tuyên bố coverage toàn app.

Chrome PM hai tab cùng mở resource3/project9 v2 (revision4): A lưu200→v3/id5, B409; history vẫn3 và nháp B còn. GET lỗi mô phỏng giữ nháp/khóa Lưu; GET thật đối chiếu v3 không thêm history, HTML/script hiện text. B bấm Lưu rõ ràng expected5→v4/id6, history4; focus quay về Thêm tài liệu. User đọc đủ lịch sử, không có nút tạo/sửa. Receipt `var/arena-followup/ar05-browser-verified-20261103/receipt.json`; đã xem ảnh đối chiếu. Revoked/archived đã kiểm native; browser cuối bốn tài khoản còn AR10. Main không đổi.

## U26 đã chốt, bổ sung AR-12

Người dùng xác nhận giữ nghĩa vụ xử lý và cho khôi phục Ticket Monkey; tiếp tục cho ẩn file và bổ sung khôi phục file. Hai câu hỏi này đã đóng, không còn chờ quyết định. AR-12 sẽ thêm đường tìm/khôi phục, giữ ID/Status/lịch sử và hard blocker. Những đoạn chờ quyết định ở checkpoint trước là lịch sử. AR-09 còn thực hiện độc lập; AR-10 sẽ dùng baseline có AR-12.

## AR-09 — diễn tập khôi phục dữ liệu

Đã thực hiện backup và restore thật trên database/storage riêng bằng dữ liệu synthetic: 95 bảng và 1 view, đối chiếu toàn bộ ID/nội dung và SHA-256 file; 240 khóa ngoại không có bản ghi mồ côi. Bản import đầu tiên thất bại được giữ nguyên để tra cứu; bản thành công sử dụng database mới, không ghi đè target lỗi. Có 77 kiểm thử phạm vi này PASS, không skip. Review độc lập đang thực hiện. Chi tiết, lần thất bại và giới hạn ở [biên bản restore](2026-10-25-arena-restore-receipt.md). Chưa có ngưỡng để kết luận RPO/RTO; chưa coi đây là nghiệm thu dữ liệu thật hoặc UAT.

AR-09: review độc lập đã duyệt, không có lỗi Critical/Important. Một lỗi nhỏ trong script kiểm chứng local được sửa: tiến trình test không khởi chạy hoặc bị kết thúc bất thường phải trả mã lỗi; bằng chứng lần chạy thành công trước đó giữ nguyên. AR-12 bắt đầu triển khai khôi phục Ticket/file theo quyết định đã chốt.

## Note — kiểm tra Chrome bổ sung

PM lưu Note, hai tab trả200/409 và giữ nháp; đối chiếu phiên bản hiện hành rồi lưu lại thành công. Nội dung HTML hiển thị nguyên văn. Hủy xóa không gửi request; xác nhận xóa chỉ bỏ Note thử đã chọn, Note còn lại giữ nguyên. User thường chỉ đọc; màn375px không tràn ngang. Bằng chứng `var/arena-followup/ar10-notes-browser-20261103/receipt.json`; chưa thay cho baseline cuối AR-10. Một lần công cụ chờ locator quá lâu đã reset trước bước sửa; dữ liệu/trace đã lưu được dùng để tiếp tục, không tạo trùng.

## AR-12 — khôi phục Monkey và file

Đã bổ sung danh sách Monkey đã xóa, bộ lọc file đã ẩn và thao tác khôi phục. Giữ nghĩa vụ xử lý, ID/nội dung/Status/lịch sử và các liên kết; quyền khôi phục đối xứng quyền xóa/ẩn. Parent phải hoạt động; không khôi phục cha ngầm. Gửi lại yêu cầu cũ sau lần xóa/ẩn tiếp theo không làm sống lại dữ liệu, phản hồi trả trạng thái hiện hành. Native19 và frontend60 PASS, không skip; build/contract đạt. Review độc lập và Chrome đang tiếp tục. Không thêm migration.

Skills AR-12: api-design → contract thêm bộ lọc/restore; tdd-workflow → RED trước khi sửa và GREEN; frontend-patterns → filter, pending, giữ trạng thái; security-review → quyền/project scope/CSRF/rollback; verification-loop → target riêng, hash và kiểm thử. Coverage native phương thức restore Ticket:94,12% instructions/85,71% branches/100% lines; restore file100% lines; không phải coverage toàn ứng dụng.
