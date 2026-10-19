const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const tests=fs.readFileSync('var/ui-audit/unit-test-list.txt','utf8').trim();
if(!/^[A-Za-z0-9_,]+$/.test(tests))throw Error('Unexpected unit-test selection');
const fd=fs.openSync('var/ui-audit/deep-review-unit-final.log','w');
const result=spawnSync('rtk',['proxy','cmd.exe','/d','/c','mvnw.cmd','-B','-ntp','-Dtest='+tests,'verify'],{cwd:'Backend',stdio:['ignore',fd,fd]});
fs.closeSync(fd);console.log('Backend unit verification exit '+result.status);process.exitCode=result.status??1;
