# F/Q task list — plan tasks/plan.md

## Chat chỉ chọn phạm vi dự án — 18/10/2026

- [x] Contract và RED2FE/4native cho chat một dự án không task/target, mặc định toàn phạm vi; thêm2regression history/General RED→GREEN.
- [x] Snapshot/quyền một dự án; rút gọn panel và prompt đúng phạm vi, giữ lịch sử cũ và retry; chỉ COMMITTED file metadata.
- [x] FullFE896 rồi finalAI60,165BE AI/13native/coverage/build PASS; Chrome fixture và app thật1combo/320px. Backup rồi restart8080 PID28580/V30/UP, hash dữ liệu giữ nguyên; [bằng chứng/giới hạn](../docs/reviews/2026-10-18-ai-chat-scope.md). Không migration/live mới hoặc commit/push, S11 IN_REVIEW.

## Câu hỏi AI có sẵn gửi ngay — 18/10/2026

- [x] RED7 hành vi bốn gợi ý gửi ngay/chống trùng, giữ nháp, retry và provider không sẵn sàng; GREEN35 AiChat.
- [x] Dùng luồng send chung, cập nhật mô tả UI và hướng dẫn; hồi quy AI60/4file, coverage/build PASS, Chrome fixture giả lập1click/1request và bản nháp giữ nguyên. [Báo cáo](../docs/reviews/2026-10-18-ai-preset-send.md); fixture đã gỡ, không backend/native/live mới hoặc commit/push, S11 IN_REVIEW.

## AI tổng hợp các dự án của tôi — 18/10/2026

- [x] User chốt tổng hợp các dự án; đối chiếu quyền, schema chat V25, KPI và luồng gửi hiện tại; giữ các sửa đã kiểm chứng trong working tree.
- [x] Contract/scope fingerprint, dữ liệu theo membership/Admin và bốn prompt có sẵn; TDD RED→GREEN, giữ General/Project cũ và private owner.
- [x] Native fresh/upgrade/quyền/fence/idempotency trên schema riêng; 893FE/162BE AI/9native/14runner/live1 PASS, coverage/build và browser320px. Backup rồi restart8080/V30, dữ liệu cũ giữ nguyên; [báo cáo/giới hạn](../docs/reviews/2026-10-18-ai-my-projects.md). Không commit/push, S11 IN_REVIEW.

## Sửa chat Caheo và phản hồi gửi — 18/10/2026

- [x] Tái hiện đúng prompt/schema chat với câu chào tổng hợp: HTTP200, JSON `answer` không đúng trường `text`; không dữ liệu dự án, không log key/payload.
- [x] RED FE3/BE1→GREEN; chỉ dẫn nêu rõ field `text`, giữ validation; UI gửi ngay trước await, compose mới, phục hồi lỗi/gửi lại/same-key timeout/network/5xx. 890FE/82file, 151BE AI PASS; coverage thực đo, FE build PASS.
- [x] Live đúng contract chat1PASS; Chrome câu chào→READY/thread3, ô nhập rỗng ngay, câu hỏi/pending hiện ngay, bản nháp mới giữ qua trả lời/mở lại. Backend đã restart PID7000/readiness200; [báo cáo](../docs/reviews/2026-10-18-caheo-chat-send.md). Không snapshot dự án/fixture tms/commit/push; giữ S11 IN_REVIEW.

## Kết nối Caheo AI — 18/10/2026

- [x] Xác nhận nhà cung cấp qua ảnh người dùng và docs chính thức; key xác thực GET /v1/models HTTP 200, có `gpt-5.6-luna`. Không đưa key vào source/log.
- [x] TDD endpoint: RED12→GREEN16, loader RED1→GREEN1; nối vào client hiện có, giữ default OpenAI. Maven hồi quy AI149 PASS; wrapper redirect log trả1 được ghi riêng, probe explicit exit0.
- [x] Cấu hình Caheo local owner-only/có backup ngoài Git; live probe schema PASS (2.428 input/22 output token, không dữ liệu dự án). Backend đã restart PID27440, readiness200, metadata ADMIN trả API của hệ thống/gpt-5.6-luna available=true; logout204. Scan893file không thấy key trong source/frontend/log mới. [Báo cáo](../docs/reviews/2026-10-18-caheo-ai-connection.md); không commit/push, giữ S11 IN_REVIEW.

