// This runner deliberately has no provisioning, migration, reset or cleanup capability.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {parseConfig,query}=require('./database/mysql-client.cjs');
const root=path.resolve(__dirname,'..');
const allowlist=['FeatureIntegrationTest','FeatureLegacyRetirementIntegrationTest','FeatureAiIntegrationTest','NativeFeatureIssueIntegrationTest','ManagementReportIntegrationTest','NativeProjectNotesIntegrationTest','NativeCurrentProjectLifecycleIntegrationTest','NativeCurrentProjectLifecycleConcurrencyTest','NativeDelegatedIdentityIntegrationTest','NativeHandbookRevisionIntegrationTest'];
const suiteName=name=>(name==='NativeHandbookRevisionIntegrationTest'?'vn.syp.tms.handbook.':name==='NativeDelegatedIdentityIntegrationTest'?'vn.syp.tms.identity.':name.startsWith('NativeCurrentProjectLifecycle')?'vn.syp.tms.admin.':'vn.syp.tms.testcase.')+name;
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function javaHome(){return process.env.JAVA_HOME||(process.platform==='win32'?'C:/Program Files/Java/jdk-21':undefined);}
function ensure(condition,message){if(!condition)throw Error(message);}
function parseArgs(args){
 const config={};const keys={'--mode':'mode','--manifest':'manifest','--manifest-sha256':'manifestSha256','--tests':'tests','--evidence-dir':'evidenceDir'};
 for(let i=0;i<args.length;i++){const arg=args[i];if(arg==='--check-only'){ensure(!config.checkOnly,'Duplicate check-only');config.checkOnly=true;continue;}ensure(keys[arg]&&!Object.hasOwn(config,keys[arg])&&args[i+1]&&!args[i+1].startsWith('--'),'Unknown, duplicate or missing argument');config[keys[arg]]=args[++i];}
 for(const key of Object.values(keys))ensure(config[key],'Required argument: '+key);
 testPlan(config.mode,config.tests);ensure(/^[a-f0-9]{64}$/.test(config.manifestSha256),'Invalid manifest digest');return config;
}
function testPlan(mode,selectors){ensure(mode==='integration','Only integration mode is supported');const classes=selectors.split(',');ensure(classes.length&&new Set(classes).size===classes.length&&classes.every(x=>allowlist.includes(x)),'Unknown selector');return {classes};}
function safePath(file){const absolute=path.resolve(file);let current=absolute;while(true){if(fs.existsSync(current))ensure(!fs.lstatSync(current).isSymbolicLink()&&fs.realpathSync.native(current).toLowerCase()===current.toLowerCase(),'Symlink/junction path rejected');const parent=path.dirname(current);if(parent===current)break;current=parent;}return absolute;}
function within(file,dir){const relative=path.relative(dir,file);return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));}
function readTargetManifest(filePath,expectedSha256){
 const bytes=fs.readFileSync(safePath(filePath));ensure(sha(bytes)===expectedSha256,'Manifest digest mismatch');const manifest=JSON.parse(bytes);
 ensure(Object.keys(manifest).sort().join(',')==='formatVersion,provenance,purpose,target','Manifest must not contain credentials or extra fields');
 ensure(manifest.formatVersion===1&&manifest.purpose==='CURRENT_WORKFLOW_NATIVE','Invalid manifest purpose/version');
 const t=manifest.target;ensure(t&&['127.0.0.1','localhost'].includes(t.host)&&Number.isInteger(t.port)&&t.port>=1&&t.port<=65535&&/^tms_docstest_[a-f0-9]{12}$/.test(t.schema),'Unsafe target');
 ensure(/^[a-f0-9-]{36}$/i.test(t.serverUuid)&&/^\d+$/.test(t.flywayVersion),'Invalid UUID/version');
 ensure(JSON.stringify(t.migrationLocations)==='["classpath:db/migration"]'||JSON.stringify(t.migrationLocations)==='["classpath:db/migration","classpath:db/demo"]','Unexpected migration locations');
 const p=manifest.provenance;ensure(p&&path.isAbsolute(p.receiptPath)&&/^[a-f0-9]{64}$/.test(p.receiptSha256),'Invalid provenance');const receiptBytes=fs.readFileSync(safePath(p.receiptPath));ensure(sha(receiptBytes)===p.receiptSha256,'Provenance digest mismatch');const receipt=JSON.parse(receiptBytes);
 ensure(receipt.formatVersion===1&&receipt.purpose==='CURRENT_WORKFLOW_NATIVE_PROVISION'&&receipt.createdNewSchema===true&&path.resolve(receipt.ownerRoot)===root&&!!Date.parse(receipt.preparedAt),'Unverified provenance');
 ensure(JSON.stringify(receipt.target)===JSON.stringify(t)&&Array.isArray(receipt.migrations)&&receipt.migrations.length>0,'Provenance target mismatch');
 ensure(receipt.migrations.every(m=>typeof m.version==='string'&&typeof m.script==='string'&&(m.checksum===null||Number.isInteger(m.checksum)))&&receipt.migrations.at(-1).version===t.flywayVersion,'Invalid provenance migrations');
 return {...manifest,receipt};
}
function testConfiguration(config,manifest){const t=manifest.target;ensure(config.TMS_MYSQL_HOST===t.host&&Number(config.TMS_MYSQL_PORT)===t.port&&config.TMS_DB_NAME===t.schema&&config.TMS_DB_USER&&config.TMS_DB_PASSWORD,'Private configuration target mismatch');return { ...config };}
function baseline(){
 const git=args=>cp.execFileSync('rtk',['proxy','git',...args],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024}).trim();
 const files=[];function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const f=path.join(dir,ent.name);if(ent.isDirectory())walk(f);else if(ent.isFile())files.push({file:path.relative(root,f).replaceAll('\\','/'),sha256:sha(fs.readFileSync(f))});}}
 walk(path.join(root,'Backend/src'));files.push({file:'Backend/pom.xml',sha256:sha(fs.readFileSync(path.join(root,'Backend/pom.xml')))});
 for(const file of ['scripts/Test-CurrentWorkflowNative.cjs','scripts/Test-CurrentWorkflowNative.test.cjs','Backend/mvnw.cmd','Backend/.mvn/wrapper/maven-wrapper.properties'])files.push({file,sha256:sha(fs.readFileSync(path.join(root,file)))});
 const jdk=cp.spawnSync('rtk',['proxy',path.join(javaHome()||'','bin',process.platform==='win32'?'java.exe':'java'),'-version'],{encoding:'utf8',windowsHide:true});ensure(jdk.status===0,'JDK unavailable');
 return {head:git(['rev-parse','HEAD']),dirty:git(['status','--short']),diffSha256:sha(git(['diff','--binary','HEAD'])),sourceHash:sha(JSON.stringify(files)),files,migrations:files.filter(f=>/\/db\/(migration|demo)\//.test(f.file)),jdk:(jdk.stdout||'')+(jdk.stderr||'')};
}
function readSuites(build){const dir=path.join(build,'target/surefire-reports');if(!fs.existsSync(dir))return [];return fs.readdirSync(dir).filter(f=>/^TEST-.*\.xml$/.test(f)).map(f=>{const xml=fs.readFileSync(path.join(dir,f),'utf8'),tag=xml.match(/<testsuite\s[^>]+>/)?.[0]||'';return {name:f.slice(5,-4),...Object.fromEntries(['tests','skipped','failures','errors'].map(k=>[k,Number(tag.match(new RegExp('\\b'+k+'="(\\d+)"'))?.[1]??NaN)]))};});}
function run(args,io={}){
 let evidence,record;try{
  const config=parseArgs(args),plan=testPlan(config.mode,config.tests),manifest=readTargetManifest(config.manifest,config.manifestSha256);
  evidence=safePath(config.evidenceDir);ensure(!fs.existsSync(evidence),'Evidence directory already used');
  const inherited=io.env||process.env;
  for(const forbidden of [path.join(root,'Backend'),path.join(root,'var/evidence'),inherited.TMS_ATTACHMENT_ROOT].filter(Boolean))ensure(!within(evidence,path.resolve(forbidden)),'Application/build storage rejected');
  const privateConfig=testConfiguration(io.loadConfig?io.loadConfig():parseConfig(fs.readFileSync(process.env.TMS_CURRENT_WORKFLOW_CONFIG,'utf8')),manifest);
  const appSchema=io.applicationSchema??parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8')).TMS_DB_NAME;ensure(manifest.target.schema!==appSchema,'Application schema rejected');
  fs.mkdirSync(evidence,{recursive:true});fs.mkdirSync(path.join(evidence,'attachments'));
  const storage={formatVersion:1,purpose:'CURRENT_WORKFLOW_NATIVE_STORAGE',ownerRoot:root,evidenceDir:evidence,attachmentRoot:path.join(evidence,'attachments'),manifestSha256:config.manifestSha256,createdAt:new Date().toISOString()};
  fs.writeFileSync(path.join(evidence,'storage.json'),JSON.stringify(storage,null,2),{flag:'wx'});
  const source=io.baseline?io.baseline():baseline();fs.writeFileSync(path.join(evidence,'baseline.json'),JSON.stringify(source,null,2));fs.writeFileSync(path.join(evidence,'target.json'),JSON.stringify(manifest,null,2));
  record={ok:false,mode:config.mode,classes:plan.classes,manifestSha256:config.manifestSha256,sourceHash:source.sourceHash,head:source.head,target:manifest.target,storage,javaValidation:'NOT_RUN',suites:[]};
  const sql=s=>io.mysql?io.mysql(s,privateConfig):query(s,privateConfig,(command,argv,options)=>cp.execFileSync(command,argv,{...options,windowsHide:true}));
  const identity=sql('SELECT DATABASE(), @@server_uuid');ensure(identity.length===1&&identity[0]===manifest.target.schema+'\t'+manifest.target.serverUuid,'Connected target mismatch');
  const history=sql('SELECT version, script, IF(success=1, IFNULL(CAST(checksum AS CHAR),\'NULL\'), \'FAILED\') FROM flyway_schema_history ORDER BY installed_rank');ensure(JSON.stringify(history)===JSON.stringify(manifest.receipt.migrations.map(m=>[m.version,m.script,m.checksum===null?'NULL':m.checksum].join('\t'))),'Unexpected migration/checksum');
  if(!config.checkOnly){
   const build=path.join(evidence,'build');fs.mkdirSync(build);fs.cpSync(path.join(root,'Backend/src'),path.join(build,'src'),{recursive:true});fs.copyFileSync(path.join(root,'Backend/pom.xml'),path.join(build,'pom.xml'));fs.copyFileSync(path.join(root,'Backend/mvnw.cmd'),path.join(build,'mvnw.cmd'));fs.cpSync(path.join(root,'Backend/.mvn'),path.join(build,'.mvn'),{recursive:true});
   if(source.files)for(const entry of source.files.filter(f=>f.file.startsWith('Backend/'))){const copy=path.join(build,entry.file.slice('Backend/'.length));ensure(sha(fs.readFileSync(copy))===entry.sha256,'Source changed while copying; use a new evidence run');}
   const env={...inherited};for(const key of Object.keys(env))if(/^(TMS_|SPRING_|MYSQL_)/.test(key)||['JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS','MAVEN_OPTS','MAVEN_ARGS','OPENAI_API_KEY'].includes(key))delete env[key];
   Object.assign(env,{JAVA_HOME:javaHome(),DEBUG:'false',TRACE:'false',TMS_CURRENT_WORKFLOW_MODE:'integration',TMS_CURRENT_WORKFLOW_MANIFEST:path.resolve(config.manifest),TMS_CURRENT_WORKFLOW_MANIFEST_SHA256:config.manifestSha256,TMS_TEST_FEATURE_MODE:'integration',TMS_CURRENT_WORKFLOW_EVIDENCE_DIR:evidence,TMS_ATTACHMENT_ROOT:storage.attachmentRoot,TMS_TEST_DB_URL:`jdbc:mysql://${manifest.target.host}:${manifest.target.port}/${manifest.target.schema}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC`,TMS_TEST_DB_USER:privateConfig.TMS_DB_USER,TMS_TEST_DB_PASSWORD:privateConfig.TMS_DB_PASSWORD});
   const result=io.maven?io.maven({...plan,env,build}):cp.spawnSync('rtk',['proxy','cmd.exe','/d','/c','mvnw.cmd','-B','-ntp','verify','-Dtest='+plan.classes.join(',')],{cwd:build,env,encoding:'utf8',windowsHide:true,maxBuffer:48*1024*1024});
   fs.writeFileSync(path.join(evidence,'maven.log'),(result.stdout||'')+(result.stderr||''));record.suites=result.suites||readSuites(build);record.javaValidation=result.status===0?'NOT_CONFIRMED':'FAILED_OR_NOT_REACHED';ensure(result.status===0,'Maven failed; see isolated maven.log');
   for(const name of plan.classes){const suite=record.suites.find(s=>s.name===suiteName(name));ensure(suite&&suite.tests>0&&suite.skipped===0&&suite.failures===0&&suite.errors===0,'Selected suite did not execute successfully: '+name);}
   record.javaValidation='PASS';record.build={directory:build,command:['rtk','proxy','cmd.exe','/d','/c','mvnw.cmd','-B','-ntp','verify','-Dtest='+plan.classes.join(',')],jdk:source.jdk};
   if(!io.maven){const jar=path.join(build,'target/tms-backend-0.1.0-SNAPSHOT.jar');ensure(fs.existsSync(jar),'Verified build artifact missing');record.build.artifact={path:jar,sha256:sha(fs.readFileSync(jar))};}
  }
  record.ok=true;fs.writeFileSync(path.join(evidence,'receipt.json'),JSON.stringify(record,null,2));return record;
 }catch(error){const result={...(record||{}),ok:false,error:error.message};if(evidence&&record)fs.writeFileSync(path.join(evidence,'receipt.json'),JSON.stringify(result,null,2));return result;}
}
module.exports={parseArgs,readTargetManifest,testPlan,testConfiguration,run};
if(require.main===module){const result=run(process.argv.slice(2));console.log(JSON.stringify({ok:result.ok,error:result.error,classes:result.classes,suites:result.suites,javaValidation:result.javaValidation}));if(!result.ok)process.exitCode=1;}
