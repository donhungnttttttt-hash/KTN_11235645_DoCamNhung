const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
function git(...args){const r=cp.spawnSync('rtk',['proxy','git',...args],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024,windowsHide:true});if(r.status!==0)throw Error('Git command failed: '+args.slice(0,2).join(' '));return r.stdout;}
const lists=[git('diff','--name-only','-z'),git('diff','--cached','--name-only','-z'),git('ls-files','--others','--exclude-standard','-z')];
const all=[...new Set(lists.flatMap(s=>s.split('\0').filter(Boolean)))].sort();
const files=all.filter(p=>!p.startsWith('var/'));
const rules=[['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/g],['api-key',/\bsk-(?:proj-)?[A-Za-z0-9_-]{25,}\b/g],['aws-key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],['jwt',/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],['credential-url',/https?:\/\/[^\s/@:]+:[^\s/@]+@/g]];
const findings=[],large=[],binary=[],byRoot={};
for(const file of files){byRoot[file.split('/')[0]]=(byRoot[file.split('/')[0]]||0)+1;const p=path.join(root,file);if(!fs.existsSync(p))continue;const data=fs.readFileSync(p);if(data.length>5*1024*1024)large.push({file,bytes:data.length});if(data.includes(0)){binary.push(file);continue;}const text=data.toString('utf8');for(const[kind,re]of rules){for(const m of text.matchAll(re))findings.push({file,kind,line:text.slice(0,m.index).split('\n').length});}}
const last=JSON.parse(fs.readFileSync(path.join(root,'var/uiux-admin-entry-2026-10-19/source-verified-after.json'),'utf8'));
const sourceChanged=last.files.filter(f=>!fs.existsSync(path.join(root,f.path))||crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f.path))).digest('hex')!==f.sha256).map(f=>f.path);
const forbidden=files.filter(p=>/(?:^|\/)(?:node_modules|target|dist|coverage)(?:\/|$)|(?:^|\/)\.env$|\.env\..*\.local$|\.(?:p12|pfx|jks|keystore|pem|key|log|bak|zip)$/i.test(p));
const stagedVar=git('diff','--cached','--name-only','-z').split('\0').filter(p=>p.startsWith('var/'));
const summary={files:files.length,excludedLocalVar:all.length-files.length,byRoot,findings,large,binary,forbidden,stagedVar,sourceChangedSinceVerified:sourceChanged,branch:git('branch','--show-current').trim(),aheadBehind:git('rev-list','--left-right','--count','HEAD...origin/system-design').trim()};
fs.writeFileSync(path.join(__dirname,'manifest.json'),JSON.stringify({capturedAt:new Date().toISOString(),...summary,paths:files},null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'manifest.nul'),Buffer.from(files.join('\0')+'\0'));
console.log(JSON.stringify(summary,null,2));
if(findings.length||forbidden.length||large.length||binary.length||stagedVar.length||sourceChanged.length)process.exitCode=1;
