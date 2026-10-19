const fs=require('node:fs');
const path=require('node:path');
const {parseConfig,query}=require('../../scripts/database/mysql-client.cjs');
const root=path.resolve(__dirname,'../..');
try{
 const config=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 const projects=query("SELECT id,code,name FROM projects ORDER BY id",config).map(line=>{const[id,code,...name]=line.split('\t');return{id:Number(id),code,name:name.join('\t')};});
 const flyway=query("SELECT version FROM flyway_schema_history WHERE success=1 AND version IS NOT NULL ORDER BY installed_rank DESC LIMIT 1",config)[0];
 const schemas=query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME REGEXP '^tms_docstest_[a-zA-Z0-9_]+$' ORDER BY SCHEMA_NAME",config);
 const isolatedInventory=schemas.map(schema=>{
   if(!/^tms_docstest_[a-zA-Z0-9_]+$/.test(schema))throw Error('Unsafe schema');
   const tables=Number(query(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${schema}'`,config)[0]);
   return {schema,tables};
 });
 const data={readOnlyQueries:true,host:'loopback',port:config.TMS_MYSQL_PORT,schemaVersion:flyway,projects,isolatedSchemas:schemas,isolatedInventory};
 fs.writeFileSync(path.join(__dirname,'environment-readonly.json'),JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify(data));
}catch(e){console.error('Readonly environment inspection unavailable; no configuration printed.');process.exitCode=1;}
