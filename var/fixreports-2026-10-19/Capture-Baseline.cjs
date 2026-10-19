const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
function git(args){const result=cp.spawnSync('rtk',['proxy','git',...args],{cwd:root,encoding:'utf8',shell:false,maxBuffer:32*1024*1024});if(result.status!==0)throw new Error('Git read failed');return result.stdout;}
const branch=git(['branch','--show-current']).trim();
if(branch!=='system-design')throw new Error('Unexpected branch; do not switch automatically');
const status=git(['status','--porcelain=v1','-z','--untracked-files=all']);
const records=status.split('\0').filter(Boolean);
const files=[];
for(let i=0;i<records.length;i++){
 const entry=records[i],code=entry.slice(0,2),file=entry.slice(3);
 if(code.includes('R')||code.includes('C'))i++;
 if(file.startsWith('var/')||!fs.existsSync(path.join(root,file)))continue;
 const data=fs.readFileSync(path.join(root,file));
 files.push({path:file,status:code,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});
}
const state=JSON.parse(fs.readFileSync(path.join(root,'docs/planning/STATUS.json'),'utf8'));
const result={capturedAt:new Date().toISOString(),branch,head:git(['rev-parse','HEAD']).trim(),phase:state.phase,activeSprint:state.activeSprint,files,excluded:'Historical/current var artifacts and gitignored local secrets/databases; no files removed'};
fs.writeFileSync(path.join(__dirname,'baseline.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'baseline.patch'),git(['diff','--binary']));
console.log(JSON.stringify({branch,head:result.head,files:files.length,phase:state.phase,activeSprint:state.activeSprint}));
