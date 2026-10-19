// Root-reviewed one-shot snapshot validator. No provisioning, restore, clean(), or main DB connection.
// Preparation: node --check this file. Execution only after root grants the shared Maven slot:
// rtk proxy node var/fixreports-2026-10-19/Run-SnapshotMigration.cjs --execute
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const SCHEMA='tms_docstest_4106ddac5f8d',BACKUP_SHA='dd945970478c48c4eb550fdda6fa2b0ade9b19d162b1556c6a31a674ad386f73';
const {parseConfig,query}=require(path.join(root,'scripts/database/mysql-client.cjs'));
function compileOnly(candidate=false){
 // Independent javac output stays in var; no Maven/Backend target writes or DB access.
 const jars=[];function walk(folder){for(const item of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,item.name);if(item.isDirectory())walk(file);else if(item.name.endsWith('.jar'))jars.push(file);}}
 walk(path.join(process.env.USERPROFILE,'.m2','repository'));
 const output=path.join(__dirname,'snapshot-compile');fs.mkdirSync(output,{recursive:true});
 const portable=value=>value.replaceAll('\\','/'),quote=value=>'"'+portable(value)+'"';
 const classpath=[path.join(root,'Backend','target','classes'),...jars].map(portable).join(path.delimiter);
 const argumentFile=path.join(__dirname,'snapshot-javac.args');
 fs.writeFileSync(argumentFile,['-encoding','UTF-8','-proc:none','-d',quote(output),'-classpath',quote(classpath),quote(candidate?path.join(__dirname,'FixReportsSnapshotMigrationTest.candidate.java'):path.join(root,'Backend','src','test','java','vn','syp','tms','testcase','FixReportsSnapshotMigrationTest.java'))].join('\n'));
 const compiler=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin','javac.exe'):'javac';
 const result=spawnSync('rtk',['proxy',compiler,'@'+argumentFile],{cwd:root,stdio:'inherit',shell:false});if(result.error)throw Error('Independent javac unavailable');process.exitCode=result.status??1;
 console.log(JSON.stringify({mode:'COMPILE_ONLY_NO_MAVEN_NO_DB',exitCode:process.exitCode,output:'var/fixreports-2026-10-19/snapshot-compile'}));
}
async function main(){
 if(process.argv.length===3&&process.argv[2]==='--compile-only'){compileOnly();return;}
 if(process.argv.length===3&&process.argv[2]==='--compile-candidate-only'){compileOnly(true);return;}
 const resume=process.argv.length===4&&process.argv[3]==='--resume-validated-location-failure';
 if(process.argv[2]!=='--execute'||(!resume&&process.argv.length!==3))throw Error('Explicit --execute [--resume-validated-location-failure] required after root Maven slot grant');
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'final-migration-targets.json'),'utf8'));
 const target=manifest.targets?.find(item=>item.purpose==='main-v30-snapshot');
 if(!manifest.mainUntouched||!manifest.sessionRowsExcluded||manifest.backupSha256!==BACKUP_SHA||target?.schema!==SCHEMA||target.status!=='RESTORED_V30'||target.tableCount!==76)throw Error('Reviewed snapshot manifest mismatch');
 const backup=path.resolve(root,manifest.backup),backupRoot=path.join(root,'var','mysql-native','backups')+path.sep;
 if(!backup.startsWith(backupRoot)||!backup.endsWith('.sql'))throw Error('Backup path outside reviewed backup directory');
 const digest=crypto.createHash('sha256');for await(const bytes of fs.createReadStream(backup))digest.update(bytes);
 if(digest.digest('hex')!==BACKUP_SHA)throw Error('Reviewed backup SHA mismatch');
 const beforePath=path.join(__dirname,'snapshot-before.json'),proofPath=path.join(__dirname,'snapshot-proof.json'),firstLogPath=path.join(__dirname,'snapshot-migration.log');
 const hashFile=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 let resumeEnv={};
 if(resume){
  const before=JSON.parse(fs.readFileSync(beforePath,'utf8')),prior=JSON.parse(fs.readFileSync(proofPath,'utf8'));
  if(before.schema!==SCHEMA||before.backupSha256!==BACKUP_SHA||before.preVersion!==30||before.oldTables?.length!==76||prior.schema!==SCHEMA||prior.backupSha256!==BACKUP_SHA||prior.status!=='FAIL'||prior.failure!=='UNEXPECTED_FlywayValidateException'||prior.mainUntouched!==true)throw Error('Only first location-validation failure with immutable V30/76-table before-manifest can resume');
  resumeEnv={TMS_SNAPSHOT_RESUME_VALIDATED_LOCATION_FAILURE:'true',TMS_SNAPSHOT_IMMUTABLE_BEFORE_SHA256:hashFile(beforePath),TMS_SNAPSHOT_FIRST_FAILURE_PROOF_SHA256:hashFile(proofPath),TMS_SNAPSHOT_FIRST_FAILURE_LOG_SHA256:hashFile(firstLogPath)};
 }else if(fs.existsSync(beforePath))throw Error('Immutable before-manifest exists; explicit validated location-failure resume required');
 const config=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(config.TMS_MYSQL_PORT!=='3307'||!['127.0.0.1','localhost'].includes(config.TMS_MYSQL_HOST))throw Error('Exact native loopback server required');
 if(!config.TMS_MIGRATION_USER||!config.TMS_MIGRATION_PASSWORD)throw Error('Dedicated migration identity missing');
 const targetConfig={...config,TMS_DB_NAME:SCHEMA,TMS_DB_USER:config.TMS_MIGRATION_USER,TMS_DB_PASSWORD:config.TMS_MIGRATION_PASSWORD};
 if(query('SELECT DATABASE();',targetConfig)[0]!==SCHEMA)throw Error('Connected schema mismatch');
 if(query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE';",targetConfig)[0]!=='76')throw Error('Refuse empty/unreviewed table set');
 if(query('SELECT COUNT(*) FROM projects;',targetConfig)[0]==='0'||query("SELECT COUNT(*) FROM import_batches WHERE status='COMMITTED';",targetConfig)[0]==='0')throw Error('Refuse empty/synthetic target');
 if(query('SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;',targetConfig)[0]!=='30')throw Error('Restored V30 required; no automatic repair/clean/resume');
 const url=`jdbc:mysql://${config.TMS_MYSQL_HOST}:3307/${SCHEMA}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED`;
 const environment={...process.env,...resumeEnv,TMS_TEST_FEATURE_MODE:'snapshot',TMS_TEST_DB_URL:url,TMS_TEST_DB_USER:config.TMS_MIGRATION_USER,TMS_TEST_DB_PASSWORD:config.TMS_MIGRATION_PASSWORD,TMS_SNAPSHOT_BACKUP_SHA256:BACKUP_SHA,TMS_BOOTSTRAP_ENABLED:'false',TMS_REDMINE_ENABLED:'false',TMS_OPENAI_ENABLED:'false',TMS_OLLAMA_ENABLED:'false',TMS_CHATGPT_LOCAL_ENABLED:'false',TMS_AI_DRAFT_CLEANUP_CRON:'-',TMS_AI_CHAT_CLEANUP_CRON:'-',DEBUG:'false',TRACE:'false'};
 if(resume){
  // Archive, never overwrite, the first failure proof and log before a new run.
  fs.copyFileSync(proofPath,path.join(__dirname,'snapshot-first-location-failure-proof.json'),fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(firstLogPath,path.join(__dirname,'snapshot-first-location-failure.log'),fs.constants.COPYFILE_EXCL);
 }
 const log=fs.openSync(path.join(__dirname,resume?'snapshot-migration-resumed.log':'snapshot-migration.log'),'wx');let result;
 try{result=spawnSync('rtk',['proxy','cmd.exe','/d','/c','mvnw.cmd','-B','-ntp','-Dtest=FixReportsSnapshotMigrationTest','verify'],{cwd:path.join(root,'Backend'),env:environment,stdio:['ignore',log,log],shell:false});}finally{fs.closeSync(log);}
 if(result.error)throw Error('Maven process unavailable');
 process.exitCode=result.status??1;
 // Only sanitized counters leave the log; detailed proofs contain IDs/counts/hashes/reasons only.
 if(fs.existsSync(proofPath)){const proof=JSON.parse(fs.readFileSync(proofPath,'utf8'));console.log(JSON.stringify({schema:SCHEMA,status:proof.status,oldTables:proof.oldTableCount,oldRowsVerifiedIdentical:proof.oldRowsVerifiedIdentical,cloneCount:proof.cloneCount,cloneRowsVerified:proof.cloneRowsVerified,paddedSourcesRecoveredV33:proof.paddedSourcesRecoveredV33,sourceExceptions:proof.sourceExceptions?.length,unfiledCasesRetained:proof.unfiledCasesRetained,migrationsExecuted:proof.migrationsExecuted,resumedGuardReason:proof.resumedGuardReason,migrationLocations:proof.migrationLocations,flywayReplayMigrationsExecuted:proof.flywayReplayMigrationsExecuted,mainUntouched:proof.mainUntouched,failure:proof.failure}));}
}
main().catch(error=>{console.error('Snapshot validator refused: '+error.message);process.exitCode=1;});
