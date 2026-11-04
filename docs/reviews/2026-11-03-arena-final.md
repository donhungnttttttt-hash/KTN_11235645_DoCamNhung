# Arena — kết quả kỹ thuật và việc còn lại (03/11/2026)

**Đã hoàn thành phần triển khai kỹ thuật Arena; review độc lập toàn diff chấp thuận, không có Critical/Important.** Nhánh `system-design`, baseline `ba2ccb5`; tất cả thay đổi còn trong working tree. Không commit/push/merge, không nâng hoặc khởi động lại main. [Nhật ký và bằng chứng từng task](2026-11-03-arena-followup.md) · [Ma trận U01–U26](../planning/2026-10-25-arena-acceptance-matrix.md).

## Đã thay đổi

- Ngoại lệ lưu trữ dự án: chỉ Admin tổng, có lý do và snapshot; chỉ miễn tồn cycle/retest cũ. Thiết bị, Ticket và blocker khác vẫn chặn. Retry không ghi trùng; lệnh cũ sau khi mở lại không tự lưu trữ lần nữa.
- Khôi phục Monkey đã xóa mềm và file đã ẩn theo quyết định U26. Giữ ID, nội dung, Status, phân công, bình luận, lịch sử và file gốc; không tự khôi phục cha hoặc kết thúc nghĩa vụ xử lý.
- Danh sách file đã ẩn hiển thị số case/kết quả được giữ lại; tổng Feature/dự án vẫn chỉ tính file đang dùng.
- Tiến độ/nhãn tổng quan dùng workflow chín cột Ticket hiện hành; xuất Excel sửa lỗi inlineStr và giữ dữ liệu gốc.
- Sổ tay: đối chiếu revision mới sau409 giữ nháp, chỉ lưu khi người dùng bấm. Danh sách thêm thành viên loại membership không tương thích trước phân trang; không khôi phục dropdown đổi vai trò.
- AI phân biệt timeout nội bộ với lỗi HTTP của nhà cung cấp; lỗi AI vẫn cho soạn/lưu báo cáo tay. Nội dung AI chỉ là gợi ý văn bản, không tự lưu hoặc sửa số liệu nguồn.
- Hồ sơ avatar không tràn ngang trên màn nhỏ; có favicon nội bộ. Người chỉ được bình luận không còn thấy khung đổi trạng thái/phân công trống.
- Công cụ kiểm thử native kiểm provenance/schema/migration/storage trước mutation; fixture Notes giữ nguyên hai Admin đăng ký. Công cụ backup/restore có manifest, kiểm dữ liệu và blob.

## Kiểm chứng cuối

| Lớp | Kết quả và giới hạn |
| --- | --- |
| Frontend | Full coverage: 1.359/1.359 test,145 file,0skip. Sau đó thay2file cho D08; suite bị tác động24/24 và build cuối PASS. Không gọi1.359 là full-suite chạy lại trên source sau D08. |
| Coverage frontend | Full-run trước D08: statements87,96%, branches84,81%, functions82,28%, lines88,77%. D08 không đo lại coverage. |
| Backend offline | Tập34class:307 test đạt theo kết quả ghép303 đã đạt +4 Notes sửa fixture. Giữ receipt4 lỗi context ban đầu; không gọi đây là toàn backend. |
| Native MySQL | Tập10suite:138 lượt thực thi đạt theo119 từ9suite +19 Issue cuối. Lần138 đầu có1 assertion quyền file ẩn sai; đã sửa expectation và chạy lại19. Có inherited methods; không gọi138 là138 kịch bản độc lập. |
| Runner/contract/build | Runner15/15, contract cấu trúc, backend/frontend build và diff check đạt. Lint/typecheck frontend chưa cấu hình. |
| Migration | Sáu đường fresh/upgrade core/demo lên V40 đã đạt; giữ migration cũ. Lần đọc main thành công gần nhất ghi V39; chiến dịch không nâng main. |
| Restore | Restore thật95bảng+1view,240FK không mồ côi; ID/nội dung/blob khớp. Target lỗi được giữ; chưa kết luận RPO/RTO vì chưa có ngưỡng. |
| Chrome | Chrome156 riêng,119 mục thao tác trong18 nhóm có receipt; không phải số testcase độc lập hoặc mọi tổ hợp nút/quyền/trạng thái. Kiểm desktop,320/375/768px, Chrome zoom200% thật. |
| Baseline cuối | JAR SHA256 `181a704de7ff4e6dda7bb8c90da47df01a8b579c946048e2ccc9275862290063`; frontend input manifest `bbace387bc7da84e259c38ff97f69cb5557335da63d5061b0702cf568f41df0e`. |

