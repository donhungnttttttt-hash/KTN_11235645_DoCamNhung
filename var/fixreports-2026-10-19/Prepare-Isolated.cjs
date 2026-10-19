// Creates only new, randomly named schemas on the existing native server. Never drops or cleans.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {parseConfig,query} = require('../../scripts/database/mysql-client.cjs');
const root = path.resolve(__dirname,'../..');
const output = path.join(__dirname,'isolated-targets.json');
let stage='read configuration';
async function main() { try {
 if (fs.existsSync(output)) throw Error('Target manifest already exists; refusing to provision twice.');
 const config = parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if (!config.TMS_MIGRATION_USER || !config.TMS_MIGRATION_PASSWORD) throw Error('Migration credential missing.');
 process.stdout.write('Waiting for the one-time administrator credential on stdin (not echoed).\n');
 if(process.stdin.isTTY)process.stdin.setRawMode(true);
 const password = await new Promise((resolve,reject)=>{
   process.stdin.once('data',data=>{if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();resolve(String(data).replace(/[\r\n]+$/,''));});
   process.stdin.once('end',()=>reject(Error('Missing credential')));
 });
 const admin = {...config,TMS_DB_USER:'root',TMS_DB_PASSWORD:password};
 const migration = {...config,TMS_DB_USER:config.TMS_MIGRATION_USER,TMS_DB_PASSWORD:config.TMS_MIGRATION_PASSWORD};
 const account = query('SELECT CURRENT_USER()',migration)[0];
 const match = /^([a-zA-Z0-9_]+)@([a-zA-Z0-9_.%:-]+)$/.exec(account||'');
 if(!match || match[1]!==config.TMS_MIGRATION_USER)throw Error('Unexpected migration account');
 const targets = [];
 for (const purpose of ['migration','integration']) {
   const schema = 'tms_docstest_'+crypto.randomBytes(6).toString('hex');
   if (!/^tms_docstest_[a-f0-9]{12}$/.test(schema) || schema === config.TMS_DB_NAME) throw Error('Unsafe test target.');
   stage='confirm schema absence';
   if (query(`SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${schema}'`,admin)[0] !== '0') throw Error('Target exists.');
   stage='create new dedicated schema';
   query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,admin,(command,args,options)=>{
     try{return execFileSync(command,args,options);}catch(error){
       const code=String(error.stderr||'').match(/ERROR (\d+) \(([A-Z0-9]+)\)/);
       if(code)console.error('MySQL refused schema creation: '+code[1]+' ('+code[2]+').');
       throw Error('Schema creation refused.');
     }
   });
   query(`GRANT ALL PRIVILEGES ON \`${schema}\`.* TO '${match[1]}'@'${match[2]}'`,admin);
   stage='verify new empty schema';
   const client = {...migration,TMS_DB_NAME:schema};
   if (query('SELECT DATABASE()',client)[0] !== schema || query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()',client)[0] !== '0') throw Error('New schema verification failed.');
   targets.push({purpose,schema,empty:true});
 }
 fs.writeFileSync(output,JSON.stringify({createdAt:new Date().toISOString(),server:'existing native loopback',port:config.TMS_MYSQL_PORT,mainUntouched:true,targets},null,2)+'\n');
 console.log(JSON.stringify({targets,credentialsPrinted:false,mainUntouched:true}));
} catch { console.error('Isolated schema preparation failed at '+stage+'; no configuration printed.'); process.exitCode=1; } }
main();
