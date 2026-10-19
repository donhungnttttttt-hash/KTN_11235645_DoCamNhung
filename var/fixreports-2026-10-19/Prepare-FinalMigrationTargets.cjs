// Provisions only two NEW isolated schemas on the existing server. No old schema is cleaned.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {parseConfig,query}=require('../../scripts/database/mysql-client.cjs');
const root=path.resolve(__dirname,'../..'),manifest=path.join(__dirname,'final-migration-targets.json');
const backup=path.join(root,'var/mysql-native/backups/2026-10-18T18-48-55-800Z-tms.sql');
let stage='configuration';
async function run(){try{
 if(fs.existsSync(manifest))throw Error('Manifest exists; reconcile instead of provisioning twice');
 const c=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(c.TMS_MYSQL_PORT!=='3307')throw Error('Server mismatch');
 const bytes=fs.readFileSync(backup),backupManifest=JSON.parse(fs.readFileSync(backup+'.json','utf8'));
 if(backupManifest.schema!=='tms'||backupManifest.schemaVersion!==30||crypto.createHash('sha256').update(bytes).digest('hex')!==backupManifest.sha256)throw Error('Reviewed V30 backup mismatch');
 const sql=bytes.toString('utf8');if(/(?:^|\n)\s*(?:CREATE\s+DATABASE|DROP\s+DATABASE|USE\s+)/i.test(sql))throw Error('Cross-schema statement in backup');
 console.log('Waiting for one-time administrator credential on stdin (not echoed).');if(process.stdin.isTTY)process.stdin.setRawMode(true);
 const password=await new Promise((resolve,reject)=>{process.stdin.once('data',data=>{if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();resolve(String(data).replace(/[\r\n]+$/,''));});process.stdin.once('end',()=>reject(Error('Missing credential')));});
 const admin={...c,TMS_DB_USER:'root',TMS_DB_PASSWORD:password},migrator={...c,TMS_DB_USER:c.TMS_MIGRATION_USER,TMS_DB_PASSWORD:c.TMS_MIGRATION_PASSWORD};
 const account=query('SELECT CURRENT_USER()',migrator)[0],match=/^([A-Za-z0-9_]+)@([A-Za-z0-9_.%:-]+)$/.exec(account||'');if(!match||match[1]!==c.TMS_MIGRATION_USER)throw Error('Unexpected migrator');
 const state={createdAt:new Date().toISOString(),server:'existing native loopback',port:3307,mainUntouched:true,backup:path.relative(root,backup),backupSha256:backupManifest.sha256,sessionRowsExcluded:true,targets:[]};
 fs.writeFileSync(manifest,JSON.stringify(state,null,2)+'\n',{flag:'wx'});
 for(const purpose of ['fresh-v33','main-v30-snapshot']){
  const schema='tms_docstest_'+crypto.randomBytes(6).toString('hex');if(schema===c.TMS_DB_NAME)throw Error('Unsafe target');
  stage='verify schema absence';if(query(`SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${schema}'`,admin)[0]!=='0')throw Error('Target exists');
  stage='create new empty target';query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,admin);query(`GRANT ALL PRIVILEGES ON \`${schema}\`.* TO '${match[1]}'@'${match[2]}'`,admin);
  const client={...migrator,TMS_DB_NAME:schema};if(query('SELECT DATABASE()',client)[0]!==schema||query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()',client)[0]!=='0')throw Error('New target not empty');
  const entry={purpose,schema,status:'EMPTY_VERIFIED'};state.targets.push(entry);fs.writeFileSync(manifest,JSON.stringify(state,null,2)+'\n');
  if(purpose==='main-v30-snapshot'){
   stage='restore reviewed backup into new empty target';query(sql,client);
   if(query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1',client)[0]!=='30')throw Error('Restored version mismatch');
   entry.status='RESTORED_V30';entry.tableCount=Number(query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()',client)[0]);fs.writeFileSync(manifest,JSON.stringify(state,null,2)+'\n');
  }
 }
 console.log(JSON.stringify({targets:state.targets,mainUntouched:true,credentialsPrinted:false}));
 }catch(error){console.error('Final migration targets preparation failed at '+stage+'; no credentials, SQL, or project content printed.');process.exitCode=1;}}
run();
