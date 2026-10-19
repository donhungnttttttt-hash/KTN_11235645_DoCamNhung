const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),crypto=require('node:crypto'),{spawn,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),manifestPath=path.join(__dirname,'isolated-runtime.json');
const {parseConfig,query}=require(path.join(root,'scripts/database/mysql-client.cjs'));
function env(){const allowed=/^(?:PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMDATA|JAVA_HOME|PROCESSOR_ARCHITECTURE|OS)$/i;return Object.fromEntries(Object.entries(process.env).filter(([key])=>allowed.test(key)));}
async function main(){
 if(process.argv.length!==3||process.argv[2]!=='--resume-authorized')throw Error('Explicit root-owned resume required');
 const runtime=JSON.parse(fs.readFileSync(manifestPath,'utf8').replace(/^\uFEFF/,''));
 if(runtime.state!=='BACKEND_STOPPED_FOR_IMMUTABLE_JAR'||runtime.schema!=='tms_docstest_2060e04c986c'||runtime.backendPort!==8081)throw Error('Exact stopped-owned runtime manifest required');
 const config=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(config.TMS_MYSQL_PORT!=='3307'||!['localhost','127.0.0.1'].includes(config.TMS_MYSQL_HOST))throw Error('Loopback database guard');
 const client={...config,TMS_DB_NAME:runtime.schema,TMS_DB_USER:config.TMS_MIGRATION_USER,TMS_DB_PASSWORD:config.TMS_MIGRATION_PASSWORD};
 if(query('SELECT DATABASE();',client)[0]!==runtime.schema||query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;',client)[0]!=='33'||query('SELECT COUNT(*) FROM flyway_schema_history WHERE success=0;',client)[0]!=='0')throw Error('Exact clean V33 schema required');
 await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',()=>reject(Error('8081 already occupied; no process adopted/stopped')));server.listen({host:'127.0.0.1',port:8081,exclusive:true},()=>server.close(resolve));});
 const source=path.join(root,'Backend/target/tms-backend-0.1.0-SNAPSHOT.jar'),jdk=process.env.JAVA_HOME||'C:/Program Files/Java/jdk-21';
 const entries=spawnSync('rtk',['proxy',path.join(jdk,'bin/jar.exe'),'tf',source],{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true,shell:false});
 if(entries.status!==0||!entries.stdout.includes('BOOT-INF/classes/vn/syp/tms/TmsApplication.class'))throw Error('Packaged application jar required; wait for Maven owner');
 const versions=[...entries.stdout.matchAll(/BOOT-INF\/classes\/db\/migration\/V(\d+)__[^\r\n]+\.(?:sql|class)/g)].map(match=>Number(match[1]));
 if(Math.max(...versions)!==33)throw Error('Reviewed V33 jar required');
 const bytes=fs.readFileSync(source),sha=crypto.createHash('sha256').update(bytes).digest('hex'),stamp=Date.now();
 const destination=path.join(__dirname,`runtime-${stamp}-${sha.slice(0,12)}.jar`);fs.writeFileSync(destination,bytes,{flag:'wx'});
 const environment={...env(),TMS_DB_URL:`jdbc:mysql://${config.TMS_MYSQL_HOST}:3307/${runtime.schema}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED`,TMS_DB_USER:config.TMS_MIGRATION_USER,TMS_DB_PASSWORD:config.TMS_MIGRATION_PASSWORD,TMS_MIGRATION_USER:config.TMS_MIGRATION_USER,TMS_MIGRATION_PASSWORD:config.TMS_MIGRATION_PASSWORD,TMS_BIND_ADDRESS:'127.0.0.1',TMS_PORT:'8081',SERVER_SERVLET_SESSION_COOKIE_NAME:'FR12_SESSION',TMS_BOOTSTRAP_ENABLED:'false',TMS_REDMINE_ENABLED:'false',TMS_OPENAI_ENABLED:'false',TMS_CHATGPT_LOCAL_ENABLED:'false',TMS_OLLAMA_ENABLED:'false',TMS_AI_DRAFT_CLEANUP_CRON:'-',TMS_AI_CHAT_CLEANUP_CRON:'-',SPRING_SESSION_JDBC_CLEANUP_CRON:'-',SPRING_PROFILES_ACTIVE:'fr-browser-isolated',SPRING_CONFIG_LOCATION:'classpath:/application.yml',DEBUG:'false',TRACE:'false'};
 const log=fs.openSync(path.join(__dirname,`isolated-backend-${stamp}.log`),'wx');
 const child=spawn(path.join(jdk,'bin/java.exe'),['-jar',destination,'--spring.config.location=classpath:/application.yml','--spring.profiles.active=fr-browser-isolated','--server.address=127.0.0.1','--server.port=8081','--server.servlet.session.cookie.name=FR12_SESSION','--spring.session.jdbc.cleanup-cron=-'],{cwd:path.join(root,'Backend'),env:environment,detached:true,windowsHide:true,shell:false,stdio:['ignore',log,log]});fs.closeSync(log);
 await new Promise((resolve,reject)=>{child.once('error',reject);child.once('spawn',resolve);});child.unref();
 runtime.previousBackendPid=runtime.backendPid;runtime.backendPid=child.pid;runtime.state='BACKEND_RESUMING';runtime.jar=path.relative(root,destination);runtime.jarSha256=sha;runtime.backendLog=`isolated-backend-${stamp}.log`;runtime.resumedAt=new Date().toISOString();
 const save=()=>fs.writeFileSync(manifestPath,JSON.stringify(runtime,null,2)+'\n');save();
 for(let attempt=0;attempt<90;attempt++){try{const response=await fetch('http://127.0.0.1:8081/actuator/health',{signal:AbortSignal.timeout(1200)});if(response.ok){runtime.state='READY';save();console.log('Owned isolated backend8081 READY from immutable jar; main services and fixture retained.');return;}}catch{} await new Promise(resolve=>setTimeout(resolve,500));}
 runtime.state='RESUME_NOT_READY_RECONCILE_OWN_PID';save();throw Error('Own process not ready; inspect recorded ignored log, no automatic kill/retry');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
