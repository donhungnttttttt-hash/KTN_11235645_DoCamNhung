const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
function parseConfig(text) {
 const c=Object.fromEntries(text.split(/\r?\n/).filter(x=>/^[A-Z_]+=/.test(x)).map(x=>[x.slice(0,x.indexOf('=')),x.slice(x.indexOf('=')+1)]));
 if(!['127.0.0.1','localhost'].includes(c.TMS_MYSQL_HOST)||!/^\d+$/.test(c.TMS_MYSQL_PORT)||Number(c.TMS_MYSQL_PORT)<1||Number(c.TMS_MYSQL_PORT)>65535)throw Error('Invalid loopback MySQL host/port.');
 if(!/^[a-zA-Z0-9_]+$/.test(c.TMS_DB_NAME||'')||!/^[a-zA-Z0-9_]+$/.test(c.TMS_DB_USER||'')||!c.TMS_DB_PASSWORD||!c.TMS_MYSQL_CLIENT)throw Error('Missing or invalid local MySQL configuration.');
 return c;
}
function clientOptions(c) {
 return {args:['proxy',c.TMS_MYSQL_CLIENT,'--no-defaults','--protocol=TCP','--host='+c.TMS_MYSQL_HOST,'--port='+c.TMS_MYSQL_PORT,'--user='+c.TMS_DB_USER,'--database='+c.TMS_DB_NAME,'--default-character-set=utf8mb4','--batch','--raw','--skip-column-names','--connect-timeout=5'],env:{...process.env,MYSQL_PWD:c.TMS_DB_PASSWORD}};
}
function query(sql,c,execute=execFileSync) {
 try {const o=clientOptions(c);return execute('rtk',o.args,{cwd:root,input:sql,encoding:'utf8',env:o.env,maxBuffer:16*1024*1024,stdio:['pipe','pipe','pipe']}).trim().split(/\r?\n/).filter(Boolean);}
 catch {throw Error('MySQL query failed; check local server, credentials and schema. No credential was printed.');}
}
function localQuery(legacy=false,configFile=path.join(root,'.env.mysql.local')) {
 if(legacy)return sql=>{try{return execFileSync('rtk',['proxy','docker','compose','exec','-T','mysql','sh','-c','MYSQL_PWD="$TMS_DB_PASSWORD" mysql --user=tms_app --default-character-set=utf8mb4 --batch --raw --skip-column-names tms'],{cwd:root,input:sql,encoding:'utf8',maxBuffer:16*1024*1024,stdio:['pipe','pipe','pipe']}).trim().split(/\r?\n/).filter(Boolean);}catch{throw Error('Legacy MySQL query failed.');}};
 const file=configFile;
 if(!fs.existsSync(file))throw Error('Run scripts/Initialize-NativeMySql.ps1 first. Legacy Docker is never selected automatically.');
 const config=parseConfig(fs.readFileSync(file,'utf8'));return sql=>query(sql,config);
}
module.exports={parseConfig,clientOptions,query,localQuery};
