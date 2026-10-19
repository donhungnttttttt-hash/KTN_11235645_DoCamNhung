const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync, execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const legacyIndex = process.argv.indexOf('--legacy');
const source = legacyIndex >= 0
 ? execFileSync('rtk', ['git', 'show', `${process.argv[legacyIndex + 1]}:scripts/Start-Backend.ps1`], {cwd:root,encoding:'utf8'})
 : fs.readFileSync(path.join(root, 'scripts/Start-Backend.ps1'), 'utf8');

test('Start-Backend pre-launch setup retains native file API credentials without registry writes or model calls', () => {
 const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'tms-start-loader-test-'));
 try {
  fs.mkdirSync(path.join(fixture, 'scripts/local-ai'), {recursive:true});
  fs.copyFileSync(path.join(__dirname, 'LocalAi.ps1'), path.join(fixture, 'scripts/local-ai/LocalAi.ps1'));
  fs.writeFileSync(path.join(fixture, '.env.mysql.local'), [
   'TMS_MYSQL_HOST=127.0.0.1', 'TMS_MYSQL_PORT=3307', 'TMS_DB_NAME=synthetic_only',
   'TMS_DB_USER=fixture_app', 'TMS_MIGRATION_USER=fixture_migrator',
   'TMS_DB_PASSWORD=fake-db-secret', 'TMS_MIGRATION_PASSWORD=fake-migration-secret',
   'TMS_OPENAI_ENABLED=true', 'OPENAI_API_KEY=fake-api-secret', 'TMS_OPENAI_MODEL=file-model',
   'TMS_OPENAI_BASE_URL=https://caheoai.com/v1'
  ].join('\n'));
  // Execute the actual startup configuration prefix; exclude Maven/runtime launch.
  const split = source.indexOf('Push-Location');
  assert.ok(split > 0, 'Runtime launch boundary must be present');
  let prefix = source.slice(0, split);
  prefix = prefix.replace('Import-TmsLocalAiEnvironment -ConfigFile $envFile', `
function Get-TmsAiVariable([string]$Name,[string]$Scope) {
 if ($Scope -eq 'Process') { return [Environment]::GetEnvironmentVariable($Name,'Process') }
 return $null
}
function Set-TmsAiVariable([string]$Name,[string]$Value,[string]$Scope) {
 if ($Scope -ne 'Process') { throw 'Forbidden persistent environment mutation in test.' }
 [Environment]::SetEnvironmentVariable($Name,$Value,'Process')
}
Import-TmsLocalAiEnvironment -ConfigFile $envFile`);
  const verify = `
if ($env:TMS_OPENAI_ENABLED -cne 'true' -or $env:OPENAI_API_KEY -cne 'fake-api-secret' -or $env:TMS_OPENAI_MODEL -cne 'file-model' -or $env:TMS_OPENAI_BASE_URL -cne 'https://caheoai.com/v1') {
 throw 'Behavioral RED: existing native file API configuration was dropped during startup.'
}
Write-Output 'PASS native file API configuration retained; no backend/database/provider start.'
`;
  const script = path.join(fixture, 'scripts/probe.ps1');
  fs.writeFileSync(script, prefix + verify);
  const env = {...process.env};
  for (const name of Object.keys(env)) {
   if (/^(TMS_CHATGPT_|TMS_OLLAMA_|TMS_OPENAI_|OPENAI_API_KEY$|TMS_BIND_ADDRESS$)/.test(name)) delete env[name];
  }
  const result = spawnSync('rtk', ['proxy','powershell','-NoProfile','-File',script], {cwd:fixture,env,encoding:'utf8'});
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /PASS native file API configuration retained/);
 } finally {
  const target = path.resolve(fixture);
  assert.ok(target.startsWith(path.resolve(os.tmpdir()) + path.sep) && /^tms-start-loader-test-/.test(path.basename(target)));
  fs.rmSync(target, {recursive:true,force:true});
 }
});
