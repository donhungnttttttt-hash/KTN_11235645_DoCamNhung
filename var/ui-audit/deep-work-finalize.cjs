const fs=require('node:fs'),crypto=require('node:crypto');
const file='var/ui-audit/deep-review-work-ai.json';
const ledger=JSON.parse(fs.readFileSync(file,'utf8'));
const inventory=JSON.parse(fs.readFileSync('var/ui-audit/deep-review-inventory.json','utf8'));
const reachability=JSON.parse(fs.readFileSync('var/ui-audit/deep-review-reachability.json','utf8'));
const assigned=inventory.sources.filter(x=>x.owner==='work-ai');
for(const source of assigned){
 const record=ledger.files.find(x=>x.file===source.file);
 if(record?.status!=='READ_COMPLETE')throw Error('Source not fully read: '+source.file);
 const hash=crypto.createHash('sha256').update(fs.readFileSync(source.file)).digest('hex');
 if(hash!==record.sha256)throw Error('Source changed since review: '+source.file);
 record.scope='assigned-production';
}
const owned=new Set(assigned.map(x=>x.file));
ledger.completedAt=new Date().toISOString();
ledger.production={files:assigned.length,lines:assigned.reduce((sum,x)=>sum+ledger.files.find(y=>y.file===x.file).lines,0),status:'READ_COMPLETE',lineCounting:'split CRLF/LF; final empty line counted',filesReviewed:assigned.map(x=>x.file)};
ledger.sourceControls=inventory.actions.filter(x=>x.owner==='work-ai').map(x=>({...x,verification:'SOURCE_REVIEWED',runtimeGuarantee:false}));
ledger.actionControls=reachability.actions.filter(x=>owned.has(x.file)).map(x=>({...x,review:'Source handler/form/disabled path read with owning component. File-level reachability is not rendered-state coverage.',runtimeGuarantee:false}));
ledger.tests={completeRead:ledger.files.filter(x=>x.status==='READ_COMPLETE'&&(/\.test\./.test(x.file)||x.file.includes('/src/test/'))).map(x=>x.file),notFullyRead:ledger.files.filter(x=>x.status!=='READ_COMPLETE'&&(/\.test\./.test(x.file)||x.file.includes('/src/test/'))).map(x=>x.file)};
ledger.newFindings=[
 {id:'WA-1',title:'Duplicate evidence retry rejected at attachment limit',status:'FIXED_GREEN',source:'Backend/src/main/java/vn/syp/tms/attachment/EvidenceService.java',tests:'QaEvidenceTest,EvidenceContentTest',passed:39,red:'deep-evidence-red.log',green:'deep-evidence-green.log'},
 {id:'WA-2',title:'Probe admission persistence failure strands in-memory GENERATING state',status:'FIXED_GREEN',source:'Backend/src/main/java/vn/syp/tms/ai/ChatGptConnectionService.java',tests:'ChatGptConnectionServiceTest',passed:28,red:'deep-probe-red.log',green:'deep-probe-green.log'},
 {id:'WA-3',title:'Redmine worker gate disagrees with queue authority for Admin and current Dev',status:'FIXED_GREEN',source:'Backend/src/main/java/vn/syp/tms/integration/RedmineWorker.java',tests:'NativeRedminePermissionTest',passed:7,red:'execution-document-deep-redmine-red-behavior.log',green:'execution-document-deep-redmine-green.log'}
];
ledger.limits=['No real AI/OAuth/Redmine requests or external writes.','No main database fixtures; native permission suite is guarded V29 test schema and rollback fixtures.','Source review of all 86 assigned production files is complete; not every test file or combinatorial runtime state was exercised.','Other owners review routing/API/shared UI/identity/admin/testing; their production files are not counted here.','No new coverage percentage inferred from test pass counts; root owns final combined coverage.'];
fs.writeFileSync(file,JSON.stringify(ledger,null,2)+'\n');
console.log({production:ledger.production.files,lines:ledger.production.lines,sourceControls:ledger.sourceControls.length,actions:ledger.actionControls.length,testsRead:ledger.tests.completeRead.length});