## Đồng nhất màu kết quả — 18/10/2026

- [x] Rà soát selector và xác nhận 5 màu người dùng đã sửa trong Admin; phân biệt kết quả test với trạng thái BUG/QA và thông báo.
- [x] Tạo biến màu dùng chung tại global.css; cập nhật 7 file CSS ở Admin, KPI/báo cáo, thư viện/bảng Excel, đợt/file và verdict retest; giữ tương phản chữ và màu của ô bị khóa.
- [x] 425 test/39 file và build PASS; Chrome Dashboard đủ 5 màu đúng, 42 mẫu không lệch màu, tương phản chữ thấp nhất 4,90:1. Đã lưu ảnh và dọn trang mẫu; xem docs/reviews/2026-10-18-result-colors.md. Chưa đo coverage/UAT toàn trang, không commit/push.

## Chẩn đoán backend startup — 18/10/2026

- [x] Tái hiện `mvn spring-boot:run` exit 1; stack trace chỉ `ChatGptCredentialVault.read` / `AI_CREDENTIAL_STORE_FAILED`, không phải MySQL/Flyway.
- [x] File kho AI có 3 ALLOW ngoài owner; sửa ACL owner-only/chặn kế thừa, giữ nguyên nội dung mã hóa và khóa. Metadata/hash trước/sau được lưu cục bộ.
- [x] Maven startup thành công, Flyway validate 29/up-to-date, readiness/liveness HTTP 200 UP; dừng bản chạy kiểm tra và giải phóng 8080. Không thay source nghiệp vụ, không chạy suite/đo coverage hoặc commit/push; S11 IN_REVIEW. Xem docs/reviews/2026-10-18-backend-startup-vault.md.

## Đối chiếu tài liệu KL.zip — 17/10/2026

- [x] KL-R1: inventory/hash và giải nén50file/2folder;5Word,22cặpdrawio/SVG và1guide. D2/D4 trùng byte.
- [x] KL-R2: trích văn bản/bảng/media; đọc bản hoàn chỉnh theo phần,14UC/25bảng; phân loại Bản gốc ngoài đề tài, bản nháp và nguồn quy trình.
- [x] KL-R3: đối chiếu source/decision hiện hành,75CREATE TABLE trong migration; không introspect DB đang dùng hoặc coi source là bằng chứng nghiệm thu.
- [x] KL-R4: báo cáo24nhóm sai lệch, ma trận14UC/22sơđồ/25bảng; tách ưu điểm, mâu thuẫn nội bộ và9đề xuất đáng giữ. Không biến ý tưởng ban đầu thành tính năng đã triển khai.
- [x] KL-R5: ZIP/5Word giữ nguyên hash; kiểm link/diff và bàn giao. Source nghiệp vụ không đổi; không test/runtime/DB/commit/push mới, S11 IN_REVIEW. Xem docs/reviews/2026-10-17-kl-documents-review.md.

## Commit/push theo yêu cầu17/10/2026

- Người dùng đã cho phép commit và push audit/UI hiện hành lên `system-design`. Kiểm tra scope/index và remote trước push; không merge/deploy, không đổi S11 IN_REVIEW. Báo kết quả commit/remote sau thực hiện; giữ scratch/config local ngoài commit.

## Tinh chỉnh UI/UX — 17/10/2026

