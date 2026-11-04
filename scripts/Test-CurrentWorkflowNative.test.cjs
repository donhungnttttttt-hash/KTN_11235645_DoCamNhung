const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const runner=require('./Test-CurrentWorkflowNative.cjs');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
test('handbook selector requires its guarded fully qualified executed suite with zero skips',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../Backend/src/test/java/vn/syp/tms/handbook/NativeHandbookRevisionIntegrationTest.java'),'utf8');
 assert.match(source,/CurrentWorkflowDatabaseGuard\.configure\(r\)/);
 assert.match(source,/@EnabledIfEnvironmentVariable\(named="TMS_TEST_FEATURE_MODE",matches="integration"\)/);
 assert.doesNotMatch(source,/DELETE FROM|TRUNCATE|DROP TABLE|CREATE TABLE|registry\.register/);
 for(const variant of ['valid','missing','skipped','wrong-package']){
  const f=fixture(),a=f.args();a[a.indexOf('--tests')+1]='NativeHandbookRevisionIntegrationTest';
  f.io.maven=()=>({status:0,suites:variant==='missing'?[]:[{name:(variant==='wrong-package'?'vn.syp.tms.testcase.':'vn.syp.tms.handbook.')+'NativeHandbookRevisionIntegrationTest',tests:5,skipped:variant==='skipped'?5:0,failures:0,errors:0}]});
  assert.equal(runner.run(a,f.io).ok,variant==='valid');
 }
});
test('identity selector requires its fully qualified executed suite with zero skips',()=>{
 for(const variant of ['valid','missing','skipped','wrong-package']){
  const f=fixture(),a=f.args();a[a.indexOf('--tests')+1]='NativeDelegatedIdentityIntegrationTest';
  f.io.maven=()=>({status:0,suites:variant==='missing'?[]:[{name:(variant==='wrong-package'?'vn.syp.tms.testcase.':'vn.syp.tms.identity.')+'NativeDelegatedIdentityIntegrationTest',tests:6,skipped:variant==='skipped'?6:0,failures:0,errors:0}]});
  assert.equal(runner.run(a,f.io).ok,variant==='valid');
 }
});
test('admin lifecycle selectors require both fully qualified executed suites with zero skips',()=>{
 for(const variant of ['valid','missing','skipped','wrong-package']){
  const f=fixture(),a=f.args(),names=['NativeCurrentProjectLifecycleIntegrationTest','NativeCurrentProjectLifecycleConcurrencyTest'];a[a.indexOf('--tests')+1]=names.join(',');
  f.io.maven=()=>({status:0,suites:names.filter((_,i)=>variant!=='missing'||i===0).map(name=>({name:(variant==='wrong-package'?'vn.syp.tms.testcase.':'vn.syp.tms.admin.')+name,tests:2,skipped:variant==='skipped'?2:0,failures:0,errors:0}))});
  assert.equal(runner.run(a,f.io).ok,variant==='valid');
 }
});
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'arena-guard-'));
 const target={host:'127.0.0.1',port:3307,schema:'tms_docstest_123456abcdef',serverUuid:'11111111-2222-3333-4444-555555555555',flywayVersion:'39',migrationLocations:['classpath:db/migration']};
 const migrations=[{version:'39',script:'V39__test.sql',checksum:123}];
 const receipt={formatVersion:1,purpose:'CURRENT_WORKFLOW_NATIVE_PROVISION',createdNewSchema:true,ownerRoot:path.resolve(__dirname,'..'),preparedAt:new Date().toISOString(),target,migrations};
 const receiptPath=path.join(dir,'provision.json');fs.writeFileSync(receiptPath,JSON.stringify(receipt));
 const manifest={formatVersion:1,purpose:'CURRENT_WORKFLOW_NATIVE',target,provenance:{receiptPath,receiptSha256:hash(fs.readFileSync(receiptPath))}};
 const file=path.join(dir,'manifest.json');
 const save=()=>{fs.writeFileSync(file,JSON.stringify(manifest));return hash(fs.readFileSync(file));};
 const args=()=>['--mode','integration','--manifest',file,'--manifest-sha256',save(),'--tests','FeatureIntegrationTest','--evidence-dir',path.join(dir,'run')];
 const io={mysqlCalls:[],mavenCalls:[],env:{TMS_ATTACHMENT_ROOT:path.join(dir,'app-storage'),TMS_TEST_FEATURE_MODE:'seed',TMS_ALLOW_LIVE:'true'},loadConfig:()=>({TMS_MYSQL_HOST:target.host,TMS_MYSQL_PORT:''+target.port,TMS_DB_NAME:target.schema,TMS_DB_USER:'isolated_user',TMS_DB_PASSWORD:'private',TMS_MYSQL_CLIENT:'mysql'}),applicationSchema:'tms',baseline:()=>({head:'abc',dirty:'existing',sourceHash:'123',migrations:[]}),mysql(sql){this.mysqlCalls.push(sql);return sql.includes('@@server_uuid')?[target.schema+'\t'+target.serverUuid]:migrations.map(m=>m.version+'\t'+m.script+'\t'+m.checksum);},maven(plan){this.mavenCalls.push(plan);return {status:0,suites:[{name:'vn.syp.tms.testcase.FeatureIntegrationTest',tests:1,skipped:0,failures:0,errors:0}]};}};
 return {dir,target,manifest,receipt,receiptPath,args,io,save,file};
}
test('rejectsUnsafeTargetBeforeConnect',()=>{for(const change of [{host:'example.com'},{port:0},{schema:'tms'}]){const f=fixture();Object.assign(f.target,change);const result=runner.run(f.args(),f.io);assert.equal(result.ok,false);assert.equal(f.io.mysqlCalls.length,0);assert.equal(f.io.mavenCalls.length,0);}});
test('rejectsManifestOrProvenanceMismatch',()=>{const f=fixture();f.manifest.provenance.receiptSha256='0'.repeat(64);assert.equal(runner.run(f.args(),f.io).ok,false);assert.equal(f.io.mysqlCalls.length,0);assert.equal(f.io.mavenCalls.length,0);});
test('rejectsUnexpectedMigrationAndUnknownSelector',()=>{const f=fixture();let args=f.args();args[args.indexOf('--tests')+1]='SystemJourneyTest';assert.equal(runner.run(args,f.io).ok,false);assert.equal(f.io.mysqlCalls.length,0);assert.equal(f.io.mavenCalls.length,0);const g=fixture();g.io.mysql=function(sql){this.mysqlCalls.push(sql);return sql.includes('@@server_uuid')?[g.target.schema+'\t'+g.target.serverUuid]:['40\tV40__unexpected.sql\t42'];};assert.equal(runner.run(g.args(),g.io).ok,false);assert.equal(g.io.mavenCalls.length,0);});
test('failsWhenSelectedSuitesOnlySkip',()=>{for(const counts of [{tests:0,skipped:0},{tests:1,skipped:1}]){const f=fixture();f.io.maven=function(plan){this.mavenCalls.push(plan);return {status:0,suites:[{name:'vn.syp.tms.testcase.FeatureIntegrationTest',failures:0,errors:0,...counts}]};};assert.equal(runner.run(f.args(),f.io).ok,false);}});
test('ignoresInheritedApplicationAttachmentRoot',()=>{const f=fixture();fs.mkdirSync(f.io.env.TMS_ATTACHMENT_ROOT);const sentinel=path.join(f.io.env.TMS_ATTACHMENT_ROOT,'sentinel');fs.writeFileSync(sentinel,'preserve');const result=runner.run(f.args(),f.io);assert.equal(result.ok,true);const env=f.io.mavenCalls[0].env;assert.equal(env.TMS_ATTACHMENT_ROOT,path.join(f.dir,'run','attachments'));assert.equal(fs.readFileSync(sentinel,'utf8'),'preserve');assert.equal(env.TMS_TEST_FEATURE_MODE,'integration');assert.equal(env.TMS_ALLOW_LIVE,undefined);assert.deepEqual(f.io.mavenCalls[0].classes,['FeatureIntegrationTest']);});
test('rejectsSharedOrEscapingAttachmentRoot',()=>{const f=fixture();const args=f.args();fs.mkdirSync(path.join(f.dir,'run'));assert.equal(runner.run(args,f.io).ok,false);assert.equal(f.io.mavenCalls.length,0);assert.equal(f.io.mysqlCalls.length,0);const g=fixture();const link=path.join(g.dir,'escape');fs.symlinkSync(g.dir,link,process.platform==='win32'?'junction':'dir');const a=g.args();a[a.indexOf('--evidence-dir')+1]=path.join(link,'run');assert.equal(runner.run(a,g.io).ok,false);assert.equal(g.io.mysqlCalls.length,0);});
test('check-only never invokes Maven and emits receipts',()=>{const f=fixture();assert.equal(runner.run([...f.args(),'--check-only'],f.io).ok,true);assert.equal(f.io.mavenCalls.length,0);assert.equal(JSON.parse(fs.readFileSync(path.join(f.dir,'run','receipt.json'))).javaValidation,'NOT_RUN');});
test('strict CLI rejects missing, duplicate, wildcard and unsafe mode arguments',()=>{assert.throws(()=>runner.parseArgs([]));const f=fixture();assert.throws(()=>runner.parseArgs([...f.args(),'--mode','integration']));assert.throws(()=>runner.testPlan('seed','FeatureIntegrationTest'));assert.throws(()=>runner.testPlan('integration','Feature*'));});
test('rejects evidence inside IDE output or application storage before connection',()=>{for(const location of ['Backend/target/ar00-forbidden','var/evidence/ar00-forbidden']){const f=fixture(),a=f.args();a[a.indexOf('--evidence-dir')+1]=path.resolve(__dirname,'..',location);assert.equal(runner.run(a,f.io).ok,false);assert.equal(f.io.mysqlCalls.length,0);assert.equal(f.io.mavenCalls.length,0);}});
test('preserves null Java migration checksums and rejects a changed checksum',()=>{const f=fixture();f.receipt.migrations[0].checksum=null;fs.writeFileSync(f.receiptPath,JSON.stringify(f.receipt));f.manifest.provenance.receiptSha256=hash(fs.readFileSync(f.receiptPath));f.io.mysql=function(sql){this.mysqlCalls.push(sql);return sql.includes('@@server_uuid')?[f.target.schema+'\t'+f.target.serverUuid]:['39\tV39__test.sql\tNULL'];};assert.equal(runner.run([...f.args(),'--check-only'],f.io).ok,true);const g=fixture();g.io.mysql=function(sql){this.mysqlCalls.push(sql);return sql.includes('@@server_uuid')?[g.target.schema+'\t'+g.target.serverUuid]:['39\tV39__test.sql\t999'];};assert.equal(runner.run(g.args(),g.io).ok,false);assert.equal(g.io.mavenCalls.length,0);});
test('requires an executed report for every selected suite',()=>{const f=fixture(),a=f.args();a[a.indexOf('--tests')+1]='FeatureIntegrationTest,FeatureAiIntegrationTest';assert.equal(runner.run(a,f.io).ok,false);assert.equal(f.io.mavenCalls.length,1);});
test('rejects provenance target mismatch and altered manifest bytes',()=>{const f=fixture();f.receipt.target={...f.target,port:3308};fs.writeFileSync(f.receiptPath,JSON.stringify(f.receipt));f.manifest.provenance.receiptSha256=hash(fs.readFileSync(f.receiptPath));assert.equal(runner.run(f.args(),f.io).ok,false);assert.equal(f.io.mysqlCalls.length,0);const g=fixture(),a=g.args();fs.appendFileSync(g.file,' ');assert.equal(runner.run(a,g.io).ok,false);assert.equal(g.io.mysqlCalls.length,0);});
