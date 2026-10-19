const fs=require('fs');
const ledger=JSON.parse(fs.readFileSync('var/ui-audit/deep-review-admin-ledger.json','utf8'));
const inventory=JSON.parse(fs.readFileSync('var/ui-audit/deep-review-inventory.json','utf8'));
console.log('Pending ledger:',ledger.files.filter(f=>!f.completeRead).map(f=>f.path));
console.log('Inventory keys:',Object.keys(inventory));
for(const key of Object.keys(inventory))if(Array.isArray(inventory[key])&&key!=='sources')console.log(key,JSON.stringify(inventory[key].slice(0,2)));
console.log('Totals:',{files:ledger.files.length,complete:ledger.files.filter(f=>f.completeRead).length,lines:ledger.files.reduce((n,f)=>n+f.lineCount,0)});
console.log('Admin owned unlisted:',inventory.sources.filter(s=>s.owner==='admin'&&!ledger.files.some(f=>f.path===s.file)).map(s=>s.file));
