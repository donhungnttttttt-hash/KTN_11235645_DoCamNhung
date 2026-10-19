const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'Backend/src/main/resources/db/migration');
const tables=[];
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.sql'))){
 const source=fs.readFileSync(path.join(dir,file),'utf8');
 for(const match of source.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/gi))tables.push({table:match[1],file:'Backend/src/main/resources/db/migration/'+file,line:source.slice(0,match.index).split('\n').length});
}
const result={method:'Static CREATE TABLE scan of current migration files, not current live database introspection',tableCount:tables.length,tables:tables.sort((a,b)=>a.table.localeCompare(b.table))};
fs.writeFileSync(path.join(__dirname,'source-schema.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