Bằng chứng cuối: `var/arena-followup/ar10-automated-20261103/`, `ar10-final-browser-20261103/`, `ar10-mobile-final-20261103/`, `ar10-zoom-final-20261103/`, `ar10-chat-ui-stub-20261103/`; inventory có cấu trúc tại `var/arena-followup/action-inventory-final-20261103.json`. Artifacts local không chứa credential trong báo cáo/Git.

D07 Chrome cuối: file11 ẩn vẫn24case/1đã test; Feature32 đang dùng0case. Parent Feature lưu trữ thì nút khôi phục file bị khóa và có đường về danh sách Feature. Khôi phục cha rồi file qua UI giữ nguyên24row; tổng dự án5/53=9,43% khớp Admin/PM/Khách. Hai Ticket còn mở vẫn chặn archive.

D05:320px dialog client/scroll290/290;375px345/345. Ảnh sai422 có thông báo; ảnh hợp lệ200, xóa ảnh thử thành công, nút cuối form tới được. Zoom200% đo innerWidth711/dpr2/outerWidth1440; dialog666/666, không có phần tử vượt ngang. Ảnh chụp headless bị crop khi zoom; kết luận kích thước dựa thêm DOM và thao tác, không coi ảnh crop là bằng chứng toàn màn.

## Truy vết kết luận Arena

| Phát hiện | Kết luận hiện tại |
| --- | --- |
| F1 toàn chuỗi | Có bằng chứng tự động/native và Chrome theo task; baseline cuối kiểm lại phần đổi và4loại tài khoản. Chưa bấm lại mọi tổ hợp của toàn bộ chuỗi trên một lần chạy. |
| F2 quyết định khách | G01–G06 vẫn OPEN, không tự ký thay khách. |
| F3 giới hạn5.000/10.000 run | Thuộc luồng cũ đã nghỉ; không tăng giới hạn không còn dùng. |
| F4 iPad/execution | Luồng hiện tại Status/version/ngày riêng case; sửa export inlineStr, kiểm độc lập Feature và bytes gốc. |
| F5 inbox | Không mở inbox cũ; giữ notification Ticket V39, sửa dashboard/các đường khôi phục hiện hành. |
| F6 PM tạo Tester | Chính sách mới PM được cấp quyền tạo USER; kiểm grant/revoke/reauth và bảo toàn ID/lịch sử. |
| F7 QA verifier | Kiểm workflow V39 được duyệt, cùngID QA→Bug; API answer/run/retest cũ vẫn410. |
| Rules/NA/cycle/loại công việc cũ | Giữ lịch sử, nói đúng phạm vi; không hồi sinh workflow cũ hoặc tự miễn hard blocker. |
| Excel/evidence | Chứng nhận original/current XLSX và Markdown hiện hành; evidence cũ kiểm read/quyền/503/410 và restore. |

D01 dashboard, D02 readiness-null, D04 inlineStr, D05 avatar, D06 sổ tay, D07 số liệu file ẩn, D08 khung bình luận trống đã sửa và có kiểm chứng. D03 deep link chập chờn **NOT_REPRODUCED** trong kiểm có kiểm soát; không gọi là đã sửa.

## Những điều chưa được chứng nhận

- Human UAT, cross-browser, thiết bị thật, tải và ngưỡng RPO/RTO; S11/FR-12 vẫn IN_REVIEW, chưa pilot-ready.
- AI live: probe đơn giản có văn bản sau19,322s; tạo báo cáo thực tế timeout30,270s. READY/report/chat UI mô phỏng được ghi rõ là stub; không chứng minh nhà cung cấp ổn định. Máy khác chưa kiểm.
- Chưa lặp mọi vai trò × nút × trạng thái trên baseline cuối. Những bước không chạy lại được ghi trong từng receipt, không điền PASS hàng loạt từ số test.
- Không có kết luận coverage toàn backend80%. Cảnh báo Vite chunk, Flyway/MySQL9.7, ByteBuddy/JVM, deprecated API và RTK hook còn được ghi nhận.
- G07 về dữ liệu TASK/REQUEST/IMPROVEMENT cũ vẫn là đối soát có điều kiện; U26 không tự miễn chúng.

## Bảo toàn dữ liệu và sai sót kiểm thử đã ghi nhận

Native toàn tập giữ nguyên94bảng và hai Admin đăng ký.10hash thay đổi/xóa chỉ ở `identity_login_buckets`: LoginThrottle dọn bucket hết hạn và cập nhật bộ đếm khi test đăng nhập; receipt bảo toàn toàn-bảng ban đầu vẫn FAIL và được phân loại rõ. Lần19cuối giữ toàn bộ hàng có trước của95bảng. Không phục hồi giả bucket hoặc xóa receipt để báo PASS.

