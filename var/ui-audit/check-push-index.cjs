const {execFileSync}=require('node:child_process');
const git=args=>execFileSync('git',args,{maxBuffer:30*1024*1024});
const files=git(['diff','--cached','--name-only','-z']).toString().split('\0').filter(Boolean);
const findings=[];let bytes=0;
for(const f of files){if(/(^|\/)(\.env(?:\.|$)|target\/|node_modules\/|coverage\/)|\.(?:p12|pfx|key|sql\.gz)$/.test(f))findings.push({file:f,reason:'local/credential path'});const b=git(['show',':'+f]);bytes+=b.length;if(b.includes(0))continue;const s=b.toString();for(const [reason,re]of [['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['provider token',/\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{35,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{35,})\b/]])if(re.test(s))findings.push({file:f,reason});}
console.log(JSON.stringify({stagedFiles:files.length,totalBytes:bytes,findings},null,2));if(findings.length)process.exitCode=1;
