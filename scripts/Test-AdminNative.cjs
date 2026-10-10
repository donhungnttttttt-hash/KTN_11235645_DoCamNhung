// Run admin integration tests against an already provisioned isolated native MySQL schema.
// Never creates a server, resets a schema, or prints local credentials.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {parseConfig,query}=require('./database/mysql-client.cjs');

function testConfiguration(config,schema) {
 if(!/^tms_docstest_[a-f0-9]{12}$/.test(schema||'')) throw Error('A dedicated tms_docstest_<12 hex digits> schema is required; tms is forbidden.');
 if(!['127.0.0.1','localhost'].includes(config.TMS_MYSQL_HOST)) throw Error('Native tests require a loopback MySQL server.');
 if(!/^\d+$/.test(config.TMS_MYSQL_PORT||'')||Number(config.TMS_MYSQL_PORT)<1||Number(config.TMS_MYSQL_PORT)>65535) throw Error('Invalid MySQL port.');
 if(!config.TMS_MIGRATION_USER||!config.TMS_MIGRATION_PASSWORD) throw Error('Local migration credentials are required.');
 return {
  client:{...config,TMS_DB_NAME:schema,TMS_DB_USER:config.TMS_MIGRATION_USER,TMS_DB_PASSWORD:config.TMS_MIGRATION_PASSWORD},
  environment:{
   TMS_TEST_DB_URL:`jdbc:mysql://${config.TMS_MYSQL_HOST}:${config.TMS_MYSQL_PORT}/${schema}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED`,
   TMS_TEST_DB_USER:config.TMS_MIGRATION_USER,TMS_TEST_DB_PASSWORD:config.TMS_MIGRATION_PASSWORD,
   TMS_BOOTSTRAP_ENABLED:'false',TMS_REDMINE_ENABLED:'false',DEBUG:'false',TRACE:'false'
  }
 };
}

function testPlan(selector,fresh=false) {
 const tests=selector||(fresh?'NativeInventoryMigrationTest':'Admin*Test,DeviceInventory*Test,InventorySecurityTest,ProjectStatusReport*Test,NativeInitialAllocationTest,NativeAdminCurrentReadTest');
 if(!/^[A-Za-z0-9_*,]+$/.test(tests))throw Error('Invalid test selector.');
 if(fresh&&tests!=='NativeInventoryMigrationTest')throw Error('Fresh migration must run NativeInventoryMigrationTest alone against an empty schema.');
 if(!fresh&&tests.includes('MigrationTest'))throw Error('Migration checks require explicit --fresh-migration opt-in.');
 return {tests,environment:{TMS_TEST_FRESH_MIGRATION:fresh?'true':'false'}};
}
function run() {
 const root=path.resolve(__dirname,'..');
 const schema=process.argv[2]||'tms_docstest_202610030001';
 const fresh=process.argv.includes('--fresh-migration');
 const selector=process.argv[3]==='--fresh-migration'?undefined:process.argv[3];
 const plan=testPlan(selector,fresh);const tests=plan.tests;
 const config=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 const prepared=testConfiguration(config,schema);
 if(query('SELECT DATABASE();',prepared.client)[0]!==schema) throw Error('Test schema verification failed.');
 console.log(`Running native integration tests on ${schema}; production tms is not selected.`);
 const args=['-B','-ntp',`-Dtest=${tests}`,'verify'];
 const command=process.platform==='win32'?['proxy','cmd.exe','/c','mvnw.cmd',...args]:['proxy','./mvnw',...args];
 const result=spawnSync('rtk',command,{cwd:path.join(root,'Backend'),stdio:'inherit',env:{...process.env,...prepared.environment,...plan.environment}});
 if(result.error) throw Error('Could not start Maven; check the local Java/Maven installation.');
 process.exitCode=result.status??1;
}

if(require.main===module) {
 try {run();} catch(error) {console.error(error.message);process.exitCode=1;}
}
module.exports={testConfiguration,testPlan};
