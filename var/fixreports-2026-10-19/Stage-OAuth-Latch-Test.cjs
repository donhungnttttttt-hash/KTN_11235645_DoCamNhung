// Preparation only: do not write Backend or run Maven until the root returns the slot.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),relative='Backend/src/test/java/vn/syp/tms/ai/ChatGptOAuthClientTest.java';
const before=fs.readFileSync(path.join(root,relative),'utf8');
const marker='    @Test void refreshAndDiscoveryShareOuterCatalogDeadlineAndValidationTimeoutRequiresReconnect() throws Exception {';
const start=before.indexOf(marker);if(start<0||before.indexOf(marker,start+1)>=0)throw Error('Expected one bounded OAuth test');
const fragment=fs.readFileSync(path.join(__dirname,'oauth-latch-method.java.fragment'),'utf8');
const after=before.slice(0,start)+fragment+'}\n';
const out=path.join(__dirname,'oauth-latch-candidate');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'ChatGptOAuthClientTest.java'),after);
fs.writeFileSync(path.join(out,'baseline.json'),JSON.stringify({relative,sha256:crypto.createHash('sha256').update(before).digest('hex'),scope:'Only the final deadline test method; no production fix, no assertion relaxation'},null,2)+'\n');
console.log('Prepared latch-controlled OAuth test candidate outside Backend; source/test/runtime untouched.');
