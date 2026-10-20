const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
const files = git('ls-files', '-z').split('\0').filter(Boolean);
function walk(relative) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, {withFileTypes: true}).flatMap(entry => entry.isDirectory()
    ? walk(`${relative}/${entry.name}`) : [`${relative}/${entry.name}`]);
}
const preserved = [...walk('docs/reports'), ...walk('var/word-report-2026-10-19')];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const snapshot = {head: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'),
  status: git('status', '--short'), files: Object.fromEntries(files.map(file => [file, hash(file)])),
  preserved: Object.fromEntries(preserved.map(file => [file, hash(file)]))};
const output = path.join(__dirname, `${process.argv[2] || 'snapshot'}.json`);
fs.writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`, {flag:'wx'});
console.log(JSON.stringify({output, trackedFiles:files.length, preservedFiles:preserved.length, head:snapshot.head}));
