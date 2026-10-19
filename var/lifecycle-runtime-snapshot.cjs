const fs=require('fs');const {localQuery}=require('../scripts/database/mysql-client.cjs');const q=localQuery();
if(q('SELECT DATABASE();')[0]!=='tms')throw Error('Unexpected database');
const excluded=['flyway_schema_history','spring_session','spring_session_attributes','project_lifecycle_decisions'];
const tables=q('SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() ORDER BY table_name;').filter(t=>!excluded.includes(t.toLowerCase()));
const counts=Object.fromEntries(tables.map(t=>{if(!/^[a-z_]+$/i.test(t))throw Error('Unexpected table');return[t,Number(q('SELECT COUNT(*) FROM '+t+';')[0])];}));
const hashes=q('SELECT id,SHA2(source_workbook,256) FROM import_batches WHERE source_workbook IS NOT NULL ORDER BY id;');
const snapshot={version:q('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;')[0],counts,hashes};
const target='var/lifecycle-before.json';
if(process.argv[2]==='before'){fs.writeFileSync(target,JSON.stringify(snapshot,null,2),{flag:'wx'});console.log('Recorded business tables',tables.length,'rows',Object.values(counts).reduce((a,b)=>a+b,0),'workbooks',hashes.length,'version',snapshot.version);}
else if(process.argv[2]==='after'){const previous=JSON.parse(fs.readFileSync(target,'utf8'));if(JSON.stringify(previous.counts)!==JSON.stringify(counts)||JSON.stringify(previous.hashes)!==JSON.stringify(hashes))throw Error('Business counts or workbook hashes changed; inspect before claiming preservation');if(snapshot.version!=='21')throw Error('V21 not applied');console.log('V21 verified; all',tables.length,'existing business table counts and',hashes.length,'workbook hashes unchanged');}
else throw Error('Explicit before or after required');
