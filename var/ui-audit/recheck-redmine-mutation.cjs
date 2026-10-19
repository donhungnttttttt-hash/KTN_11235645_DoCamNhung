const fs=require('node:fs'), {spawnSync}=require('node:child_process');
const file='Frontend/src/app/features/integrations/RedminePanel.jsx';
const original=fs.readFileSync(file,'utf8');
const needle='const disabled = busy || loading || loadFailed || stale';
if (!original.includes(needle)) throw Error('Expected guard missing; do not mutate an unknown source');
try {
  fs.writeFileSync(file,original.replace(needle,'const disabled = busy || loading || stale'));
  const result=spawnSync('cmd.exe',['/d','/c','npm.cmd test -- src/app/features/integrations/RedminePanel.test.jsx'],{cwd:'Frontend',encoding:'utf8'});
  fs.writeFileSync('var/ui-audit/recheck-redmine-mutation.log',result.stdout+result.stderr);
  if (result.status===0 || result.error) throw Error('Mutation not killed or runner failed');
  if (!result.stdout.includes('keeps failed refresh visibly retryable')) throw Error('Unexpected failure; inspect log');
  console.log('Mutation killed: removing stale-authority loadFailed guard fails the action behavior regression.');
} finally { fs.writeFileSync(file,original); }
