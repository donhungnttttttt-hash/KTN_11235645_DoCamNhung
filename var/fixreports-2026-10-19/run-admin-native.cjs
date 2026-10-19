// Root-authorized Admin regression run. Exact existing integration schema only; never provisions/cleans.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const {parseConfig,query}=require(path.join(root,'scripts/database/mysql-client.cjs'));
try {
 const schema='tms_docstest_2060e04c986c',c=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(c.TMS_MYSQL_PORT!=='3307'||!['127.0.0.1','localhost'].includes(c.TMS_MYSQL_HOST))throw Error('Authorized loopback server mismatch');
 const client={...c,TMS_DB_NAME:schema,TMS_DB_USER:c.TMS_MIGRATION_USER,TMS_DB_PASSWORD:c.TMS_MIGRATION_PASSWORD};
 if(query('SELECT DATABASE();',client)[0]!==schema)throw Error('Target schema mismatch');
 if(query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;',client)[0]!=='33')throw Error('Final V33 schema required');
 if(query('SELECT COUNT(*) FROM flyway_schema_history WHERE success=0;',client)[0]!=='0')throw Error('Failed migration requires reconciliation');
 const allowed=/^(?:PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMDATA|JAVA_HOME|PROCESSOR_ARCHITECTURE|OS)$/i;
 const environment={...Object.fromEntries(Object.entries(process.env).filter(([key])=>allowed.test(key))),TMS_TEST_FEATURE_MODE:'integration',
 TMS_TEST_DB_URL:`jdbc:mysql://${c.TMS_MYSQL_HOST}:3307/${schema}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED`,TMS_TEST_DB_USER:c.TMS_MIGRATION_USER,TMS_TEST_DB_PASSWORD:c.TMS_MIGRATION_PASSWORD,
 TMS_BOOTSTRAP_ENABLED:'false',TMS_REDMINE_ENABLED:'false',TMS_CHATGPT_LOCAL_ENABLED:'false',TMS_OLLAMA_ENABLED:'false',TMS_OPENAI_ENABLED:'false',TMS_AI_DRAFT_CLEANUP_CRON:'-',TMS_AI_CHAT_CLEANUP_CRON:'-',SPRING_SESSION_JDBC_CLEANUP_CRON:'-',SPRING_PROFILES_ACTIVE:'fr-browser-isolated',SPRING_CONFIG_LOCATION:'classpath:/application.yml',DEBUG:'false',TRACE:'false'};
 const log=fs.openSync(path.join(__dirname,'admin-native-current.log'),'w');let result;
 try{result=spawnSync('rtk',['proxy','cmd.exe','/d','/c','mvnw.cmd','-B','-ntp','-Dtest=AdminNativeIntegrationTest','-Dspring.profiles.active=fr-browser-isolated','-Dspring.config.location=classpath:/application.yml','verify'],{cwd:path.join(root,'Backend'),stdio:['ignore',log,log],env:environment,windowsHide:true,shell:false});}finally{fs.closeSync(log);}
 if(result.error)throw Error('Maven launch failed');process.exitCode=result.status??1;
}catch(error){console.error('Admin native run refused: '+error.message);process.exitCode=1;}
