const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const {parseConfig,query}=require('../../scripts/database/mysql-client.cjs');
const {testConfiguration}=require('../../scripts/Test-FileWorkQaNative.cjs');
const schema='tms_docstest_202610100016';
const config=parseConfig(fs.readFileSync('.env.mysql.local','utf8'));
const prepared=testConfiguration(config,schema);
if(query('SELECT DATABASE();',prepared.client)[0]!==schema)throw Error('Wrong test database');
if(query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;',prepared.client)[0]!=='27')throw Error('Expected isolated V27');
const log=fs.openSync('var/ui-audit/problems-native.log','w');
const result=spawnSync('rtk',['proxy','cmd.exe','/d','/c','mvnw.cmd','-B','-ntp','-Dtest=AdminWorkspaceNativeTest,AdminWorkspaceFileReadNativeTest,NativeFileWorkQaIntegrationTest,TestDocumentIntegrationTest','verify'],{
 cwd:'Backend',env:{...process.env,...prepared.environment,TMS_TEST_FQ_MODE:'integration',TMS_TEST_FRESH_MIGRATION:'false'},stdio:['ignore',log,log]
});
fs.closeSync(log);console.log('Native regression exit:',result.status);process.exitCode=result.status??1;
