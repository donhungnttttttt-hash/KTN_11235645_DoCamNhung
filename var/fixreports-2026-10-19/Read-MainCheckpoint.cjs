// SELECT-only main checkpoint. No migration, cleanup, updates, login or process control.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const {parseConfig,query}=require(path.join(root,'scripts/database/mysql-client.cjs'));
async function main(){
 const c=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(c.TMS_MYSQL_PORT!=='3307'||!['127.0.0.1','localhost'].includes(c.TMS_MYSQL_HOST))throw Error('Loopback main checkpoint only');
 const client={...c,TMS_DB_NAME:'tms',TMS_DB_USER:c.TMS_MIGRATION_USER,TMS_DB_PASSWORD:c.TMS_MIGRATION_PASSWORD};
 if(query('SELECT DATABASE();',client)[0]!=='tms')throw Error('Main identity mismatch');
 const version=query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;',client)[0];
 const project=query("SELECT CONCAT(p.id,'|',p.code,'|',u.username,'|',m.project_role) FROM projects p JOIN project_memberships m ON m.project_id=p.id AND m.active=1 JOIN identity_users u ON u.id=m.user_id WHERE p.id=12 AND p.code='SPIDER-PLUS' AND m.project_role='PM';",client);
 const proof={capturedAt:new Date().toISOString(),mode:'SELECT_ONLY',schema:'tms',version,failedMigrations:Number(query('SELECT COUNT(*) FROM flyway_schema_history WHERE success=0;',client)[0]),tableCount:Number(query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE';",client)[0]),authorizedSpiderProject:project,mainMigrationAppliedByThisTask:false,mainRestartedByThisTask:false};
 try{const response=await fetch('http://127.0.0.1:8080/actuator/health',{signal:AbortSignal.timeout(3000)});proof.mainHealthStatus=response.status;proof.mainHealthUp=response.ok&&(await response.json()).status==='UP';}catch{proof.mainHealthUp=false;}
 const backup='var/mysql-native/backups/2026-10-18T19-02-48-762Z-tms.sql';
 if(fs.existsSync(path.join(root,backup))){const hash=crypto.createHash('sha256');for await(const bytes of fs.createReadStream(path.join(root,backup)))hash.update(bytes);proof.latestTaskBackup={path:backup,sha256:hash.digest('hex'),afterAuthorizedSpiderCreation:true,sessionRowsExcluded:true};}
 fs.writeFileSync(path.join(__dirname,'main-final-readonly.json'),JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify(proof));
}
main().catch(error=>{console.error('Main checkpoint failed: '+error.message);process.exitCode=1;});
