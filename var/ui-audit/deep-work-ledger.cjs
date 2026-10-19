const fs=require('fs'),crypto=require('crypto');
const path='var/ui-audit/deep-review-work-ai.json';
const old=JSON.parse(fs.readFileSync(path,'utf8'));
const files=process.argv.slice(2).flatMap(file=>fs.statSync(file).isDirectory()?fs.readdirSync(file).filter(x=>x.endsWith('.java')).map(x=>file+'/'+x):[file]);
for(const file of files) {
 const body=fs.readFileSync(file,'utf8');let record=old.files.find(x=>x.file===file);
 if(!record){record={file};old.files.push(record);}
 Object.assign(record,{lines:body.split(/\r?\n/).length,sha256:crypto.createHash('sha256').update(body).digest('hex'),status:'READ_COMPLETE',reviewedRanges:[[1,body.split(/\r?\n/).length]],reviewedAt:new Date().toISOString()});
}
fs.writeFileSync(path,JSON.stringify(old,null,2)+'\n');
console.log({readComplete:old.files.filter(x=>x.status==='READ_COMPLETE').length,total:old.files.length});
