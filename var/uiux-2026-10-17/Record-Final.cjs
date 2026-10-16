// Read-only source checks and evidence aggregation for this UI/UX task only.
// Does not connect to services, databases or Git remotes.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const dir=__dirname,root=path.resolve(dir,'../..');
const read=file=>fs.readFileSync(path.join(dir,file),'utf8');
const baseline=JSON.parse(read('baseline.json'));
const allowed=new Set(['Frontend/src/app/features/admin/AdminProjectDetail.jsx','docs/planning/README.md','docs/planning/STATUS.json','tasks/plan.md','tasks/todo.md']);
const hashes=Object.entries(baseline.hashes).map(([file,before])=>{
 const current=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 return {file,unchanged:before===current,allowedUiOrPlanningEdit:allowed.has(file)};
});
const unexpected=hashes.filter(row=>!row.unchanged&&!row.allowedUiOrPlanningEdit);
const coverage=JSON.parse(read('coverage-summary.json')).total;
const suite=read('frontend-final-coverage.log'),build=read('frontend-final-build.log');
const contracts=read('contracts-final.log'),diff=read('diff-check-final.log');
const diffLines=diff.split(/\r?\n/).filter(Boolean);
const eolWarningsOnly=diffLines.length>0&&diffLines.every(line=>/^warning: in the working copy of '.+', LF will be replaced by CRLF the next time Git touches it$/.test(line));
const status=JSON.parse(fs.readFileSync(path.join(root,'docs/planning/STATUS.json'),'utf8'));
const head=read('head-final.txt').trim(),branch=read('branch-final.txt').trim();
const docFiles=['docs/reviews/2026-10-17-uiux-refinement.md','var/uiux-2026-10-17/README.md'];
const docLinks=docFiles.flatMap(file=>[...fs.readFileSync(path.join(root,file),'utf8').matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)].map(match=>({from:file,target:match[1]})))
 .filter(link=>!/^https?:|^#/.test(link.target))
 .map(link=>({...link,exists:fs.existsSync(path.resolve(root,path.dirname(link.from),link.target.split('#')[0]))}));
const summary={
 recordedAt:new Date().toISOString(),date:'2026-10-17',timezone:'Asia/Saigon',branch,head,
 baselineHeadPreserved:head===baseline.head,baselineBranchPreserved:branch===baseline.branch,
 phase:status.phase,activeSprint:status.activeSprint,
 frontend:{status:/Test Files\s+82 passed/.test(suite)&&/Tests\s+884 passed/.test(suite)?'PASS':'UNCONFIRMED',files:82,tests:884,newTests:12,exitCode:0,durationSeconds:130.41,coverage},
 build:{status:/built in 5.39s/.test(build)?'PASS':'UNCONFIRMED',exitCode:0,bundleKb:674.42,gzipKb:192.16,advisory:'Existing >500KB chunk warning; no measured performance claim'},
 contracts:{status:/PASS/.test(contracts)?'PASS_STRUCTURAL':'INSPECT_LOG',log:'contracts-final.log'},
 diffCheck:{status:eolWarningsOnly?'PASS_WITH_EOL_WARNINGS':diff.trim()?'INSPECT_LOG':'PASS',exitCode:0,log:'diff-check-final.log'},
 priorTrackedBaseline:{checked:hashes.length,unchanged:hashes.filter(row=>row.unchanged).length,expectedNewEdits:hashes.filter(row=>!row.unchanged&&row.allowedUiOrPlanningEdit).map(row=>row.file),unexpectedChanges:unexpected,details:hashes},
 browser:{status:'SCOPED_MOCK_COMPONENT_VERIFIED',tool:'CUA Chrome',viewports:[375,768,1440],apiBlocked:true,backendIntegration:'NOT_RUN',zoom200:'NOT_VERIFIED_SHORTCUT_NO_EFFECT',touchAtSafariUat:'NOT_RUN',stateEvidence:'browser-after.json',consoleEvidence:'browser-final-console.json'},
 notRun:['Backend/native suites (UI only)','Dependency advisory scan','JDT','Real backend/API role-data browser verification','Screen reader/Safari/physical touch/UAT'],
 notConfigured:['JS lint/typecheck scripts'],
 noNewBackendApiSchemaChanges:unexpected.length===0,
 noCommitPushMergeDeploy:true,noMainDatabaseWrites:true,noBackendStartRestart:true,
 reportLinks:{checked:docLinks.length,missing:docLinks.filter(link=>!link.exists)},
 independentReview:'independent-review.md: bounded Spec + Standards, no confirmed critical/P1/P2; not whole-system acceptance',
};
fs.writeFileSync(path.join(dir,'verification-summary.json'),JSON.stringify(summary,null,2)+'\n');
if(unexpected.length||summary.reportLinks.missing.length||!summary.baselineHeadPreserved||!summary.baselineBranchPreserved||summary.frontend.status!=='PASS'||summary.build.status!=='PASS')process.exitCode=1;
console.log(JSON.stringify({branch,head,tests:summary.frontend.status,build:summary.build.status,contracts:summary.contracts.status,diff:summary.diffCheck.status,baselineChecked:hashes.length,baselineUnchanged:summary.priorTrackedBaseline.unchanged,unexpectedChanges:unexpected,phase:summary.phase},null,2));
