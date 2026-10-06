const {test}=require('node:test');
const assert=require('node:assert/strict');
const {testPlan,testConfiguration,run}=require('./Test-FileWorkQaNative.cjs');
const schema='tms_docstest_012345abcdef';
const config={TMS_MYSQL_HOST:'127.0.0.1',TMS_MYSQL_PORT:'3307',TMS_MIGRATION_USER:'fixture',TMS_MIGRATION_PASSWORD:'never-log-this'};
test('only explicit matching modes and exact selectors are accepted',()=>{
 for(const [mode,selector] of [['fresh-migration','NativeFileWorkQaMigrationTest'],['integration','NativeFileWorkQaIntegrationTest']]) {
  assert.equal(testPlan(mode,selector).selector,selector);
 }
 for(const pair of [[undefined,undefined],['integration','*Test'],['integration','NativeFileWorkQaMigrationTest'],['fresh-migration','NativeFileWorkQaIntegrationTest'],['integration','NativeFileWorkQaIntegrationTest,OtherTest'],['verify','NativeFileWorkQaIntegrationTest']])assert.throws(()=>testPlan(...pair));
});
test('schema, host, port and credentials are fail closed',()=>{
 const prepared=testConfiguration(config,schema);
 assert.match(prepared.environment.TMS_TEST_DB_URL,/^jdbc:mysql:\/\/127\.0\.0\.1:3307\/tms_docstest_012345abcdef\?/);
 assert.equal(prepared.environment.TMS_BOOTSTRAP_ENABLED,'false');
 assert.equal(prepared.environment.TMS_REDMINE_ENABLED,'false');
 for(const value of [undefined,'tms','tms_docstest_ABCDEF012345','tms_docstest_012345abcdef/other','tms_docstest_012345abcdef?database=tms','tms_docstest_012345abcdef\n'])assert.throws(()=>testConfiguration(config,value));
 for(const host of ['db.example.com','127.0.0.1.evil','localhost:3307/tms','::1','localhost\n'])assert.throws(()=>testConfiguration({...config,TMS_MYSQL_HOST:host},schema));
 for(const port of ['0','65536','3307&x=1','3307\n'])assert.throws(()=>testConfiguration({...config,TMS_MYSQL_PORT:port},schema));
 assert.throws(()=>testConfiguration({...config,TMS_MIGRATION_PASSWORD:''},schema));
});
test('invalid arguments are rejected before config read, SQL or process launch',()=>{
 let touched=0;const io={readConfig:()=>{touched++;return config;},query:()=>{touched++;},spawn:()=>{touched++;}};
 for(const args of [[],[schema,'integration'],['tms','integration','NativeFileWorkQaIntegrationTest'],[schema,'integration','*'],[schema,'integration','NativeFileWorkQaIntegrationTest','extra']])assert.throws(()=>run(args,io));
 assert.equal(touched,0);
});
test('fresh refuses existing contents before Maven; integration refuses wrong version',()=>{
 let spawned=false;
 const io={readConfig:()=>config,query:sql=>sql==='SELECT DATABASE();'?[schema]:['1'],spawn:()=>{spawned=true;}};
 assert.throws(()=>run([schema,'fresh-migration','NativeFileWorkQaMigrationTest'],io));
 assert.throws(()=>run([schema,'integration','NativeFileWorkQaIntegrationTest'],io));
 io.query=sql=>sql==='SELECT DATABASE();'?[schema]:['18'];
 assert.throws(()=>run([schema,'integration','NativeFileWorkQaConcurrencyTest'],io));
 assert.equal(spawned,false);
});
test('wrong selected database and bad host do not reach Maven',()=>{
 let queries=0,spawned=false;
 const io={readConfig:()=>({...config,TMS_MYSQL_HOST:'external'}),query:()=>{queries++;return ['tms'];},spawn:()=>{spawned=true;}};
 assert.throws(()=>run([schema,'integration','NativeFileWorkQaIntegrationTest'],io));assert.equal(queries,0);
 io.readConfig=()=>config;assert.throws(()=>run([schema,'integration','NativeFileWorkQaIntegrationTest'],io));assert.equal(spawned,false);
});
test('valid integration launches only selected test with structured secret-free arguments',()=>{
 let call;
 const result=run([schema,'integration','NativeFileWorkQaIntegrationTest'],{readConfig:()=>config,query:sql=>sql==='SELECT DATABASE();'?[schema]:['19'],spawn:(command,args,options)=>{call={command,args,options};return {status:0};}});
 assert.equal(result,0);assert.equal(call.command,'rtk');
 assert.ok(call.args.includes('-Dtest=NativeFileWorkQaIntegrationTest'));
 assert.ok(!JSON.stringify(call.args).includes(config.TMS_MIGRATION_PASSWORD));
 assert.equal(call.options.shell,false);assert.equal(call.options.env.TMS_TEST_FQ_MODE,'integration');
 assert.equal(call.options.env.TMS_TEST_FRESH_MIGRATION,'false');
});

test('concurrency selector is explicitly allowlisted only in integration mode',()=>{assert.equal(testPlan('integration','NativeFileWorkQaConcurrencyTest').selector,'NativeFileWorkQaConcurrencyTest');assert.throws(()=>testPlan('fresh-migration','NativeFileWorkQaConcurrencyTest'));});
