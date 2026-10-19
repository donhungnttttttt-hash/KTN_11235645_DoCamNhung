const fs=require('node:fs');
const file='docs/planning/STATUS.json', source=fs.readFileSync(file,'utf8'), status=JSON.parse(source);
const report='docs/reviews/2026-10-11-button-recheck.md';
const note='11/10/2026 rà lại nút theo yêu cầu mới: sửa submit nhầm khi phân trang, stock cũ sau bàn giao một phần, callback tạo dự án đổi route muộn, focus popup/retetst, phản hồi ticket/bình luận, X pending, retry nguồn AI/Redmine, lý do khóa/100-case limit và retry lịch sử ô. Full FE842/76file PASS, build/contract/diff PASS; coverage statements86.85 branches83.95 functions81.35 lines86.65. Kiểm kê370native+81custom declarations/42forms không thiếu đường handler/submit; không tương đương bấm mọi tổ hợp. Chrome20máy/keyboard390/ticket/Redmine read PASS, có ảnh; không fixturetms/productionJava/migration/restart/commit/push. Báo cáo '+report+'; S11 IN_REVIEW.';
status.updatedAt='2026-10-11';
if(!status.notes.some(n=>n.includes(report)))status.notes.unshift(note);
status.buttonRecheck={status:'DONE',scope:'Confirmed existing button behavior/feedback defects and source review; product S11 remains IN_REVIEW',review:report,
  checks:{frontendTests:842,frontendFiles:76,build:'PASS',contracts:'PASS_STRUCTURAL',diff:'PASS',coverage:{statements:86.85,branches:83.95,functions:81.35,lines:86.65},nativeButtonDeclarations:370,customButtonUsages:81,forms:42},
  browser:'Chrome Admin: 20-device draft validation/bulk-recipient, dialog focus desktop/390px, ticket expand/refresh/restore/close, Redmine read refresh. Screenshot recorded.',
  remaining:'Real-device/role-data UAT and external live delivery/paid AI remain separate; no blanket all-states guarantee.',backendOrSchemaChanged:false,pushed:false};
const eol=source.includes('\r\n')?'\r\n':'\n';fs.writeFileSync(file,(JSON.stringify(status,null,2)+'\n').replaceAll('\n',eol));
const readme='docs/planning/README.md', text=fs.readFileSync(readme,'utf8');
if(!text.includes('2026-10-11-button-recheck.md'))fs.writeFileSync(readme,text.replace(/^(# [^\r\n]+\r?\n)/,'$1\nRà lại nút 11/10: [các lỗi mới và bằng chứng](../reviews/2026-10-11-button-recheck.md). Sửa submit nhầm, bàn giao một phần, điều hướng muộn, focus/retry/phản hồi; full FE842, coverage toàn FE 86.85/83.95/81.35/86.65, build/contract PASS. Có ảnh Chrome; không commit/push, giữ S11 IN_REVIEW.\n'));
console.log('Recorded button recheck evidence; S11 phase: '+status.phase);
