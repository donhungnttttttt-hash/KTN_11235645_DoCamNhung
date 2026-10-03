const fs=require('node:fs'),path=require('node:path');
const groupDefinitions=require('./database/diagram-groups.cjs');
const dir=path.resolve(__dirname,'../docs/database/erd');
const model=JSON.parse(fs.readFileSync(path.join(dir,'schema.json'),'utf8'));
// Windows MySQL may store table names in lower case (including Spring Session).
const groups=groupDefinitions.map(g=>({...g,tables:g.tables.map(name=>model.tables.find(t=>t.name.toLowerCase()===name.toLowerCase())?.name||name)}));
const names=groups.flatMap(g=>g.tables);
if(new Set(names).size!==model.tables.length||model.tables.some(t=>!names.includes(t.name)))throw Error('Diagram inventory differs from live schema');
const edges=new Map();
for(const fk of model.foreignKeys){const key=fk.table+'.'+fk.name;if(!edges.has(key))edges.set(key,{...fk,columns:[]});edges.get(key).columns.push(fk);}
const keys=new Map(model.tables.map(t=>[t.name,model.columns.filter(c=>c.table===t.name&&(c.key==='PRI'||model.foreignKeys.some(f=>f.table===t.name&&f.column===c.name)))]));
// Mermaid: cardinality follows FK nullability and uniqueness, rather than guessing 1:N.
const mermaid=['erDiagram'];
for(const name of names){mermaid.push('  '+name+' {');for(const c of keys.get(name))mermaid.push('    '+c.type.replace(/[^A-Za-z0-9_]/g,'_')+' '+c.name+' '+(c.key==='PRI'?'PK':'FK'));mermaid.push('  }');}
for(const e of edges.values()){
 const cols=e.columns.map(c=>c.column);
 const required=cols.every(c=>model.columns.find(x=>x.table===e.table&&x.name===c).nullable==='NO');
 const indexGroups=new Map();for(const i of model.indexes.filter(i=>i.table===e.table&&i.unique)){if(!indexGroups.has(i.name))indexGroups.set(i.name,[]);indexGroups.get(i.name).push(i.column);}
 const unique=[...indexGroups.values()].some(index=>index.every(c=>cols.includes(c)));
 mermaid.push(`  ${e.parent} ${required?'||':'|o'}--${unique?'o|':'o{'} ${e.table} : "${e.name}"`);
}
fs.writeFileSync(path.join(dir,'full-schema.mmd'),mermaid.join('\n')+'\n');
const payload=JSON.stringify({...model,groups,edges:[...edges.values()]}).replace(/</g,'\\u003c');
const template=fs.readFileSync(path.join(__dirname,'database/diagram-template.html'),'utf8');
fs.writeFileSync(path.join(dir,'index.html'),template.replace('/*SCHEMA_DATA*/',payload));
console.log(`Rendered ${names.length} tables / ${edges.size} FK constraints. Offline HTML + complete Mermaid.`);
