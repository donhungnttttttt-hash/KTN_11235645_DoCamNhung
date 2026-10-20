// Only the existing, preprovisioned Feature integration target; no provision, reset or main writes.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), schema = 'tms_docstest_2060e04c986c';
const { parseConfig, query } = require(path.join(root, 'scripts/database/mysql-client.cjs'));
const modes = {
  red: 'FeatureIntegrationTest#featureCreationDatesUseInclusiveVietnamDaysBeforeCountingAndPaging+featureCreationDateBoundsCanBeUsedIndependentlyAndCleared+featureSortUsesCreationDateAndStableTiesInsteadOfAssumingIdChronology+invalidFeatureFiltersReturnClearClientErrorsWithoutQueryingArbitrarySorts',
  green: 'FeatureIntegrationTest,NativeFeatureIssueIntegrationTest,FeatureLegacyRetirementIntegrationTest',
  final: 'FeatureIntegrationTest,NativeFeatureIssueIntegrationTest,FeatureLegacyRetirementIntegrationTest',
};
const mode = process.argv[2];
if (!Object.hasOwn(modes, mode)) throw Error('Explicit test mode required');
const c = parseConfig(fs.readFileSync(path.join(root, '.env.mysql.local'), 'utf8'));
if (c.TMS_MYSQL_PORT !== '3307' || !['localhost', '127.0.0.1'].includes(c.TMS_MYSQL_HOST)) throw Error('Exact loopback server required');
const client = { ...c, TMS_DB_NAME: schema, TMS_DB_USER: c.TMS_MIGRATION_USER, TMS_DB_PASSWORD: c.TMS_MIGRATION_PASSWORD };
if (query('SELECT DATABASE();', client)[0] !== schema || query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1;', client)[0] !== '33' || query('SELECT COUNT(*) FROM flyway_schema_history WHERE success=0;', client)[0] !== '0') throw Error('Exact healthy V33 target required');
const allowed = /^(?:PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMDATA|JAVA_HOME|PROCESSOR_ARCHITECTURE|OS)$/i;
const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.test(key))), TMS_TEST_FEATURE_MODE: 'integration', TMS_TEST_DB_URL: `jdbc:mysql://${c.TMS_MYSQL_HOST}:3307/${schema}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED`, TMS_TEST_DB_USER: c.TMS_MIGRATION_USER, TMS_TEST_DB_PASSWORD: c.TMS_MIGRATION_PASSWORD, TMS_BOOTSTRAP_ENABLED: 'false', TMS_REDMINE_ENABLED: 'false', TMS_OPENAI_ENABLED: 'false', TMS_CHATGPT_LOCAL_ENABLED: 'false', TMS_OLLAMA_ENABLED: 'false', TMS_AI_DRAFT_CLEANUP_CRON: '-', TMS_AI_CHAT_CLEANUP_CRON: '-', SPRING_SESSION_JDBC_CLEANUP_CRON: '-', SPRING_CONFIG_LOCATION: 'classpath:/application.yml', DEBUG: 'false', TRACE: 'false' };
const log = fs.openSync(path.join(__dirname, `backend-${mode}.log`), 'wx');
const startedAt = new Date().toISOString();
let result;
try { result = spawnSync('rtk', ['proxy', 'cmd.exe', '/d', '/c', 'mvnw.cmd', '-B', '-ntp', `-Dtest=${modes[mode]}`, 'verify'], { cwd: path.join(root, 'Backend'), env, shell: false, windowsHide: true, stdio: ['ignore', log, log] }); } finally { fs.closeSync(log); }
if (result.error) throw Error('Maven launch failed');
const receipt = { startedAt, completedAt: new Date().toISOString(), exitCode: result.status, schema, selected: modes[mode] };
fs.writeFileSync(path.join(__dirname, `backend-${mode}.json`), JSON.stringify(receipt, null, 2));
for (const file of fs.readdirSync(path.join(root, 'Backend/target/surefire-reports')).filter(name => name.startsWith('TEST-') && ['FeatureIntegrationTest', 'NativeFeatureIssueIntegrationTest', 'FeatureLegacyRetirementIntegrationTest'].some(test => name.endsWith(`.${test}.xml`)))) fs.copyFileSync(path.join(root, 'Backend/target/surefire-reports', file), path.join(__dirname, `${mode}-${file}`));
console.log(JSON.stringify(receipt));
process.exitCode = result.status ?? 1;
