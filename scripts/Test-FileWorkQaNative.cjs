// Explicit, preprovisioned loopback schema only. Never provisions, grants, or resets.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {parseConfig,query}=require('./database/mysql-client.cjs');
const schemaPattern=/^tms_docstest_[a-f0-9]{12}$/;
function requireSchema(schema){if(typeof schema!=='string'||!schemaPattern.test(schema)||schema.length!==25)throw Error('Dedicated tms_docstest_<12 lowercase hex> schema required.');}
function testPlan(mode,selector){
 const allowed={'fresh-migration':['NativeFileWorkQaMigrationTest','NativeDemoDataMigrationTest'],integration:['NativeFileWorkQaIntegrationTest','NativeFileWorkQaConcurrencyTest']};
 if(!Object.hasOwn(allowed,mode)||!allowed[mode].includes(selector))throw Error('Explicit mode and matching exact F/Q selector required.');
 return {selector,environment:{TMS_TEST_FQ_MODE:mode,TMS_TEST_FRESH_MIGRATION:'false'}};
}
function testConfiguration(config,schema){
 requireSchema(schema);
 if(!['127.0.0.1','localhost'].includes(config.TMS_MYSQL_HOST))throw Error('Loopback MySQL host required.');
 const port=config.TMS_MYSQL_PORT;
 if(typeof port!=='string'||!/^\d{1,5}$/.test(port)||port.trim()!==port||Number(port)<1||Number(port)>65535)throw Error('Invalid MySQL port.');
 if(!config.TMS_MIGRATION_USER||!config.TMS_MIGRATION_PASSWORD)throw Error('Configured migration credentials required.');
 return {client:{...config,TMS_DB_NAME:schema,TMS_DB_USER:config.TMS_MIGRATION_USER,TMS_DB_PASSWORD:config.TMS_MIGRATION_PASSWORD},environment:{
  TMS_TEST_DB_URL:`jdbc:mysql://${config.TMS_MYSQL_HOST}:${port}/${schema}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED`,
  TMS_TEST_DB_USER:config.TMS_MIGRATION_USER,TMS_TEST_DB_PASSWORD:config.TMS_MIGRATION_PASSWORD,
  TMS_BOOTSTRAP_ENABLED:'false',TMS_REDMINE_ENABLED:'false',DEBUG:'false',TRACE:'false'
 }};
}
function run(args,io={}){
 if(args.length!==3)throw Error('Usage: node scripts/Test-FileWorkQaNative.cjs SCHEMA MODE EXACT_TEST');
 const [schema,mode,selector]=args;requireSchema(schema);const plan=testPlan(mode,selector);
 const root=path.resolve(__dirname,'..');
 const config=(io.readConfig||(()=>parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'))))();
 const prepared=testConfiguration(config,schema),read=io.query||query;
 if(read('SELECT DATABASE();',prepared.client)[0]!==schema)throw Error('Selected schema verification failed.');
 if(mode==='fresh-migration'){
  if(read('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE();',prepared.client)[0]!=='0')throw Error('Fresh mode requires a truly empty preprovisioned schema.');
 }else if(read("SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;",prepared.client)[0]!=='19')throw Error('Integration requires an already migrated V19 isolated schema.');
 const mvnArgs=['-B','-ntp',`-Dtest=${selector}`,'verify'];
 const command=process.platform==='win32'?['proxy','cmd.exe','/d','/c','mvnw.cmd',...mvnArgs]:['proxy','./mvnw',...mvnArgs];
 const result=(io.spawn||spawnSync)('rtk',command,{cwd:path.join(root,'Backend'),stdio:'inherit',shell:false,env:{...process.env,...prepared.environment,...plan.environment}});
 if(result.error)throw Error('Maven could not start.');
 return result.status??1;
}
if(require.main===module){try{process.exitCode=run(process.argv.slice(2));}catch{console.error('Native F/Q run refused or unavailable. Check explicit arguments, isolated schema and configured credentials.');process.exitCode=1;}}
module.exports={testPlan,testConfiguration,run};
