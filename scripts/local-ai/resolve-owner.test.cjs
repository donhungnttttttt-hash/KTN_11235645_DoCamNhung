const {test}=require('node:test');
const assert=require('node:assert/strict');
const {resolveOwner}=require('./resolve-owner.cjs');
const id='cc166570-78be-4d67-b514-5cada01f3738';
test('owner lookup uses only a SELECT and encodes the username as UTF-8 hex',()=>{
 let sql;
 assert.equal(resolveOwner("admin.local' OR 1=1 --",query=>{sql=query;return [id];}),id);
 assert.match(sql,/^SELECT id FROM identity_users WHERE BINARY username=CONVERT\(0x[0-9a-f]+ USING utf8mb4\) AND enabled=TRUE;$/);
 assert.ok(!sql.includes("admin.local'"));
});
test('missing disabled ambiguous and malformed owner results are rejected',()=>{
 for(const rows of [[],[id,id],['not-an-id']]) assert.throws(()=>resolveOwner('admin.local',()=>rows),/not found or disabled/);
});
test('empty oversized and control-character usernames fail before querying',()=>{
 for(const input of ['', 'a'.repeat(101), 'admin\nlocal']) {
  let calls=0;
  assert.throws(()=>resolveOwner(input,()=>{calls++;return [id];}),/Invalid owner username/);
  assert.equal(calls,0);
 }
});
