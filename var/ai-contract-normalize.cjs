const fs=require('node:fs'),assert=require('node:assert/strict');
const path='docs/api/ai-assistance.openapi.json',doc=JSON.parse(fs.readFileSync(path,'utf8'));
doc.components.schemas.Error={type:'object',required:['code','message'],properties:{code:{type:'string'},message:{type:'string'}}};
doc.components.responses={};
const descriptions={400:'Malformed request',401:'Unauthenticated or stale session',403:'Forbidden task or CSRF',404:'Project, draft or source not accessible',409:'Archived project, conflicting request or version',410:'Expired request',422:'Invalid input',429:'Project daily quota exceeded',503:'AI disabled',500:'Unexpected server failure; no saved-success claim'};
const operations=[];
for(const [url,pathItem] of Object.entries(doc.paths))for(const [method,op] of Object.entries(pathItem)){
 if(!['get','post','put'].includes(method))continue;
 operations.push(op.operationId);
 for(const code of Object.keys(descriptions)){
  doc.components.responses['Error'+code]={description:descriptions[code],content:{'application/json':{schema:{$ref:'#/components/schemas/Error'}}}};
  op.responses[code]={$ref:'#/components/responses/Error'+code};
 }
 if(['post','put'].includes(method))op.parameters=[...(op.parameters||[]).filter(p=>p.in!=='header'),{in:'header',name:'X-CSRF-TOKEN',required:true,schema:{type:'string'},description:'Use headerName and token returned by GET /api/v1/auth/csrf with the same session.'}];
 assert.equal(op.responses['200'].description,'Success');
}
assert.equal(operations.length,6);assert.equal(new Set(operations).size,6);
function refs(x){if(!x||typeof x!=='object')return;for(const[k,v]of Object.entries(x)){if(k==='$ref'){assert.ok(v.startsWith('#/'));assert.ok(v.slice(2).split('/').reduce((a,b)=>a?.[b],doc),v);}else refs(v);}}
refs(doc);fs.writeFileSync(path,JSON.stringify(doc,null,2)+'\n');
console.log('PASS: 5 AI paths, 6 unique operations and local refs resolve. Structural check only; HTTP behavior tested separately.');
