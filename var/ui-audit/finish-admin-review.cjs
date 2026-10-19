const fs=require('node:fs');
const before=JSON.parse(fs.readFileSync('var/ui-audit/admin-database-before.json','utf8'));
const after=JSON.parse(fs.readFileSync('var/demo/database-audit.json','utf8'));
const changed=after.tables.filter(t=>before.tables.find(b=>b.name===t.name)?.count!==t.count)
 .map(t=>({table:t.name,before:before.tables.find(b=>b.name===t.name)?.count,after:t.count}));
console.log(JSON.stringify({tableCount:after.tableCount,foreignKeys:after.foreignKeysChecked,changedCounts:changed,failures:after.failures},null,2));
fs.writeFileSync('var/ui-audit/admin-database-after.json',JSON.stringify({...after,changedCounts:changed},null,2)+'\n');
