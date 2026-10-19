const fs = require('node:fs');
const path = require('node:path');
const postcss = require('../../Frontend/node_modules/postcss');
const directory = 'var/result-colors-2026-10-18';
const changes = new Map();
const edits = [];
const tokens = {
  ok: '#0dd44c', ng: '#b60202', pending: '#f8f835', 'not-run': '#161c25', na: '#7a7a7c',
};
const foregrounds = {ok: '#000000', ng: '#ffffff', pending: '#000000', 'not-run': '#ffffff', na: '#000000'};
function document(file) {
  if (!changes.has(file)) {
    const before = fs.readFileSync(file, 'utf8');
    changes.set(file, {before, root: postcss.parse(before)});
  }
  return changes.get(file).root;
}
function rule(file, selector, declarations, optional = false) {
  const root = document(file);
  const matches = [];
  root.walkRules(item => { if (item.selector === selector) matches.push(item); });
  const expectedMatches = selector === '.td-result-unexecuted' ? 2 : 1;
  if (matches.length > expectedMatches || (!matches.length && !optional)) throw new Error(`Unexpected selector: ${file}: ${selector}`);
  let target = matches.at(-1);
  if (!target) {
    target = postcss.rule({selector});
    target.raws.before = '\n';
    root.append(target);
  }
  for (const [prop, value] of Object.entries(declarations)) {
    const existing = target.nodes.filter(item => item.type === 'decl' && item.prop === prop);
    if (existing.length > 1) throw new Error(`Duplicate property: ${selector} ${prop}`);
    if (existing[0]) existing[0].value = value;
    else target.append({prop, value});
  }
  edits.push({file, selector, declarations});
}
const color = state => `var(--color-result-${state})`;
const text = state => `var(--color-result-${state}-text)`;
const solid = state => ({background: color(state), color: text(state)});
const global = 'Frontend/src/app/styles/global.css';
const root = document(global).nodes.find(item => item.type === 'rule' && item.selector === ':root');
if (!root) throw new Error('Global :root not found.');
root.append(postcss.comment({text: 'Shared test-result palette. Change these five colors to update every result view.'}));
for (const [state, value] of Object.entries(tokens)) {
  root.append({prop: `--color-result-${state}`, value});
  root.append({prop: `--color-result-${state}-text`, value: foregrounds[state]});
}
for (const [suffix, state] of Object.entries({ok:'ok',ng:'ng',pending:'pending',unexec:'not-run',na:'na'})) {
  rule(global, `.cat-status-${suffix}`, {...solid(state), 'font-weight':'600', 'border-radius':'3px', padding:'1px 4px'}, suffix === 'na');
  rule(global, `.cat-kpi-block-${suffix}`, {'background-color':color(state), color:text(state), ...(suffix === 'unexec' ? {border:`1px solid ${color(state)}`} : {})});
}

const admin = 'Frontend/src/app/features/admin/admin.css';
rule(admin, '.admin-bar-track span', {background: color('ok')});
for (const [suffix, state] of Object.entries({ok:'ok',ng:'ng',pending:'pending',notRun:'not-run',na:'na'})) {
  rule(admin, `.admin-bar-track .result-${suffix}`, {background:color(state)}, suffix === 'ok');
}

const execution = 'Frontend/src/app/features/test-execution/execution.css';
rule(execution, '.ex-result', solid('not-run'));
for (const [suffix, state] of Object.entries({OK:'ok',NG:'ng',P:'pending',NOT_RUN:'not-run',NA:'na'})) {
  rule(execution, `.ex-result-${suffix}`, solid(state), ['NOT_RUN','NA'].includes(suffix));
}

const fileWork = 'Frontend/src/app/features/file-work/file-work.css';
for (const [suffix, state] of Object.entries({OK:'ok',NG:'ng',P:'pending',NOT_RUN:'not-run',NA:'na'})) {
  rule(fileWork, `.fw-page .fw-result-${suffix}`, {...solid(state), 'border-color':color(state)}, suffix === 'NOT_RUN');
}

const reports = 'Frontend/src/app/features/reports/reports.css';
for (const [suffix, state] of Object.entries({ok:'ok',ng:'ng',pending:'pending',unexec:'not-run',na:'na'})) {
  rule(reports, `.rp-page .cat-kpi-block-${suffix}`, {...solid(state), 'border-color':color(state)});
}
rule(reports, '.rp-meter span', {background:color('ok')});

const documents = 'Frontend/src/app/features/test-cases/test-documents.css';
for (const [suffix, state] of Object.entries({ok:'ok',ng:'ng',pending:'pending',unexecuted:'not-run',na:'na'})) {
  // P is rendered as td-count-p by the library; pending is the legacy CSS alias.
  const countSuffix = suffix === 'pending' ? 'p' : suffix;
  rule(documents, `.td-count-${countSuffix}`, solid(state), ['p','unexecuted','na'].includes(countSuffix));
  if (suffix === 'pending') rule(documents, '.td-count-pending', solid(state));
  rule(documents, `.td-result-${suffix}`, {...solid(state), border:`2px solid ${color(state)}`});
}
for (const [suffix, state] of Object.entries({ok:'ok',ng:'ng',pending:'pending',na:'na','-':'not-run'})) {
  rule(documents, `.td-highlight .td-case-grid .td-outcome-${suffix}`, {
    background:`color-mix(in srgb, ${color(state)} 12%, white)`,
  });
}
rule(documents, '.td-result:disabled', {'border-style':'dashed'});
const disabledRule = document(documents).nodes.find(item => item.type === 'rule' && item.selector === '.td-result:disabled');
disabledRule.nodes.filter(item => item.type === 'decl' && item.prop === 'background').forEach(item => item.remove());

const retest = 'Frontend/src/app/features/retest/retest.css';
rule(retest, '.rt-verdict', {...solid('not-run'), display:'inline-block', padding:'3px 7px', 'border-radius':'4px'});
rule(retest, '.rt-verdict.PASS', solid('ok'));
rule(retest, '.rt-verdict.FAIL', solid('ng'));

// Validate every edit before writing; keep the user's current palette as the baseline.
for (const [file, item] of changes) {
  const target = path.join(directory, file.replaceAll('/', '__') + '.before');
  fs.writeFileSync(target, item.before, {flag:'wx'});
}
for (const [file, item] of changes) fs.writeFileSync(file, item.root.toString());
fs.writeFileSync(path.join(directory, 'edits.json'), JSON.stringify({tokens, foregrounds, edits}, null, 2));
console.log(JSON.stringify({files:changes.size, selectors:edits.length, tokens}, null, 2));
