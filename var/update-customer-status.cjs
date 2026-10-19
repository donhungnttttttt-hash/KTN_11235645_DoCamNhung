const fs=require('node:fs');
const p='docs/planning/STATUS.json';const s=JSON.parse(fs.readFileSync(p,'utf8'));
s.updatedAt='2026-10-08';
s.notes.unshift('08/10/2026 cải tiến khách hàng trên system-design: preparation checklist PM, tên context, single-case responsive giữ lựa chọn sau lưu, Admin project search, action inbox FILE/QA/BUG/RETEST phân quyền, tên Excel cập nhật. FullFE632/632, Admin final49/49; BE scoped108/108, native isolated9/9, JDT197sources0error0warning, contract27/27/build PASS. Backend8080 đã restart/native3307/tmsV20; không migration mới. Báo cáo docs/reviews/2026-10-08-customer-improvements.md. Archive policy còn chờ trả lời; S11 giữ IN_REVIEW UAT/pilot/NFR production.');
s.nextAction='Nghiệm thu checklist/inbox/single-case/search tại docs/reviews/2026-10-08-customer-improvements.md; chốt điều kiện archive dự án đang hỏi. UAT/pilot/cảm ứng và NFR production còn mở, S11 IN_REVIEW.';
fs.writeFileSync(p,JSON.stringify(s,null,2)+'\n');
const folder='docs/reviews/evidence/customer-improvements-2026-10-08/';
for(const n of ['file-case-375','admin-project-search-375','admin-project-search-1366'])fs.renameSync(folder+n+'.png',folder+n+'.jpg');
