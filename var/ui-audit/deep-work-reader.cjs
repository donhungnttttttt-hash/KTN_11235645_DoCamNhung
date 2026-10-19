const fs=require('fs');
if(process.argv[2]==='inventory') {
 const j=JSON.parse(fs.readFileSync('var/ui-audit/deep-review-inventory.json','utf8'));
 console.log(j.sources.filter(x=>x.owner==='work-ai').map(x=>`${x.lines} ${x.file}`).join('\n'));
} else {
 const [file,start='1',end='99999']=process.argv.slice(2);
 const lines=fs.readFileSync(file,'utf8').split(/\r?\n/);
 console.log(lines.slice(Number(start)-1,Number(end)).map((x,i)=>`${Number(start)+i}: ${x}`).join('\n'));
}
