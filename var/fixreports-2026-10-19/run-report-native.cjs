// Exact owned V32 integration schema only; no provisioning, cleaning, or main application access.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const {parseConfig,query}=require(path.join(root,'scripts/database/mysql-client.cjs'));
try {
 const schema='tms_docstest_2060e04c986c',c=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(c.TMS_MYSQL_PORT!=='3307'||!['127.0.0.1','localhost'].includes(c.TMS_MYSQL_HOST))throw Error('Authorized server mismatch');
 const client={...c,TMS_DB_NAME:schema,TMS_DB_USER:c.TMS_MIGRATION_USER,TMS_DB_PASSWORD:c.TMS_MIGRATION_PASSWORD};
 if(query('SELECT DATABASE();',client)[0]!==schema)throw Error('Target schema mismatch');
 if(query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;',client)[0]!=='32')throw Error('Exact integrated V32 schema required');
 const environment={...process.env,TMS_TEST_FEATURE_MODE:'integration',TMS_TEST_DB_URL:`jdbc:mysql://${c.TMS_MYSQL_HOST}:3307/${schema}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED`,TMS_TEST_DB_USER:c.TMS_MIGRATION_USER,TMS_TEST_DB_PASSWORD:c.TMS_MIGRATION_PASSWORD,TMS_BOOTSTRAP_ENABLED:'false',TMS_REDMINE_ENABLED:'false',DEBUG:'false',TRACE:'false'};
 const log=fs.openSync(path.join(__dirname,'fr10-native.log'),'w');let result;
 try{result=spawnSync('rtk',['proxy','cmd.exe','/d','/c','mvnw.cmd','-B','-ntp','-Dtest=ManagementReportIntegrationTest,ManagementReportServiceTest,FeatureProgressContractTest','verify'],{cwd:path.join(root,'Backend'),stdio:['inherit',log,log],env:environment,shell:false});}finally{fs.closeSync(log);}
 if(result.error)throw Error('Maven unavailable');process.exitCode=result.status??1;
}catch(error){console.error('Report native run refused: '+error.message);process.exitCode=1;}
