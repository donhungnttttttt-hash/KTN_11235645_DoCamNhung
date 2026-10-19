const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),cwd=path.join(root,'Frontend');
function run(args,name){const log=fs.openSync(path.join(__dirname,name),'w');let result;try{result=spawnSync('rtk',['proxy','cmd.exe','/d','/c','npm.cmd',...args],{cwd,stdio:['ignore',log,log],shell:false,windowsHide:true});}finally{fs.closeSync(log);}if(result.error)throw Error('Frontend command unavailable');return result.status??1;}
try{
 const tests=run(['run','test:coverage','--','--maxWorkers=2'],'frontend-final-coverage.log');
 if(tests!==0){console.log('Frontend full coverage/test run failed; inspect frontend-final-coverage.log.');process.exitCode=tests;}
 else{
  fs.copyFileSync(path.join(cwd,'coverage','coverage-summary.json'),path.join(__dirname,'frontend-final-coverage-summary.json'));
  const build=run(['run','build'],'frontend-final-build.log');process.exitCode=build;console.log(JSON.stringify({fullCoverageTests:'PASS',build:build===0?'PASS':'FAIL',artifacts:'var/fixreports-2026-10-19/frontend-final-*'}));
 }
}catch(error){console.error(error.message);process.exitCode=1;}
