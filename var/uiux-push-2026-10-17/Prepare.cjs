// Prepare only an explicit commit manifest; never stages files or accesses credentials.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const git=(...args)=>cp.execFileSync('rtk',['proxy','git',...args],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
const tracked=git('diff','--name-only','-z').split('\0').filter(Boolean);
const tests=['Frontend/src/app/components/selection-ux.test.jsx','Frontend/src/app/features/admin/admin-member-feedback.test.jsx','Frontend/src/app/features/test-cases/document-conflicts.test.jsx','Frontend/src/app/features/test-execution/read-state.test.jsx'];
const docs=['docs/reviews/2026-10-16-workflow-audit.md','docs/reviews/2026-10-17-uiux-refinement.md'];
function walk(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(dir+'/'+item.name):[dir+'/'+item.name]);}
const evidence=walk('var/review-2026-10-16').concat(walk('var/uiux-2026-10-17'));
const files=[...new Set([...tracked,...tests,...docs,...evidence])];
const findings=[];
const rules=[['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/],['api-key',/\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/],['aws-key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],['jwt',/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],['credential-url',/https?:\/\/[^\s/@:]+:[^\s/@]+@/]];
for(const file of files){if(/\.(jpg|png)$/i.test(file))continue;const source=fs.readFileSync(path.join(root,file),'utf8');for(const [name,re]of rules)if(re.test(source))findings.push({file,kind:name});}
if(findings.length){console.log(JSON.stringify({findings},null,2));process.exit(1);}
fs.writeFileSync(path.join(__dirname,'manifest.json'),JSON.stringify(files,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'manifest.nul'),Buffer.from(files.join('\0')+'\0'));
console.log(JSON.stringify({tracked:tracked.length,newTestFiles:tests.length,reports:docs.length,evidenceFiles:evidence.length,total:files.length,totalBytes:files.reduce((n,f)=>n+fs.statSync(path.join(root,f)).size,0),sensitivePatternsFound:0},null,2));
