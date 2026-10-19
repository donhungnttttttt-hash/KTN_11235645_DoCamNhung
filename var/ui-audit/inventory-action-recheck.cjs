const fs = require('node:fs'), path = require('node:path');
const parser = require('../../Frontend/node_modules/@babel/parser');
const base = path.resolve('Frontend/src'), files = [], imports = new Map(), actions = [];
function list(dir) {
  for (const item of fs.readdirSync(dir, {withFileTypes:true})) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) list(file);
    else if (/\.[jt]sx?$/.test(file) && !/\.(test|spec)\.[jt]sx?$/.test(file)) files.push(file);
  }
}
list(base);
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const tree = parser.parse(source, {sourceType:'module', plugins:['jsx','typescript']});
  const links = [];
  function walk(node, form = null) {
    if (!node || typeof node !== 'object') return;
    if (['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(node.type) && node.source?.value.startsWith('.')) {
      const p = path.resolve(path.dirname(file), node.source.value);
      const target = [p,p+'.js',p+'.jsx',path.join(p,'index.js'),path.join(p,'index.jsx')].find(p => files.includes(p));
      if (target) links.push(target);
    }
    if (node.type === 'JSXElement') {
      const tag = source.slice(node.openingElement.name.start, node.openingElement.name.end);
      const attrs = node.openingElement.attributes;
      const get = key => attrs.find(a => a.type === 'JSXAttribute' && a.name.name === key);
      const value = key => { const a = get(key); return a?.value ? source.slice(a.value.start,a.value.end) : a ? 'true' : ''; };
      if (tag === 'form') form = {line:node.loc.start.line, submit:value('onSubmit')};
      const kind = tag === 'button' ? 'native-button' : /(Button|Action)$/.test(tag) ? 'custom-action'
        : tag === 'input' && /"(submit|button|reset)"/.test(value('type')) ? 'input-action'
        : value('onClick') ? 'click-control' : tag === 'form' ? 'form' : tag === 'summary' ? 'native-disclosure' : null;
      if (kind) actions.push({file:path.relative(process.cwd(),file).replaceAll('\\','/'), line:node.loc.start.line,
        tag,kind,label:(value('aria-label') || value('label') || node.children.filter(n=>n.type==='JSXText').map(n=>n.value.trim()).filter(Boolean).join(' ')),
        type:value('type'),click:value('onClick'),change:value('onChange'),disabled:value('disabled'),
        reason:value('disabledReason') || value('aria-describedby') || value('title'),
        form,formTarget:value('form'),spread:attrs.some(a=>a.type==='JSXSpreadAttribute')});
    }
    for (const [k,v] of Object.entries(node)) {
      if (['loc','start','end','extra','tokens','comments'].includes(k)) continue;
      if (Array.isArray(v)) v.forEach(n=>walk(n,form));
      else if (v && typeof v === 'object') walk(v,form);
    }
  }
  walk(tree); imports.set(file,links);
}
const seen = new Set();
function visit(file) {if(seen.has(file))return;seen.add(file);(imports.get(file)||[]).forEach(visit);}
['main.jsx','AppEntry.jsx'].forEach(name=>visit(path.join(base,name)));
actions.forEach(a=>a.reachable=seen.has(path.resolve(a.file)));
const live = actions.filter(a=>a.reachable), counts = {};
for (const a of live) counts[a.kind]=(counts[a.kind]||0)+1;
const noPath = live.filter(a=>['native-button','custom-action','input-action'].includes(a.kind)&&!a.click&&!a.change&&!a.spread&&!a.formTarget&&!(a.form?.submit && !a.type.includes('button')));
const implicitSubmit = live.filter(a=>a.kind==='native-button'&&!a.type&&!a.spread);
const report = {sourceFiles:files.length,reachableFiles:seen.size,counts,total:live.length,noPath,implicitSubmit,actions};
fs.writeFileSync('var/ui-audit/button-action-recheck-inventory.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sourceFiles:files.length,reachableFiles:seen.size,counts,total:live.length,noPath,implicitSubmit:implicitSubmit.map(({file,line,label,form})=>({file,line,label,form}))},null,2));
