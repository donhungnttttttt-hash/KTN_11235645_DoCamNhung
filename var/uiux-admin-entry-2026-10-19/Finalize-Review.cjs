const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(__dirname,p),'utf8'));
const tests=read('frontend-verified-final-tests.json');
const before=read('source-verified-before.json');
const after=read('source-verified-after.json');
const buildAfter=read('source-verified-after-build.json');
const build=read('build-verified-final.json');
function compare(snapshot){const old=new Map(before.files.map(f=>[f.path,f.sha256]));const current=new Map(snapshot.files.map(f=>[f.path,f.sha256]));return {changed:[...old].filter(([p,h])=>current.has(p)&&current.get(p)!==h).map(([p])=>p),missing:[...old.keys()].filter(p=>!current.has(p)),added:[...current.keys()].filter(p=>!old.has(p))};}
const stable=compare(after),buildStable=compare(buildAfter);
if(!tests.success||tests.numFailedTests||tests.numPendingTests||build.exitCode!==0||[stable,buildStable].some(v=>Object.values(v).some(a=>a.length)))throw Error('Final verification must pass on unchanged source before updating completion records.');
const count=tests.numPassedTests,files=tests.testResults.length;
const validation={capturedAt:new Date().toISOString(),tests:{passed:count,failed:tests.numFailedTests,pending:tests.numPendingTests,files,success:tests.success,exitCode:0,receipt:'frontend-verified-final-tests.json'},build:{exitCode:build.exitCode,receipt:'build-verified-final.json'},sourceStable:{files:before.files.length,...stable,buildComparison:buildStable,before:before.capturedAt,after:after.capturedAt},coverage:'NOT_MEASURED_THIS_TURN',browser:{allButtonsPassed:false,main:'localhost:5173',fixture:'localhost:5174',domainWrites:0,liveAiCalls:0,authAuditEventsExpected:true,cleanup:'browser-cleanup.json'},preservationReceipt:'preservation-and-links.json',sprintStatus:'S11_IN_REVIEW_FR12_IN_REVIEW'};
fs.writeFileSync(path.join(__dirname,'final-validation.json'),JSON.stringify(validation,null,2)+'\n');
const reportPath=path.join(root,'docs/reviews/2026-10-19-admin-entry-uiux.md');
let report=fs.readFileSync(reportPath,'utf8');
const marker='<!-- FINAL_VALIDATION:';
if(!report.includes(marker))throw Error('Report completion marker missing; refusing blind rewrite.');
report=report.slice(0,report.indexOf(marker))+`- **Toàn bộ frontend trên source đã chốt: ${count}/${count} PASS, ${files} file, 0 FAIL/0 bỏ qua.** Lệnh từ Frontend: \`rtk proxy npm.cmd test -- --maxWorkers=1 --reporter=json --outputFile=../var/uiux-admin-entry-2026-10-19/frontend-verified-final-tests.json\`. [Receipt cuối](../../var/uiux-admin-entry-2026-10-19/frontend-verified-final-tests.json). Không cộng các lượt test theo nhóm vào tổng này.
- **Build PASS, exit 0:** 1.701 module, 9,17 giây; JavaScript 488,03 kB (gzip 141,76 kB), CSS 188,40 kB (gzip 33,58 kB). [Receipt build](../../var/uiux-admin-entry-2026-10-19/build-verified-final.json). Đây là build local, không deploy.
- **Source giữ nguyên trong lượt kiểm chứng cuối:** hash ${before.files.length} file frontend/source/config trước build, sau build và sau suite không đổi; không file thêm/mất. [Đối chiếu](../../var/uiux-admin-entry-2026-10-19/final-validation.json), [trước](../../var/uiux-admin-entry-2026-10-19/source-verified-before.json), [sau](../../var/uiux-admin-entry-2026-10-19/source-verified-after.json).
- **Giữ kết quả thất bại/trung gian:** lượt full đầu 1.080 PASS/1 FAIL/1.081 tổng do test lifecycle cũ mong Hủy đóng nháp ngay; test được cập nhật để kiểm hai lựa chọn giữ/bỏ nháp theo hành vi mới. [Lượt thất bại](../../var/uiux-admin-entry-2026-10-19/frontend-final-tests.json). Lượt full tiếp theo 1.085/1.085 PASS nhưng source tiếp tục đổi trong lúc chạy, nên chỉ là [checkpoint](../../var/uiux-admin-entry-2026-10-19/frontend-stable-final-tests.json). Chỉ lượt đầu mục này đại diện bản đã chốt.
- **Coverage mới: NOT_MEASURED.** Không lấy phần trăm của lượt polish trước làm coverage của bản sửa này. Không chạy lại backend/native vì không sửa backend/schema; mock frontend không thay kiểm tích hợp/API ghi thật.
- **Bảo toàn:** [receipt hash, whitespace và liên kết](../../var/uiux-admin-entry-2026-10-19/preservation-and-links.json) đối chiếu baseline 3.374 file; không file cũ bị mất, Backend/config/package giữ nguyên, không thay đổi ngoài UI/docs/evidence. Không có commit/push/merge/deploy, migration hoặc restart trong lượt này. Hash chỉ xác nhận file; không dùng nó để giả đã kiểm từng dòng của toàn source.
- **Chrome:** các hình học và thao tác được ghi theo từng trạng thái phía trên; link workspace từ Admin và link Quản trị hệ thống quay lại đã được bấm. Tab cuối không có warning/error được công cụ thu trong cửa sổ quan sát; không suy toàn app không có lỗi. Đã đăng xuất tài khoản kiểm tra, đặt lại viewport và đóng tab cuối. Hai tab cũ bị detached khiến công cụ không đóng tường minh được; không tab nào được đánh dấu giữ lại. [Cleanup](../../var/uiux-admin-entry-2026-10-19/browser-cleanup.json), [console](../../var/uiux-admin-entry-2026-10-19/final-tab-console.json). Không ghi dữ liệu nghiệp vụ; đăng nhập/đăng xuất có audit kỹ thuật.

**Phần chưa hoàn tất:** mọi tổ hợp role × route × loading/error/empty/dirty/pending/conflict; mọi biến thể edit/thu hồi/lưu API của bốn nhóm form; bàn phím ảo/IME, chạm trên thiết bị thật, zoom 200%, screen reader và chế độ giảm chuyển động thực tế; upload/download/clipboard, AI/OAuth thật và UAT. Chat thấp và xác nhận bỏ nháp trong app đã có bằng chứng Chrome, nhưng không suy thành đã kiểm mọi trạng thái/thiết bị. Không khẳng định “tất cả button đều hoạt động” từ ${count} test hoặc 1.004 khai báo JSX.

**Tồn đọng nghiệp vụ giữ nguyên:** UX-002 (ngoại lệ Admin có lý do khi lưu trữ dự án còn đợt/retest legacy) đã được người dùng chốt chính sách, nhưng chưa triển khai luồng backend trong lượt frontend này; UX-011 (contract Rules) còn OPEN. Route exit của nháp Issue, phân trang Feature/file khi số bản ghi giảm, so sánh xung đột phân công và các khoảng trống khác tiếp tục theo [báo cáo polish](2026-10-19-uiux-polish.md) và [ma trận toàn hệ thống](2026-10-19-uiux-system-coverage.md). **FR-12 và S11 vẫn IN_REVIEW.**
`;
fs.writeFileSync(reportPath,report);
const planPath=path.join(root,'docs/planning/2026-10-19-admin-entry-uiux.md');
let plan=fs.readFileSync(planPath,'utf8').replace('- [ ] Chạy regression và build trên source đã chốt; ghi coverage đã đo/chưa đo.',`- [x] Chạy regression và build trên source đã chốt: ${count}/${count} test, ${files} file, build exit 0; hash ${before.files.length} file giữ nguyên. Coverage chưa đo mới.`).replace('- [ ] Cập nhật báo cáo/STATUS, giới hạn còn lại và ảnh trước/sau.','- [x] Cập nhật [báo cáo](../reviews/2026-10-19-admin-entry-uiux.md)/STATUS, giới hạn còn lại và ảnh trước/sau.');
fs.writeFileSync(planPath,plan);
const statusPath=path.join(root,'docs/planning/STATUS.json');
const raw=fs.readFileSync(statusPath,'utf8'),status=JSON.parse(raw);
if(Object.hasOwn(status,'uiuxAdminEntry20261019'))throw Error('Status entry already exists; review before overwriting.');
const entry={status:'SCOPED_FIXES_VERIFIED_WHOLE_SYSTEM_UAT_GAPS_OPEN',report:'docs/reviews/2026-10-19-admin-entry-uiux.md',plan:'docs/planning/2026-10-19-admin-entry-uiux.md',evidence:'var/uiux-admin-entry-2026-10-19',scope:['Admin first-login layout and desktop/mobile navigation','Workspace focus contrast, testing grid and low-height chat','Admin unsaved drafts, inert focus restoration and scrollport dropdown','Explicit read recovery and device conflict feedback'],verification:validation,remaining:['UX-002 legacy archive exception implementation','UX-011 Rules contract','Per-role/per-state UAT and real touch/IME/zoom200/screen-reader/live-provider/upload/download gaps'],preservation:{backendChanged:false,configurationChanged:false,dependenciesChanged:false,mainDomainWrites:0,migration:false,restart:false,commit:false,push:false,merge:false,deploy:false},nextAction:'Keep FR-12/S11 IN_REVIEW; retain previous coverage matrix NOT_RUN entries and scoped evidence. No claim all buttons passed.'};
const tail=raw.lastIndexOf('}');
const head=raw.slice(0,tail).trimEnd();
fs.writeFileSync(statusPath,head+',\n  "uiuxAdminEntry20261019": '+JSON.stringify(entry,null,2).replace(/\n/g,'\n  ')+'\n}\n');
const parsed=JSON.parse(fs.readFileSync(statusPath,'utf8'));
delete parsed.uiuxAdminEntry20261019;
if(JSON.stringify(parsed)!==JSON.stringify(status))throw Error('Existing status data changed unexpectedly.');
const readmePath=path.join(root,'docs/planning/README.md');
const readme=fs.readFileSync(readmePath,'utf8');
const heading='# Kế hoạch phát triển theo sprint\n';
if(!readme.startsWith(heading))throw Error('Unexpected README heading.');
const note=`\nAdmin entry/UIUX19/10: [sửa menu sau đăng nhập, popup/focus/form và responsive](../reviews/2026-10-19-admin-entry-uiux.md), [checklist](2026-10-19-admin-entry-uiux.md). ${count}/${count} frontend test (${files} file), build PASS trên hash ${before.files.length} file ổn định; Chrome desktop/mobile/low-height theo từng receipt. Coverage chưa đo mới; không nghiệm thu mọi button/trạng thái. Bảo toàn baseline 3.374 file, không sửa backend/schema/config, không ghi nghiệp vụ/commit/push. UX-002/011 và UAT còn mở; FR-12/S11 IN_REVIEW. Các ghi chú cũ bên dưới là checkpoint lịch sử, trạng thái main hiện hành xem STATUS.json.\n`;
fs.writeFileSync(readmePath,heading+note+readme.slice(heading.length));
console.log(JSON.stringify({tests:count,files,sourceFiles:before.files.length,buildExit:build.exitCode,reportUpdated:true,statusExistingPreserved:true}));
