const fs=require('fs'),path=require('path'),out=__dirname,backend=path.resolve(out,'../../Backend');
const xml=fs.readFileSync(path.join(backend,'target/site/jacoco/jacoco.xml'),'utf8');fs.writeFileSync(path.join(out,'fr09-worker-scoped-jacoco.xml'),xml);
const metrics={};for(const match of xml.matchAll(/<class name="([^"]+)"[^>]*>([\s\S]*?)<\/class>/g)){
 const name=match[1].split('/').pop();if(!['FeatureFacts','AiPortfolioContext','LegacyTestingWrites','FeatureService','AiChatService','AiAccess'].includes(name))continue;
 const counters={};for(const c of match[2].matchAll(/<counter type="([^"]+)" missed="(\d+)" covered="(\d+)"\/>/g))counters[c[1]]={missed:+c[2],covered:+c[3],percent:Math.round(10000*(+c[3])/(+c[2]+ +c[3]))/100};metrics[name]=counters;
}
let count=0;for(const name of ['AiAccessTest','AiChatServiceTest','AiManagementReportGeneratorTest','AiPortfolioContextTest','CustomerWorkbookTest','FeatureAiIntegrationTest','FeatureLegacyRetirementIntegrationTest']){
 for(const file of fs.readdirSync(path.join(backend,'target/surefire-reports')).filter(f=>f.endsWith(name+'.xml')||f.endsWith(name+'.txt'))){fs.copyFileSync(path.join(backend,'target/surefire-reports',file),path.join(out,'worker-final-'+file));if(file.endsWith('.xml'))count+=+(fs.readFileSync(path.join(backend,'target/surefire-reports',file),'utf8').match(/<testsuite[^>]* tests="(\d+)"/)?.[1]||0);}
}
fs.writeFileSync(path.join(out,'fr09-worker-scoped-coverage.json'),JSON.stringify({scope:'Focused AI worker follow-up, not whole-suite',tests:count,classes:metrics},null,2));
fs.copyFileSync(path.join(out,'core-native-ai.log'),path.join(out,'fr09-worker-final-regression.log'));
console.log(JSON.stringify({tests:count,coverage:Object.fromEntries(Object.entries(metrics).map(([n,c])=>[n,{line:c.LINE?.percent,branch:c.BRANCH?.percent}]))}));
