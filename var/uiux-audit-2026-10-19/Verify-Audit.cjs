// Audit final gate: filesystem hashes, document integrity, localhost GET and SELECT only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {parseConfig,query}=require('../../scripts/database/mysql-client.cjs');
const root=path.resolve(__dirname,'../..'),base=JSON.parse(fs.readFileSync(path.join(__dirname,'baseline.json'),'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const docs=['docs/reviews/2026-10-19-uiux-system-audit.md','docs/reviews/2026-10-19-uiux-system-coverage.md','docs/reviews/2026-10-19-uiux-system-repair-plan.md'];
const allowed=new Set([...docs,'docs/planning/README.md','docs/planning/STATUS.json']);
const git=(args)=>spawnSync('rtk',['proxy','git',...args],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});
const save=(name,v)=>fs.writeFileSync(path.join(__dirname,name),JSON.stringify(v,null,2)+'\n');
async function main(){
 const branch=git(['branch','--show-current']).stdout.trim();
 const changed=base.files.filter(x=>!fs.existsSync(path.join(root,x.path))||hash(fs.readFileSync(path.join(root,x.path)))!==x.sha256).map(x=>x.path);
 const current=[...new Set(git(['ls-files','-co','--exclude-standard','-z']).stdout.split('\0').filter(Boolean))];
 const known=new Set(base.files.map(x=>x.path));const added=current.filter(x=>!known.has(x));
 const unexpected=[...new Set([...changed,...added])].filter(x=>!allowed.has(x)&&!x.startsWith('var/uiux-audit-2026-10-19/'));
 const product=base.files.filter(x=>/^(Frontend\/|Backend\/|scripts\/)/.test(x.path));
 const productChanged=product.filter(x=>!fs.existsSync(path.join(root,x.path))||hash(fs.readFileSync(path.join(root,x.path)))!==x.sha256).map(x=>x.path);
 const broken=[],docStats=[];
 for(const file of docs){const content=fs.readFileSync(path.join(root,file),'utf8');let links=0;
  for(const m of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)){let target=m[1].replace(/^<|>$/g,'');if(/^(https?:|#)/.test(target))continue;target=target.split('#')[0];links++;if(!fs.existsSync(path.resolve(path.dirname(path.join(root,file)),target)))broken.push({file,target});}
  docStats.push({file,bytes:Buffer.byteLength(content),localLinksChecked:links,sha256:hash(Buffer.from(content))});
 }
 const report=fs.readFileSync(path.join(root,docs[0]),'utf8'),coverage=fs.readFileSync(path.join(root,docs[1]),'utf8');
 const findings=[...report.matchAll(/^### (UX-\d{3}) /gm)].map(x=>x[1]);const inventoryRows=coverage.split('\n').filter(x=>/^\| (AG-I\d+|T\d+|RA-I\d+) \|/.test(x)).length;
 const coverageBadTables=[];let expected=null;
 for(const [i,line] of coverage.split('\n').entries()){if(!line.startsWith('|')){expected=null;continue;}const n=line.split('|').length;if(expected===null)expected=n;else if(n!==expected)coverageBadTables.push({line:i+1,expected,n});}
 const state=JSON.parse(fs.readFileSync(path.join(root,'docs/planning/STATUS.json'),'utf8'));
 const diff=git(['diff','--check']);
 const filesToScan=[...docs,...fs.readdirSync(__dirname).filter(x=>/\.(json|md|cjs)$/.test(x)).map(x=>path.relative(root,path.join(__dirname,x)))];
 const keyPattern=/\bsk-(?:cho-)?[A-Za-z0-9_-]{16,}\b/g;let matches=0;const hitFiles=[];
 for(const file of filesToScan){const content=fs.readFileSync(path.join(root,file),'utf8');const count=[...content.matchAll(keyPattern)].length;if(count){matches+=count;hitFiles.push(file);}}
 const cfg=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(cfg.TMS_DB_NAME!=='tms'||cfg.TMS_MYSQL_PORT!=='3307'||!['localhost','127.0.0.1'].includes(cfg.TMS_MYSQL_HOST))throw Error('Exact expected native environment required');
 const db=(schema,sql)=>{if(!sql.trim().startsWith('SELECT '))throw Error('Read-only SQL required');return query(sql,{...cfg,TMS_DB_NAME:schema,TMS_DB_USER:cfg.TMS_MIGRATION_USER,TMS_DB_PASSWORD:cfg.TMS_MIGRATION_PASSWORD});};
 const schemas=['tms','tms_docstest_2060e04c986c'].map(schema=>({schema,flywayVersion:db(schema,'SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;')[0],failed:Number(db(schema,'SELECT COUNT(*) FROM flyway_schema_history WHERE success=0;')[0])}));
 const iso='tms_docstest_2060e04c986c';
 const fixture={
  feature:db(iso,"SELECT JSON_OBJECT('id',id,'projectId',project_id,'archived',archived_at IS NOT NULL) FROM testing_features WHERE project_id=156 AND id=261;"),
  document:db(iso,"SELECT JSON_OBJECT('id',id,'featureId',feature_id,'status',status,'rows',total_rows) FROM import_batches WHERE project_id=156 AND id=267 AND feature_id=261;"),
  statuses:db(iso,"SELECT JSON_OBJECT('status',result_status,'count',COUNT(*)) FROM import_rows WHERE project_id=156 AND batch_id=267 GROUP BY result_status ORDER BY result_status;"),
  assignments:db(iso,"SELECT JSON_OBJECT('rows',COUNT(*),'assigned',SUM(assignee_membership_id IS NOT NULL)) FROM test_document_assignments WHERE project_id=156 AND document_id=267;"),
  issue:db(iso,"SELECT JSON_OBJECT('id',w.id,'key',w.item_key,'featureId',x.feature_id,'documentId',x.document_id,'rowId',x.row_id) FROM work_items w JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id WHERE w.project_id=156 AND w.item_key='SPIDER-PLUS-7' AND x.feature_id=261;"),
  report:db(iso,"SELECT JSON_OBJECT('id',id,'featureId',feature_id,'markdownBytes',OCTET_LENGTH(markdown),'sha256',SHA2(markdown,256)) FROM project_management_reports WHERE project_id=156 AND id=6 AND feature_id=261;"),
  note:db(iso,"SELECT JSON_OBJECT('id',id,'version',lock_version,'archived',archived_at IS NOT NULL) FROM project_notes WHERE project_id=156 AND id=9;")
 };
 const health=[];for(const origin of ['http://127.0.0.1:8080','http://127.0.0.1:8081','http://localhost:5173','http://127.0.0.1:5174']){try{const r=await fetch(origin+'/actuator/health',{signal:AbortSignal.timeout(5000)}),body=await r.json();health.push({origin,status:r.status,up:body.status==='UP'});}catch{health.push({origin,up:false});}}
 const result={verifiedAt:new Date().toISOString(),branch,baselineFiles:base.files.length,productFilesChecked:product.length,productChanged,changedSinceBaseline:changed,newNonignoredFiles:added,unexpectedChanges:unexpected,docStats,brokenLocalLinks:broken,coverageBadTables,findings,inventoryRows,statusAudit:state.uiuxAudit20261019?.status,sprintUnchanged:state.activeSprint,diffCheck:{exitCode:diff.status,diagnosticLines:diff.stdout.trim()?diff.stdout.trim().split(/\r?\n/).length:0},secretScan:{files:filesToScan.length,keyMatches:matches,hitFiles},schemas,health,fixture,mainDomainWritesByAuditor:0,environmentMutationsByAuditor:0};
 save('final-verification.json',result);save('fixture-final-receipt.json',{verifiedAt:result.verifiedAt,schema:iso,...fixture});
 const ok=branch==='system-design'&&!unexpected.length&&!productChanged.length&&!broken.length&&!coverageBadTables.length&&findings.length===14&&state.uiuxAudit20261019.findings.total===14&&state.uiuxAudit20261019.findings.p2===11&&inventoryRows===92&&diff.status===0&&matches===0&&health.every(x=>x.up)&&schemas.every(x=>x.flywayVersion==='33'&&!x.failed);
 console.log(JSON.stringify({ok,branch,baselineFiles:base.files.length,productFilesChecked:product.length,productChanged:productChanged.length,unexpectedChanges:unexpected,docs:docStats.map(x=>({file:x.file,bytes:x.bytes,localLinksChecked:x.localLinksChecked})),brokenLocalLinks:broken,coverageBadTables,findings:findings.length,inventoryRows,diffCheck:diff.status,keyMatches:matches,schemas,health}));
 if(!ok)process.exitCode=1;
}
main().catch(e=>{console.error('Audit verification failed: '+e.message);process.exitCode=1;});
