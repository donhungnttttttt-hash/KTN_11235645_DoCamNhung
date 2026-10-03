const fs=require('node:fs');
const path=require('node:path');
const {localQuery}=require('./database/mysql-client.cjs');
const root=path.resolve(__dirname,'..');
function identifier(value) {
  if(!/^[A-Za-z0-9_]+$/.test(value))throw Error('Unexpected database identifier');
  return '`'+value+'`';
}
try {
  const query=localQuery(process.argv.includes('--legacy-docker'));
  const tableNames=query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME;");
  const foreignKeys=query("SELECT JSON_OBJECT('table',TABLE_NAME,'constraint',CONSTRAINT_NAME,'column',COLUMN_NAME,'parent',REFERENCED_TABLE_NAME,'parentColumn',REFERENCED_COLUMN_NAME) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION;").map(JSON.parse);
  const groups=new Map();
  for(const key of foreignKeys){const name=key.table+'.'+key.constraint; if(!groups.has(name))groups.set(name,[]);groups.get(name).push(key);}
  const queries=[];
  for(const [name,columns] of groups){
    const first=columns[0];
    const join=columns.map(k=>`child.${identifier(k.column)}=parent.${identifier(k.parentColumn)}`).join(' AND ');
    const present=columns.map(k=>`child.${identifier(k.column)} IS NOT NULL`).join(' AND ');
    queries.push(`SELECT '${name}' AS check_name,COUNT(*) AS violations FROM ${identifier(first.table)} child LEFT JOIN ${identifier(first.parent)} parent ON ${join} WHERE ${present} AND parent.${identifier(first.parentColumn)} IS NULL`);
  }
  queries.push("SELECT 'BUG_WITHOUT_DETAILS',COUNT(*) FROM work_items w LEFT JOIN bug_details b ON b.project_id=w.project_id AND b.work_item_id=w.id WHERE w.item_type='BUG' AND b.work_item_id IS NULL");
  queries.push("SELECT 'RESOLVED_WITHOUT_BUILD',COUNT(*) FROM work_items w JOIN bug_details b ON b.project_id=w.project_id AND b.work_item_id=w.id WHERE w.status_code IN ('resolved','closed') AND b.fixed_build_id IS NULL");
  queries.push("SELECT 'RUN_UNAPPROVED_REVISION',COUNT(*) FROM run_items r JOIN test_case_revisions c ON c.project_id=r.project_id AND c.id=r.revision_id WHERE c.approved_at IS NULL");
  queries.push("SELECT 'INVALID_ACCOUNT_DELEGATION',COUNT(*) FROM identity_users WHERE can_create_users=TRUE AND role_code<>'PM'");
  queries.push("SELECT 'CLOSED_WITHOUT_DECISION',COUNT(*) FROM work_items w WHERE w.item_type='BUG' AND w.status_code IN ('closed','unreproducible','wontfix') AND NOT EXISTS (SELECT 1 FROM bug_closure_decisions d WHERE d.project_id=w.project_id AND d.work_item_id=w.id AND d.decision_kind<>'REOPEN')");
  queries.push("SELECT 'DEMO_UNLINKED_LATEST_NG',COUNT(*) FROM run_items r JOIN projects p ON p.id=r.project_id JOIN execution_attempts a ON a.project_id=r.project_id AND a.id=r.latest_attempt_id WHERE p.code='DEMO-PILOT' AND a.result_code='NG' AND NOT EXISTS (SELECT 1 FROM work_item_execution_links l WHERE l.project_id=r.project_id AND l.attempt_id=a.id)");
  const tablesSql=tableNames.map(name=>`SELECT '${name}',COUNT(*) FROM ${identifier(name)}`).join(' UNION ALL ');
  // Consistent read-only snapshot. No payload, token, username or password is selected.
  const rows=query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ; START TRANSACTION READ ONLY;\n'+tablesSql+';\n'+queries.join(' UNION ALL ')+';\nCOMMIT;');
  const parse=row=>{const [name,count]=row.split('\t');return {name,count:Number(count)};};
  const tables=rows.slice(0,tableNames.length).map(parse),checks=rows.slice(tableNames.length).map(parse);
  const failures=checks.filter(c=>c.count!==0);
  const report={checkedAt:new Date().toISOString(),database:'local/tms',access:'tms_app / read-only transaction',tableCount:tables.length,totalRows:tables.reduce((n,t)=>n+t.count,0),foreignKeysChecked:groups.size,domainChecks:queries.length-groups.size,failures,tables};
  fs.mkdirSync(path.join(root,'var/demo'),{recursive:true});
  fs.writeFileSync(path.join(root,'var/demo/database-audit.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,tables:undefined},null,2));
  if(failures.length)process.exitCode=1;
} catch(error) {
  // Do not emit a child process error containing environment or SQL payloads.
  console.error('Database audit failed; check schema and local MySQL availability. No data was changed.');
  process.exitCode=1;
}
