# F/Q task list — plan tasks/plan.md

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
