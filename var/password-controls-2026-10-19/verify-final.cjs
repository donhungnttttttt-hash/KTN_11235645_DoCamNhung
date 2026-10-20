const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const before = read('before.json');
const frozen = read('final.json');
const fullSuite = read('verified-source-start.json');
const prior = read('preservation-result.json');
const hash = file => fs.existsSync(path.join(root, file))
  ? crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')
  : null;
const product = file => /^(Frontend|Backend|scripts)\//.test(file);
const changed = (files, predicate = () => true) => Object.keys(files).filter(file => predicate(file) && hash(file) !== files[file]);
const newProductFiles = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z', '--', 'Frontend', 'Backend', 'scripts'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const newProductChanges = newProductFiles.filter(file => hash(file) !== prior.newSources[file]);
const removedNewFiles = Object.keys(prior.newSources).filter(file => !newProductFiles.includes(file));
const temporaryFixtureExists = ['Frontend/__ui_controls_20261019.html', 'Frontend/__ui_controls_20261019.jsx'].some(file => fs.existsSync(path.join(root, file)));
const planning = JSON.parse(fs.readFileSync(path.join(root, 'docs/planning/STATUS.json'), 'utf8'));
const result = {
  preservedFiles: Object.keys(before.preserved).length,
  preservedChanged: changed(before.preserved),
  backendChanged: changed(before.files, file => file.startsWith('Backend/')),
  changesSinceFinalBuildSource: changed(frozen.files, product),
  changesSinceFullSuiteSource: changed(fullSuite.files, product),
  newProductFiles, newProductChanges, removedNewFiles,
  temporaryFixtureExists,
  planningJsonValid: Boolean(planning),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
};
result.pass = result.preservedChanged.length === 0 && result.backendChanged.length === 0
  && result.changesSinceFinalBuildSource.length === 0 && newProductChanges.length === 0
  && removedNewFiles.length === 0 && !temporaryFixtureExists
  && result.head === before.head && result.branch === before.branch;
fs.writeFileSync(path.join(__dirname, 'final-preservation-result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
