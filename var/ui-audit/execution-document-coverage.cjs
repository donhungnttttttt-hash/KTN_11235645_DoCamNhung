const fs=require('node:fs');
const xml=fs.readFileSync('Backend/target/site/jacoco/jacoco.xml','utf8');
const body=xml.match(/<class name="vn\/syp\/tms\/execution\/ExecutionService"[^>]*>([\s\S]*?)<\/class>/)?.[1];
if(!body)throw Error('Missing ExecutionService coverage');
const method=body.match(/<method name="updateDocumentResults"[^>]*>([\s\S]*?)<\/method>/)?.[1];
if(!method)throw Error('Missing projection method coverage');
function counters(text){return Object.fromEntries([...text.matchAll(/<counter type="([^"]+)" missed="(\d+)" covered="(\d+)"\/>/g)].map(m=>[m[1],{missed:Number(m[2]),covered:Number(m[3])}]));}
const data={scope:'Final focused native + execution/document unit run, not whole backend coverage',projectionMethod:counters(method),executionService:counters(body.replace(/<method[\s\S]*?<\/method>/g,''))};
fs.writeFileSync('var/ui-audit/execution-document-coverage.json',JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(data));
