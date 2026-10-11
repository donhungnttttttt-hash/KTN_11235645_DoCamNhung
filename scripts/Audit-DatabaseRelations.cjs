// Read-only FK inventory/orphan audit against the explicitly configured local database.
const fs=require('node:fs'),path=require('node:path');
const {localQuery}=require('./database/mysql-client.cjs');
const query=localQuery();
const identifier=value=>{if(!/^[A-Za-z0-9_]+$/.test(value))throw Error('Unexpected schema identifier');return '`'+value+'`';};
try{
 const columns=query(`SELECT JSON_OBJECT('name',CONSTRAINT_NAME,'table',TABLE_NAME,'column',COLUMN_NAME,'parent',REFERENCED_TABLE_NAME,'parentColumn',REFERENCED_COLUMN_NAME) FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION;`).map(JSON.parse);
 const groups=new Map();for(const c of columns){const key=c.table+':'+c.name;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);}
 const statements=[...groups.values()].map(cols=>{
  const c=cols[0];const join=cols.map(x=>'c.'+identifier(x.column)+'=p.'+identifier(x.parentColumn)).join(' AND ');
  const present=cols.map(x=>'c.'+identifier(x.column)+' IS NOT NULL').join(' AND ');
  return `SELECT '${c.table}:${c.name}' AS relation,COUNT(*) AS orphanRows FROM ${identifier(c.table)} c LEFT JOIN ${identifier(c.parent)} p ON ${join} WHERE ${present} AND p.${identifier(c.parentColumn)} IS NULL`;
 });
 const checks=query('START TRANSACTION READ ONLY;'+statements.join(' UNION ALL ')+';COMMIT;').map(line=>{const [relation,count]=line.split('\t');return {relation,orphanRows:Number(count)};});
 const report={checkedAt:new Date().toISOString(),readOnly:true,tableCount:Number(query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type=\'BASE TABLE\';')[0]),foreignKeys:checks.length,failures:checks.filter(c=>c.orphanRows),checks};
 const output=path.join(__dirname,'../var/ui-audit/database-relations.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({checkedAt:report.checkedAt,readOnly:true,tables:report.tableCount,foreignKeys:report.foreignKeys,failures:report.failures}));if(report.failures.length)process.exitCode=1;
}catch{console.error('Read-only database relationship audit failed. No credentials or row contents printed.');process.exitCode=1;}
