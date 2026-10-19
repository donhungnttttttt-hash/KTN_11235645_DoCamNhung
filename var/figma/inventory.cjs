const fs=require('node:fs'),path=require('node:path');
const parser=require('../../Frontend/node_modules/@babel/parser');
const base='Frontend/src',files=[];function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.jsx$/.test(p)&&!p.includes('.test.'))files.push(p.replaceAll('\\','/'));}}walk(base);
const dialogs=[];
for(const file of files){const source=fs.readFileSync(file,'utf8'),ast=parser.parse(source,{sourceType:'module',plugins:['jsx']});
function visit(n){if(!n||typeof n!=='object')return;if(n.type==='JSXOpeningElement'){const tag=source.slice(n.name.start,n.name.end);const attrs=Object.fromEntries(n.attributes.filter(a=>a.type==='JSXAttribute').map(a=>[a.name.name,a.value?source.slice(a.value.start,a.value.end):'true']));if(/Dialog|Modal/.test(tag)||/dialog/.test(attrs.role||''))dialogs.push({file,line:n.loc.start.line,tag,title:attrs.title||attrs['aria-label']||attrs['aria-labelledby']||'',role:attrs.role||''});}for(const [k,v]of Object.entries(n)){if(['loc','comments','extra'].includes(k))continue;if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}}visit(ast);}
fs.writeFileSync('var/figma/dialog-declarations.json',JSON.stringify(dialogs,null,2));console.log(JSON.stringify(dialogs,null,2));
