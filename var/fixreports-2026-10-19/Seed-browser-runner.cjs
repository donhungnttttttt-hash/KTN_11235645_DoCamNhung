// Prepared only. Root must grant the Maven slot and explicit execution before this runner is used.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const {parseConfig,query}=require(path.join(root,'scripts/database/mysql-client.cjs'));
const schema='tms_docstest_2060e04c986c';
const manifest=path.join(__dirname,'browser-fixture.json');

function osEnvironment(){
 const allowed=/^(?:PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMDATA|JAVA_HOME|PROCESSOR_ARCHITECTURE|OS)$/i;
 return Object.fromEntries(Object.entries(process.env).filter(([key])=>allowed.test(key)));
}
try {
 if(process.argv.length!==3||process.argv[2]!=='--seed-authorized')throw Error('Explicit --seed-authorized argument required; obtain root Maven/schema grant first.');
 if(fs.existsSync(manifest))throw Error('Fixture manifest exists. Reconcile it and its owned rows; automatic reseeding is forbidden.');
 const config=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(config.TMS_MYSQL_PORT!=='3307'||!['127.0.0.1','localhost'].includes(config.TMS_MYSQL_HOST))throw Error('Authorized loopback server mismatch.');
 const client={...config,TMS_DB_NAME:schema,TMS_DB_USER:config.TMS_MIGRATION_USER,TMS_DB_PASSWORD:config.TMS_MIGRATION_PASSWORD};
 if(query('SELECT DATABASE();',client)[0]!==schema)throw Error('Exact browser schema mismatch.');
 if(query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;',client)[0]!=='33')throw Error('Final V33 schema required; runner never provisions or migrates it.');
 if(query('SELECT COUNT(*) FROM flyway_schema_history WHERE success=0;',client)[0]!=='0')throw Error('Failed migration requires owner reconciliation.');
 const environment={...osEnvironment(),TMS_FR_BROWSER_FIXTURE:'true',TMS_TEST_FEATURE_MODE:'integration',
  TMS_TEST_DB_URL:`jdbc:mysql://${config.TMS_MYSQL_HOST}:3307/${schema}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED`,
  TMS_TEST_DB_USER:config.TMS_MIGRATION_USER,TMS_TEST_DB_PASSWORD:config.TMS_MIGRATION_PASSWORD,
  TMS_BOOTSTRAP_ENABLED:'false',TMS_REDMINE_ENABLED:'false',TMS_CHATGPT_LOCAL_ENABLED:'false',TMS_OLLAMA_ENABLED:'false',TMS_OPENAI_ENABLED:'false',
  TMS_AI_DRAFT_CLEANUP_CRON:'-',TMS_AI_CHAT_CLEANUP_CRON:'-',SPRING_SESSION_JDBC_CLEANUP_CRON:'-',
  SPRING_PROFILES_ACTIVE:'fr-browser-isolated',SPRING_CONFIG_LOCATION:'classpath:/application.yml',DEBUG:'false',TRACE:'false'};
 const log=fs.openSync(path.join(__dirname,'browser-seed.log'),'wx');
 let result;
 try {
  result=spawnSync('rtk',['proxy','cmd.exe','/d','/c','mvnw.cmd','-B','-ntp','-Dtest=FixReportsBrowserFixtureTest','-Dspring.profiles.active=fr-browser-isolated','-Dspring.config.location=classpath:/application.yml','verify'],
   {cwd:path.join(root,'Backend'),env:environment,windowsHide:true,shell:false,stdio:['ignore',log,log]});
 }finally{fs.closeSync(log);}
 if(result.error)throw Error('Fixture Maven launch failed; credentials were not printed.');
 if(result.status!==0)throw Error('Fixture test failed. Inspect ignored browser-seed.log and manifest; do not retry without reconciliation.');
 const ready=JSON.parse(fs.readFileSync(manifest,'utf8'));
 if(ready.state!=='READY'||ready.schema!==schema||ready.flywayVersion!=='33')throw Error('Fixture did not produce a ready exact-schema manifest.');
 console.log('Browser fixture READY. Manifest: var/fixreports-2026-10-19/browser-fixture.json. Password remains in test source only.');
}catch(error){console.error('Browser seed refused/failed: '+error.message);process.exitCode=1;}
