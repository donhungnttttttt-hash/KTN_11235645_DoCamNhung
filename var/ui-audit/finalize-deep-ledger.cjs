const fs=require('node:fs'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const run=spawnSync(process.execPath,['var/ui-audit/deep-review-inventory.cjs'],{encoding:'utf8'});
if(run.status!==0)throw Error(run.stderr);
const read=n=>JSON.parse(fs.readFileSync('var/ui-audit/'+n+'.json','utf8'));
const root=read('deep-review-root');
for(const s of root.sources){const body=fs.readFileSync(s.file,'utf8');s.sha256=crypto.createHash('sha256').update(body).digest('hex');s.lines=body.split('\n').length;s.reviewedRanges=[[1,s.lines]];}
root.updatedAt=new Date().toISOString();fs.writeFileSync('var/ui-audit/deep-review-root.json',JSON.stringify(root,null,2)+'\n');
const admin=read('deep-review-admin-ledger'),testing=read('deep-review-testing'),work=read('deep-review-work-ai');
const reviews=[...root.sources.map(s=>({...s,reviewer:'root'})),...admin.files.filter(s=>s.completeRead).map(s=>({file:s.path,sha256:s.sha256,reviewer:'admin'})),...testing.sources.filter(s=>s.reviewLevel==='FULL_READ_THIS_PASS').map(s=>({...s,reviewer:'testing'})),...work.files.filter(s=>s.status==='READ_COMPLETE').map(s=>({...s,reviewer:'work-ai'}))];
const inventory=read('deep-review-inventory'),missing=[];
for(const s of inventory.sources){const hit=reviews.find(r=>r.file===s.file&&r.sha256===s.sha256);if(!hit)missing.push(s.file);else{ s.reviewStatus='COMPLETE_SOURCE_READ';s.reviewer=hit.reviewer;s.reviewedRanges=[[1,s.lines]];s.runtimeVerified=false;}}
const actionReviews=[...admin.actions,...testing.actions,...work.sourceControls];
for(const a of inventory.actions){const found=actionReviews.find(r=>r.file===a.file&&r.line===a.line&&r.tag===a.tag);a.verification='SOURCE_TRACED_NOT_BLANKET_RUNTIME_PASS';a.runtimeVerified=false;a.evidenceMatrix=a.owner==='root'?'docs/reviews/2026-10-11-deep-source-buttons-review.md':a.owner==='admin'?'var/ui-audit/deep-review-admin.md':a.owner==='testing'?'var/ui-audit/deep-review-testing.md':'var/ui-audit/deep-review-work-ai.md';if(found?.contractId)a.contractId=found.contractId;}
inventory.reviewSummary={complete:inventory.sources.length-missing.length,total:inventory.sources.length,lines:inventory.sources.reduce((n,s)=>n+s.lines,0),controlDeclarations:inventory.actions.length,missing,limits:'Full source trace, not exhaustive runtime state coverage. Named regression/browser evidence is separate.'};
fs.writeFileSync('var/ui-audit/deep-review-inventory.json',JSON.stringify(inventory,null,2)+'\n');
console.log(inventory.reviewSummary);if(missing.length)process.exitCode=1;
