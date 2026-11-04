const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),crypto=require('node:crypto');
const {parseConfig,query}=require('./database/mysql-client.cjs');
const root=path.resolve(__dirname,'..');
const legacy=process.argv.includes('--legacy-docker');
const configIndex=process.argv.indexOf('--config');
const configFile=configIndex<0?path.join(root,'.env.mysql.local'):process.argv[configIndex+1];
// A V39 view needs SHOW VIEW. Prefer a configured reader, then the migration
// account; this only selects credentials for the same read-only dump/queries.
function backupConfig(text){const c=parseConfig(text);for(const prefix of ['TMS_VIEWER','TMS_MIGRATION'])if(c[prefix+'_USER']&&c[prefix+'_PASSWORD'])return {...c,TMS_DB_USER:c[prefix+'_USER'],TMS_DB_PASSWORD:c[prefix+'_PASSWORD']};return c;}
try {
 const directory=path.join(root,'var/mysql-native/backups');fs.mkdirSync(directory,{recursive:true});
 const file=path.join(directory,new Date().toISOString().replace(/[:.]/g,'-')+'-tms.sql');
 const flags=['--single-transaction','--skip-lock-tables','--no-tablespaces','--hex-blob','--set-gtid-purged=OFF','--default-character-set=utf8mb4','--skip-add-drop-table','--skip-comments'];
 let args,env=process.env,sessionTables=['SPRING_SESSION','SPRING_SESSION_ATTRIBUTES'],source='legacy MySQL / 3310',schemaVersion=null,schema='tms',evidenceDirectory='Backend/var/evidence';
 if(legacy){args=['proxy','docker','compose','exec','-T','mysql','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --user=root '+flags.join(' ')+' --ignore-table=tms.SPRING_SESSION_ATTRIBUTES --ignore-table=tms.SPRING_SESSION tms'];}
 else {const c=backupConfig(fs.readFileSync(configFile,'utf8'));source=c.TMS_MYSQL_HOST+':'+c.TMS_MYSQL_PORT+' / native mysql client';const binary=path.join(path.dirname(c.TMS_MYSQL_CLIENT),'mysqldump.exe');sessionTables=query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND LOWER(TABLE_NAME) IN ('spring_session','spring_session_attributes') ORDER BY TABLE_NAME",c);if(sessionTables.length!==2||sessionTables.some(t=>!/^spring_session(?:_attributes)?$/i.test(t)))throw Error('Session schema incomplete');args=['proxy',binary,'--no-defaults','--protocol=TCP','--host='+c.TMS_MYSQL_HOST,'--port='+c.TMS_MYSQL_PORT,'--user='+c.TMS_DB_USER,...flags,...sessionTables.map(t=>'--ignore-table='+c.TMS_DB_NAME+'.'+t),c.TMS_DB_NAME];env={...process.env,MYSQL_PWD:c.TMS_DB_PASSWORD};}
 // Session rows are omitted, their DDL is retained for Flyway's 56-table schema.
 const body=execFileSync('rtk',args,{cwd:root,env,maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']});
 let schemaArgs=args.slice();
 if(legacy){schemaArgs[schemaArgs.length-1]='MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --user=root '+flags.join(' ')+' --no-data tms SPRING_SESSION SPRING_SESSION_ATTRIBUTES';}
 else {schemaArgs=schemaArgs.filter(a=>!a.startsWith('--ignore-table='));schemaArgs.push(...sessionTables,'--no-data');}
 const sessions=execFileSync('rtk',schemaArgs,{cwd:root,env,maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']});
 const bytes=Buffer.concat([Buffer.from('-- TMS local transfer snapshot. Target MUST be empty. No existing data may be overwritten.\n'),body,Buffer.from('\n'),sessions]);
 fs.writeFileSync(file,bytes,{flag:'wx'});
 if(!legacy){const c=backupConfig(fs.readFileSync(configFile,'utf8'));schema=c.TMS_DB_NAME;evidenceDirectory=c.TMS_ATTACHMENT_ROOT||evidenceDirectory;schemaVersion=Number(query("SELECT version FROM flyway_schema_history WHERE success=1 AND version IS NOT NULL ORDER BY installed_rank DESC LIMIT 1",c)[0]);if(!Number.isFinite(schemaVersion))throw Error('Unknown schema version');}
 const manifest={createdAt:new Date().toISOString(),source,schema,schemaVersion,sessionRowsExcluded:true,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,evidenceDirectory,note:'Keep writers stopped during transfer; evidence files must accompany DB when moving machines. This manifest does not validate or copy blobs.'};
 fs.writeFileSync(file+'.json',JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 console.log('Backup created: '+path.relative(root,file));console.log('Session rows excluded; all table DDL preserved. Source database was read only.');
}catch{console.error('Backup failed. Check selected native/legacy database and client; no credential or SQL content was printed.');process.exitCode=1;}