Các lần lỗi setup/assertion, lỗi locator, ảnh PNG thử không hợp lệ, screenshot zoom bị crop và draft do Vite reload đều được giữ trong nhật ký. Không đổi source để che các giới hạn này; main không nhận fixture.

## Skill và review

Mỗi task có brief/report/review và bảng skill→mục đích→bằng chứng trong nhật ký. Dùng subagent-driven-development để tách triển khai/review; finishing-a-development-branch để chốt và giữ nguyên nhánh theo phạm vi được phép; API/security/TDD/React/verification theo stack thực tế; browser-testing dùng Chrome riêng. Review từng task và review toàn bộ thay đổi đã chấp thuận. Quyết định kỹ thuật và chi phí nếu sai được giữ trong ledger, sẽ tổng hợp khi chốt review.

## Quyết định kỹ thuật đã thực hiện và chi phí nếu sai

- Ruling: Work in user-specified D:/DCN/KTN_11235645_DoCamNhung on system-design, with isolated test builds/DB/storage; do not create/switch worktree. Existing branch/workspace instructions take priority over skill defaults. Cost if wrong: workspace coordination, mitigated by one implementer at a time.
- Ruling: Later approved unified USER/GUEST and Ticket V39 supersede old Arena TESTER/DEV/manual-QA/no-notifications wording. Keep retired run/retest/answer APIs retired. Cost if wrong: acceptance mapping; explicit approved product behavior is authoritative.
- Ruling: Next archive migration is provisionally V40; inventory all Java/SQL locations before adding. Upgrade includes current V39 plus historical V33/V34 paths, preserving originals. Cost if wrong: migration collision; inventory gate prevents execution.
- Ruling: No commit/push from skill task steps; prior handover is complete and this is a new implementation task. Use working tree snapshots/hashes in review packages. Cost: review packaging overhead only.
- Ruling: Existing AR-xx headings do not match skill task-brief parser. Extract exact AR task sections into numbered brief files with Node; preserve source text and attach this adjustment document. Cost: extraction must be verified against headings.
- Ruling: legacy Test-Backend.ps1 commands write IDE Backend/target; tasks use own Backend copy with JDK21/mvnw.cmd instead. No extra public script option is needed. Cost if wrong: command differences recorded, behavior tested on same source.
- Ruling: AR-06 also updates docs/api/project-lifecycle.md and lifecycle portions of docs/api/admin-management.openapi.yaml. They explicitly say no blocker bypass and omit new DTO/error fields; only updating FixReports note would leave authoritative API docs contradictory. Cost if wrong: extra documentation diff; no additional product policy or API behavior. Agent arena_ar06 owns synchronized lifecycle-only edits, reviewer includes both.
- AR01 context ruling: include minimal AdminManagementSecurityTest fixture alignment after extra focused security run exposed missing PlatformTransactionManager context,3 errors before assertions. Relevant permission assurance; preserve CSRF/auth/currentUSER assertions, no product security loosening or broad suite expansion. Cost: one additional test fixture diff; exactfile in review. Required baseline5backend29 and FE81 alreadyPASS; native realRED inactivelegacyroleoffered, fixed before pagination thennative6PASS/FE82. Await finalreport.
- Ruling: AR04 historical PMglobalAI premise superseded by current approved unifiedaccess and fixreports-contract.md66: ADMINregistered global, PM/USER active matchingmemberships only. Native outsidePM404/memberUSERAI200-report403, no permissionexpansion. Cost ifwrong: acceptance wording/testexpectation revisit, not widened dataaccess. Brief/currentplaninterface corrected; AI_TIMEOUT localdeadline contract added, providerHTTP408/5xx remainAI_UNAVAILABLE/noimplicitretry.
- User decision U26: keep obligation+restore deletedMonkey; allowhide+restorefile. AR12 added beforeAR10. Ruling: recovery authority mirrors existing removal rights and requires active parent — preserves established ownership/permissions — cost if wrong: adjust restore capability policy/tests, no lostdata. API/security skills applied to contract/lock/replay/scope brief; AR09 remains sole implementer until review complete.
- ARENA-D07 rootChrome/API: hidden doc11Feature32 lists0cases/0tested yet retained24rows/1NG; false Chưa có case. Evidence ar12-browser-20261103/hidden-progress-observation.json+PNG. Ruling: AR10 sole implementer handles per-item hidden stats truthful, active aggregates still exclude hidden docs — minimal adjacent correction before final baseline — cost if wrong: adjust stats projection, no lost data. Native RED and Chrome recheck required.
- Ruling: D08 hide empty comment change controls when no allowed choices, preserve plain comments and permissions — root observed empty fieldset; no business change, cost if wrong is restoring explanatory UI.

