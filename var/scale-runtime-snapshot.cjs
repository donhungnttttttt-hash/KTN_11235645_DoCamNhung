const fs=require('fs'),assert=require('node:assert/strict');
const {localQuery}=require('../scripts/database/mysql-client.cjs');const q=localQuery();
assert.equal(q('SELECT DATABASE();')[0],'tms');
const excluded=new Set(['flyway_schema_history','spring_session','spring_session_attributes','identity_login_buckets']);
const columns={};
for(const line of q('SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=DATABASE() ORDER BY table_name,ordinal_position;')) {
 const [table,column]=line.split('\t');
 assert.match(table,/^[a-z_][a-z0-9_]*$/i);assert.match(column,/^[a-z_][a-z0-9_]*$/i);
 if(!excluded.has(table.toLowerCase()))(columns[table]??=[]).push(column);
}
const snapshots=Object.fromEntries(Object.keys(columns).map(t=>[t,[]]));
const sql=Object.entries(columns).map(([table,cols])=>`SELECT '${table}',SHA2(JSON_ARRAY(${cols.map(c=>'IF(`'+c+'` IS NULL,NULL,HEX(`'+c+'`))').join(',')}),256) FROM \`${table}\`;`).join('\n');
for(const line of q(sql)){const [table,hash]=line.split('\t');assert.match(hash,/^[0-9a-f]{64}$/);snapshots[table].push(hash);}
Object.values(snapshots).forEach(rows=>rows.sort());
const version=q('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;')[0];
const sourceHashes=q('SELECT id,SHA2(source_workbook,256) FROM import_batches WHERE source_workbook IS NOT NULL ORDER BY id;');
const beforeFile='var/scale-main-before.json';
if(process.argv[2]==='before'){
 assert.equal(version,'21');
 assert.equal(q("SELECT COUNT(*) FROM identity_users WHERE username LIKE 'syp.lab.%';")[0],'0');
 assert.equal(q("SELECT COUNT(*) FROM device_assets WHERE asset_code LIKE 'SYP-LAB-22-%';")[0],'0');
 assert.equal(q("SELECT COUNT(*) FROM projects WHERE code LIKE 'SYP-LAB-22-%';")[0],'0');
 assert.equal(q("SELECT COUNT(*) FROM identity_users WHERE username='syp.demo.admin' AND role_code='ADMIN' AND enabled=TRUE;")[0],'1');
 fs.writeFileSync(beforeFile,JSON.stringify({version,snapshots,sourceHashes},null,2),{flag:'wx'});
 console.log(JSON.stringify({version,tables:Object.keys(snapshots).length,rows:Object.values(snapshots).reduce((n,r)=>n+r.length,0),workbooks:sourceHashes.length}));
}else if(process.argv[2]==='after'){
 assert.equal(version,'22');const before=JSON.parse(fs.readFileSync(beforeFile));
 const added={};
 for(const [table,rows] of Object.entries(before.snapshots)) {
  const remaining=new Map();for(const h of snapshots[table])remaining.set(h,(remaining.get(h)||0)+1);
  for(const h of rows){assert.ok(remaining.get(h)>0,`Existing row changed/missing in ${table}`);remaining.set(h,remaining.get(h)-1);}
  const delta=snapshots[table].length-rows.length;if(delta)added[table]=delta;
 }
 assert.deepEqual(sourceHashes,before.sourceHashes);
 assert.equal(added.identity_users,100);assert.equal(added.device_assets,120);assert.equal(added.device_allocations,24);assert.equal(added.projects,3);
 const evidence={version,oldTablesPreserved:Object.keys(before.snapshots).length,oldRowsPreserved:Object.values(before.snapshots).reduce((n,r)=>n+r.length,0),workbookHashesUnchanged:sourceHashes.length,added};
 fs.writeFileSync('var/scale-main-preservation.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}else throw Error('Expected before/after');
