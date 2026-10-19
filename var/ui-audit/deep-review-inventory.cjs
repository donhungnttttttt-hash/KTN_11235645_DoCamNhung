const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const parser=require('../../Frontend/node_modules/@babel/parser');
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else files.push(p.replaceAll('\\','/'));}}
walk('Frontend/src');walk('Backend/src');
const production=files.filter(p=>p.startsWith('Frontend/src')?!/\.(test|spec)\.[jt]sx?$/.test(p)&&!p.includes('/test/')&&/\.(jsx?|css)$/.test(p):p.includes('/main/')&&/\.(java|sql|ya?ml|properties)$/.test(p));
function owner(p){
 if(/Frontend\/src\/app\/features\/(admin|projects)\//.test(p)||/Backend\/src\/main\/java\/vn\/syp\/tms\/(admin|project|identity|device|handbook|rules)\//.test(p))return 'admin';
 if(/Frontend\/src\/app\/features\/(test-cases|test-execution|file-work|retest)\//.test(p)||/Backend\/src\/main\/java\/vn\/syp\/tms\/(testcase|execution|filework|retest)\//.test(p))return 'testing';
 if(/Frontend\/src\/app\/features\/(work-items|qa|reports|ai|integrations|auth)\//.test(p)||/Backend\/src\/main\/java\/vn\/syp\/tms\/(workitem|qa|reporting|ai|integration|attachment)\//.test(p))return 'work-ai';
 return 'root';
}
const ledger=production.map(file=>{const source=fs.readFileSync(file,'utf8');return {file,lines:source.split('\n').length,sha256:crypto.createHash('sha256').update(source).digest('hex'),owner:owner(file),reviewStatus:'PENDING'};});
const actions=[];
for(const entry of ledger.filter(x=>x.file.endsWith('.jsx')||x.file.endsWith('.js'))){
 const source=fs.readFileSync(entry.file,'utf8');const ast=parser.parse(source,{sourceType:'module',plugins:['jsx']});
 function visit(n,form=null){if(!n||typeof n!=='object')return;
  if(n.type==='JSXElement'){
   const op=n.openingElement,tag=source.slice(op.name.start,op.name.end),attrs=op.attributes.filter(a=>a.type==='JSXAttribute');
   const get=k=>{const a=attrs.find(a=>a.name.name===k);return a?.value?source.slice(a.value.start,a.value.end):a?'true':null;};
   if(tag==='form')form={line:n.loc.start.line,onSubmit:get('onSubmit')};
   const handlers=Object.fromEntries(attrs.filter(a=>/^on[A-Z]/.test(a.name.name)).map(a=>[a.name.name,get(a.name.name)]));
   if(['button','input','select','textarea','form','summary','a'].includes(tag)||Object.keys(handlers).length||/(Button|Action)$/.test(tag))
    actions.push({id:entry.file+':'+n.loc.start.line,file:entry.file,line:n.loc.start.line,owner:entry.owner,tag,label:get('aria-label')||get('label')||n.children.filter(x=>x.type==='JSXText').map(x=>x.value.trim()).filter(Boolean).join(' '),handlers,disabled:get('disabled'),reason:get('disabledReason')||get('aria-describedby')||get('title'),type:get('type'),href:get('href'),form,spread:op.attributes.some(a=>a.type==='JSXSpreadAttribute'),verification:'PENDING'});
  }
  for(const [k,v]of Object.entries(n)){if(['loc','extra','tokens','comments'].includes(k))continue;if(Array.isArray(v))v.forEach(x=>visit(x,form));else if(v&&typeof v==='object')visit(v,form);}
 }visit(ast);
}
const result={createdAt:new Date().toISOString(),scope:'All production FE JS/JSX/CSS and BE Java/SQL/config; generated/dependency/build files excluded; declarations are not unique runtime controls or proof of behavior.',sources:ledger,actions};
fs.writeFileSync('var/ui-audit/deep-review-inventory.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({files:ledger.length,lines:ledger.reduce((s,x)=>s+x.lines,0),declarations:actions.length,byOwner:Object.fromEntries(['root','admin','testing','work-ai'].map(o=>[o,{files:ledger.filter(x=>x.owner===o).length,lines:ledger.filter(x=>x.owner===o).reduce((s,x)=>s+x.lines,0),actions:actions.filter(x=>x.owner===o).length}]))},null,2));
