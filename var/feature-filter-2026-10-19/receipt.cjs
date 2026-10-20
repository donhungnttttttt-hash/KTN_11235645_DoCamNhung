const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const files=['Backend/src/main/java/vn/syp/tms/feature/FeatureController.java','Backend/src/main/java/vn/syp/tms/feature/FeatureService.java','Backend/src/test/java/vn/syp/tms/testcase/FeatureIntegrationTest.java'];
const native=['FeatureIntegrationTest','NativeFeatureIssueIntegrationTest','FeatureLegacyRetirementIntegrationTest'];
const selected=JSON.parse(fs.readFileSync(path.join(__dirname,'offline-selection.json'),'utf8')).selected;
function results(directory,prefix,names){return fs.readdirSync(directory).filter(f=>f.startsWith(prefix+'TEST-')&&names.some(n=>f.endsWith('.'+n+'.xml'))).map(f=>{const source=fs.readFileSync(path.join(directory,f),'utf8'),m=source.match(/<testsuite\b[^>]+>/)[0];return Object.fromEntries(['name','tests','failures','errors','skipped','time'].map(k=>[k,m.match(new RegExp('\\b'+k+'="([^"]+)"'))[1]]));});}
const receipt={at:new Date().toISOString(),files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),native:results(__dirname,'final-',native),offline:results(path.join(root,'Backend/target/surefire-reports'),'',selected)};
fs.writeFileSync(path.join(__dirname,'backend-final-receipt.json'),JSON.stringify(receipt,null,2));
console.log(JSON.stringify({native:receipt.native,offline:receipt.offline.reduce((sum,row)=>({tests:sum.tests+Number(row.tests),failures:sum.failures+Number(row.failures),errors:sum.errors+Number(row.errors),skipped:sum.skipped+Number(row.skipped),suites:sum.suites+1}),{tests:0,failures:0,errors:0,skipped:0,suites:0})}));
