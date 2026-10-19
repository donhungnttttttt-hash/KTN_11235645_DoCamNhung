const fs = require('node:fs');
const {localQuery} = require('../../scripts/database/mysql-client.cjs');
const source = fs.readFileSync('Backend/src/main/resources/db/demo/V20__local_role_demo_data.sql', 'utf8');
const selected = new Set(['syp.demo.admin', 'syp.demo.pm', 'syp.demo.tester01', 'syp.demo.dev']);
const seeded = [...source.matchAll(/\(@demo_[^,]+,'(syp\.demo\.[^']+)','[^']+','(\{pbkdf2-v5_8\}[0-9a-f]+)','(ADMIN|PM|TESTER|DEV)'/g)]
  .filter(row => selected.has(row[1]));
if (seeded.length !== 4) throw new Error('Expected exactly four documented demo accounts.');
const sql = 'START TRANSACTION READ ONLY; ' + seeded.map(row =>
  `SELECT username,role_code,enabled,password_hash='${row[2]}' AS documented_password_unchanged FROM identity_users WHERE username='${row[1]}';`
).join(' ') + ' ROLLBACK;';
console.log(localQuery()(sql).join('\n'));
