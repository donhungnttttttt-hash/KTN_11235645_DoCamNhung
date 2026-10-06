# Review tổng luồng TMS — 06/10/2026

Yêu cầu: kiểm tra toàn hệ thống theo hành trình ADMIN tạo dự án/PM/user → PM nhập/giao file → Tester dùng máy, ghi tiến độ/kết quả, tạo bug/QA → Dev xử lý → Tester retest → PM theo sát; sửa lỗi rõ ràng và viết PRD/đặc tả đầy đủ. Lượt bắt đầu 05/10 và qua ngày 06/10 theo Asia/Saigon.

Nhánh `system-design`; HEAD đầu lượt `b189f8e`. Working tree ADMIN A1–A4 và sửa UI trước được bảo toàn; không reset, commit, push, merge hoặc deploy. ADMIN code/migrations V14–V16 đã có trước lượt này, không tính như chức năng mới được viết trong review này.

## Kết luận

Nền có phần lớn chức năng kiểm thử ở cấp case/run/build, nhưng **chưa đủ luồng công việc theo file** và QA hỏi/đáp. Không đánh đồng nền kiến trúc đúng với sản phẩm hoàn chỉnh. Có ba lớp kết quả nguồn/annotation/execution và một lớp verification; chúng tách theo quyết định đã duyệt, không tự chuyển annotation thành attempt.

Đã đối chiếu identity/ADMIN/member/inventory/import/revision/approval/execution/ticket/Dev/retest/report/audit/Redmine ở phạm vi source và contract. Hai audit độc lập chỉ đọc được dùng cho phần file và ticket: [file](2026-10-05-workflow-file-audit.md), [ticket](2026-10-05-workflow-ticket-audit.md). Không khẳng định đã chạy mọi UI/API/dữ liệu thực tế.

## Defect đã sửa

| ID | Tái hiện / nguyên nhân | Thay đổi và kiểm chứng |
| --- | --- | --- |
| WF-B01 | DEV get/transition dùng `in_progress`; V7 và native V16 chỉ có `progress`. Dev không vào Đang xử lý được | Dùng canonical progress, sửa fixture/docs; regression positive GET/POST và chặn typo. RED 3 failure+1 error, GREEN trong 26 BE tests scoped |
| WF-B02 | ProjectOverview chỉ kiểm `writable` nên Dev thấy Thêm công việc enabled dù create bị server từ chối | Guard metadata.canCreate===true, fail-closed lúc chưa có metadata; hai test PM/Dev. RED → GREEN |
| WF-B03 | AttemptDialog readOnly nhưng active=true vẫn render NgBugActions cho history NG; copy mời Dev ghi trên dòng | Gate mutation actions !readOnly, lời nhắc chỉ xem; regression readOnly NG. RED → GREEN |
| WF-D01 | Docs S05 còn ghi NA/chốt đợt chưa có dù S08 đã triển khai; defect-lifecycle thiếu precedence Dev/S07 | Cập nhật execution.md, execution-results.md, permissions.md và banner hiện hành defect-lifecycle. Không sửa policy/SQL cũ |

Không đổi permission Dev sang QA/REQUEST, không đóng non-BUG bằng closure bug, không tự tạo retest/coverage hoặc ghi lại source workbook. Các phần đó là capability/decision mới.

## Phần thiếu đã đặc tả

- Giao file như một nhóm scope có danh sách run IDs/revision đã pin; My files của Tester.
- Phiên READY/DOING/PAUSED/COMPLETED, actor/server time, máy vật lý allocation đúng dự án/người.
- File execution projection/export theo cycle/config/build/session; giữ annotation/source riêng.
- Dashboard PM theo file/người/máy, queue Chờ chuẩn bị retest/Đã giao/Đã kiểm chứng.
- QA hỏi/đáp có identity/context/assignee/lifecycle, không giả dạng BUG hoặc mở Dev trên tất cả loại ticket.
- Closure non-BUG hiện chưa hoàn chỉnh; cần policy nhận kết quả riêng.

