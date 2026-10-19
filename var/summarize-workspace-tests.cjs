const fs=require('fs');
const names=fs.readFileSync('var/workspace-unit-selector.txt','utf8').split(',').concat(['AdminWorkspaceNativeTest','AdminWorkspaceFileReadNativeTest','TestDocumentIntegrationTest','AdminNativeIntegrationTest']);
let totals={tests:0,failures:0,errors:0,skipped:0,classes:0};
for(const n of names){
 const p=fs.readdirSync('Backend/target/surefire-reports').find(f=>f.endsWith('.'+n+'.xml'));if(!p)throw Error(n);
 const tag=fs.readFileSync('Backend/target/surefire-reports/'+p,'utf8').match(/<testsuite[^>]*>/)[0];
 for(const key of ['tests','failures','errors','skipped'])totals[key]+=Number(tag.match(new RegExp(key+'="([0-9]+)"'))[1]);totals.classes++;
}
console.log(JSON.stringify(totals));fs.writeFileSync('var/admin-workspace-test-summary.json',JSON.stringify(totals,null,2));
