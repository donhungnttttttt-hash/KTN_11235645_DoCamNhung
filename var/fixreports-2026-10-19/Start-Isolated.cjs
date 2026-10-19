// Prepared only. Root must explicitly grant runtime start before using --start-authorized.
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const {parseConfig,query}=require(path.join(root,'scripts/database/mysql-client.cjs'));
const schema='tms_docstest_2060e04c986c';
const runtimePath=path.join(__dirname,'isolated-runtime.json');

function osEnvironment(){
 const allowed=/^(?:PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMDATA|JAVA_HOME|PROCESSOR_ARCHITECTURE|OS)$/i;
 return Object.fromEntries(Object.entries(process.env).filter(([key])=>allowed.test(key)));
}
function freePort(port){return new Promise((resolve,reject)=>{
 const server=net.createServer();server.once('error',()=>reject(Error(`Loopback port ${port} is occupied; no existing process will be stopped.`)));
 server.listen({host:'127.0.0.1',port,exclusive:true},()=>server.close(resolve));
});}
function background(command,args,cwd,environment,logName){
 const log=fs.openSync(path.join(__dirname,logName),'wx');
 let child;
 try{child=spawn(command,args,{cwd,env:environment,detached:true,windowsHide:true,shell:false,stdio:['ignore',log,log]});}
 finally{fs.closeSync(log);}
 return new Promise((resolve,reject)=>{child.once('error',()=>reject(Error('Isolated process launch failed; see ignored log.')));child.once('spawn',()=>{child.unref();resolve(child.pid);});});
}
async function healthy(port,route){
 for(let attempt=0;attempt<45;attempt++){
  try{const response=await fetch(`http://127.0.0.1:${port}${route}`,{signal:AbortSignal.timeout(1500)});if(response.ok)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 throw Error(`Isolated endpoint ${port}${route} did not become ready; no existing service was touched.`);
}
async function main(){
 if(process.argv.length!==3||process.argv[2]!=='--start-authorized')throw Error('Explicit --start-authorized argument required; obtain root runtime grant first.');
 if(fs.existsSync(runtimePath))throw Error('Runtime manifest exists; reconcile recorded PIDs first. Never replace or stop an unknown process.');
 const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'browser-fixture.json'),'utf8'));
 if(fixture.state!=='READY'||fixture.schema!==schema||fixture.flywayVersion!=='33')throw Error('Ready V33 exact-schema browser fixture required.');
 const config=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(config.TMS_MYSQL_PORT!=='3307'||!['127.0.0.1','localhost'].includes(config.TMS_MYSQL_HOST))throw Error('Authorized loopback database server mismatch.');
 const client={...config,TMS_DB_NAME:schema,TMS_DB_USER:config.TMS_MIGRATION_USER,TMS_DB_PASSWORD:config.TMS_MIGRATION_PASSWORD};
 if(query('SELECT DATABASE();',client)[0]!==schema)throw Error('Exact isolated database mismatch.');
 if(query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;',client)[0]!=='33')throw Error('Final V33 schema required. No provisioning/repair/cleanup will run.');
 if(query('SELECT COUNT(*) FROM flyway_schema_history WHERE success=0;',client)[0]!=='0')throw Error('Failed migration requires owner reconciliation.');
 const jar=path.join(root,'Backend','target','tms-backend-0.1.0-SNAPSHOT.jar');
 const vite=path.join(root,'Frontend','node_modules','vite','bin','vite.js');
 const viteConfig=path.join(root,'Frontend','scratch','fixreports-vite.config.mjs');
 for(const file of [jar,vite,viteConfig])if(!fs.existsSync(file))throw Error('Required packaged jar/existing Vite dependency/config missing. No build or install is automatic.');
 const jdkHome=process.env.JAVA_HOME || (fs.existsSync('C:/Program Files/Java/jdk-21/bin/jar.exe')?'C:/Program Files/Java/jdk-21':null);
 const jarTool=jdkHome?path.join(jdkHome,'bin','jar.exe'):'jar';
 const entries=spawnSync('rtk',['proxy',jarTool,'tf',jar],{cwd:root,env:osEnvironment(),windowsHide:true,shell:false,encoding:'utf8',stdio:['ignore','pipe','pipe']});
 if(entries.status!==0)throw Error('Cannot inspect packaged jar.');
 const versions=[...entries.stdout.matchAll(/BOOT-INF\/classes\/db\/migration\/V(\d+)__[^\r\n]+\.(?:sql|class)/g)].map(match=>Number(match[1]));
 if(!versions.length||Math.max(...versions)!==33)throw Error('Packaged jar must contain final V33 and no later migration. Rebuild only in root Maven slot.');
 await freePort(8081);await freePort(5174);
 const runtime={state:'STARTING',schema,flywayVersion:'33',fixtureRunId:fixture.runId,startedAt:new Date().toISOString(),backendPort:8081,frontendPort:5174};
 fs.writeFileSync(runtimePath,JSON.stringify(runtime,null,2)+'\n',{flag:'wx'});
 const save=()=>fs.writeFileSync(runtimePath,JSON.stringify(runtime,null,2)+'\n',{flag:'w'});
 // A running Windows JVM keeps its jar open. Never hold the shared Maven target artifact.
 const runtimeJar=path.join(__dirname,`isolated-backend-${Date.now()}.jar`);
 fs.copyFileSync(jar,runtimeJar,fs.constants.COPYFILE_EXCL);runtime.backendJar=runtimeJar;save();
 const environment={...osEnvironment(),
  TMS_DB_URL:`jdbc:mysql://${config.TMS_MYSQL_HOST}:3307/${schema}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED`,
  TMS_DB_USER:config.TMS_MIGRATION_USER,TMS_DB_PASSWORD:config.TMS_MIGRATION_PASSWORD,TMS_MIGRATION_USER:config.TMS_MIGRATION_USER,TMS_MIGRATION_PASSWORD:config.TMS_MIGRATION_PASSWORD,
  TMS_BIND_ADDRESS:'127.0.0.1',TMS_PORT:'8081',SERVER_SERVLET_SESSION_COOKIE_NAME:'FR12_SESSION',TMS_BOOTSTRAP_ENABLED:'false',TMS_REDMINE_ENABLED:'false',
  TMS_CHATGPT_LOCAL_ENABLED:'false',TMS_OLLAMA_ENABLED:'false',TMS_OPENAI_ENABLED:'false',
  TMS_AI_DRAFT_CLEANUP_CRON:'-',TMS_AI_CHAT_CLEANUP_CRON:'-',SPRING_SESSION_JDBC_CLEANUP_CRON:'-',
  SPRING_PROFILES_ACTIVE:'fr-browser-isolated',SPRING_CONFIG_LOCATION:'classpath:/application.yml',DEBUG:'false',TRACE:'false'};
 const java=jdkHome?path.join(jdkHome,'bin','java.exe'):'java';
 try{
  runtime.backendPid=await background(java,['-jar',runtimeJar,'--spring.config.location=classpath:/application.yml','--spring.profiles.active=fr-browser-isolated','--server.address=127.0.0.1','--server.port=8081','--server.servlet.session.cookie.name=FR12_SESSION','--spring.session.jdbc.cleanup-cron=-'],path.join(root,'Backend'),environment,'isolated-backend.log');save();
  console.log(`Isolated backend started (PID ${runtime.backendPid}); checking readiness.`);
  await healthy(8081,'/actuator/health');
  runtime.frontendPid=await background(process.execPath,[vite,'--config',viteConfig],path.join(root,'Frontend'),osEnvironment(),'isolated-frontend.log');save();
  await healthy(5174,'/');runtime.state='READY';runtime.readyAt=new Date().toISOString();save();
  console.log('Isolated browser runtime READY at http://127.0.0.1:5174 (backend8081, exact schema206). Existing8080/5173 were untouched.');
 }catch(error){
  // Only processes created by this invocation may be stopped on its failed startup.
  for(const key of ['frontendPid','backendPid'])if(runtime[key]){try{process.kill(runtime[key]);}catch{}}
  runtime.state='FAILED_OWN_PROCESSES_STOPPED';save();throw error;
 }
}
main().catch(error=>{console.error('Isolated start refused/failed: '+error.message);process.exitCode=1;});
