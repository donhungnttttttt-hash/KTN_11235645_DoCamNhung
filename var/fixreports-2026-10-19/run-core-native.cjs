// Explicit two-target runner. Credentials read in memory and never printed.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const {parseConfig,query}=require(path.join(root,'scripts/database/mysql-client.cjs'));
const mode=process.argv[2];
const plans={worker:{schema:'tms_docstest_2060e04c986c',test:'FeatureAiIntegrationTest#workersReceiveSelectedFilePersonalProgressAndActualCaseHistoryBeyondSamples+archivedDocumentIssuesAreExcludedConsistentlyFromManagementAndWorkerFacts,AiPortfolioContextTest'},export:{schema:'tms_docstest_2060e04c986c',test:'FeatureAiIntegrationTest#repeatedCurrentCustomerExportReusesAssignmentHeadersAndNeverImportsTesterExperience,TestCaseWorkbookTest'},fresh:{schema:'tms_docstest_670ffab81c69',test:'NativeFeatureMigrationTest'},migration:{schema:'tms_docstest_7cb4aee200db',test:'NativeFeatureMigrationTest'},repair:{schema:'tms_docstest_7cb4aee200db',test:'NativeFeatureRepairMigrationTest'},integration:{schema:'tms_docstest_2060e04c986c',test:'FeatureIntegrationTest'},ai:{schema:'tms_docstest_2060e04c986c',test:'FeatureAiIntegrationTest,FeatureLegacyRetirementIntegrationTest,AiPortfolioContextTest,AiAccessTest,AiChatServiceTest,CustomerWorkbookTest,AiManagementReportGeneratorTest'}};
try {
 if(!Object.hasOwn(plans,mode))throw Error('Explicit migration or integration mode required');
 const plan=plans[mode],c=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(c.TMS_MYSQL_PORT!=='3307'||!['127.0.0.1','localhost'].includes(c.TMS_MYSQL_HOST))throw Error('Authorized native server mismatch');
 const client={...c,TMS_DB_NAME:plan.schema,TMS_DB_USER:c.TMS_MIGRATION_USER,TMS_DB_PASSWORD:c.TMS_MIGRATION_PASSWORD};
 if(query('SELECT DATABASE();',client)[0]!==plan.schema)throw Error('Target database mismatch');
 const tables=query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE();',client)[0];
 if(tables!=='0') {
  // Rerun integration after the first successful initialization, without cleanup.
  const version=query("SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;",client)[0];
  const migrationResume=mode==='migration'&&version==='30'&&query('SELECT COUNT(*) FROM projects;',client)[0]==='0'&&query('SELECT COUNT(*) FROM identity_users;',client)[0]==='0';
  const approvedExisting=mode==='repair'?version==='32':['integration','ai','export','worker'].includes(mode)&&['32','33'].includes(version);
  if(!migrationResume&&!approvedExisting)throw Error('Refuse nonempty target outside exact authorized test resume');
 }
 const url=`jdbc:mysql://${c.TMS_MYSQL_HOST}:3307/${plan.schema}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED`;
 const environment={...process.env,TMS_TEST_FEATURE_MODE:['ai','export','worker'].includes(mode)?'integration':mode==='fresh'?'migration':mode,TMS_TEST_DB_URL:url,TMS_TEST_DB_USER:c.TMS_MIGRATION_USER,TMS_TEST_DB_PASSWORD:c.TMS_MIGRATION_PASSWORD,TMS_BOOTSTRAP_ENABLED:'false',TMS_REDMINE_ENABLED:'false',DEBUG:'false',TRACE:'false'};
 const log=fs.openSync(path.join(__dirname,`core-native-${mode}.log`),'w');
 let result;
 try{result=spawnSync('rtk',['proxy','cmd.exe','/d','/c','mvnw.cmd','-B','-ntp',`-Dtest=${plan.test}`,'verify'],{cwd:path.join(root,'Backend'),stdio:['inherit',log,log],env:environment,shell:false});}finally{fs.closeSync(log);}
 if(result.error)throw Error('Maven unavailable');process.exitCode=result.status??1;
}catch(error){console.error('Core native run refused: '+error.message);process.exitCode=1;}
