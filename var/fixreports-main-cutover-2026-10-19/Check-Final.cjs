const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),json=p=>JSON.parse(read(p).replace(/^\uFEFF/,''));
async function main(){
 const documents=['docs/reviews/2026-10-19-fixreports-ui-followup.md','docs/reviews/2026-10-19-fixreports-implementation-review.md','docs/planning/2026-10-19-fixreports-implementation-plan.md','docs/planning/README.md','tasks/todo.md','tasks/plan.md'];
 const failures=[];let links=0;
 for(const file of documents){const text=read(file);for(const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){const target=m[1].replace(/^<|>$/g,'').split('#')[0];if(!target||/^[a-z]+:/i.test(target))continue;links++;if(!fs.existsSync(path.resolve(root,path.dirname(file),target)))failures.push({file,target,type:'MISSING_LOCAL_LINK'});}}
 const s=json('docs/planning/STATUS.json').fixReports20261019;if(s.runtime.mainFlywayObserved!==33||!s.runtime.mainMigrationApplied||!s.runtime.mainRestarted||s.followupFindings.runtimeMismatchUnresolved!==0||s.committed||s.pushed)throw Error('Ledger mismatches actual action');
 const baseline=json('var/fixreports-ui-followup-2026-10-19/baseline-source-hashes.json');
 const changed=baseline.filter(x=>!fs.existsSync(path.join(root,x.path))||crypto.createHash('sha256').update(fs.readFileSync(path.join(root,x.path))).digest('hex')!==x.sha256).map(x=>x.path);
 const backend=changed.filter(p=>p.startsWith('Backend/'));if(backend.length)throw Error('Unexpected backend source change during runtime follow-up');
 const diff=spawnSync('rtk',['git','diff','--check'],{cwd:root,encoding:'utf8',windowsHide:true,shell:false});if(diff.status!==0)throw Error('git diff --check failed');
 const health=await fetch('http://127.0.0.1:8080/actuator/health',{signal:AbortSignal.timeout(5000)});if(!health.ok||(await health.json()).status!=='UP')throw Error('Final health not UP');
 const proof={checkedAt:new Date().toISOString(),status:failures.length?'FAIL':'PASS',mainMigrated:true,mainRestarted:true,mainHealth:'UP',mainVersion:33,sourceBackendChanged:false,frontendFilesChangedSinceFollowupBaseline:changed.filter(p=>p.startsWith('Frontend/src/')),localLinksChecked:links,failures,gitDiffCheck:'PASS',commitPushPerformed:false};
 fs.writeFileSync(path.join(__dirname,'final-check.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));if(failures.length)process.exitCode=1;
}
main().catch(e=>{console.error('Final check failed: '+e.message);process.exitCode=1;});
