const fs = require('node:fs');
const crypto = require('node:crypto');
const parser = require('../../Frontend/node_modules/@babel/parser');

const ledgerPath = 'var/ui-audit/deep-review-testing.json';
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const actions = [];

for (const entry of ledger.sources) {
  const content = fs.readFileSync(entry.file);
  const source = content.toString('utf8');
  entry.lines = source.split(/\r?\n/).length;
  entry.sha256 = crypto.createHash('sha256').update(content).digest('hex');
  entry.readRanges = [[1, entry.lines]];
  if (!/\.jsx?$/.test(entry.file)) continue;

  const ast = parser.parse(source, {sourceType: 'module', plugins: ['jsx']});
  function visit(node, form = null) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXElement') {
      const opening = node.openingElement;
      const tag = source.slice(opening.name.start, opening.name.end);
      const attrs = opening.attributes.filter(attribute => attribute.type === 'JSXAttribute');
      const get = key => {
        const attribute = attrs.find(item => item.name.name === key);
        return attribute?.value ? source.slice(attribute.value.start, attribute.value.end) : attribute ? 'true' : null;
      };
      if (tag === 'form') form = {line: node.loc.start.line, onSubmit: get('onSubmit')};
      const handlers = Object.fromEntries(attrs.filter(attribute => /^on[A-Z]/.test(attribute.name.name))
        .map(attribute => [attribute.name.name, get(attribute.name.name)]));
      if (['button', 'input', 'select', 'textarea', 'form', 'summary', 'a'].includes(tag)
        || Object.keys(handlers).length || /(Button|Action)$/.test(tag)) {
        actions.push({
          id: `${entry.file}:${node.loc.start.line}`, file: entry.file, line: node.loc.start.line,
          owner: 'testing', tag,
          label: get('aria-label') || get('label') || node.children.filter(child => child.type === 'JSXText')
            .map(child => child.value.trim()).filter(Boolean).join(' '),
          handlers, disabled: get('disabled'),
          reason: get('disabledReason') || get('aria-describedby') || get('title'),
          type: get('type'), href: get('href'), form,
          spread: opening.attributes.some(attribute => attribute.type === 'JSXSpreadAttribute'),
          verification: 'PENDING', reviewLevel: 'STATIC_ACTION_MAP', runtimeVerified: false,
          sourceRead: true, inventorySnapshot: new Date().toISOString()
        });
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'extra', 'tokens', 'comments'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(item => visit(item, form));
      else if (value && typeof value === 'object') visit(value, form);
    }
  }
  visit(ast);
}

ledger.actions = actions;
ledger.actionCount = actions.length;
ledger.generatedAt = new Date().toISOString();
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
console.log(JSON.stringify({sources: ledger.sources.length, lines: ledger.sources.reduce((sum, entry) => sum + entry.lines, 0), actions: actions.length}));
