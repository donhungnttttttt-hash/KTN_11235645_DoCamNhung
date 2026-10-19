const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const evidence='var/uiux-polish-2026-10-19/';
const tests=JSON.parse(read(evidence+'frontend-stable-final-tests.json'));
const build=JSON.parse(read(evidence+'build-final.json'));
const before=JSON.parse(read(evidence+'source-freeze-final.json'));
const after=JSON.parse(read(evidence+'source-after-final-tests.json'));
const old=new Map(before.files.map(f=>[f.path,f.sha256]));
const changed=after.files.filter(f=>old.get(f.path)!==f.sha256).map(f=>f.path);
const missing=before.files.filter(f=>!after.files.some(n=>n.path===f.path)).map(f=>f.path);
if(!tests.success||tests.numFailedTests||build.exitCode!==0||changed.length||missing.length)throw Error('Final verification not clean; do not publish PASS.');
const coverage=JSON.parse(read(evidence+'frontend-final-coverage/coverage-summary.json')).total;
const verification={capturedAt:new Date().toISOString(),tests:{passed:tests.numPassedTests,failed:tests.numFailedTests,pending:tests.numPendingTests,files:tests.testResults.length,receipt:evidence+'frontend-stable-final-tests.json'},build:{exitCode:build.exitCode,receipt:evidence+'build-final.json'},sourceStable:{files:after.files.length,changed,missing,before:before.capturedAt,after:after.capturedAt},coverage:{...coverage,note:'Measured full-source checkpoint1047 tests/115 files. During that run hook Escape guard, its new test, and modal radius changed; final frozen source is separately verified by the full suite above. Do not describe percentages as remeasured after freeze.'},browser:{matrix:evidence+'browser-matrix.md',allButtonsPassed:false,liveProviderCalls:0,domainWrites:0,authAuditEventsExpected:true},remaining:{oldFindingsFixedSourceMock:11,partial:1,open:['UX-002','UX-011'],uat:'PARTIAL'}};
write(evidence+'final-validation.json',JSON.stringify(verification,null,2)+'\n');
const block=`## Kiểm chứng cuối

- **Toàn bộ frontend trên source đã chốt: ${tests.numPassedTests}/${tests.numTotalTests} PASS, ${tests.testResults.length} file, ${tests.numPendingTests} bỏ qua.** Lệnh: \`rtk proxy npm.cmd test -- --maxWorkers=1 --reporter=json --outputFile=../var/uiux-polish-2026-10-19/frontend-stable-final-tests.json\`. [Receipt](../../${evidence}frontend-stable-final-tests.json). Hash ${after.files.length} file source/config trước–sau lượt cuối giống nhau; không chỉnh assertion/timeout để lấy PASS.
- **Build PASS, exit 0:** Vite 6.4.3, 1.701 module; JavaScript 480,82 kB (gzip 139,73 kB), CSS 183,64 kB (gzip 32,89 kB). [Receipt](../../${evidence}build-final.json). Đây là build local, không deploy.
- **Coverage đã đo:** statements ${coverage.statements.pct}%, branches ${coverage.branches.pct}%, functions ${coverage.functions.pct}%, lines ${coverage.lines.pct}%. [Summary](../../${evidence}frontend-final-coverage/coverage-summary.json). Include \`src/**/*.{js,jsx}\`, exclude tests/setup và legacy bootstrap \`src/index.js\`. Lượt coverage đạt 1.047/1.047 test, 115 file; trong lúc chạy có thêm xử lý Escape cho bộ chọn lồng nhau, test của nó và CSS bo góc. Vì vậy tỷ lệ là checkpoint coverage, còn lượt toàn frontend ở bullet đầu xác nhận source cuối. Không gọi tỷ lệ này là coverage browser hoặc coverage của mọi trạng thái.
- Giữ nguyên lượt coverage đầu 1.031/1.034 thất bại và lượt cô lập 48 PASS; lượt full coverage một worker sau đó không còn lỗi. Lượt ổn định cuối có thêm test bộ chọn, không cộng các lượt thành tổng coverage. [Đối chiếu máy đọc được](../../${evidence}final-validation.json).
- **Chrome đã kiểm bốn role trên fixture**, thêm main chỉ đọc đầu lượt. [Ma trận browser chi tiết](../../${evidence}browser-matrix.md) phân biệt từng hành trình và NOT_RUN. Hộp thoại monkey được đo ở 320/390/768/1024 px; tạo Issue từ case ở 390 px, Chat và tài khoản Admin ở 320 px, Tổng quan ở 320/1440 px. Đã kiểm DEV mở rộng và xem lịch sử Issue, Tester chuyển case và focus/preview/lịch sử, PM mở Note và giữ nháp báo cáo. Console cuối không có error/warn được công cụ thu thập tại hai tab; không suy toàn hệ thống không có lỗi. Không sửa dữ liệu nghiệp vụ main; fixture chỉ đọc, mở và hủy form; các lần đăng nhập/đăng xuất có audit kỹ thuật.
- **Bảo toàn:** [receipt hash và link](../../${evidence}preservation-and-links.json) so với baseline 2.853 file, không file cũ bị mất; Backend/config/package không đổi. Các sửa cũ tồn tại trước task được giữ; không dùng diff với HEAD để nhận toàn bộ thay đổi là của đợt này. Whitespace và local link check PASS; không mở link Drive/SharePoint.
- **Chưa hoàn tất toàn bộ UAT:** 11 finding có sửa source/mock, UX-001 còn PARTIAL theo ma trận entry/trạng thái; UX-002/011 còn OPEN cùng các mục tồn đọng đã liệt kê. Không nói mọi button đã được click hoặc hoạt động 100%. Backend/native tests không chạy lại vì không đổi backend; live AI/OAuth/probe, ghi dữ liệu, upload/download thật, screen reader/IME/touch/zoom 200% và reduced motion của hệ điều hành còn NOT_RUN. S11/FR-12 tiếp tục IN_REVIEW.
- Không commit/push/merge/deploy; không migration/restart/cài dependency. Viewport reset và các tài khoản fixture logout; main cleanup thấy màn đăng nhập.

![Tổng quan sau polish, giữ thông tin dự án, trạng thái và mốc](../../${evidence}overview-final-1440.jpg)
`;
const reportPath='docs/reviews/2026-10-19-uiux-polish.md';
let report=read(reportPath);
const index=report.indexOf('## FINAL_VALIDATION');
if(index<0)throw Error('Final validation marker missing');
report=report.slice(0,index)+block;
report=report.replace(/Trạng thái bản nháp:/,'Trạng thái:').replace(/Kết quả tích hợp cuối chờ mục `FINAL_VALIDATION` do root bổ sung\./,'Kết quả kiểm chứng cuối được ghi ở cuối báo cáo.');
write(reportPath,report);
const statusPath='docs/planning/STATUS.json',status=JSON.parse(read(statusPath));
status.updatedAt='2026-10-19';
status.uiuxPolish20261019={status:'IMPLEMENTED_WITH_EXPLICIT_GAPS',report:reportPath,plan:'docs/planning/2026-10-19-uiux-polish.md',evidence:evidence.slice(0,-1),sourceInventory:{controls:997,controlFiles:111,stylesheets:28,parseErrors:0,transitionAll:0,runtimeClickCoverage:false},verification,scope:'Frontend UI/UX and state recovery; preserve overview status/milestones and five result colors; no business contract changes',preservation:{backendChanged:false,dependenciesChanged:false,domainWrites:0,migration:false,restart:false,commit:false,push:false,merge:false,deploy:false},nextAction:'Continue residual and browser/UAT gaps from report; implement approved archive legacy exception and clarify Rules contract through their separate plan. Do not mark FR-12/S11 complete.'};
write(statusPath,JSON.stringify(status,null,2)+'\n');
const readmePath='docs/planning/README.md';
const checkpoint='### Hoàn thiện UI/UX và trạng thái thao tác — 19/10/2026';
if(!read(readmePath).includes(checkpoint))write(readmePath,read(readmePath)+`\n${checkpoint}\n\nĐã áp dụng skill UI/UX và sửa frontend theo ba nhóm: Admin/Auth/General, Testing/Issue, Reports/AI; thống nhất radius/motion/focus, khắc phục portal/nháp/409/reauth/keyboard. AST kiểm kê997controls ở111file, không phải997nút đã bấm. Full source cuối${tests.numPassedTests}/${tests.numTotalTests}test và buildPASS;coverage checkpoint lines${coverage.lines.pct}%. Chrome có smoke bốn role và viewport đại diện, chưa fullUAT.11finding cũ có sửa source/mock,1partial,2open; xem [báo cáo chi tiết](../reviews/2026-10-19-uiux-polish.md). Giữ dữ liệu/source cũ,không backend/migration/restart/commit/push;FR-12/S11 vẫnIN_REVIEW.\n`);
const planPath='docs/planning/2026-10-19-uiux-polish.md';let plan=read(planPath);
for(const prefix of ['Rà Auth/Admin/General','Rà Feature/file/case/Issue','Rà Reports/AI','Hoàn thiện shared shell','Chạy kiểm thử toàn frontend/build','Cập nhật báo cáo'])plan=plan.replace('- [ ] '+prefix,'- [x] '+prefix);
plan=plan.replace('- [ ] Browser Admin/PM/Tester/Dev, màn thường và hộp thoại, viewport 320/390/768/1024/1440, cao thấp; phân biệt thao tác đọc với ghi dữ liệu.','- [ ] Browser toàn ma trận: đã smoke bốn role và viewport đại diện 320/390/768/1024/1440; còn state/error/permission/AT/IME/zoom/reduced-motion đầy đủ. Xem browser-matrix.md trong thư mục bằng chứng, không đánh dấu toàn bộ PASS.');
plan+='\nCheckpoint cuối: xem [báo cáo](../reviews/2026-10-19-uiux-polish.md) và `uiuxPolish20261019` trong STATUS. Source/review/kiểm thử đã ghi bằng chứng; UAT và residual còn mở.\n';write(planPath,plan);
console.log(JSON.stringify({tests:verification.tests,sourceStable:verification.sourceStable,build:verification.build}));
