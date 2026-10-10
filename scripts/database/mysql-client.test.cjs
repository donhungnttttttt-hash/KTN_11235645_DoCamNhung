const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseConfig,clientOptions,query}=require('./mysql-client.cjs');
const {localQuery}=require('./mysql-client.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const sample='TMS_MYSQL_HOST=127.0.0.1\nTMS_MYSQL_PORT=3307\nTMS_DB_NAME=tms\nTMS_DB_USER=tms_app\nTMS_DB_PASSWORD=secret-fixture\nTMS_MYSQL_CLIENT=C:/Program Files/MySQL/mysql.exe\n';
test('native config preserves spaces in executable and keeps password out of args',()=>{
 const c=parseConfig(sample); const o=clientOptions(c);assert.equal(o.args[1],'C:/Program Files/MySQL/mysql.exe');assert(!o.args.join(' ').includes('secret-fixture'));assert.equal(o.env.MYSQL_PWD,'secret-fixture');assert(o.args.includes('--port=3307'));
});
test('local tools reject nonloopback, invalid ports/schema and missing secret without disclosing it',()=>{
 for(const text of [sample.replace('127.0.0.1','example.com'),sample.replace('3307','0'),sample.replace('3307','65536'),sample.replace('3307','33oops'),sample.replace('TMS_DB_NAME=tms','TMS_DB_NAME=tms;DROP'),sample.replace('TMS_DB_PASSWORD=secret-fixture','TMS_DB_PASSWORD=')]) assert.throws(()=>parseConfig(text),e=>!e.message.includes('secret-fixture'));
});
test('native query uses input pipe and sanitizes failed child-process output',()=>{
 const c=parseConfig(sample);let seen;assert.deepEqual(query('SELECT 1;',c,(...args)=>{seen=args;return '1\n';}),['1']);assert.equal(seen[2].input,'SELECT 1;');assert.throws(()=>query('SELECT 1;',c,()=>{throw Error('secret-fixture');}),/^Error: MySQL query failed/);
});
test('blank output is empty and comments are ignored',()=>{const c=parseConfig('# local\n'+sample);assert.deepEqual(query('SELECT 1;',c,()=>''),[]);});
test('missing native configuration fails closed without selecting legacy Docker',()=>{assert.throws(()=>localQuery(false,path.join(os.tmpdir(),'tms-absent-config-'+Date.now())),/never selected automatically/);});
test('native local query reads explicitly selected configuration',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tms-config-'));try{const file=path.join(dir,'.env');fs.writeFileSync(file,sample);assert.equal(typeof localQuery(false,file),'function');}finally{fs.rmSync(path.join(dir,'.env'));fs.rmdirSync(dir);}});