Các quyết định trên giữ nguyên nguồn/chi phí đã ghi trong ledger; không có quyết định miễn blocker, đổi chính sách tài khoản, tự commit hoặc nâng main.

## Bổ sung bằng chứng và giới hạn dữ liệu

- Chrome cuối768px: Khách đọc đủ báo cáo5 dạng văn bản, gồm HTML nguyên văn không thực thi; tiến độ5/53, documentWidth762 trong viewport768, không tràn ngang. Receipt `ar10-768-final-20261103/receipt.json`. Điều này bổ sung lần screenshot Khách trước đó chỉ chụp khi đang tải.
- Lượt native AR04 ban đầu có cleanup TTL nhưng thiếu snapshot trước; không thể hồi cứu để tuyên bố bảo toàn mọi hàng ở lượt đó. Các lượt sau có guard/snapshot/rollback và giới hạn được ghi riêng. Không ghi fixture hoặc cleanup vào main.
- Đọc lại lịch sử main bằng credential test cuối lượt không thành công; không đổi quyền/cấu hình để ép đọc. Receipt mainV39 thành công trước đó vẫn là quan sát gần nhất; không lấy lần thử thất bại làm xác nhận mới.

| Task | Skill → mục đích → bằng chứng |
| --- | --- |
| AR00 | security-review / tdd-workflow / verification-loop → fail-closed runner và target → Node/Java/native receipts, review Approved |
| AR01 | api-design / security-review / TDD → quyền tạo USER, membership/identity/session → FE82/offline46/native6 + Chrome |
| AR02 | frontend-patterns / TDD / verification-loop → Feature, Status, Excel/pagination → FE112/offline30/native21 + artifact roundtrip |
| AR03 | api-design / security-review / TDD → Ticket/retired API/retry → FE101/offline9/native39 + QA→Bug Chrome |
| AR04 | security-review / TDD / verification-loop → số liệu/report/AI scope+timeout → FE136/offline145/native35, live và stub tách riêng |
| AR05 | frontend-patterns / TDD → conflict sổ tay giữ nháp → FE48/native5 + hai tab Chrome |
| AR06 | api-design / security-review / TDD → snapshot/lock/replay/migration archive → offline16/native20,6migration paths |
| AR07 | frontend-patterns / TDD → opt-in/readiness/retry UI → FE36 + Chrome409/hardblocker/replay |
| AR08 | frontend-patterns / verification-loop → Rules đúng phạm vi lịch sử → FE33/backend6 + Admin/PM/USER Chrome |
| AR09 | security-review / verification-loop → backup/restore/evidence →77scoped checks,95tables+view/blob/hash |
| AR12 | api-design / security-review / TDD → khôi phục Monkey/file → native19/FE60, independent review, Chrome preservation |
| AR10 | frontend-patterns / TDD / security-review / verification-loop / browser-testing-with-devtools → hồi quy/D05/D07/D08/fixture → counts, hashes, inventory119 và cảnh báo trong báo cáo |
| AR11 | subagent-driven-development / code review / verification-loop → đối chiếu bằng chứng, truy vết F1–F7/gate/decision → matrix và final review riêng |

## Kết luận review và bàn giao

Reviewer độc lập toàn diff đã kiểm lại hash372file frontend,435đầu vào backend,10fileAR10 và JAR cuối; không có Critical/Important. Bốn Minor giữ cho bảo trì: tên hai test lifecycle còn mô tả trước khôi phục; tên test storage rộng hơn assertion; guard viết dày khó đọc; cảnh báo toolchain. Không có bypass hoặc sai dữ liệu được xác nhận từ các Minor này.

Phần từ chối kết luận được xử lý:768px đã có receipt bổ sung; liveprovider/UAT/realdevice/crossbrowser/máykhác/maincutover/RPO-RTO/G07 và bằng chứng lịch sử thiếu vẫn giữ giới hạn. Source còn chưa commit tại nhánhsystem-design; không merge/push/deploy, không nângmain. Workspace/evidence được giữ vì chưa tích hợp vào Git.

- Ruling: Finish with branch/workspace/evidence preserved, no integration menu or repeated suite — current user scope already forbids commit/push/main and developer directs targeted checks after changes — cost if wrong: user can separately authorize integration; no work lost.
