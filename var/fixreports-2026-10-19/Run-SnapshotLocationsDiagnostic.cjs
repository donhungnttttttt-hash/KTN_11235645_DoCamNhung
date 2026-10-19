// Default: javac only into var. --execute requires root review; runs read-only validate, never Maven/migrate/repair/clean.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),schema='tms_docstest_4106ddac5f8d',sha='dd945970478c48c4eb550fdda6fa2b0ade9b19d162b1556c6a31a674ad386f73';
async function main(){
 if(process.argv.length>3||(process.argv[2]&&process.argv[2]!=='--execute'))throw Error('Use no argument for compile-only, --execute only after root review');
 const jars=[];function walk(folder){for(const item of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,item.name);if(item.isDirectory())walk(file);else if(item.name.endsWith('.jar'))jars.push(file);}}
 walk(path.join(process.env.USERPROFILE,'.m2/repository'));
 const output=path.join(__dirname,'snapshot-location-diagnostic-compile');fs.mkdirSync(output,{recursive:true});
 const portable=value=>value.replaceAll('\\','/'),quote=value=>'"'+portable(value)+'"';
 const compileCp=[path.join(root,'Backend/target/classes'),...jars].join(path.delimiter),args=path.join(__dirname,'snapshot-location-diagnostic-javac.args');
 // Reuse Maven's actual resolved classpath; an all-.m2 runtime mixes plugin/provider versions.
 const report=fs.readFileSync(path.join(root,'Backend/target/surefire-reports/TEST-vn.syp.tms.ai.ChatGptOAuthClientTest.xml'),'utf8');
 const rawCp=/<property name="java.class.path" value="([^"]+)"/.exec(report)?.[1];
 if(!rawCp)throw Error('Resolved Maven test classpath required');
 const cp=rawCp.replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
 if(!cp.includes('flyway-core')||!cp.includes('flyway-mysql'))throw Error('Resolved Flyway classpath required');
 fs.writeFileSync(args,['-encoding','UTF-8','-proc:none','-d',quote(output),'-classpath',quote(cp),quote(path.join(__dirname,'SnapshotLocationsDiagnostic.java'))].join('\n'));
 const javac='C:/Program Files/Java/jdk-21/bin/javac.exe',java='C:/Program Files/Java/jdk-21/bin/java.exe';
 const compile=spawnSync('rtk',['proxy',javac,'@'+args],{cwd:root,stdio:'inherit',shell:false});
 if(compile.status!==0)throw Error('Diagnostic independent javac failed');
 if(!process.argv[2]){console.log('Diagnostic javac PASS; no DB or Maven used.');return;}
 if(fs.existsSync(path.join(__dirname,'snapshot-location-validation.json')))throw Error('Immutable diagnostic evidence already exists');
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'final-migration-targets.json'),'utf8'));
 const target=manifest.targets?.find(item=>item.purpose==='main-v30-snapshot');
 if(manifest.backupSha256!==sha||!manifest.mainUntouched||!manifest.sessionRowsExcluded||target?.schema!==schema||target.status!=='RESTORED_V30'||target.tableCount!==76)throw Error('Reviewed manifest required');
 const backup=path.resolve(root,manifest.backup);if(!backup.startsWith(path.join(root,'var/mysql-native/backups')+path.sep))throw Error('Backup path guard');
 const digest=crypto.createHash('sha256');for await(const bytes of fs.createReadStream(backup))digest.update(bytes);if(digest.digest('hex')!==sha)throw Error('Backup SHA mismatch');
 const {parseConfig}=require(path.join(root,'scripts/database/mysql-client.cjs')),config=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(config.TMS_MYSQL_PORT!=='3307'||!['localhost','127.0.0.1'].includes(config.TMS_MYSQL_HOST)||!config.TMS_MIGRATION_USER||!config.TMS_MIGRATION_PASSWORD)throw Error('Exact loopback/dedicated identity required');
 const env={...process.env,TMS_TEST_DB_URL:`jdbc:mysql://${config.TMS_MYSQL_HOST}:3307/${schema}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED`,TMS_TEST_DB_USER:config.TMS_MIGRATION_USER,TMS_TEST_DB_PASSWORD:config.TMS_MIGRATION_PASSWORD,TMS_SNAPSHOT_BACKUP_SHA256:sha};
 const javaArgs=path.join(__dirname,'snapshot-location-diagnostic-java.args');
 fs.writeFileSync(javaArgs,['-cp',quote([output,cp].join(path.delimiter)),'SnapshotLocationsDiagnostic'].join('\n'));
 const result=spawnSync('rtk',['proxy',java,'@'+javaArgs],{cwd:root,env,stdio:'inherit',shell:false});
 if(result.error)throw Error('Diagnostic JVM process unavailable: '+result.error.code);
 process.exitCode=result.status??1;
}
main().catch(error=>{console.error('Snapshot diagnostic refused: '+error.message);process.exitCode=1;});
