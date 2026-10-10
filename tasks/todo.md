# F/Q task list — plan tasks/plan.md

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
