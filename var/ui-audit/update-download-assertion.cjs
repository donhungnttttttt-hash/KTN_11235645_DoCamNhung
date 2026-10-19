const fs=require('node:fs');
const file='Frontend/src/app/features/file-work/file-work.test.jsx';
const source=fs.readFileSync(file,'utf8');
if(!source.includes("{responseType:'response'}"))throw Error('Expected assertion missing');
fs.writeFileSync(file,source.replace("{responseType:'response'}","{responseType:'download'}"));
