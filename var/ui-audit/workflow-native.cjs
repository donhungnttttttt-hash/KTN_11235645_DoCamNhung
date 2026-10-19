const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const {parseConfig,query}=require('../../scripts/database/mysql-client.cjs');
const {testConfiguration}=require('../../scripts/Test-FileWorkQaNative.cjs');
const schema=process.argv[2]||'tms_docstest_202610100016';
const prepared=testConfiguration(parseConfig(fs.readFileSync('.env.mysql.local','utf8')),schema);
if(query('SELECT DATABASE();',prepared.client)[0]!==schema)throw Error('Wrong isolated test database');
const version=query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;',prepared.client)[0];
if(!['28','29'].includes(version))throw Error('Workflow regression requires isolated V28 or V29');
const environment={...process.env,...prepared.environment,TMS_TEST_FQ_MODE:'integration',TMS_TEST_FRESH_MIGRATION:'false'};
function run(test,upgrade){
 const destination='var/ui-audit/workflow-'+(upgrade?'upgrade':'regression')+'.log';
 const log=fs.openSync(destination,'w');
 const r=spawnSync('rtk',['proxy','cmd.exe','/d','/c','mvnw.cmd','-B','-ntp','-Dtest='+test,'verify'],{cwd:'Backend',env:{...environment,TMS_TEST_WORKFLOW_UPGRADE:upgrade?'true':'false'},stdio:['ignore',log,log]});
 fs.closeSync(log);
 console.log(test+' exit '+r.status+'; '+destination);
 if(r.error||r.status!==0)process.exit(r.status||1);
}
if(version==='28')run('NativeWorkflowSplitMigrationTest',true);
if(query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;',prepared.client)[0]!=='29')throw Error('Isolated upgrade did not reach V29');
run('NativeWorkflowRepairTest,CentralMembershipTest,TestDocumentBulkApprovalTest,FileWorkServiceTest,AdminWorkspaceNativeTest,AdminWorkspaceFileReadNativeTest,NativeFileWorkQaIntegrationTest,TestDocumentIntegrationTest,NativeFileWorkQaConcurrencyTest',false);
