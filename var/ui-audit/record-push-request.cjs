const fs=require('node:fs');
const p='docs/planning/STATUS.json',x=JSON.parse(fs.readFileSync(p,'utf8'));
x.currentBranchPushRequest={date:'2026-10-11',branch:'system-design',authorization:'User explicitly requested push of current reviewed changes. No permanent push, merge or deploy authorization.',scope:'Reviewed source, tests, migrations V26-V29, documentation and selected review artifacts; local credentials, databases, builds and scratch logs excluded.'};
fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
const r='docs/planning/README.md',s=fs.readFileSync(r,'utf8');
const note='Yêu cầu mới 11/10: người dùng cho phép commit và push các thay đổi đã kiểm chứng lên nhánh hiện tại `system-design`. Quyền này chỉ áp dụng cho lần bàn giao này, không bao gồm merge/deploy. Các ghi chú “chưa push” bên dưới phản ánh thời điểm review trước yêu cầu mới.\n\n';
fs.writeFileSync(r,s.replace(/^(# [^\n]+\n\n)/,(_,h)=>h+note));
