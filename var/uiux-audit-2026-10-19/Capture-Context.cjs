// Audit only: source hashes, native SELECTs and local GETs; no domain/process/config changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {parseConfig,query}=require('../../scripts/database/mysql-client.cjs');
const root=path.resolve(__dirname,'../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const save=(name,data)=>fs.writeFileSync(path.join(__dirname,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
async function main(){
 const tracked=execFileSync('rtk',['proxy','git','ls-files','-co','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
 const files=[...new Set(tracked)].filter(p=>fs.existsSync(path.join(root,p))&&fs.statSync(path.join(root,p)).isFile());
 if(!fs.existsSync(path.join(__dirname,'baseline.json')))save('baseline.json',{capturedAt:new Date().toISOString(),branch:execFileSync('rtk',['proxy','git','branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),files:files.map(p=>({path:p,sha256:hash(fs.readFileSync(path.join(root,p)))}))});
 const c=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(c.TMS_DB_NAME!=='tms'||c.TMS_MYSQL_PORT!=='3307'||!['localhost','127.0.0.1'].includes(c.TMS_MYSQL_HOST))throw Error('Exact native loopback required');
 const schemas=['tms','tms_docstest_2060e04c986c'];const databases=schemas.map(schema=>{const connection={...c,TMS_DB_NAME:schema,TMS_DB_USER:c.TMS_MIGRATION_USER,TMS_DB_PASSWORD:c.TMS_MIGRATION_PASSWORD};try{return {schema,version:query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;',connection)[0],failed:Number(query('SELECT COUNT(*) FROM flyway_schema_history WHERE success=0;',connection)[0])};}catch{return {schema,status:'READ_UNAVAILABLE_NO_CONFIG_CHANGE'};}});
 const servers=[];for(const origin of ['http://127.0.0.1:8080','http://127.0.0.1:8081','http://localhost:5173','http://127.0.0.1:5174']){try{const r=await fetch(origin+'/actuator/health',{signal:AbortSignal.timeout(4000)});const body=await r.json();servers.push({origin,status:r.status,up:body.status==='UP'});}catch{servers.push({origin,status:'UNAVAILABLE_OR_NON_JSON'});}}
 const modules=[];for(const port of [5173,5174])for(const file of ['Frontend/src/AppEntry.jsx','Frontend/src/app/routes/AppRouter.jsx']){
  const relative=file.replace(/^Frontend\//,'');const r=await fetch(`http://127.0.0.1:${port}/${relative}`,{signal:AbortSignal.timeout(4000)}),text=await r.text();const encoded=text.match(/sourceMappingURL=data:application\/json;base64,([^\s]+)/)?.[1];let matches=null;
  if(encoded){const map=JSON.parse(Buffer.from(encoded,'base64').toString('utf8'));matches=map.sourcesContent?.some(s=>s===fs.readFileSync(path.join(root,file),'utf8'))??false;}
  modules.push({port,file,status:r.status,sourceMapContentMatches:matches});
 }
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'var/fixreports-2026-10-19/isolated-runtime.json'),'utf8'));
 const jar=path.resolve(root,manifest.jar);if(!jar.startsWith(path.join(root,'var/fixreports-2026-10-19')+path.sep))throw Error('Unexpected runtime artifact');
 const result={capturedAt:new Date().toISOString(),mode:'READ_ONLY_AUDIT',databases,servers,modules,isolatedJar:{sha256:hash(fs.readFileSync(jar)),matchesManifest:hash(fs.readFileSync(jar))===manifest.jarSha256},devtools:{dedicatedMcp:false,available:'CUA DOM/accessibility snapshot, read-only computed styles, console; no network throttle/screen reader/touch synthesis API'},existingBusinessDataWrites:0,liveProviderCalls:0};save('environment.json',result);console.log(JSON.stringify(result));
}
main().catch(e=>{console.error('Audit context failed: '+e.message);process.exitCode=1;});
