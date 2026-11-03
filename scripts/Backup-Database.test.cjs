const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('native backup manifest records the database Flyway version instead of a fixed sprint version',()=>{
  const writes=new Map();const config={TMS_MYSQL_HOST:'127.0.0.1',TMS_MYSQL_PORT:'3307',TMS_MYSQL_CLIENT:'C:/mysql/mysql.exe',TMS_DB_USER:'test',TMS_DB_PASSWORD:'not-a-real-secret',TMS_DB_NAME:'tms'};
  const fakeFs={mkdirSync(){},readFileSync(){return 'local config';},writeFileSync(file,bytes){writes.set(file,bytes);}};
  const client={parseConfig:()=>config,query:sql=>sql.includes('flyway_schema_history')?['13']:['SPRING_SESSION','SPRING_SESSION_ATTRIBUTES']};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'Backup-Database.cjs'),'utf8'),{
    __dirname,Buffer,process:{argv:['node','script'],env:{}},console:{log(){},error(message){throw Error(message);}},
    require:name=>name==='node:fs'?fakeFs:name==='node:child_process'?{execFileSync:()=>Buffer.from('SQL dump')}:name==='./database/mysql-client.cjs'?client:require(name)
  });
  const manifest=[...writes].find(([file])=>file.endsWith('.json'));
  assert.ok(manifest);assert.equal(JSON.parse(manifest[1]).schemaVersion,13);
});

for(const [name,extra,expectedUser,expectedPassword] of [
 ['viewer',{TMS_VIEWER_USER:'viewer',TMS_VIEWER_PASSWORD:'viewer-test-only',TMS_MIGRATION_USER:'migrator',TMS_MIGRATION_PASSWORD:'migration-test-only'},'viewer','viewer-test-only'],
 ['migration',{TMS_MIGRATION_USER:'migrator',TMS_MIGRATION_PASSWORD:'migration-test-only'},'migrator','migration-test-only'],
 ['incomplete viewer falls back to migration',{TMS_VIEWER_USER:'viewer',TMS_MIGRATION_USER:'migrator',TMS_MIGRATION_PASSWORD:'migration-test-only'},'migrator','migration-test-only'],
 ['app fallback',{TMS_VIEWER_PASSWORD:'incomplete-viewer',TMS_MIGRATION_USER:'incomplete-migrator'},'app','app-test-only'],
])test('native backup consistently selects '+name+' credentials for view-compatible read-only backup',()=>{
 const queries=[],dumps=[],writes=new Map();
 const config={TMS_MYSQL_HOST:'127.0.0.1',TMS_MYSQL_PORT:'3307',TMS_MYSQL_CLIENT:'C:/mysql/mysql.exe',TMS_DB_NAME:'tms',TMS_DB_USER:'app',TMS_DB_PASSWORD:'app-test-only',...extra};
 const fakeFs={mkdirSync(){},readFileSync(){return 'local config';},writeFileSync(file,bytes){writes.set(file,bytes);}};
 const client={parseConfig:()=>({...config}),query:(sql,c)=>{queries.push(c);return sql.includes('flyway_schema_history')?['39']:['SPRING_SESSION','SPRING_SESSION_ATTRIBUTES'];}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'Backup-Database.cjs'),'utf8'),{
  __dirname,Buffer,process:{argv:['node','script'],env:{}},console:{log(){},error(message){throw Error(message);}},
  require:name=>name==='node:fs'?fakeFs:name==='node:child_process'?{execFileSync:(_cmd,args,options)=>{dumps.push({args,env:options.env});return Buffer.from('SQL dump');}}:name==='./database/mysql-client.cjs'?client:require(name)
 });
 assert.equal(queries.length,2);for(const q of queries){assert.equal(q.TMS_DB_USER,expectedUser);assert.equal(q.TMS_DB_PASSWORD,expectedPassword);}
 assert.equal(dumps.length,2);for(const dump of dumps){assert.ok(dump.args.includes('--user='+expectedUser));assert.equal(dump.env.MYSQL_PWD,expectedPassword);assert.equal(dump.args.some(a=>a.includes(expectedPassword)),false);}
 assert.ok(dumps[0].args.includes('--ignore-table=tms.SPRING_SESSION'));assert.ok(dumps[1].args.includes('--no-data'));
 const manifest=JSON.parse([...writes].find(([file])=>file.endsWith('.json'))[1]);assert.equal(manifest.schemaVersion,39);assert.equal(manifest.sessionRowsExcluded,true);assert.equal(JSON.stringify(manifest).includes(expectedPassword),false);
});
