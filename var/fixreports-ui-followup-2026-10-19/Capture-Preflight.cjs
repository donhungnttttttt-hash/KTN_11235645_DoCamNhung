// SELECT-only and local backup hash. No migration, login or process changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {parseConfig,query}=require('../../scripts/database/mysql-client.cjs');
const root=path.resolve(__dirname,'../..');
async function main(){
 const c=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(c.TMS_DB_NAME!=='tms'||c.TMS_MYSQL_PORT!=='3307'||!['localhost','127.0.0.1'].includes(c.TMS_MYSQL_HOST))throw Error('Exact main native target required');
 const connection={...c,TMS_DB_USER:c.TMS_MIGRATION_USER,TMS_DB_PASSWORD:c.TMS_MIGRATION_PASSWORD};
 if(query('SELECT DATABASE();',connection)[0]!=='tms')throw Error('Read-only target mismatch');
 const backup='var/mysql-native/backups/2026-10-19T01-00-03-809Z-tms.sql';
 const manifest=JSON.parse(fs.readFileSync(path.join(root,backup+'.json'),'utf8'));
 const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(path.join(root,backup)))hash.update(chunk);
 if(hash.digest('hex')!==manifest.sha256||manifest.schema!=='tms'||manifest.schemaVersion!==30)throw Error('Reviewed V30 backup mismatch');
 const scalar=sql=>Number(query(sql,connection)[0]);
 const response=await fetch('http://127.0.0.1:8080/actuator/health',{signal:AbortSignal.timeout(3000)});
 const proof={capturedAt:new Date().toISOString(),mode:'SELECT_ONLY_NO_MIGRATION_OR_RUNTIME_CHANGE',schema:'tms',server:'127.0.0.1:3307',version:scalar('SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;'),failedMigrations:scalar('SELECT COUNT(*) FROM flyway_schema_history WHERE success=0;'),oldTableCount:scalar("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE';"),committedSourceDocuments:scalar("SELECT COUNT(*) FROM import_batches WHERE status='COMMITTED';"),missingWorkbookSourceDocuments:scalar("SELECT COUNT(*) FROM import_batches WHERE status='COMMITTED' AND (source_workbook IS NULL OR OCTET_LENGTH(source_workbook)=0);"),unfiledCasesRetained:scalar('SELECT COUNT(*) FROM test_cases c WHERE NOT EXISTS(SELECT 1 FROM import_rows r WHERE r.project_id=c.project_id AND r.target_case_id=c.id);'),healthStatus:response.status,healthUp:response.ok&&(await response.json()).status==='UP',backup:{path:backup,sha256:manifest.sha256,bytes:manifest.bytes,sessionRowsExcluded:manifest.sessionRowsExcluded},mainDomainMutationsInThisFollowup:0};
 fs.writeFileSync(path.join(__dirname,'main-preflight.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}
main().catch(error=>{console.error('Preflight failed: '+error.message);process.exitCode=1;});
