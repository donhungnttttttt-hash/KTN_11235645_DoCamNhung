const fs=require('node:fs'),{localQuery}=require('../../scripts/database/mysql-client.cjs');
const sql=localQuery(),path='var/admin-excel/preserve-before.json';
const names=['test_case_revisions','test_cases','test_suites','project_memberships','import_batches','import_rows','project_audit'];
const before=process.argv[2]==='check'?JSON.parse(fs.readFileSync(path,'utf8')):null;
const data={};
for(const name of names) {
 const columns=before?.[name].columns || sql('SHOW COLUMNS FROM `'+name+'`').map(line=>line.split('\t')[0]);
 const expr=columns.map(col=>'COALESCE(HEX(`'+col+'`),\'NULL\')').join(',');
 const hashes=sql('SELECT id,SHA2(CONCAT_WS(\'|\','+expr+'),256) FROM `'+name+'` ORDER BY id');
 data[name]={columns,hashes};
}
if(!before) {fs.writeFileSync(path,JSON.stringify(data));console.log('Saved old-column hashes for '+names.length+' affected tables; no row values printed.');}
else {for(const name of names){if(JSON.stringify(before[name].hashes)!==JSON.stringify(data[name].hashes))throw Error('Changed existing data in '+name);}console.log('PASS: original columns and rows unchanged in '+names.length+' tables ('+names.reduce((n,x)=>n+data[x].hashes.length,0)+' rows).');}
console.log('Flyway version '+sql('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1')[0]);
