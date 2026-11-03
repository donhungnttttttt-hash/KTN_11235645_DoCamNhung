const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateSchema,validateBuildDirectory,assertExecuted}=require('./Test-UnifiedAccessNative.cjs');
test('rejectsMainAndExistingUnownedSchema',()=>{
  for(const name of ['tms','mysql','tms_userstest_bad','tms_userstest_123456789abc;DROP']) assert.throws(()=>validateSchema(name,[],null));
  assert.throws(()=>validateSchema('tms_userstest_123456789abc',['tms_userstest_123456789abc'],null));
  assert.equal(validateSchema('tms_userstest_123456789abc',[],null),'tms_userstest_123456789abc');
  assert.equal(validateSchema('tms_userstest_123456789abc',['tms_userstest_123456789abc'],'tms_userstest_123456789abc'),'tms_userstest_123456789abc');
});
test('rejectsSkippedNativeSuite',()=>{
  assert.throws(()=>assertExecuted([{tests:3,skipped:3,failures:0,errors:0}]));
  assert.throws(()=>assertExecuted([]));
  assert.throws(()=>assertExecuted([{tests:1,skipped:0,failures:1,errors:0}]));
  assert.throws(()=>assertExecuted([{name:'GuestReportingNativeTest',tests:3,skipped:3,failures:0,errors:0},{name:'PolicyTest',tests:2,skipped:0,failures:0,errors:0}]));
  assert.equal(assertExecuted([{tests:2,skipped:0,failures:0,errors:0}]).executed,2);
});
test('doesNotOverwriteRunningBackendBuild',()=>{
  const path=require('node:path');const root=path.resolve(__dirname,'..');
  assert.throws(()=>validateBuildDirectory(root,path.join(root,'Backend')));
  assert.throws(()=>validateBuildDirectory(root,path.join(root,'Backend/target/user-profile-verification/delete-versions-backend')));
  assert.equal(validateBuildDirectory(root,path.join(root,'Backend/target/unified-access-verification')),path.join(root,'Backend/target/unified-access-verification'));
});
