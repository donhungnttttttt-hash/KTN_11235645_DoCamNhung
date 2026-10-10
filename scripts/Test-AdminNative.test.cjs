const {test}=require('node:test');
const assert=require('node:assert/strict');
const {testConfiguration,testPlan}=require('./Test-AdminNative.cjs');
const local={TMS_MYSQL_HOST:'127.0.0.1',TMS_MYSQL_PORT:'3307',TMS_DB_NAME:'tms',TMS_DB_USER:'app',TMS_DB_PASSWORD:'app-secret',TMS_MIGRATION_USER:'migrator',TMS_MIGRATION_PASSWORD:'migration-secret'};
test('default includes initial allocation and current-read regressions without destructive migration opt-in',()=>{
 assert.match(testPlan().tests,/NativeInitialAllocationTest/);assert.equal(testPlan().environment.TMS_TEST_FRESH_MIGRATION,'false');
 assert.match(testPlan().tests,/NativeAdminCurrentReadTest/);
 assert.equal(testPlan(undefined,true).tests,'NativeInventoryMigrationTest');assert.equal(testPlan(undefined,true).environment.TMS_TEST_FRESH_MIGRATION,'true');
 assert.throws(()=>testPlan('NativeInventoryMigrationTest'));assert.throws(()=>testPlan('Admin*Test,NativeInventoryMigrationTest',true));
});

test('refuses production, arbitrary names and injected identifiers',()=>{
 for(const schema of ['tms','mysql','test','tms_docstest_abc','tms_docstest_202610030001;DROP DATABASE tms'])
  assert.throws(()=>testConfiguration(local,schema));
});
test('selects only dedicated loopback schema with migration credentials',()=>{
 const result=testConfiguration(local,'tms_docstest_202610030001');
 assert.equal(result.client.TMS_DB_NAME,'tms_docstest_202610030001');
 assert.equal(result.client.TMS_DB_USER,'migrator');
 assert.equal(result.environment.TMS_TEST_DB_PASSWORD,'migration-secret');
 assert.match(result.environment.TMS_TEST_DB_URL,/^jdbc:mysql:\/\/127\.0\.0\.1:3307\/tms_docstest_202610030001\?/);
 assert.equal(local.TMS_DB_NAME,'tms');
});
test('refuses remote host and missing migration secret',()=>{
 assert.throws(()=>testConfiguration({...local,TMS_MYSQL_HOST:'example.com'},'tms_docstest_202610030001'));
 assert.throws(()=>testConfiguration({...local,TMS_MIGRATION_PASSWORD:''},'tms_docstest_202610030001'));
});
