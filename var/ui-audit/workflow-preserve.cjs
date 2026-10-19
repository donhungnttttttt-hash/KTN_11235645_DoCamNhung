const fs=require('node:fs'),{localQuery}=require('../../scripts/database/mysql-client.cjs');const query=localQuery();
const file='var/ui-audit/workflow-main-before.json';const mode=process.argv[2]||'snapshot';
const ident=s=>{if(!/^[A-Za-z0-9_]+$/.test(s))throw Error('Unexpected identifier');return '`'+s+'`';};
const before=mode==='check'?JSON.parse(fs.readFileSync(file,'utf8')):null;
const columns=before?.columns||query("SELECT JSON_OBJECT('table',TABLE_NAME,'column',COLUMN_NAME) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND LOWER(TABLE_NAME) NOT IN ('spring_session','spring_session_attributes','flyway_schema_history') ORDER BY TABLE_NAME,ORDINAL_POSITION;").map(JSON.parse);
const tables=new Map();for(const c of columns){if(!tables.has(c.table))tables.set(c.table,[]);tables.get(c.table).push(c.column);}
const selects=[...tables].map(([table,cols])=>`SELECT '${table}',SHA2(CONCAT_WS('|',${cols.map(c=>"COALESCE(HEX("+ident(c)+"),'NULL')").join(',')}),256) FROM ${ident(table)}`);
const hashes=query('START TRANSACTION READ ONLY;'+selects.join(' UNION ALL ')+';COMMIT;').sort();
if(before){const current=new Map();for(const h of hashes)current.set(h,(current.get(h)||0)+1);for(const h of before.hashes){if(!current.get(h))throw Error('Existing business row changed during migration: '+h.split('\t')[0]);current.set(h,current.get(h)-1);}console.log('PASS preserved '+before.hashes.length+' business rows across '+tables.size+' tables; source workbook bytes included in hashes.');}
else{fs.writeFileSync(file,JSON.stringify({checkedAt:new Date().toISOString(),columns,hashes}));console.log('Saved hashes for '+hashes.length+' rows / '+tables.size+' tables. No row contents printed.');}
console.log('Flyway '+query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;')[0]);
