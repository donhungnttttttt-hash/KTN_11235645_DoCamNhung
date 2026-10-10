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
