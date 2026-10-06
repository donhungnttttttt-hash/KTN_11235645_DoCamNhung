# F/Q task list — plan tasks/plan.md

- [x] Task1: Contract/schema nền; review spec/quality APPROVE; native validation gate NOT_RUN riêng.
- [x] Task2: Giao file/My work API; 34 tests + 48 related regression PASS; review spec/quality APPROVE. Native/HTTP gate riêng.
- [x] Task3: Phiên/máy thật; clean65 PASS + fix33 session tests PASS; review spec+quality PASS. Native/HTTP NOT_RUN.
- [x] Task4: Execution session/pinnedview/export; review spec/quality APPROVE, focused regression + fresh javac PASS. Native/HTTP NOT_RUN.
- [x] Checkpoint F: Backend tests/compile/contract source PASS; native NOT_RUN, không gọi toàn bộ database gate PASS.
- [x] Task5: Filework UI/route/PMlinks; 5A/5B/5C reviews spec+quality APPROVE, scoped tests/build PASS. Browser/native gate Task8 riêng.
- [x] Task6: QAbackend + genericpermissionguards/evidence; 6A/6B/6C reviews APPROVE sau sửa, final scoped112 tests PASS. Native/HTTP NOT_RUN.
- [x] Task7: QAUI/PMhandoff; 7A/7B/7C/7C2/7D/7E source reviews spec+quality APPROVE. Native/HTTP/UAT riêng, chưa hoàn tất.
- [x] Task8 source gate: Fullregression/guarded native fixture source/browser UI-only/finalreview/docs;612 FE/394 offline BE PASS, final scoped review APPROVED. Không phải native nghiệm thu.
- [ ] Task8 native gate: FreshV18/upgradeV16→18/FK/preservation/SQL thực tế trên schema riêng.
- [ ] Task8 concurrency/transaction: Viết/chạy ba race identity SHARE, BUG stale-command, exact QA comment; kiểm chứng commit độc lập/rollback command thất bại và Java pre-start guard.
- [ ] Task8 HTTP/UAT/pilot: Hành trình ADMIN→PM→Tester→Dev→retest→PM, Excel tải thực tế và người dùng nghiệm thu.

Đã duyệt nghiệp vụ F/Q ngày06/10/2026. Không đánh dấu checklist chỉ vì đã viết tài liệu hoặc thấy source; bằng chứng chạy/review lưu ledger và docs/reviews.
