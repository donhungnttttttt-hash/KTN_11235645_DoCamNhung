const fs=require('node:fs'),path=require('node:path'),base='Backend/src/test/java/vn/syp/tms/';
for(const [source,methods,target] of [['testcase/FeatureAiIntegrationTest.java','fr09-worker-native-methods.txt','FeatureAiIntegrationTest.java'],['ai/AiPortfolioContextTest.java','fr09-worker-unit-methods.txt','AiPortfolioContextTest.java']]){
 let text=fs.readFileSync(base+source,'utf8');const at=text.lastIndexOf('}');text=text.slice(0,at)+fs.readFileSync(path.join(__dirname,methods),'utf8')+text.slice(at);fs.writeFileSync(path.join(__dirname,target),text);
}
console.log('Prepared complete Java drafts outside Backend; no production, target or database writes.');