Phương án và quyết định mở: [PRD](../product/PRD.md). Mô hình dữ liệu/API/invariant/acceptance: [đặc tả](../product/SYSTEM-SPECIFICATION.md). [UAT](../product/TRACEABILITY-UAT.md) có 57 kịch bản (9 ADMIN, 11 Excel, 12 file/execution, 15 ticket/retest, 10 báo cáo/vận hành), phân biệt source/test PASS/gap/native pending.

## Kiểm thử thực sự đã chạy

- FE focused 26/26, full **344/344 trong 44 files**, build PASS. Full FE ban đầu bắt fixture PM thiếu metadata; bổ sung quyền fixture và rerun toàn bộ, không làm yếu guard.
- BE scoped **26/26 trong 6 suites**, Surefire XML failure/error/skip đều 0; Maven exit0. Package `-DskipTests` PASS riêng. Không gọi đây full BE verify hoặc fulljourney native.
- JDT **167 source, 0 error/0 warning**. Matcher test mới từng sinh một null-safety warning, đã thay helper @NonNull và rerun JDT/scoped tests.
- Check-Contracts PASS **109 operations S03–S10**, local references/path parameters và 50 tài liệu cũ. Structural checker không thay OpenAPI validator đầy đủ.
- Chỉ đọc native `2026-10-05T17:03:34Z`: V16 success; 4 projects/9 users/12 memberships/5 documents/492 cases/242 runs/191 attempts/74 tickets; 0 assets/allocations. 0 active project thiếu PM enabled non-DEV; 0 run assigned DEV; 0 committed row thiếu target_case_id.
- Từ điển metadata: **59 tables, 560 columns, 139 FK constraints, 269 indexes**. Sinh chỉ từ information_schema, không có dữ liệu/hash/session/credential: [DATA-DICTIONARY](../product/DATA-DICTIONARY.md).

Lệnh chính:

```powershell
cd D:\DCN\KTN_11235645_DoCamNhung\Frontend
rtk npm test
rtk npm run build
cd D:\DCN\KTN_11235645_DoCamNhung\Backend
rtk mvn -q '-Dtest=DeveloperPermissionsTest,WorkItemHistoryTest,DeveloperResultsTest,DocumentResultServiceTest,IdentityPolicyTest,CentralMembershipTest' test
rtk mvn -q -DskipTests package
cd D:\DCN\KTN_11235645_DoCamNhung
rtk node scripts/Check-JavaDiagnostics.cjs
rtk node scripts/Check-Contracts.cjs
```

Scratch READ_ONLY_SELECT/metadata scripts được dùng để kiểm chứng local, không thêm dependency/runtime feature và không chứa credential. Không đo coverage toàn hệ thống trong lượt này. Bằng chứng native/browser/load/backup trước vẫn giữ ở [review ADMIN](2026-10-05-admin-implementation.md); không gán lại thành kiểm thử của chức năng F/Q chưa có.

## Giới hạn và việc tiếp theo

Schema native test chưa dùng được do quyền CREATE DATABASE 1044 đã ghi trong review trước. Không chạy fixture hoặc migration test trên `tms`, không tạo Docker/server thay. Không stop/restart listener người dùng 8080/5173; artifact mới đã build nhưng phải chạy lại đúng backend để runtime nhận patch. Lượt này không có migration mới hoặc dữ liệu nghiệp vụ mới.

S11 giữ `IN_REVIEW`. Cần duyệt spec phần F/Q, schema test native, regression migration/concurrency/export và UAT PM/Tester/Dev trước nghiệm thu luồng. Các câu hỏi D-F1/D-Q1 đã gửi nhưng chưa có phản hồi; đề xuất không tự trở thành quyết định đã chốt.

Skill đã dùng: prompt-master (đối chiếu mục đích, không biến task coding/docs thành prompt), brainstorming, product-capability, dispatching-parallel-agents, api-design, api-and-interface-design, spec-driven-development, security-review, tdd-workflow, verification-loop; audit agents dùng code-review-and-quality. Stack giữ React JavaScript/Spring Boot/MySQL native/Flyway. Không coi việc đọc/cài skill là kết quả kiểm thử.
