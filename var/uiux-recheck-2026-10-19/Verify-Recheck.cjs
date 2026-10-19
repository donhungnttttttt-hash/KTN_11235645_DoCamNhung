// Final verification: hashes, document links, existing test/build receipts, local GET/SELECT only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {parseConfig,query}=require('../../scripts/database/mysql-client.cjs');
const root=path.resolve(__dirname,'../..'),base=JSON.parse(fs.readFileSync(path.join(__dirname,'baseline.json'),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=args=>spawnSync('rtk',['proxy','git',...args],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});
const productAllowed=new Set(['Frontend/src/app/modules/ProjectOverview.jsx','Frontend/src/app/features/projects/ProjectInformation.jsx','Frontend/src/app/features/projects/project-information.css','Frontend/src/app/styles/project-overview.css','Frontend/src/app/modules/ProjectOverview.test.jsx','Frontend/src/app/modules/ProjectOverview.permissions.test.jsx','Frontend/src/app/modules/ProjectOverview.layout.test.jsx']);
const docAllowed=new Set(['docs/planning/STATUS.json','docs/planning/README.md','docs/planning/2026-10-19-fixreports-clarification.md','docs/reviews/2026-10-19-uiux-system-audit.md','docs/reviews/2026-10-19-uiux-system-coverage.md','docs/reviews/2026-10-19-uiux-recheck-and-overview-correction.md']);
const allowed=p=>productAllowed.has(p)||docAllowed.has(p)||p.startsWith('var/uiux-recheck-2026-10-19/');
async function main(){
 const branch=git(['branch','--show-current']).stdout.trim();
 const changed=base.files.filter(x=>!fs.existsSync(path.join(root,x.path))||sha(fs.readFileSync(path.join(root,x.path)))!==x.sha256).map(x=>x.path);
 const known=new Set(base.files.map(x=>x.path));const current=[...new Set(git(['ls-files','-co','--exclude-standard','-z']).stdout.split('\0').filter(Boolean))];
 const added=current.filter(x=>!known.has(x));const unexpected=[...new Set([...changed,...added])].filter(x=>!allowed(x));
 const product=base.files.filter(x=>/^(Frontend\/|Backend\/|scripts\/)/.test(x.path));
 const productChanged=changed.filter(x=>/^(Frontend\/|Backend\/|scripts\/)/.test(x));const backendChanged=changed.filter(x=>x.startsWith('Backend/'));
 const docs=[...docAllowed].filter(x=>x.endsWith('.md'));const brokenLinks=[],tableErrors=[],docStats=[];
 for(const file of docs){const content=fs.readFileSync(path.join(root,file),'utf8');let links=0;
  for(const m of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)){let target=m[1].replace(/^<|>$/g,'');if(/^(https?:|#)/.test(target))continue;target=target.split('#')[0];links++;if(!fs.existsSync(path.resolve(path.dirname(path.join(root,file)),target)))brokenLinks.push({file,target});}
  let expected=null;for(const [i,line] of content.split('\n').entries()){if(!line.startsWith('|')){expected=null;continue;}const n=line.split('|').length;if(expected===null)expected=n;else if(n!==expected)tableErrors.push({file,line:i+1,expected,n});}
  docStats.push({file,sha256:sha(Buffer.from(content)),localLinks:links});
 }
 const test=JSON.parse(fs.readFileSync(path.join(__dirname,'frontend-full-tests.json'),'utf8'));
 const build=JSON.parse(fs.readFileSync(path.join(__dirname,'build-receipt.json'),'utf8'));
 const session=JSON.parse(fs.readFileSync(path.join(__dirname,'browser-session-final.json'),'utf8'));
 const previews=[];for(const name of ['overview-main-after','overview-tester-1440','overview-tester-768','overview-tester-390-top','overview-tester-320']){const e=JSON.parse(fs.readFileSync(path.join(__dirname,name+'.json'),'utf8'));previews.push({name,...e.metrics.viewport,regions:e.metrics.regions.map(x=>({name:x.name,...x.rect}))});}
 const modules=[];for(const port of [5173,5174])for(const relative of ['src/app/modules/ProjectOverview.jsx','src/app/features/projects/ProjectInformation.jsx']){
  const response=await fetch(`http://127.0.0.1:${port}/${relative}`,{signal:AbortSignal.timeout(5000)}),body=await response.text();const encoded=body.match(/sourceMappingURL=data:application\/json;base64,([^\s]+)/)?.[1];let matches=false;if(encoded){const map=JSON.parse(Buffer.from(encoded,'base64').toString('utf8'));matches=map.sourcesContent?.includes(fs.readFileSync(path.join(root,'Frontend',relative),'utf8'))??false;}modules.push({port,file:relative,status:response.status,sourceMatches:matches});
 }
 const health=[];for(const origin of ['http://127.0.0.1:8080','http://127.0.0.1:8081','http://localhost:5173','http://127.0.0.1:5174']){try{const r=await fetch(origin+'/actuator/health',{signal:AbortSignal.timeout(5000)}),body=await r.json();health.push({origin,status:r.status,up:body.status==='UP'});}catch{health.push({origin,up:false});}}
 const c=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));if(c.TMS_DB_NAME!=='tms'||c.TMS_MYSQL_PORT!=='3307')throw Error('Exact existing native target required');
 const schemas=['tms','tms_docstest_2060e04c986c'].map(schema=>{const connection={...c,TMS_DB_NAME:schema,TMS_DB_USER:c.TMS_MIGRATION_USER,TMS_DB_PASSWORD:c.TMS_MIGRATION_PASSWORD};return {schema,flyway:query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;',connection)[0],failed:Number(query('SELECT COUNT(*) FROM flyway_schema_history WHERE success=0;',connection)[0])};});
 const diff=git(['diff','--check']);
 const scan=[...docs,...fs.readdirSync(__dirname).filter(x=>/\.(json|cjs|md)$/.test(x)).map(x=>path.relative(root,path.join(__dirname,x)))];let keyMatches=0;for(const file of scan){keyMatches+=[...fs.readFileSync(path.join(root,file),'utf8').matchAll(/\bsk-(?:cho-)?[A-Za-z0-9_-]{16,}\b/g)].length;}
 const status=JSON.parse(fs.readFileSync(path.join(root,'docs/planning/STATUS.json'),'utf8'));
 const value={verifiedAt:new Date().toISOString(),branch,baselineFiles:base.files.length,baselineProductFiles:product.length,productChanged,backendChanged,newProduct:added.filter(x=>x.startsWith('Frontend/')||x.startsWith('Backend/')),unexpectedChanges:unexpected,docStats,brokenLinks,tableErrors,tests:{success:test.success,passed:test.numPassedTests,total:test.numTotalTests,failed:test.numFailedTests,skipped:test.numPendingTests,files:test.testResults.length},build,previews,modules,health,schemas,session,diffCheck:diff.status,secretScan:{files:scan.length,keyMatches},activeSprint:status.activeSprint,fr12:status.fixReports20261019.tasks['FR-12'],auditRecheckStatus:status.uiuxRecheck20261019.status,domainWritesByAuditor:0,environmentMutationsByAuditor:0};
 const ok=branch==='system-design'&&!unexpected.length&&!backendChanged.length&&!brokenLinks.length&&!tableErrors.length&&diff.status===0&&test.success&&test.numPassedTests===985&&test.numFailedTests===0&&build.exitCode===0&&modules.every(x=>x.sourceMatches)&&health.every(x=>x.up)&&schemas.every(x=>x.flyway==='33'&&!x.failed)&&previews.every(x=>x.pageWidth<=x.width)&&keyMatches===0&&status.activeSprint==='S11';
 value.ok=ok;fs.writeFileSync(path.join(__dirname,'final-verification.json'),JSON.stringify(value,null,2)+'\n');console.log(JSON.stringify({ok,branch,baselineFiles:base.files.length,productChanged,backendChanged,newProduct:value.newProduct,unexpectedChanges:unexpected,brokenLinks,tableErrors,tests:value.tests,buildExit:build.exitCode,modules,health,schemas,diffCheck:diff.status,keyMatches}));if(!ok)process.exitCode=1;
}
main().catch(e=>{console.error('Recheck gate failed: '+e.message);process.exitCode=1;});
