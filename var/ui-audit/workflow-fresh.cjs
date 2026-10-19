const fs=require('node:fs'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {parseConfig,query}=require('../../scripts/database/mysql-client.cjs');
const {testConfiguration}=require('../../scripts/Test-FileWorkQaNative.cjs');
const config=parseConfig(fs.readFileSync('.env.mysql.local','utf8'));
// Reuse the existing local provisioning helper's credentials privately; never print them.
const provisioner=fs.readFileSync('var/ui-audit/fresh-admin-workflow.cjs','utf8');
const account=provisioner.match(/TMS_DB_USER:'([^']+)'/),password=provisioner.match(/TMS_DB_PASSWORD:'([^']+)'/);
if(!account||!password||!/^\w+$/.test(config.TMS_MIGRATION_USER))throw Error('Existing local provisioning helper unavailable');
const schema='tms_docstest_'+crypto.randomBytes(6).toString('hex');
const prepared=testConfiguration(config,schema);
const provision={...config,TMS_DB_NAME:'information_schema',TMS_DB_USER:account[1],TMS_DB_PASSWORD:password[1]};
if(query("SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='"+schema+"';",provision)[0]!=='0')throw Error('New schema required; existing schemas will never be reset');
query('CREATE DATABASE '+schema+" CHARACTER SET utf8mb4; GRANT ALL PRIVILEGES ON "+schema+".* TO '"+config.TMS_MIGRATION_USER+"'@'127.0.0.1';",provision);
if(query('SELECT DATABASE();',prepared.client)[0]!==schema||query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE();',prepared.client)[0]!=='0')throw Error('New empty schema verification failed');
fs.writeFileSync('var/ui-audit/workflow-fresh-schema.txt',schema+'\n');
function run(test,mode,label){
 const log=fs.openSync('var/ui-audit/workflow-fresh-'+label+'.log','w');
 const result=spawnSync('rtk',['proxy','cmd.exe','/d','/c','mvnw.cmd','-B','-ntp','-Dtest='+test,'verify'],{cwd:'Backend',env:{...process.env,...prepared.environment,TMS_TEST_FQ_MODE:mode,TMS_TEST_FRESH_MIGRATION:'false'},stdio:['ignore',log,log]});
 fs.closeSync(log);console.log(label+' '+schema+' exit '+result.status);
 if(result.error||result.status!==0)process.exit(result.status||1);
}
run('NativeWorkflowFreshMigrationTest','fresh-migration','migration');
run('NativeWorkflowRepairTest','integration','regression');
