const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const hash = name => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');

(async () => {
  const before = read('final-verification-before.json').files;
  const after = read('final-verified-source.json').files;
  const frontendNames = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(name => name.startsWith('Frontend/src/'));
  const frontendChanges = frontendNames.filter(name => before[name] !== after[name] || hash(name) !== after[name]);
  const aiHashes = read('report-ai/final-report-ai-hashes.json').files;
  const aiChanges = Object.keys(aiHashes).filter(name => hash(name) !== aiHashes[name]);
  const tests = read('frontend-final-tests.json');
  const build = read('frontend-final-build-result.json');
  const backend = read('report-ai/backend-ai-final-verify.json');
  const healthResponse = await fetch('http://127.0.0.1:8080/actuator/health', {signal: AbortSignal.timeout(5000)});
  const health = await healthResponse.json();
  const ledger = JSON.parse(fs.readFileSync(path.join(root, 'docs/planning/STATUS.json'), 'utf8'));
  const result = {
    at: new Date().toISOString(),
    frontend: {passed: tests.numPassedTests, failed: tests.numFailedTests, pending: tests.numPendingTests, testFiles: tests.testResults.length, success: tests.success, sourceFilesCompared: frontendNames.length, changesSinceFullSuiteStarted: frontendChanges},
    buildExitCode: build.exitCode,
    backendVerifyExitCode: backend.status,
    aiSourceHashesCompared: Object.keys(aiHashes).length,
    changesSinceAiFinalVerify: aiChanges,
    runtimeHealth: {httpStatus: healthResponse.status, status: health.status},
    ledger: {activeSprint: ledger.activeSprint, phase: ledger.phase},
    liveProviderSuccess: 'NOT_VERIFIED: HTTP402 insufficient_balance; user reports balance available',
    gitActions: 'No commit, push, merge or deploy'
  };
  fs.writeFileSync(path.join(__dirname, 'final-verification-receipt.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (frontendChanges.length || aiChanges.length || !tests.success || tests.numFailedTests || build.exitCode || backend.status || health.status !== 'UP') process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
