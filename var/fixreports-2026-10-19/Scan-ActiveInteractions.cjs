// Source-only inventory. Does not start services, browse, call HTTP, or change product files.
const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const root=path.resolve(__dirname,'../..'),frontend=path.join(root,'Frontend');
const requireFrontend=createRequire(path.join(frontend,'package.json'));
const {parse}=requireFrontend('@babel/parser');
const entries=['src/main.jsx','src/app/features/admin/AdminApp.jsx'];
const seen=new Set(),queue=entries.map(p=>path.join(frontend,p)),controls=[],candidates=[];
function resolveImport(from,request){if(!request.startsWith('.'))return null;const base=path.resolve(path.dirname(from),request);return [base,base+'.jsx',base+'.js',path.join(base,'index.jsx'),path.join(base,'index.js')].find(p=>/\.(jsx|js)$/.test(p)&&fs.existsSync(p));}
function attribute(node,name){return node.openingElement.attributes.find(a=>a.type==='JSXAttribute'&&a.name.name===name);}
function literal(attr){return attr?.value?.type==='StringLiteral'?attr.value.value:null;}
while(queue.length){const file=queue.shift();if(seen.has(file)||!fs.existsSync(file))continue;seen.add(file);const source=fs.readFileSync(file,'utf8');let ast;
 try{ast=parse(source,{sourceType:'module',plugins:['jsx']});}catch(error){candidates.push({file:path.relative(root,file),reason:'parse-error',message:error.message});continue;}
 for(const item of ast.program.body){if(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(item.type)&&item.source){const next=resolveImport(file,item.source.value);if(next)queue.push(next);}}
 function walk(node,ancestors=[]){if(!node||typeof node!=='object')return;
  if(node.type==='JSXElement'&&node.openingElement.name.type==='JSXIdentifier'){
   const tag=node.openingElement.name.name;
   if(tag==='button'||tag==='a'){
    const click=attribute(node,'onClick'),submit=ancestors.some(a=>a.type==='JSXElement'&&a.openingElement.name.name==='form')&&literal(attribute(node,'type'))!=='button';
    const text=source.slice(node.start,node.end).replace(/\s+/g,' ').slice(0,420);
    const record={file:path.relative(root,file).replaceAll('\\','/'),line:node.loc.start.line,tag,type:literal(attribute(node,'type')),click:Boolean(click),doubleClick:Boolean(attribute(node,'onDoubleClick')),keyboard:Boolean(attribute(node,'onKeyDown')),submit,disabled:Boolean(attribute(node,'disabled')),text};
    controls.push(record);let reason;
    if(tag==='button'&&!click&&!submit)reason=record.doubleClick?'double-click-only-button':'button-without-click-or-form-submit';
    if(tag==='a'&&['','#','javascript:void(0)'].includes(literal(attribute(node,'href')))&&!click)reason='placeholder-link';
    if(click?.value?.expression?.type==='ArrowFunctionExpression'&&click.value.expression.body.type==='BlockStatement'&&!click.value.expression.body.body.length)reason='empty-click-handler';
    if(reason)candidates.push({...record,reason});
   }
  }
  for(const [key,value]of Object.entries(node)){if(['loc','start','end','extra'].includes(key))continue;if(Array.isArray(value))value.forEach(child=>walk(child,[...ancestors,node]));else if(value&&typeof value==='object')walk(value,[...ancestors,node]);}
 }
 walk(ast);
}
const result={mode:'SOURCE_ONLY_NOT_BROWSER',entries,files:seen.size,controls:controls.length,candidateCount:candidates.length,candidates,inventory:controls};
fs.writeFileSync(path.join(__dirname,'active-interactions-source.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({mode:result.mode,files:result.files,controls:result.controls,candidateCount:result.candidateCount,candidates},null,2));
