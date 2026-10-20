const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),testsRoot=path.join(root,'Backend/src/test/java');
const suffix=['final','complete'].includes(process.argv[2])?'-'+process.argv[2]:'';
const selected=[],excluded=[];
for(const relative of fs.readdirSync(testsRoot,{recursive:true}).filter(f=>f.endsWith('Test.java'))){
  const source=fs.readFileSync(path.join(testsRoot,relative),'utf8');
  const name=path.basename(relative,'.java');
  if(/@Testcontainers|@SpringBootTest|@EnabledIfEnvironmentVariable|extends FeatureIntegrationTest|DriverManager\.getConnection/.test(source))excluded.push(name);else selected.push(name);
}
selected.sort();excluded.sort();
fs.writeFileSync(path.join(__dirname,'offline-selection.json'),JSON.stringify({selected,excluded},null,2));
const allowed=/^(?:PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMDATA|JAVA_HOME|PROCESSOR_ARCHITECTURE|OS)$/i;
const env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>allowed.test(key))),DEBUG:'false',TRACE:'false',SPRING_CONFIG_LOCATION:'classpath:/application.yml'};
const log=fs.openSync(path.join(__dirname,`backend-offline${suffix}.log`),'wx'),startedAt=new Date().toISOString();let result;
try{result=spawnSync('rtk',['proxy','cmd.exe','/d','/c','mvnw.cmd','-B','-ntp','-Dtest='+selected.join(','),'verify'],{cwd:path.join(root,'Backend'),env,shell:false,windowsHide:true,stdio:['ignore',log,log]});}finally{fs.closeSync(log);}
if(result.error)throw Error('Maven launch failed');
const receipt={startedAt,completedAt:new Date().toISOString(),exitCode:result.status,selected,excluded};
fs.writeFileSync(path.join(__dirname,`backend-offline${suffix}.json`),JSON.stringify(receipt,null,2));
console.log(JSON.stringify({startedAt,completedAt:receipt.completedAt,exitCode:result.status,selectedCount:selected.length,excludedCount:excluded.length}));
process.exitCode=result.status??1;
