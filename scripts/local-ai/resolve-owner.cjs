const path = require('node:path');
const {localQuery} = require('../database/mysql-client.cjs');

// Native read only. Hex literal keeps untrusted input out of SQL syntax.
function resolveOwner(username, query) {
 if (typeof username !== 'string' || !username.trim() || username.length > 100 || /[\x00-\x1f\x7f]/.test(username)) {
  throw Error('Invalid owner username.');
 }
 const hex = Buffer.from(username, 'utf8').toString('hex');
 const rows = query(`SELECT id FROM identity_users WHERE BINARY username=CONVERT(0x${hex} USING utf8mb4) AND enabled=TRUE;`);
 if (rows.length !== 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rows[0])) {
  throw Error('Owner not found or disabled; choose an exact enabled TMS username.');
 }
 return rows[0];
}
if (require.main === module) {
 try {
  if (process.argv.length !== 4) throw Error('Expected owner username and repository path.');
  const root = path.resolve(process.argv[3]);
  process.stdout.write(resolveOwner(process.argv[2], localQuery(false, path.join(root, '.env.mysql.local'))));
 } catch {
  // Never expose SQL/client output/config values through PowerShell error output.
  process.stderr.write('Read-only local owner lookup failed; check enabled TMS username and native configuration.\n');
  process.exitCode = 1;
 }
}
module.exports = {resolveOwner};
