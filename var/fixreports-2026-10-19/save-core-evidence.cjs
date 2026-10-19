const fs=require('node:fs'),path=require('node:path'),out=__dirname,backend=path.resolve(out,'../../Backend');
const xml=fs.readFileSync(path.join(backend,'target/site/jacoco/jacoco.xml'),'utf8');fs.writeFileSync(path.join(out,'fr09-scoped-jacoco.xml'),xml);
const names=['FeatureService','AssignmentPlan','FeatureController','LegacyTestingWrites','FeatureFacts','AiPortfolioContext','AiAccess','AiContextService','AiChatService','AiChatStore','AiDraftStore','TestDocumentService','TestDocumentEditingService','TestCaseService'];
const metrics={};for(const match of xml.matchAll(/<class name="([^"]+)"[^>]*>([\s\S]*?)<\/class>/g)){
 const name=match[1].split('/').pop();if(!names.includes(name))continue;const counters={};for(const c of match[2].matchAll(/<counter type="([^"]+)" missed="(\d+)" covered="(\d+)"\/>/g))counters[c[1]]={missed:+c[2],covered:+c[3],percent:Math.round(10000*(+c[3])/(+c[2]+ +c[3]))/100};metrics[name]=counters;
}
fs.writeFileSync(path.join(out,'fr09-scoped-coverage.json'),JSON.stringify({scope:'Focused AI/core legacy final98; not whole-suite coverage',classes:metrics},null,2));
for(const name of ['AiAccessTest','AiChatServiceTest','AiManagementReportGeneratorTest','AiPortfolioContextTest','CustomerWorkbookTest','FeatureAiIntegrationTest','FeatureLegacyRetirementIntegrationTest','NativeFeatureMigrationTest','NativeFeatureRepairMigrationTest']){
 for(const file of fs.readdirSync(path.join(backend,'target/surefire-reports')).filter(file=>file.endsWith(name+'.xml')||file.endsWith(name+'.txt')))fs.copyFileSync(path.join(backend,'target/surefire-reports',file),path.join(out,'final-'+file));
}
const stale=path.join(backend,'target/test-classes/vn/syp/tms/filework/NativeFeatureTailRecoveryTest.class');if(fs.existsSync(stale))fs.unlinkSync(stale);
console.log(JSON.stringify(Object.fromEntries(Object.entries(metrics).map(([name,c])=>[name,{line:c.LINE?.percent,branch:c.BRANCH?.percent}]))));
