// Current-audit evidence only: reads logs/Git and probes existing HTTP listeners.
// Does not start services, query/write databases, or execute historical var scripts.
const fs=require('node:fs'),cp=require('node:child_process');
async function record(){
 const availability=await Promise.all(['http://127.0.0.1:8080/actuator/health','http://127.0.0.1:5173/'].map(async url=>{
  try{const r=await fetch(url,{signal:AbortSignal.timeout(2000)});return {url,status:r.status,reachable:true};}
  catch(e){return {url,reachable:false,error:e.cause?.code||e.name};}
 }));
 const directory='var/review-2026-10-16/';
 fs.writeFileSync(directory+'runtime-availability.json',JSON.stringify({checkedAt:new Date().toISOString(),readOnly:true,availability},null,2)+'\n');
 const names=fs.readFileSync('var/ui-audit/unit-test-list.txt','utf8').trim();
 if(!/^[A-Za-z0-9_,]+$/.test(names))throw Error('Invalid selector');
 fs.writeFileSync(directory+'backend-unit-selector.txt',names+'\n');
 const fe=fs.readFileSync(directory+'frontend-final-coverage.log','utf8');
 const be=fs.readFileSync(directory+'backend-unit-verified.log','utf8');
 const audit=JSON.parse(fs.readFileSync('docs/planning/STATUS.json','utf8')).workflowAudit20261016;
 const branch=cp.execFileSync('rtk',['proxy','git','branch','--show-current'],{encoding:'utf8'}).trim();
 const head=cp.execFileSync('rtk',['proxy','git','rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(!/872 passed/.test(fe)||!/Tests run: 552, Failures: 0, Errors: 0, Skipped: 0/.test(be)||!/BUILD SUCCESS/.test(be))throw Error('Evidence mismatch');
 const jacoco=fs.readFileSync('Backend/target/site/jacoco/jacoco.xml','utf8');
 const tail=jacoco.slice(jacoco.lastIndexOf('</package>')+10);
 const counters=Object.fromEntries([...tail.matchAll(/<counter type="([^"]+)" missed="([0-9]+)" covered="([0-9]+)"/g)].map(m=>[m[1],{missed:Number(m[2]),covered:Number(m[3])}]));
 const summary={recordedAt:new Date().toISOString(),branch,head,selectedUnitClasses:names.split(',').length,checks:audit.verification,backendJacocoUnitOnlyCounters:counters,runtimeAvailability:availability,mainDatabaseFixturesWritten:false,commitPushMergeDeployPerformed:false};
 fs.writeFileSync(directory+'verification-summary.json',JSON.stringify(summary,null,2)+'\n');
 console.log(JSON.stringify({branch,head,selectedUnitClasses:summary.selectedUnitClasses,runtime:availability,checksSaved:true}));
}
record().catch(e=>{console.error(e.message);process.exitCode=1;});
