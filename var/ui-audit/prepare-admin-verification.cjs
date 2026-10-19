const fs=require('fs');
const p='docs/planning/STATUS.json',s=JSON.parse(fs.readFileSync(p,'utf8'));
s.confirmedDecisions.adminWorkspaceRead='SUPERSEDED 10/10/2026: Admin tổng có toàn quyền nghiệp vụ trên mọi dự án, không cần membership. Xem adminFullAuthority.';
s.adminFullAuthority={status:'IN_PROGRESS',decision:'ADMIN toàn quyền; vòng kết quả Unexecuted → OK → NG → P → NA → Unexecuted',plan:'docs/planning/2026-10-10-admin-full-authority.md',migration:'V28',pushAuthorized:false};
fs.writeFileSync(p,JSON.stringify(s,null,2)+'\n');
let h=fs.readFileSync('var/ui-audit/run-current-workflow.cjs','utf8');
if(!h.includes("schema='tms_docstest_202610100016'"))throw Error('Unexpected helper');
h=h.replace('tms_docstest_202610100016','tms_docstest_202610102245').replace('native-current-workflow.log','admin-fresh.log');
fs.writeFileSync('var/ui-audit/fresh-admin-workflow.cjs',h);
