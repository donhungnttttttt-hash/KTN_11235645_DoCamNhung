const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const {parseConfig,query}=require('../../scripts/database/mysql-client.cjs');
const {testConfiguration}=require('../../scripts/Test-FileWorkQaNative.cjs');
const mode=process.argv[2]||'native';
let environment=process.env,tests;
if(mode==='unit') tests=fs.readFileSync('var/ui-audit/unit-test-list.txt','utf8');
else {
 const schema='tms_docstest_202610100016',prepared=testConfiguration(parseConfig(fs.readFileSync('.env.mysql.local','utf8')),schema);
 if(query('SELECT DATABASE();',prepared.client)[0]!==schema)throw Error('Wrong test database');
 const version=query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;',prepared.client)[0];
 if(mode==='upgrade'?!['27','28'].includes(version):version!=='29')throw Error('Unexpected test schema version');
 environment={...process.env,...prepared.environment,TMS_TEST_FQ_MODE:'integration',TMS_TEST_FRESH_MIGRATION:'false'};
 tests=mode==='upgrade'?'NativeAdminAuthorityMigrationTest':'AdminWorkspaceNativeTest,AdminWorkspaceFileReadNativeTest,NativeFileWorkQaIntegrationTest,TestDocumentIntegrationTest,NativeFileWorkQaConcurrencyTest';
}
const log=fs.openSync('var/ui-audit/admin-'+mode+'.log','w');
const r=spawnSync('rtk',['proxy','cmd.exe','/d','/c','mvnw.cmd','-B','-ntp','-Dtest='+tests,'verify'],{cwd:'Backend',env:environment,stdio:['ignore',log,log]});
fs.closeSync(log);console.log(mode+' exit '+r.status);process.exitCode=r.status??1;
