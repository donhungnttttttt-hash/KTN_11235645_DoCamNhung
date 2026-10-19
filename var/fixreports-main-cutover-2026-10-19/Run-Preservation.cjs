// SELECT-only comparison; no migration, provider, login or process changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net'),{spawnSync}=require('node:child_process');
const {parseConfig}=require('../../scripts/database/mysql-client.cjs');
const root=path.resolve(__dirname,'../..');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function filesystem(){const result={};function walk(dir){if(!fs.existsSync(dir))return;for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(item.isFile())result[path.relative(root,file)]=hash(file);else throw Error('Unexpected evidence link');}}walk(path.join(root,'Backend/var/evidence'));result['.env.mysql.local']=hash(path.join(root,'.env.mysql.local'));return result;}
async function main(){
 const mode=process.argv[2];if(!['before','after'].includes(mode))throw Error('Use before or after');
 const cfg=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(cfg.TMS_DB_NAME!=='tms'||cfg.TMS_MYSQL_PORT!=='3307'||!['localhost','127.0.0.1'].includes(cfg.TMS_MYSQL_HOST))throw Error('Exact native main target required');
 const stop=JSON.parse(fs.readFileSync(path.join(__dirname,'main-stopped.json'),'utf8').replace(/^\uFEFF/,''));
 let backupProof;
 if(mode==='before'){
  const occupied=await new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port:8080});socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));});if(occupied)throw Error('Main must remain stopped while capturing before');
  const folder=path.join(root,'var/mysql-native/backups');const file=fs.readdirSync(folder).filter(f=>f.endsWith('-tms.sql.json')).sort().at(-1);if(!file)throw Error('Fresh backup missing');
  const manifest=JSON.parse(fs.readFileSync(path.join(folder,file),'utf8'));const backup=path.join(folder,file.slice(0,-5));
  if(Date.parse(manifest.createdAt)<Date.parse(stop.stoppedAt)||manifest.schemaVersion!==30||manifest.schema!=='tms'||!manifest.sessionRowsExcluded||hash(backup)!==manifest.sha256)throw Error('Fresh stopped-writer V30 backup required');
  backupProof={path:path.relative(root,backup),...manifest};
  fs.writeFileSync(path.join(__dirname,'main-backup.json'),JSON.stringify(backupProof,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(path.join(__dirname,'filesystem-before.json'),JSON.stringify(filesystem(),null,2)+'\n',{flag:'wx'});
 }else{
  backupProof=JSON.parse(fs.readFileSync(path.join(__dirname,'main-backup.json'),'utf8'));if(hash(path.join(root,backupProof.path))!==backupProof.sha256)throw Error('Backup changed');
  const original=JSON.parse(fs.readFileSync(path.join(__dirname,'filesystem-before.json'),'utf8'));for(const [file,sha]of Object.entries(original))if(!fs.existsSync(path.join(root,file))||hash(path.join(root,file))!==sha)throw Error('Original evidence/config changed');
  fs.writeFileSync(path.join(__dirname,'filesystem-after-proof.json'),JSON.stringify({status:'PASS',originalFilesPreserved:Object.keys(original).length,localConfigUnchanged:true},null,2)+'\n',{flag:'wx'});
 }
 const env={...process.env,CUTOVER_DB_URL:'jdbc:mysql://127.0.0.1:3307/tms?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED',CUTOVER_DB_USER:cfg.TMS_MIGRATION_USER,CUTOVER_DB_PASSWORD:cfg.TMS_MIGRATION_PASSWORD,CUTOVER_BACKUP_SHA256:backupProof.sha256};
 const result=spawnSync('rtk',['proxy','C:/Program Files/Java/jdk-21/bin/java.exe','@'+path.join(__dirname,'java.args'),mode,__dirname],{cwd:root,env,stdio:'inherit',shell:false,windowsHide:true});if(result.error)throw Error('JVM unavailable');process.exitCode=result.status??1;
}
main().catch(e=>{console.error('Preservation refused: '+e.message);process.exitCode=1;});
