const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const previous = path.join(root, 'var/password-controls-2026-10-19');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const frozen = read(path.join(previous, 'final.json'));
const baseline = read(path.join(previous, 'before.json'));
const oldNewFiles = read(path.join(previous, 'preservation-result.json')).newSources;
const hash = file => fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
const changedProduct = Object.keys(frozen.files).filter(file => /^(Frontend|Backend|scripts)\//.test(file) && hash(path.join(root, file)) !== frozen.files[file]);
const preservedChanged = Object.keys(baseline.preserved).filter(file => hash(path.join(root, file)) !== baseline.preserved[file]);
const previousNewSourceChanges = Object.keys(oldNewFiles).filter(file => hash(path.join(root, file)) !== oldNewFiles[file]);
const result = {
  changedProduct, preservedFiles:Object.keys(baseline.preserved).length, preservedChanged, previousNewSourceChanges,
  originalEntryMatchesPreviousCheckpoint:hash(path.join(__dirname, 'AppEntry.before.jsx')) === frozen.files['Frontend/src/AppEntry.jsx'],
  finalEntrySha256:hash(path.join(root, 'Frontend/src/AppEntry.jsx')),
  regressionTestSha256:hash(path.join(root, 'Frontend/src/app/features/admin/admin-login-landing.test.jsx')),
  planningJsonValid: Boolean(read(path.join(root, 'docs/planning/STATUS.json'))),
};
result.pass = JSON.stringify(changedProduct) === JSON.stringify(['Frontend/src/AppEntry.jsx'])
  && preservedChanged.length === 0 && previousNewSourceChanges.length === 0 && result.originalEntryMatchesPreviousCheckpoint;
fs.writeFileSync(path.join(__dirname, 'preservation-result.json'), JSON.stringify(result,null,2) + '\n', {flag:'wx'});
console.log(JSON.stringify(result,null,2));
if (!result.pass) process.exitCode = 1;
