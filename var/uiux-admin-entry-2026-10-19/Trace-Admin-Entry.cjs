const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const parser=require(path.join(root,'Frontend/node_modules/@babel/parser'));
const postcss=require(path.join(root,'Frontend/node_modules/postcss'));
const {JSDOM}=require(path.join(root,'Frontend/node_modules/jsdom'));
const relative=p=>path.relative(root,p).replaceAll('\\','/');
const modules=new Set(),styles=new Set(),edges=[];
function resolve(from,spec){
 const p=path.resolve(path.dirname(from),spec);
 return [p,...['.js','.jsx','.mjs','.css','.json'].map(ext=>p+ext),...['index.js','index.jsx'].map(name=>path.join(p,name))].find(candidate=>fs.existsSync(candidate)&&fs.statSync(candidate).isFile());
}
function visit(file){
 if(modules.has(file))return;modules.add(file);
 if(file.endsWith('.css')){styles.add(file);return;}
 if(!/\.[cm]?jsx?$/.test(file))return;
 const ast=parser.parse(fs.readFileSync(file,'utf8'),{sourceType:'module',plugins:['jsx']});
 for(const node of ast.program.body){
  if(!['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(node.type)||!node.source?.value?.startsWith('.'))continue;
  const target=resolve(file,node.source.value);if(!target)continue;
  edges.push({from:relative(file),to:relative(target)});visit(target);
 }
}
visit(path.join(root,'Frontend/src/main.jsx'));
const dom=new JSDOM('<!doctype html><html><body><div class="admin-shell"><header class="admin-header"></header><aside class="admin-sidebar"><nav aria-label="Quản trị"><a href="#/admin" aria-current="page"><svg></svg><span>Tổng quan</span></a></nav><div class="admin-sidebar-bottom"><strong>S+TMS</strong><small>Quản trị tập trung</small></div></aside><main class="admin-main"></main></div></body></html>');
const areas={shell:'.admin-shell',sidebar:'.admin-sidebar',nav:'.admin-sidebar nav',activeLink:'.admin-sidebar nav a',label:'.admin-sidebar nav span',icon:'.admin-sidebar svg',footer:'.admin-sidebar-bottom',main:'.admin-main'};
const matches=[];
for(const file of styles){
 const ast=postcss.parse(fs.readFileSync(file,'utf8'),{from:file});
 ast.walkRules(rule=>{
  let parent=rule.parent;const conditions=[];
  while(parent){if(parent.type==='atrule')conditions.unshift(`@${parent.name} ${parent.params}`);parent=parent.parent;}
  if(conditions.some(value=>value.startsWith('@keyframes')))return;
  // This inventory records potential interaction selectors; it does not compute
  // a rendered cascade, media-query result, dimensions or pseudo-class state.
  const selector=rule.selector.replace(/:(?:hover|active|focus-visible|focus)\b/g,'');
  const applicable=Object.entries(areas).filter(([,area])=>{try{return dom.window.document.querySelector(area).matches(selector);}catch{return false;}}).map(([name])=>name);
  if(!applicable.length)return;
  matches.push({file:relative(file),line:rule.source.start.line,selector:rule.selector,conditions,areas:applicable,declarations:rule.nodes.filter(node=>node.type==='decl').map(node=>({property:node.prop,value:node.value,important:!!node.important}))});
 });
}
const sources=['Frontend/src/AppEntry.jsx','Frontend/src/app/features/admin/AdminApp.jsx','Frontend/src/app/features/admin/AdminLayout.jsx','Frontend/src/app/features/admin/admin.css','Frontend/src/app/components/Sidebar.jsx','Frontend/src/app/layouts/MainLayout.jsx','Frontend/src/app/styles/app-shell.css','Frontend/src/app/styles/global.css'];
const value={capturedAt:new Date().toISOString(),mode:'SOURCE_ONLY_NO_BROWSER_NO_REQUESTS',limitations:['Static relative imports only; no runtime module execution.','Source CSS only; generated Tailwind reset/utilities are not expanded.','Selector matches are structural potential matches, not computed styles or viewport assertions.'],moduleCount:modules.size,styles:[...styles].map(relative),edges,adminMatchingRules:matches,sidebarRuleSources:[...new Set(matches.filter(item=>item.areas.some(area=>['sidebar','nav','activeLink','label','icon','footer'].includes(area))).map(item=>item.file))],sourceHashes:sources.map(p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')}))};
fs.writeFileSync(path.join(__dirname,path.basename(process.argv[2]||'admin-entry-source.json')),JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({mode:value.mode,modules:modules.size,styleCount:styles.size,matchingRules:matches.length,sidebarRuleSources:value.sidebarRuleSources}));
