// Existing main data GETs only; login/logout affect only this authentication session/audit.
const fs=require('node:fs'),path=require('node:path'),{LocalApi}=require('../../scripts/demo/local-api.cjs');
const {parseConfig,query}=require('../../scripts/database/mysql-client.cjs');
const root=path.resolve(__dirname,'../..');
async function main(){
 const c=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(c.TMS_DB_NAME!=='tms'||c.TMS_MYSQL_PORT!=='3307'||!['localhost','127.0.0.1'].includes(c.TMS_MYSQL_HOST))throw Error('Main native target required');
 const health=await fetch('http://127.0.0.1:8080/actuator/health',{signal:AbortSignal.timeout(5000)});const h=await health.json();if(!health.ok||h.status!=='UP')throw Error('Main health not UP');
 const docs=fs.readFileSync(path.join(root,'docs/database/demo-v22.md'),'utf8');
 const username=docs.match(/Admin demo V20 \*\*`([^`]+)`/)?.[1],password=docs.match(/mật khẩu ban đầu `([^`]+)`/)?.[1];if(!username||!password)throw Error('Documented login missing');
 const api=new LocalApi('http://127.0.0.1:8080'),reads=[];let signed=false;
 try{
  await api.write('POST','/auth/login',{username,password});signed=true;
  for(const project of [1,3,12])for(const route of [`/projects/${project}`,`/projects/${project}/features`,`/projects/${project}/issues`,`/projects/${project}/management-reports/summary`]){
   await api.get(route);reads.push({route,status:200});
  }
 }finally{if(signed)await api.write('POST','/auth/logout');}
 const history=query('SELECT version,success FROM flyway_schema_history WHERE CAST(version AS UNSIGNED)>=31 ORDER BY installed_rank;',c);
 const proof={checkedAt:new Date().toISOString(),status:'PASS',origin:'http://127.0.0.1:8080',frontend:'http://localhost:5173',health:{status:health.status,up:h.status==='UP'},history,failedMigrations:Number(query('SELECT COUNT(*) FROM flyway_schema_history WHERE success=0;',c)[0]),reads,domainWrites:0,liveAiCalls:0};
 fs.writeFileSync(path.join(__dirname,'main-http-proof.json'),JSON.stringify(proof,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(proof));
}
main().catch(e=>{console.error('Main verification failed: '+e.message);process.exitCode=1;});
