const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const paths=[...new Set(execFileSync('rtk',['proxy','git','ls-files','-co','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean))];
const files=paths.filter(p=>fs.existsSync(path.join(root,p))&&fs.statSync(path.join(root,p)).isFile());
const value={capturedAt:new Date().toISOString(),branch:execFileSync('rtk',['proxy','git','branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),files:files.map(p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')}))};
fs.writeFileSync(path.join(__dirname,'baseline.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({branch:value.branch,files:value.files.length}));
