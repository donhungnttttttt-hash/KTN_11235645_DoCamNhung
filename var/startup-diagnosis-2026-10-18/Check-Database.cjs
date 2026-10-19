const fs = require('node:fs');
const {parseConfig, query} = require('../../scripts/database/mysql-client.cjs');
const config = parseConfig(fs.readFileSync('.env.mysql.local', 'utf8'));
const migrationConfig = { ...config, TMS_DB_USER: config.TMS_MIGRATION_USER,
  TMS_DB_PASSWORD: config.TMS_MIGRATION_PASSWORD };
const infoSql = 'START TRANSACTION READ ONLY; SELECT VERSION(), @@port, DATABASE(); ROLLBACK;';
const checks = {};
for (const [label, item] of [['appConnection', config], ['migrationConnection', migrationConfig]]) {
  try { checks[label] = {ok: true, server: query(infoSql, item)}; }
  catch (error) { checks[label] = {ok: false, error: error.message}; }
}
if (checks.appConnection.ok) {
  try {
    checks.schema = query('START TRANSACTION READ ONLY; '
      + 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE(); '
      + 'SELECT installed_rank,version,description,type,script,success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 8; '
      + 'SELECT COUNT(*) FROM flyway_schema_history WHERE success=0; ROLLBACK;', config);
  } catch (error) { checks.schema = {error: error.message}; }
}
checks.sourceMigrationFiles = fs.readdirSync('Backend/src/main/resources/db/migration');
checks.demoMigrationFiles = fs.readdirSync('Backend/src/main/resources/db/demo');
fs.writeFileSync('var/startup-diagnosis-2026-10-18/database-check.json', JSON.stringify(checks, null, 2));
console.log(JSON.stringify(checks, null, 2));
