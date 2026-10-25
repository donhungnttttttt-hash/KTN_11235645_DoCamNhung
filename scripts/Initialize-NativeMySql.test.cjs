'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const helper = path.join(__dirname, 'database', 'native-schema.ps1');
const quote = value => "'" + value.replaceAll("'", "''") + "'";

function validate(summary) {
  const command = `. ${quote(helper)}; Assert-NativeSchemaSummary -Summary ${quote(summary)} | ConvertTo-Json -Compress`;
  return cp.spawnSync('rtk', ['proxy', 'powershell', '-NoProfile', '-NonInteractive', '-Command', command],
    { cwd: root, encoding: 'utf8', windowsHide: true });
}

test('accepts a fully migrated current or future schema without pinning V12 or a table count', () => {
  for (const [tables, migrations] of [[79, 34], [84, 37], [56, 12]]) {
    const result = validate(`${tables}\n${migrations}\n0`);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout.trim()), { TableCount: tables, AppliedMigrations: migrations });
  }
});

test('rejects empty, failed, malformed or ambiguous schema summaries', () => {
  for (const summary of ['', '0\n34\n0', '79\n0\n0', '79\n34\n1', '79\n34\n-1', '79\ntext\n0', '79\n34\n0\nextra']) {
    const result = validate(summary);
    assert.notEqual(result.status, 0, summary);
    assert.match(result.stderr, /Unexpected native schema summary/);
  }
});

test('accepts Windows line endings and rejects a nonnumeric value without echoing it', () => {
  assert.equal(validate('79\r\n34\r\n0\r\n').status, 0);
  const result = validate('private-sensitive-value\n34\n0');
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /private-sensitive-value/);
  assert.doesNotMatch(result.stderr, /private-sensitive-value/);
});

test('plan-only mode describes dynamic migration validation and does not connect or write', () => {
  const result = cp.spawnSync('rtk', ['proxy', 'powershell', '-NoProfile', '-NonInteractive', '-File',
    path.join(__dirname, 'Initialize-NativeMySql.ps1'), '-PlanOnly', '-MySqlClient', process.execPath],
  { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /resolved migrations including local demo/);
  assert.doesNotMatch(result.stdout, /56 tables|V12/);
});
