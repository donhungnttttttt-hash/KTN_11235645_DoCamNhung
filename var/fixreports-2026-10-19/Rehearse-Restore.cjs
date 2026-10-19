// Restore rehearsal against a newly provisioned empty schema on the EXISTING native server.
// The source is the owned migration fixture, never tms. No DROP DATABASE or cleanup is performed.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {parseConfig,query}=require('../../scripts/database/mysql-client.cjs');
const root=path.resolve(__dirname,'../..'),manifest=path.join(__dirname,'restore-rehearsal.json');
const source='tms_docstest_7cb4aee200db';
const identifier=name=>{if(!/^[A-Za-z0-9_]+$/.test(name))throw Error('Unsafe identifier');return '`'+name+'`';};
let stage='configuration';
async function run(){try{
 if(fs.existsSync(manifest))throw Error('Restore manifest exists; refusing to repeat provisioning');
 const c=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(c.TMS_MYSQL_PORT!=='3307'||source===c.TMS_DB_NAME)throw Error('Source/server mismatch');
 const sourceClient={...c,TMS_DB_NAME:source,TMS_DB_USER:c.TMS_MIGRATION_USER,TMS_DB_PASSWORD:c.TMS_MIGRATION_PASSWORD};
 if(query('SELECT DATABASE()',sourceClient)[0]!==source||query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1',sourceClient)[0]!=='32')throw Error('Owned V32 migration fixture required');
 console.log('Waiting for one-time administrator credential on stdin (not echoed).');
 if(process.stdin.isTTY)process.stdin.setRawMode(true);
 const password=await new Promise((resolve,reject)=>{process.stdin.once('data',data=>{if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();resolve(String(data).replace(/[\r\n]+$/,''));});process.stdin.once('end',()=>reject(Error('Missing credential')));});
 const admin={...c,TMS_DB_USER:'root',TMS_DB_PASSWORD:password};
 const account=query('SELECT CURRENT_USER()',sourceClient)[0],match=/^([A-Za-z0-9_]+)@([A-Za-z0-9_.%:-]+)$/.exec(account||'');if(!match||match[1]!==c.TMS_MIGRATION_USER)throw Error('Unexpected migrator');
 const target='tms_docstest_'+crypto.randomBytes(6).toString('hex');if(target===source||target===c.TMS_DB_NAME)throw Error('Unsafe target');
 stage='provision empty restore target';
 if(query(`SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${target}'`,admin)[0]!=='0')throw Error('Target exists');
 query('CREATE DATABASE '+identifier(target)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',admin);
 query(`GRANT ALL PRIVILEGES ON ${identifier(target)}.* TO '${match[1]}'@'${match[2]}'`,admin);
 const restoreClient={...sourceClient,TMS_DB_NAME:target};
 if(query('SELECT DATABASE()',restoreClient)[0]!==target||query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()',restoreClient)[0]!=='0')throw Error('Restore target must be newly empty');
 const state={createdAt:new Date().toISOString(),source,target,port:3307,mainUntouched:true,status:'PREPARED',credentialsPrinted:false};fs.writeFileSync(manifest,JSON.stringify(state,null,2)+'\n');
 const columns=query("SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION",sourceClient);
 const tables=new Map();for(const line of columns){const [table,column]=line.split('\t');if(!tables.has(table))tables.set(table,[]);tables.get(table).push(column);}
 function fingerprint(client){
  const sql=["SET SESSION time_zone='+00:00'"];
  for(const [table,cols]of tables){const fields=cols.map(col=>"COALESCE(HEX("+identifier(col)+"),'__NULL__')");sql.push(`SELECT 'count','${table}',COUNT(*) FROM ${identifier(table)}`);sql.push(`SELECT 'row','${table}',SHA2(CONCAT_WS(':',${fields.join(',')}),256) FROM ${identifier(table)} ORDER BY 3`);}
  const rows=query(sql.join(';')+';',client).sort();return {hash:crypto.createHash('sha256').update(rows.join('\n')).digest('hex'),counts:rows.filter(row=>row.startsWith('count\t')).map(row=>{const [,table,count]=row.split('\t');return {table,count:Number(count)};})};
 }
 stage='hash fixture before backup';state.before=fingerprint(sourceClient);
 stage='backup owned fixture';const backup=path.join(__dirname,'isolated-migration-v32.sql');
 const dump=path.join(path.dirname(c.TMS_MYSQL_CLIENT),'mysqldump.exe');if(!fs.existsSync(dump)||fs.existsSync(backup))throw Error('Dump binary missing or backup already exists');
 execFileSync('rtk',['proxy',dump,'--no-defaults','--protocol=TCP','--host='+c.TMS_MYSQL_HOST,'--port=3307','--user='+c.TMS_MIGRATION_USER,'--default-character-set=utf8mb4','--single-transaction','--hex-blob','--no-tablespaces','--set-gtid-purged=OFF','--result-file='+backup,source],{cwd:root,env:{...process.env,MYSQL_PWD:c.TMS_MIGRATION_PASSWORD},stdio:['ignore','pipe','pipe'],maxBuffer:32*1024*1024});
 const bytes=fs.readFileSync(backup),sql=bytes.toString('utf8');if(/(?:^|\n)\s*(?:CREATE\s+DATABASE|DROP\s+DATABASE|USE\s+)/i.test(sql))throw Error('Backup contains cross-schema commands');
 state.backup={path:path.relative(root,backup),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
 stage='restore into new empty target';query(sql,restoreClient);
 stage='compare source and restored rows';state.restored=fingerprint(restoreClient);state.sourceAfter=fingerprint(sourceClient);
 if(state.before.hash!==state.restored.hash||state.before.hash!==state.sourceAfter.hash)throw Error('Restored content or source conservation mismatch');
 state.status='PASS';state.finishedAt=new Date().toISOString();state.tableCount=tables.size;fs.writeFileSync(manifest,JSON.stringify(state,null,2)+'\n');console.log(JSON.stringify({status:state.status,source,target,tables:tables.size,identicalContent:true,sourceUnchanged:true,mainUntouched:true,backupSha256:state.backup.sha256}));
 }catch(error){console.error('Restore rehearsal failed at '+stage+'; no credentials or SQL content printed.');process.exitCode=1;}}
run();