- [x] Đọc handoff/planning/permissions/source, snapshot working tree và kiểm runtime;8080/5173 ECONNREFUSED. Giữ S11 IN_REVIEW và các sửa audit.
- [x] Khoanh bounded UI-R1–R5 theo source/bằng chứng, không đổi brand/navigation/API/DB; phân công rõ file.
- [x] UI-R2: ScopeSetup/CoverageEditor kết thúc loading khi request lỗi, giữ nháp và retry; RED2→GREEN79 trong5files.
- [x] UI-R3: role-save/remove success/focus và MemberPicker pager/nút có tên; RED3→GREEN31 trong5files.
- [x] UI-R1: shared filter/selection clarity và modal focus; RED4/9→GREEN49/7files; thêm empty-source precedence RED1/3→GREEN trong full suite884. Giữ initial heading tabindex=-1.
- [x] UI-R4: computed contrast nút xóa lọc12.63:1/count6.45:1; KPI thực tế11.80–12.43:1 nên giữ nguyên global.css, loại false positive thiếu scoped CSS. Không suy thành WCAG toàn hệ thống.
- [x] UI-R5 bounded: Chrome component fixture/mock/API blocked,375/768/1440, keyboard/filter/selection/member/retest, console sau reload sạch trong cửa sổ quan sát; full FE884/82files, coverage/build PASS; review Spec+Standards, report/STATUS.
- [ ] Zoom200%: đã thử shortcut nhưng không đổi DPR/viewport; NOT_VERIFIED. Screen reader/Safari/cảm ứng thật chưa kiểm chứng.
- [ ] Integrated runtime/physical touch/role-data UAT: chưa chạy, backend không được tự khởi động. Không dùng mock/jsdom thay kết luận tích hợp.

## Rà soát luồng hiện hữu — 16/10/2026

Phạm vi do người dùng yêu cầu: khảo sát trạng thái hiện tại, sửa lỗi đã tái hiện của chức năng hiện có; một kế hoạch và một vòng RED→GREEN cho mỗi lỗi. Báo cáo tại `docs/reviews/2026-10-16-workflow-audit.md`. Không commit/push/merge/deploy/PR, không chạy script lịch sử trong `var/`, không thay dữ liệu sử dụng hoặc restart/tạo dịch vụ.

- [x] Đọc yêu cầu, RTK/AGENTS, đối chiếu branch, tracked diff, phiên bản và kế hoạch; ghi baseline và giới hạn.
- [x] Ma trận source theo9luồng và thuật ngữ đã chốt; UI→API→quyền→DB→readback, file:dòng và giới hạn trong báo cáo/3owner evidence.
- [x] Điều tra ba nhóm nghiệp vụ độc lập;5lỗi hành vi xác nhận,3tài liệu sửa; candidate revoke-race tách khỏi finding đã chứng minh.
- [x] R2/ADM-01: gỡ member thành công dọn đúng role draft; gỡ lỗi/nháp người khác giữ nguyên. UI RED→GREEN.
- [x] R3/T-01/T-02:409 edit ô/test lần2 giữ nháp, reload context/token và explicit save; source/run/permission/revision đổi fail closed.13regressions RED→GREEN.
- [x] R4/WQ-01: authoritative detail reload chờ/lỗi khóa commands, giữ nháp/file, retry/read thành công mới mở.2regressions RED→GREEN.
- [x] R5/ADM-03 SQL: keyword Unicode cũ ERROR3854→exact final clause PASS trên SELECT readonly; guarded public HTTP regression đã viết/compile.
- [x] R6 source review: review chéo Spec/Standards, final revision guard/Unicode/audit-output path; không finding critical/P1/P2 được xác nhận còn lại trong diff.
- [x] FE872/79files và coverage thực đo; BE552/57unit classes và JaCoCo unit-only; build/package/contract structural/diff PASS, DB readonly76tables/185FK/10checks không violation. Lỗi môi trường/lượt trung gian ghi riêng.
- [ ] Native/HTTP: cần preprovisioned isolated V29;3schema đang có V21/V22 không phù hợp, không tự migrate/reset/chọn tms. Public HTTP Unicode và concurrency/projection **NOT_RUN**.
- [ ] Browser/runtime/UAT:8080/5173 ECONNREFUSED; không tự start/restart. Kiểm browser/role-data/physical-device và S11 UAT còn riêng.
- [x] Báo cáo/STATUS/planning cập nhật scope,skill,changed files,coverage,retro/next action; S11 giữ IN_REVIEW, không commit/push.

