// Documentation synthesis only. Does not touch product code or invoke a browser.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'docs/reviews/2026-10-19-uiux-system-coverage.md');
if(fs.existsSync(out))throw Error('Preserve existing audit history; choose a new checkpoint instead');
const ev=n=>`[${n}](../../var/uiux-audit-2026-10-19/${n})`;
const entry=(status,role,view,input,proof)=>({status,role,view,input,proof});
const a={
1:entry('PARTIAL','A/P/T/D','320×844 cho layout; login các role ở nhiều kích thước','Chuột, Enter, nhập text','login-320-measured.json; browser-session-final.json'),
2:entry('PARTIAL','A/P/T/D','320/768/1440 và main mặc định','Chuột, Enter/Escape','browser-session-final.json; chat-dev-unavailable-320.json'),
3:entry('PARTIAL','A','320×844','Chuột, cuộn','admin-dashboard-320.json'),
4:entry('SOURCE_ONLY','—','—','Chưa gọi Admin bằng ba worker/PM trong browser đợt này','admin-general-source.md'),
5:entry('PARTIAL','A','320×844','Mở danh sách, tạo form','admin-project-form-320.json'),
6:entry('PARTIAL_RISK_R01','A','320×844','Nhập nháp → Escape → mở lại; không lưu','admin-project-form-320.json; admin-general-source.md'),
7:entry('PARTIAL','A','main mặc định (~1381×862)','Mở chi tiết, kiểm tra readiness, hủy','main-archive-readonly.json'),
8:entry('SOURCE_ONLY','—','—','Không submit/chưa thử edit conflict','admin-general-source.md'),
9:entry('PARTIAL','A','320×844','Mở create project; chưa thử chọn nhiều trang/lưu','admin-project-form-320.json'),
10:entry('FINDING_UX-002','A','main mặc định','Mở readiness, đọc blocker, Hủy; KHÔNG archive/reopen','main-archive-readonly.json; http-read-proof.json'),
11:entry('SOURCE_ONLY','—','—','Chưa mở/paging lịch sử lifecycle','admin-general-source.md'),
12:entry('SOURCE_ONLY','—','—','Chưa mở lịch sử báo cáo cũ; không tạo report legacy','admin-general-source.md'),
13:entry('PARTIAL','A','1440×900','Filter dữ liệu giả, mở tạo; không khóa/cấp quyền','admin-users-1440.json'),
14:entry('PARTIAL','A','1440×900','Mở/đóng; không nhập mật khẩu hoặc tạo account','admin-account-form-1440.json'),
15:entry('PARTIAL','A','1440×900','Đọc bảng máy; chưa handover/return','admin-devices-1440.json'),
16:entry('PARTIAL','A','768×1024','Mở create editor/đóng; chưa tạo/sửa máy','admin-device-form-768.json'),
17:entry('SOURCE_ONLY','—','—','Chưa thử chọn project/PM và handover trong đợt này','admin-general-source.md'),
18:entry('SOURCE_ONLY','—','—','Chưa return; không dùng máy đang cấp phát để test','admin-general-source.md'),
19:entry('PARTIAL','A/P','768/1440','Đọc current; history/paging chưa bấm','members-devices-pm-768.json; admin-devices-1440.json'),
20:entry('PARTIAL','A','768×1024','Mở/đọc bộ lọc, ngày VN; chưa thử mọi biên ngày','admin-audit-768.json'),
21:entry('SOURCE_ONLY','—','—','Adapter cũ; chưa mở URL này','admin-general-source.md'),
22:entry('SOURCE_ONLY','—','—','Chưa mở fallback Admin; fallback workspace kiểm riêng','admin-general-source.md'),
23:entry('PARTIAL','A/P/T/D','320/390/768/1440','Chọn project bằng UI trong các hành trình; chưa phủ tất cả keyboard/menu dài','browser-ledger.json'),
24:entry('SOURCE_ONLY','—','—','Chưa sửa/lưu General hoặc thử409 trong browser','admin-general-source.md'),
25:entry('PARTIAL','P','768×1024','Đọc members/held devices; các nút Admin chưa kiểm','members-devices-pm-768.json'),
26:entry('PARTIAL','P/A','768/1440','Đọc current allocations; không handover/return','members-devices-pm-768.json; admin-devices-1440.json'),
27:entry('SOURCE_ONLY','—','—','Nút bàn giao máy đã chọn chưa thực thi lại; không coi test cũ là PASS mới','admin-general-source.md'),
28:entry('FINDING_UX-003','P','768×1024','Tạo Note giả, edit409, reload, retry409; hủy editor','note-conflict-proof.json; note-competing-journal.json'),
29:entry('FINDING_UX-003','P','768×1024','Nhập Unicode, giữ nháp khi lỗi; so sánh list mới/editor cũ','note-conflict-after-reload-768.json'),
30:entry('SOURCE_ONLY','—','—','Chưa delete-confirm/409; không suy từ edit conflict','admin-general-source.md'),
31:entry('FINDING_UX-011','A main/P fixture','main mặc định/768','Đọc existing DEMO Rules main; empty fixture; không publish','main-rules-observation.json; rules-loaded-pm-768.json; independent-admin-review.md'),
32:entry('PARTIAL','P/A','768/main mặc định','Đọc empty; chưa có versioned-document fixture để thử revision/focus','handbook-empty-pm-768.json'),
33:entry('SOURCE_ONLY','—','—','Adapter→Note; chưa bấm URL này','admin-general-source.md'),
34:entry('NOT_APPLICABLE_ACTIVE_ROUTE','—','—','Source kiểm caller: exported legacy editors không reachable; không tính màn đang hoạt động','admin-general-source.md')};
const t={
1:entry('PARTIAL_FINDING_UX-010','A/P/T','390 và main mặc định','Mở/list/tạo fixture; main archived chỉ mở form, không lưu','feature-created-390.json; main-archived-create-enabled.json'),
2:entry('SOURCE_ONLY','—','—','Chưa archive/restore Feature trong audit','testing-issues-source.md'),
3:entry('PARTIAL','A','390×844','Tạo Feature261 giả bằng browser; environment tự do','feature-created-390.json; audit-fixture.json'),
4:entry('SOURCE_ONLY','—','—','Chưa edit409/refresh failure','testing-issues-source.md'),
5:entry('PARTIAL','A/P/T','390×844','Mở file theo tên; filter/reload; không hide','document-390.json; audit-fixture.json'),
6:entry('SOURCE_ONLY','—','—','Chưa mở archived Feature/file','testing-issues-source.md'),
7:entry('TOOL_LIMIT','A','390×844','Mở form/chooser thành công; setFiles bị công cụ từ chối','import-select-390.json; upload-tool-limit.json'),
8:entry('API_SOURCE_UX-005_BROWSER_NOT_RUN','A API','—','API setup workbook5case; source field mismatch; không browser preview PASS','import-preview-contract.json; audit-fixture.json'),
9:entry('SOURCE_ONLY_TOOL_LIMIT','—','—','Chưa batch partial/error/expired trong browser; single API setup không thay thế','testing-issues-source.md; upload-tool-limit.json'),
10:entry('PARTIAL_FINDINGS_UX-001_007_009_013','A/P','390×844','Grid/cuộn/case/assignment/cell editor; chưa commit nội dung cell','document-390.json; case-detail-390.json; cell-editor-390.json'),
11:entry('PARTIAL','T','390×844','Case1 full5click cycle, đặt OK/P/NA; case4 unassigned disabled; manager đã giao1–3','status-cycle.json; tester-status-390.json'),
12:entry('API_SOURCE_PARTIAL','D','API; browser board768/1440','GET doc267 canManage/canAssign/canUpdateResult=false; archived file browser chưa kiểm','http-read-proof.json'),
13:entry('SOURCE_ONLY','—','—','Deep-link exact row/absent/invalid chưa thử lại runtime','testing-issues-source.md'),
14:entry('PARTIAL','A','390×844','Giao1–3 cho TesterA trên own fixture; directory/range UI;409 chưa thử','assignment-390.json; status-cycle.json'),
15:entry('SOURCE_ONLY','—','—','Tester tự nhận/release range chưa bấm trong audit này','testing-issues-source.md'),
16:entry('PARTIAL','A','390×844','Double click mở editor; Hủy; save/history/conflict chưa chạy','cell-editor-390.json'),
17:entry('FINDING_UX-007','A','390×844','File60case, mởcase1: Trước/Tiếp đều disabled; source tất cảcaller thiếucallback','case-detail-390.json; independent-testing-review.md'),
18:entry('SOURCE_ONLY','—','—','Nút hiện hữu; chưa mở/paging Status history trong browser đợt này','testing-issues-source.md'),
19:entry('FINDING_UX-001_008','T','390×844','Mở create/preview sau tạo, badge1; chuột+Tab/Enter','case-issue-form-390.json; case-issue-saved-390.json; issue-preview-keyboard.json'),
20:entry('FINDING_UX-008','T','390×844','Tab trigger→history, popup blur đóng trước focus nội dung; touch chưa thử','issue-preview-keyboard.json'),
21:entry('FINDING_UX-001','T','390×844','Tạo Bugcase1 bằng keyboard workaround; QA create chỉ source','case-issue-form-390.json; case-issue-saved-390.json; issue-modal-computed.json'),
22:entry('PARTIAL_SOURCE_ROOT_UX-001','T/D','390/1440','Popover có link; detail từ board kiểm riêng; không coi mọi case entry đều bấm','issue-preview-keyboard.json; dev-issue-note-1440.json'),
23:entry('PARTIAL_FINDING_UX-001','D','1440×900','Kanban/layout/open Issue; chưa drag/drop/transition submit','board-kanban-dev-1440.json'),
24:entry('FINDING_UX-006','A/D','768/1440','Filter Feature261+keyword→reload mất filter; list/detail/return','issue-filter-reload.json; board-list-dev-1440.json'),
25:entry('FINDING_UX-001','A','768×1024','Mở monkey form, chọn Feature; không monkey save','monkey-dialog-768.json'),
26:entry('PARTIAL_FINDING_UX-001','A/D','768/1440','Mở detail/expand; Dev ghi comment giả; edit/transition/delete chưa submit','issue-detail-context-loss-768.json; dev-issue-note-1440.json'),
27:entry('FINDING_UX-001','A','768×1024','Expand đổi class nhưng vẫn static, width536; không full-screen','issue-expanded-768.json'),
28:entry('FINDING_UX-001','A','768×1024','Chọn Feature, nhập nháp rồi Escape; không lưu','monkey-dialog-768.json'),
29:entry('SOURCE_ONLY','—','—','Retired create adapter chưa mở runtime','testing-issues-source.md'),
30:entry('PARTIAL','A main','~1381×862','Mở /tests: hướng dẫn Feature, không remap IDs; ảnh timeout, DOM có bằng chứng','retired-tests-observed.json'),
31:entry('SOURCE_ONLY','—','—','Alias code đọc; chưa mở từng alias runtime','testing-issues-source.md'),
32:entry('PARTIAL','A main','~1381×862','Unknown route→NotFound→Về tổng quan hoạt động; malformed IDs/query chưa thử','not-found-observed.json; browser-session-final.json')};
const r={
1:entry('PARTIAL','A/P/T/D','320/390/768/1440/main','Mở/chọn project; generic info; SpiderPlus article riêng/source; không mở Drive/SharePoint','browser-ledger.json; browser-session-final.json'),
2:entry('SOURCE_ONLY','—','—','Adapter /dashboard/* chưa mở','reports-ai-source.md'),
3:entry('PARTIAL','P/A/D;T API','1440/768','PM tạo report, DEV UI denied, TESTER/DEV API403; /progress alias source','analysis-dev-denied-768.json; http-read-proof.json'),
4:entry('PARTIAL','P','1440×900','Đọc metric3/5=60/legend/VNtime; không suy tất cả dữ liệu đúng','analysis-feature-scope-1440.json'),
5:entry('FINDING_UX-012','P','1440×900','SelectFeature261: metric/Issue scoped, Featuretable5rowsallproject','analysis-feature-scope-1440.json; http-read-proof.json'),
6:entry('PARTIAL','P','1440×900','Tạo/chọn own report6; pagination20/empty/error chưa kiểm','report-saved-1440.json'),
7:entry('FINDING_UX-004','P','1440×900','Nháp→Tổng quan→quay lại mất; sau đó tạo report6 giả bằng UI','report-draft-property-proof.json; report-saved-1440.json'),
8:entry('PARTIAL_API_DOWNLOAD','P','1440×900','Saved preview safe; HTTP download140bytesexact; browser wait timeout; update409 chưa thử','report-download.json; http-read-proof.json'),
9:entry('NOT_RUN_LIVE','—','—','Không gọi AI bằng dữ liệu thật; chưa thực thi proposal lifecycle browser','reports-ai-source.md'),
10:entry('PARTIAL','D/A','320×844/320×568','Mở/thu nhỏ/return focus; cả Admin launcher đã thấy','chat-dev-unavailable-320.json; chat-short-height-320.json'),
11:entry('PARTIAL_UNAVAILABLE','D','320×844','Provider absent: reason+disabled; không live send; mock suite riêng','chat-dev-unavailable-320.json; focused-tests.json'),
12:entry('PARTIAL','D','320×844','Mở scope tất cả/1project; chưa gửi targetedFeature','chat-scope-320.json; focused-tests.json'),
13:entry('PARTIAL_EMPTY','D','320×844/568','Lịch sử trống; older/history pagination chưa runtime','chat-short-height-320.json'),
14:entry('SOURCE_ONLY','—','—','Chưa dùng thread đủ dài để đo prepend/scroll/copy; không bịa history','reports-ai-source.md'),
15:entry('MOCK_PASS_BROWSER_NOT_RUN','mockroles','jsdom; không viewport thật','Existing suite78total có Enter/IME/preset/pending/retry; live/provider browser chưa chạy','focused-tests.json'),
16:entry('PARTIAL_UNAVAILABLE','D','320×844','Mở config/source/model; không đổi config/probe','chat-config-320.json'),
17:entry('NOT_RUN_EXTERNAL','—','—','Không OAuth/login/provider grant','reports-ai-source.md'),
18:entry('NOT_RUN_EXTERNAL','—','—','Không popup OAuth/poll/cancel thật','reports-ai-source.md'),
19:entry('NOT_RUN_EXTERNAL','—','—','Không probe/disconnect/quota action','reports-ai-source.md'),
20:entry('SOURCE_ONLY','—','—','Retired /ai entry chưa mở; chat launcher đã kiểm riêng','reports-ai-source.md'),
21:entry('PARTIAL','A/P/T/D','768/1440','Mở nhóm menu/đổi route; mọi collapsed state chưa phủ','board-kanban-dev-1440.json; note-editor-768.json'),
22:entry('PARTIAL','A/T/D','320/390','Mobile menu trong hành trình; combined modal/chat keyboard toàn bộ chưa kiểm','document-390.json; chat-dev-unavailable-320.json'),
23:entry('PARTIAL','A/P/T/D','320/390/768/1440','Chọn dự án; chưa arrow/Home/End tất cả menu variants','browser-ledger.json'),
24:entry('PARTIAL','A/P/D','768/1440','Bảng/cuộn ngang có vùng riêng; KeyboardTable/200%zoom chưa phủ','board-list-dev-1440.json; analysis-feature-scope-1440.json'),
25:entry('PARTIAL','A','320','Picker trong project create; chưa multi-page/select-all submit','admin-project-form-320.json'),
26:entry('PARTIAL','A main','~1381×862','Representative /tests và unknown-route; các adapter khác SOURCE_ONLY','retired-tests-observed.json; not-found-observed.json')};
const mapLocal=s=>s.replace(/TI-001/g,'UX-001').replace(/TI-002/g,'R01').replace(/TI-003/g,'UX-005').replace(/TI-004/g,'UX-006').replace(/TI-005/g,'UX-007').replace(/TI-006/g,'R03/R04').replace(/TI-007/g,'UX-008/R09').replace(/TI-008/g,'UX-009').replace(/TI-009/g,'R02').replace(/TI-010/g,'UX-010').replace(/TI-011/g,'R05').replace(/TI-012/g,'UX-013');
let text=`# Ma trận UI/UX toàn hệ thống — 19/10/2026\n\nTrạng thái: **DOCUMENTED_WITH_EXPLICIT_GAPS**. Đồng hành với [báo cáo](2026-10-19-uiux-system-audit.md) và [kế hoạch sửa](2026-10-19-uiux-system-repair-plan.md).\n\nCó **92 mục kiểm kê**: 34 Admin/Auth/General, 32 Testing/Issue, 26 Report/AI/Shell. Đây là mục kiểm tra route/biến thể/component/adapter, **không phải 92 màn hình riêng**; có chủ ý lặp component theo ranh giới trách nhiệm. Một mục legacy không reachable được đánh dấu không áp dụng. Tất cả mục có source và trạng thái; không suy từ việc kiểm kê sang mọi nút đã PASS.\n\nA/P/T/D = ADMIN / PM của dự án / TESTER / DEV có quyền đọc. “SOURCE_ONLY” = đã đối chiếu source nhưng **chưa thao tác browser** ở biến thể đó. “PARTIAL” chỉ xác nhận các bước ghi trong cột cuối, không nghiệm thu toàn dòng. “FINDING” = có lỗi trong phạm vi bằng chứng. “TOOL_LIMIT” khác lỗi ứng dụng. “MOCK_PASS” không thay thế trình duyệt/API thật. Trạng thái nguyên bản SOURCE_REVIEW của agent trong các bảng nguồn là lịch sử review tĩnh; cột runtime dưới đây là kết quả root bổ sung.\n\nFrontend thử ghi: 127.0.0.1:5174→8081/schema cô lập206. Main localhost:5173→8080 chỉ đọc. Mỗi file JSON browser chứa viewport **thực đo**; tên file là nhãn thuận tiện. Main đang có zoom riêng của origin, vì vậy không coi nhãn yêu cầu viewport là số đo thật. 320/390/768/1440 là CSSpx, không phải thiết bị chạm thật. Các row không có viewport là chưa chạy browser.\n\nMẫu được chọn theo cấu trúc: AdminFormDialog, ex-modal Feature/assignment/cell, td-case-dialog và d-modal Issue được kiểm riêng; không dùng dialog Admin đúng để suy Issue đúng. Các form create/edit/409/pending/OAuth và quyền khác nhau được tách dòng. Mỗi hàng còn có những state chưa chạy dù happy path đã chạy. Chi tiết state xuất phát từ source, không phải khẳng định đã tái hiện.\n\nĐường dẫn rút gọn trong inventory: F/ = Frontend/src/app/features/, C/ = Frontend/src/app/components/. Source đầy đủ và primitive map nằm trong ba checkpoint gốc dưới var (link cuối tài liệu).\n`;
for(const [file,heading,title,kind,actual] of [
 ['admin-general-source.md','Route and UI inventory','Admin, xác thực và thông tin dự án','AG',a],
 ['testing-issues-source.md','Active route and variant inventory','Feature, test case và Issue','T',t],
 ['reports-ai-source.md','Route and distinct variant inventory','Báo cáo, AI và shell','RA',r]]){
 const content=fs.readFileSync(path.join(__dirname,file),'utf8');const start=content.indexOf('## '+heading);const section=content.slice(start,content.indexOf('\n## ',start+4));
 const rows=section.split('\n').filter(x=>x.startsWith('|')&&!x.startsWith('| ---')).slice(1);
 text+=`\n## ${title}\n\n| ID | Route/entry và vai trò theo source | Component và controls/state cần phủ | Actor đã chạy | Viewport/input đã chạy | Kết quả runtime và phần còn thiếu | Bằng chứng |\n| --- | --- | --- | --- | --- | --- | --- |\n`;
 rows.forEach((line,i)=>{const c=line.split('|').slice(1,-1).map(x=>x.trim());const x=actual[i+1];if(!x)throw Error('Missing actual row');
  let id,route,source;
  if(kind==='AG'){id='AG-I'+String(i+1).padStart(2,'0');route=c[0];source=`${c[1]}<br>**Controls:** ${c[2]}<br>**States:** ${c[3]}`;}
  else if(kind==='T'){id=c[0];route=c[1]+'<br>'+c[2];source=mapLocal(c[3]+'<br>'+c[4]);}
  else{id=c[0];route=c[1]+'<br>'+c[2];source=c[3]+'<br>'+c[4];}
  text+=`| ${id} | ${route} | ${source} | ${x.role} | ${x.view}<br>${x.input} | **${x.status}** | ${x.proof.split('; ').map(ev).join('<br>')} |\n`;
 });
}
text+=`\n## Primitive, state và phương thức chưa thể suy rộng\n\n| Nhóm | Đã làm | Chưa làm/giới hạn |\n| --- | --- | --- |\n| Modal/focus | Admin create, Feature create, assignment, cell editor, case detail, Issue monkey/case/detail; Escape và Enter đại diện | Chưa Tab/Shift+Tab đầy đủ mọi dialog; nested project dropdown; pending close; chat+drawer+sidebar đồng thời |\n| Buttons/feedback | Status5bước; assignment1–3; Issue create; Dev note; Note create/conflict; reportcreate; return NotFound; login/logout | Chưa thực thi lại Lưu thành viên đã chọn / Bàn giao máy đã chọn; không lấy test cũ để đánh dấu mới |\n| Data tables | Grid390; Kanban/list1440; Analysis1440; Admin tables768/1440; local overflow | Long unbroken cells, cross-page checkbox persistence, final-page shrink, all sticky-column combinations chưa runtime |\n| Async | Note hai writer thực +409/retry; filter reload; browser loading; Chat mock pending/retry/IME | Không network throttle/response interception trong CUA; read-after-write failure/commit-response loss chỉ source và kế hoạch |\n| Accessibility | DOM semantics/names, Tab/Enter/Escape đại diện, popup focus thực; SafeMarkdown literal/unsafe-link check | Không AT/screen reader thật, physical touch, virtual keyboard, 200%zoom, forced colors, enlarged font/reduced-motion emulation; không kết luận WCAG toàn hệ thống |\n| Visual | Root xem ảnh Admin320, Issue390/768, Kanban1440, Analysis1440, Note768, Chat320 thấp và một số ảnh trong các lượt trước; computed geometry dialog | Không coi mỗi file ảnh đã lưu đều là ảnh đã đánh giá; ảnh main-archive bị crop sai không làm bằng chứng visual |\n| Live services | Local read/API+fake fixture; không restart/migrate | Live AI/OAuth/probe/Drive/SharePoint/Redmine/production latency không chạy |\n\n## Evidence và checkpoint gốc\n\n- ${ev('browser-ledger.json')}: index các capture ban đầu, không phải checklist PASS. Hai DOM evidence cuối và browser-session-final bổ sung ngoài ledger.\n- ${ev('environment.json')}, ${ev('baseline.json')}: runtime và source baseline trước audit.\n- ${ev('admin-general-source.md')}, ${ev('testing-issues-source.md')}, ${ev('reports-ai-source.md')}: inventory/call chains đầy đủ và state nguồn.\n- ${ev('independent-admin-review.md')}, ${ev('independent-testing-review.md')}, ${ev('detector-review.md')}: review độc lập; không được tính là browser session thứ hai.\n- ${ev('focused-tests.json')}: 78/78 test hiện có; không đo coverage mới.\n\n**Hiệu chỉnh bằng chứng:** login-320 ban đầu có actual240px nên chỉ là calibration, dùng login-320-measured để kết luận320. rules-pm capture ban đầu còn loading, dùng loaded và main-rules observation cho nội dung. issue-detail-context-loss là tên cũ gây hiểu nhầm: ngay phiên đó project vẫn đúng; mất project trên copied-link là source scenario, còn reload mất filter đã tái hiện riêng. report-draft-property-proof đọc textarea.value, không dùng getAttribute(value) làm bằng chứng nháp trống. rect ngoài viewport trong scrollport không tự chứng minh footer không cuộn được. Browser download timeout là NOT_CONFIRMED; API download đúng không làm browser PASS.\n`;
fs.writeFileSync(out,text,{flag:'wx'});console.log(JSON.stringify({file:path.relative(root,out),inventoryRows:92,bytes:Buffer.byteLength(text)}));
