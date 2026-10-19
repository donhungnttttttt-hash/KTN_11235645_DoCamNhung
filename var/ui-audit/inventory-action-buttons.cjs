const fs=require('node:fs'),path=require('node:path');
const parser=require('../../Frontend/node_modules/@babel/parser');
const base=path.resolve('Frontend/src');const files=[];
function list(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())list(p);else if(/\.[jt]sx?$/.test(p)&&!/(test|spec)\.[jt]sx?$/.test(p))files.push(p);}}
list(base);const report=[];const imports=new Map();
for(const file of files){const source=fs.readFileSync(file,'utf8');let tree;try{tree=parser.parse(source,{sourceType:'module',plugins:['jsx','typescript']});}catch(e){throw Error(path.relative(base,file)+': '+e.message);}
 const links=[];for(const node of tree.program.body){if(node.type==='ImportDeclaration'||node.type==='ExportNamedDeclaration'||node.type==='ExportAllDeclaration'){const s=node.source?.value;if(s?.startsWith('.')){const p=path.resolve(path.dirname(file),s);const target=[p,p+'.js',p+'.jsx',path.join(p,'index.js'),path.join(p,'index.jsx')].find(x=>files.includes(x));if(target)links.push(target);}}}imports.set(file,links);
 function walk(node,forms=0){if(!node||typeof node!=='object')return;const tag=node.type==='JSXElement'?node.openingElement.name.name:null;const formDepth=forms+(tag==='form'?1:0);
  if(tag==='button'){const attrs=node.openingElement.attributes;const find=name=>attrs.find(a=>a.type==='JSXAttribute'&&a.name.name===name);const val=a=>a?source.slice(a.start,a.end):'';const click=find('onClick');const type=find('type');const label=(node.children||[]).filter(x=>x.type==='JSXText').map(x=>x.value.trim()).filter(Boolean).join(' ');report.push({file:path.relative(process.cwd(),file).replaceAll('\\','/'),line:node.loc.start.line,label,type:val(type),click:val(click),disabled:val(find('disabled')),form:!!forms,formTarget:val(find('form')),spread:attrs.some(a=>a.type==='JSXSpreadAttribute')});}
  for(const [k,v] of Object.entries(node)){if(['loc','start','end','extra','tokens','comments'].includes(k))continue;if(Array.isArray(v))for(const x of v)walk(x,formDepth);else if(v&&typeof v==='object')walk(v,formDepth);}}
 walk(tree);
}
const seen=new Set();function visit(file){if(seen.has(file))return;seen.add(file);for(const next of imports.get(file)||[])visit(next);}
for(const name of ['main.jsx','AppEntry.jsx'])visit(path.join(base,name));
for(const button of report)button.reachable=seen.has(path.resolve(button.file));
const suspicious=report.filter(b=>b.reachable&&!b.click&&!b.spread&&!b.formTarget&&(!b.form||b.type.includes('button')));
fs.writeFileSync('var/ui-audit/action-button-inventory.json',JSON.stringify({sourceFiles:files.length,reachableSourceFiles:seen.size,totalButtons:report.length,reachableButtons:report.filter(b=>b.reachable).length,suspicious,buttons:report},null,2)+'\n');
console.log(JSON.stringify({sourceFiles:files.length,reachableSourceFiles:seen.size,totalButtons:report.length,reachableButtons:report.filter(b=>b.reachable).length,suspicious},null,2));
