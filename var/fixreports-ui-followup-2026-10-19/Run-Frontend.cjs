const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),cwd=path.join(root,'Frontend');
const prefix=process.argv.includes('--final')?'frontend-final':'frontend';
const allowed=/^(?:PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMDATA|JAVA_HOME|PROCESSOR_ARCHITECTURE|OS)$/i;
const environment=Object.fromEntries(Object.entries(process.env).filter(([key])=>allowed.test(key)));
for(const [name,args]of [['coverage',['run','test:coverage','--','--maxWorkers=2']],['build',['run','build']]]){
 const file=path.join(__dirname,prefix+'-'+name+'.log'),log=fs.openSync(file,'wx');let result;
 try{result=spawnSync('rtk',['proxy','cmd.exe','/d','/c','npm.cmd',...args],{cwd,env:environment,stdio:['ignore',log,log],shell:false,windowsHide:true});}finally{fs.closeSync(log);}
 if(result.error||result.status!==0){console.log(JSON.stringify({step:name,status:'FAIL',log:file}));process.exitCode=1;break;}
 if(name==='coverage')fs.copyFileSync(path.join(cwd,'coverage/coverage-summary.json'),path.join(__dirname,prefix+'-coverage-summary.json'));
 console.log(JSON.stringify({step:name,status:'PASS',tail:fs.readFileSync(file,'utf8').split('\n').slice(-7).join('\n')}));
}
