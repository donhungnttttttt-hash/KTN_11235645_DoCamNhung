// Schema metadata only. No user data, password hashes, sessions or SQL payloads.
const fs=require('node:fs'),path=require('node:path');
const {localQuery}=require('./database/mysql-client.cjs');
const root=path.resolve(__dirname,'..');
try {
 const query=localQuery(process.argv.includes('--legacy-docker'));
 const json=sql=>query(sql).map(JSON.parse);
 const tables=json("SELECT JSON_OBJECT('name',TABLE_NAME,'engine',ENGINE) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
 const columns=json("SELECT JSON_OBJECT('table',TABLE_NAME,'name',COLUMN_NAME,'type',COLUMN_TYPE,'nullable',IS_NULLABLE,'key',COLUMN_KEY,'extra',EXTRA) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION");
 const foreignKeys=json("SELECT JSON_OBJECT('table',TABLE_NAME,'name',CONSTRAINT_NAME,'column',COLUMN_NAME,'parent',REFERENCED_TABLE_NAME,'parentColumn',REFERENCED_COLUMN_NAME) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION");
 const indexes=json("SELECT JSON_OBJECT('table',TABLE_NAME,'name',INDEX_NAME,'column',COLUMN_NAME,'unique',IF(NON_UNIQUE=0,TRUE,FALSE)) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX");
 const migrations=json("SELECT JSON_OBJECT('version',version,'description',description,'checksum',checksum,'success',success) FROM flyway_schema_history WHERE version IS NOT NULL ORDER BY installed_rank");
 const model={generatedAt:new Date().toISOString(),database:'tms',source:process.argv.includes('--legacy-docker')?'Existing MySQL 8.4 local snapshot':'Native MySQL local',tables,columns,foreignKeys,indexes,migrations};
 const directory=path.join(root,'docs/database/erd');fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'schema.json'),JSON.stringify(model,null,2)+'\n');
 console.log(JSON.stringify({tables:tables.length,columns:columns.length,foreignKeys:new Set(foreignKeys.map(x=>x.table+'.'+x.name)).size,migrations:migrations.length}));
}catch(error){console.error(error.message);process.exitCode=1;}
