const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../..');
const localRequire=createRequire(path.join(root,'Frontend/package.json'));
const parser=localRequire('@babel/parser'),postcss=localRequire('postcss');
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else files.push(p);}}
walk(path.join(root,'Frontend/src'));
const controls=[],css=[],errors=[];
for(const file of files){
 const relative=path.relative(root,file).replaceAll('\\','/');
 if(/\.(test|spec)\.[^.]+$|\/test\/|\/mocks\//.test(relative))continue;
 const source=fs.readFileSync(file,'utf8');
 if(/\.[jt]sx?$/.test(file)){
  let ast;try{ast=parser.parse(source,{sourceType:'module',plugins:['jsx']});}catch(error){errors.push({file:relative,error:error.message});continue;}
  function visit(node,parents=[]){
   if(!node||typeof node!=='object')return;
   if(node.type==='JSXOpeningElement'){
    const tag=node.name.type==='JSXIdentifier'?node.name.name:source.slice(node.name.start,node.name.end);
    if(/^(button|a|input|select|textarea|summary|dialog)$/.test(tag)||/(?:Button|Dialog|Modal|TableScroll)$/.test(tag)){
     const attrs={};for(const attr of node.attributes){if(attr.type==='JSXAttribute'){const key=attr.name.name;attrs[key]=attr.value?source.slice(attr.value.start,attr.value.end).slice(0,220):true;}}
     const conditions=parents.filter(p=>['ConditionalExpression','LogicalExpression'].includes(p.type)).map(p=>source.slice(p.start,Math.min(p.end,p.start+180)));
     controls.push({file:relative,line:node.loc.start.line,tag,attributes:attrs,conditions:conditions.slice(-3),runtimeReachability:'NOT_INFERRED_FROM_AST'});
    }
   }
   for(const [key,value]of Object.entries(node)){if(['loc','start','end','extra','comments','tokens'].includes(key))continue;if(Array.isArray(value))for(const child of value)visit(child,[...parents,node]);else if(value&&typeof value==='object')visit(value,[...parents,node]);}
  }
  visit(ast);
 }else if(file.endsWith('.css')){
  try{const tree=postcss.parse(source);let declarations=0,important=0;const transitions=[],animations=[],radii=[];
   tree.walkDecls(decl=>{declarations++;if(decl.important)important++;const entry={line:decl.source.start.line,selector:decl.parent.selector||decl.parent.name,value:decl.value};if(decl.prop==='transition'&&/\ball\b/.test(decl.value))transitions.push(entry);if(decl.prop.startsWith('animation'))animations.push(entry);if(decl.prop==='border-radius')radii.push(entry);});
   css.push({file:relative,declarations,important,transitionAll:transitions,animations,radii});
  }catch(error){errors.push({file:relative,error:error.message});}
 }
}
const result={at:new Date().toISOString(),purpose:'Source inventory of controls and styling, including conditional/prototype code; not proof of runtime reachability or successful clicks.',controls,stylesheets:css,errors};
fs.writeFileSync(path.join(__dirname,'source-surfaces.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({controls:controls.length,controlFiles:new Set(controls.map(x=>x.file)).size,stylesheets:css.length,transitionAll:css.reduce((n,x)=>n+x.transitionAll.length,0),errors}));
