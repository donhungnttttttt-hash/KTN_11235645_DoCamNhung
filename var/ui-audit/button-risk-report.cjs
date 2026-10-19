const fs=require('node:fs');const {buttons}=JSON.parse(fs.readFileSync('var/ui-audit/action-button-inventory.json','utf8'));
const risks=buttons.filter(b=>b.reachable&&((b.form&&b.click&&!b.type)||/\?\.|=>\s*\{\s*\}|=>\s*null/.test(b.click)||b.disabled==='disabled'));
console.log(JSON.stringify(risks,null,2));