Contract/diff checkpoint cuối và artifact tổng hợp nằm trong báo cáo; không đánh dấu native/browser đã đạt bằng unit test. Fresh dependency scan/JDT **NOT_RUN**, JS lint/typecheck **NOT_CONFIGURED**.

## Mở rộng V20 — 07/10/2026

- [x] Dữ liệu demo local: 5 user theo quyền, 2 dự án, membership/catalog/cycle/device/allocation; không seed case/file/result trong SQL.
- [x] Fresh + V19 upgrade, giữ dữ liệu cũ, no-reset, collision rollback; config release isolation, HTTP các quyền và Tester session/Dev denial trên schema riêng.
- [x] Backup, áp dụng V20 trên tms, restart8080; fingerprint 4379 dòng cũ/64 bảng nguyên vẹn.
- [x] Nhập riêng hai file sẵn có, duyệt/phân công 87+1 case và kích hoạt đợt demo; để chưa thực thi trên database bàn giao.
- [x] Hướng dẫn tài khoản và bằng chứng: docs/database/demo-v20.md, docs/reviews/2026-10-07-demo-v20.md.
- V20 tiếp tục theo ủy quyền commit/push `system-design`; không merge `develop`.

## F/Q trước V20

- [x] Task1: Contract/schema nền; review spec/quality APPROVE; native validation gate NOT_RUN riêng.
- [x] Task2: Giao file/My work API; 34 tests + 48 related regression PASS; review spec/quality APPROVE. Native/HTTP gate riêng.
- [x] Task3: Phiên/máy thật; clean65 PASS + fix33 session tests PASS; review spec+quality PASS. Native/HTTP NOT_RUN.
- [x] Task4: Execution session/pinnedview/export; review spec/quality APPROVE, focused regression + fresh javac PASS. Native/HTTP NOT_RUN.
- [x] Checkpoint F: Backend tests/compile/contract source PASS; native NOT_RUN, không gọi toàn bộ database gate PASS.
- [x] Task5: Filework UI/route/PMlinks; 5A/5B/5C reviews spec+quality APPROVE, scoped tests/build PASS. Browser/native gate Task8 riêng.
- [x] Task6: QAbackend + genericpermissionguards/evidence; 6A/6B/6C reviews APPROVE sau sửa, final scoped112 tests PASS. Native/HTTP NOT_RUN.
- [x] Task7: QAUI/PMhandoff; 7A/7B/7C/7C2/7D/7E source reviews spec+quality APPROVE. Native/HTTP/UAT riêng, chưa hoàn tất.
- [x] Task8 source gate: Fullregression/guarded native fixture source/browser UI-only/finalreview/docs;612 FE/394 offline BE PASS, final scoped review APPROVED. Không phải native nghiệm thu.
- [x] Task8 native gate: Fresh V19/upgrade V16→V19/FK/preservation trên schema riêng; phát hiện và sửa hai FK QA bằng V19, giữ V1–V18.
- [x] Task8 concurrency/transaction: 5 test native PASS về identity SHARE, BUG stale version/assignment, exact QA comment, commit độc lập/rollback batch; guard Java 2/2 và runner Node 7/7 PASS.
- [x] Task8 HTTP: Hành trình ADMIN→PM→Tester→Dev→retest→PM và QA, 37 bước trên V18 rồi 37 bước mới trên V19; Excel nguồn/cập nhật đối chiếu thực tế. Sau backup, `tms` V19 và backend 8080 đã cập nhật; 23 kiểm tra HTTP 4 vai trò PASS.
- [ ] Task8 UAT/pilot: Người dùng nghiệm thu bộ kịch bản đầy đủ và môi trường pilot; không tự ký từ kết quả kiểm thử tự động.

