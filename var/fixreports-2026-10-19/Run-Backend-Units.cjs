// Broad unit/security/controller regression only. Native/container/live classes are explicitly inventoried separately.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),testRoot=path.join(root,'Backend/src/test/java');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
const selected=[],excluded=[];
const sources=files(testRoot).filter(file=>file.endsWith('.java')).map(file=>({file,content:fs.readFileSync(file,'utf8'),name:path.basename(file,'.java')}));
const byName=new Map(sources.map(source=>[source.name,source]));
function isolationReason(source,seen=new Set()){
 if(!source||seen.has(source.name))return null;seen.add(source.name);
 if(/@SpringBootTest|@Testcontainers|@Container|@EnabledIfEnvironmentVariable|DriverManager|Flyway\.configure/.test(source.content))return 'Native/container/live or explicitly environment-gated in '+source.name+'; run separately';
 const parent=/\bclass\s+\w+\s+extends\s+([\w.]+)/.exec(source.content)?.[1]?.split('.').at(-1);
 return parent?isolationReason(byName.get(parent),seen):null;
}
for(const source of sources.filter(source=>source.file.endsWith('Test.java'))){
 const {name}=source,reason=isolationReason(source);
 if(reason)excluded.push({name,reason});else selected.push(name);
}
const manifest={createdAt:new Date().toISOString(),selected:selected.sort(),excluded:excluded.sort((a,b)=>a.name.localeCompare(b.name)),scope:'All test classes without native/container/live/environment-gated source markers; no main database credential supplied'};
fs.writeFileSync(path.join(__dirname,'backend-unit-selection.json'),JSON.stringify(manifest,null,2)+'\n');
if(!selected.length)throw Error('Refuse empty unit selector');
const allowed=/^(?:PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMDATA|JAVA_HOME|PROCESSOR_ARCHITECTURE|OS)$/i;
const environment={...Object.fromEntries(Object.entries(process.env).filter(([key])=>allowed.test(key))),DEBUG:'false',TRACE:'false',TMS_OPENAI_ENABLED:'false',TMS_CHATGPT_LOCAL_ENABLED:'false',TMS_OLLAMA_ENABLED:'false',TMS_REDMINE_ENABLED:'false',TMS_BOOTSTRAP_ENABLED:'false'};
const log=fs.openSync(path.join(__dirname,'backend-full-units.log'),'w');let result;
try{result=spawnSync('rtk',['proxy','cmd.exe','/d','/c','mvnw.cmd','-B','-ntp','-Dtest='+selected.join(','),'verify'],{cwd:path.join(root,'Backend'),stdio:['ignore',log,log],shell:false,windowsHide:true,env:environment});}finally{fs.closeSync(log);}
if(result.error)throw Error('Maven launch failed');
if(result.status===0)fs.copyFileSync(path.join(root,'Backend/target/site/jacoco/jacoco.xml'),path.join(__dirname,'backend-full-units-jacoco.xml'));
console.log(JSON.stringify({status:result.status===0?'PASS':'FAIL',selectedClasses:selected.length,excludedNativeContainerLive:excluded.length}));process.exitCode=result.status??1;
