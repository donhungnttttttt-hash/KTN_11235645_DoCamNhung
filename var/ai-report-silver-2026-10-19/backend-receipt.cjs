const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const production=['AiDraftContent','AiDraftService','AiManagementReportGenerator','AiProviderGateway','OpenAiResponsesClient','ChatGptPlanClient','ChatGptSse','OllamaClient'].map(name=>`Backend/src/main/java/vn/syp/tms/ai/${name}.java`);
const tests=['Backend/src/test/java/vn/syp/tms/ai/AiManagementReportGeneratorTest.java','Backend/src/test/java/vn/syp/tms/ai/AiManagementReportTextTest.java','Backend/src/test/java/vn/syp/tms/testcase/ManagementReportIntegrationTest.java'];
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const offline=JSON.parse(fs.readFileSync(path.join(__dirname,'backend-offline-complete.json'),'utf8'));
const log=fs.readFileSync(path.join(__dirname,'backend-offline-complete.log'),'utf8');
const match=[...log.matchAll(/Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)/g)].at(-1);
if(!match||offline.exitCode!==0||!log.includes('BUILD SUCCESS'))throw Error('Complete verification receipt required');
const receipt={recordedAt:new Date().toISOString(),sourceFiles:Object.fromEntries([...production,...tests].map(file=>[file,hash(file)])),offline:{...offline,counts:{tests:+match[1],failures:+match[2],errors:+match[3],skipped:+match[4]}},native:JSON.parse(fs.readFileSync(path.join(__dirname,'backend-native.json'),'utf8')),jar:{path:'Backend/target/tms-backend-0.1.0-SNAPSHOT.jar',sha256:hash('Backend/target/tms-backend-0.1.0-SNAPSHOT.jar')},coverage:'NOT_MEASURED_FOR_THIS_CHANGE',configChanged:false,migrationsChanged:false,mainDomainWrites:0,externalProviderCallsBySubagent:0,restartBySubagent:false,commit:false,push:false};
fs.writeFileSync(path.join(__dirname,'backend-final-receipt.json'),JSON.stringify(receipt,null,2));
for(const name of ['AiManagementReportTextTest','AiManagementReportGeneratorTest','AiDraftServiceTest','OpenAiResponsesClientTest']){
const file=`TEST-vn.syp.tms.ai.${name}.xml`;fs.copyFileSync(path.join(root,'Backend/target/surefire-reports',file),path.join(__dirname,'final-'+file));}
console.log(JSON.stringify({counts:receipt.offline.counts,productionFiles:production.length,testFiles:tests.length,jar:receipt.jar}));
