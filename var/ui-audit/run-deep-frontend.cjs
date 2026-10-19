const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const log = fs.openSync('var/ui-audit/deep-review-frontend-final.log', 'w');
const result = spawnSync('rtk', ['proxy','cmd.exe','/d','/c','npm','exec','--','vitest','run','--coverage','--maxWorkers=2'], {cwd:'Frontend',stdio:['ignore',log,log]});
fs.closeSync(log);
console.log('Full frontend coverage exit:', result.status);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
