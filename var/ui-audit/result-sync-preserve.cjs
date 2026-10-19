const fs=require('node:fs'),assert=require('node:assert/strict');
const {localQuery}=require('../../scripts/database/mysql-client.cjs');const query=localQuery();
assert.equal(query('SELECT DATABASE();')[0],'tms');
const file='var/ui-audit/result-sync-main-before.json';
const columns=query("SELECT JSON_OBJECT('table',TABLE_NAME,'column',COLUMN_NAME) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND LOWER(TABLE_NAME) NOT IN ('spring_session','spring_session_attributes','flyway_schema_history','identity_login_buckets') ORDER BY TABLE_NAME,ORDINAL_POSITION;").map(JSON.parse);
const ident=s=>{assert.match(s,/^[A-Za-z0-9_]+$/);return '`'+s+'`';};
const tables=new Map();for(const c of columns){if(!tables.has(c.table))tables.set(c.table,[]);tables.get(c.table).push(c.column);}
const selects=[...tables].map(([table,cols])=>`SELECT '${table}',SHA2(CONCAT_WS('|',${cols.map(c=>"COALESCE(HEX("+ident(c)+"),'NULL')").join(',')}),256) FROM ${ident(table)}`);
const hashes=query('START TRANSACTION READ ONLY;'+selects.join(' UNION ALL ')+';COMMIT;').sort();
const version=query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;')[0];
if(process.argv[2]==='before') fs.writeFileSync(file,JSON.stringify({columns,hashes,version}),{flag:'wx'});
else {
 const before=JSON.parse(fs.readFileSync(file));assert.deepEqual(columns,before.columns);assert.equal(version,before.version);
 const remaining=new Map();for(const hash of hashes)remaining.set(hash,(remaining.get(hash)||0)+1);
 for(const hash of before.hashes){assert.ok(remaining.get(hash),'Existing row changed: '+hash.split('\t')[0]);remaining.set(hash,remaining.get(hash)-1);}
 const added={};for(const [hash,count] of remaining)if(count){const table=hash.split('\t')[0];assert.equal(table,'identity_audit','Unexpected added business row');added[table]=(added[table]||0)+count;}
 const evidence={tables:tables.size,preservedRows:before.hashes.length,version,added,sourceWorkbookBytesIncluded:true};
 fs.writeFileSync('var/ui-audit/result-sync-preservation.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}
console.log(JSON.stringify({mode:process.argv[2],tables:tables.size,rows:hashes.length,version,sourceWorkbookBytesIncluded:true}));