Kết quả mới nhất, thay thế các nhãn native NOT_RUN tại checkpoint lịch sử phía trên: [nghiệm thu native V19](../docs/reviews/2026-10-06-native-completion.md).

Đã duyệt nghiệp vụ F/Q ngày06/10/2026. Không đánh dấu checklist chỉ vì đã viết tài liệu hoặc thấy source; bằng chứng chạy/review lưu ledger và docs/reviews.

## FixReports — checkpoint 19/10/2026

Phạm vi mở rộng theo yêu cầu người dùng; kế hoạch duy nhất là [FR-00–FR-12](../docs/planning/2026-10-19-fixreports-implementation-plan.md), [báo cáo/skills/A01–A20](../docs/reviews/2026-10-19-fixreports-implementation-review.md). Không làm lại các mục PASS trong lịch sử.

- [x] FR00–11 source/contract/migration và test cô lập theo R01–R08; FR12 finalreview/test/browsercheckpoint có giới hạn rõ.
- [x] FE975/105files +coverage/build; BE645/74classes+verify/package; native/HTTP/coreAI/Admin/Note/report/Issue vàsnapshot mainV30→33 PASS theo scope, không cộng test trùng.
- [x] Bảo toàn7.362 row cũ/76bảng;10file/711case đối chiếu;replay0. Tạo thật project12SPIDER-PLUS/PM syp.lab.pm03 theo user cho phép; main vẫnV30/UP.
- [x] Browser4role/320–1440px, actual reportdownload110bytes, bàn giao2máy/lưu1member/Status/Issue/Note/archive; preview5174/8081 riêng.
- [ ] Browser upload: extension fileURL permission chặn, không autoenable; workbook gốc download chưa xác nhận.
- [ ] Dữ liệu trước cutover: source1 thiếu workbook và120case không file giữ nguyên; cần chứng minh nguồn/quan hệ nếu muốn chuyển.
- [ ] Hoàn tất manual trước/sau mọi trạng thái/liveAI/UAT/thiết bị thật/pilot/NFR. S11 giữIN_REVIEW.
- [x] Main cutoverV31–33/restart8080 đã thực hiện sau quyền người dùng; xem checkpoint19/10 bên dưới. Không commit/push/merge hoặc triển khai ngoài local.

### FR-12 follow-up UI/Chrome 19/10/2026

- [x] Main5173/8080V30 authenticated404 được tái hiện; preview8081 trả200.
- [x] Bảy lỗi sourceUI sửa,980FE/105files+coverage/build; browser390/768/1440/reload/range/focus.
- [x] Báo cáo và skill/evidence: [follow-up](../docs/reviews/2026-10-19-fixreports-ui-followup.md), kế hoạch duy nhất vẫnFR12.
- [x] User cho phép main cutoverV30→33/restart8080; backup mới khi writer dừng,7.374row giữ nguyên,711case,12GET200 và Chrome5173 kiểm xong.
- [ ] Toolfilechooser vẫn lỗi sau user xác nhận fileURLaccessON; không autochange/bypass quyềnChrome; manual/UAT/live riêng.

### FR-12 main cutover được cho phép19/10/2026

- [x] Dừng đúng7016/start30588; mainV33/UP;5173/5174/8081 không đổi process.
- [x] Backup mới,7.374 hàng cũ ngoài session giữ nguyên;10file/711case khớp nguồn; validate33/pending0; HTTP12/12 và Chrome5173 PASS.
- [ ] Giữ FR12/S11 IN_REVIEW cho các mục chưa kiểm đầy đủ, upload/download browser chưa xác nhận, liveAI/UAT và ngoại lệ nguồn; xem [báo cáo cập nhật](../docs/reviews/2026-10-19-fixreports-ui-followup.md). Không commit/push/merge.
