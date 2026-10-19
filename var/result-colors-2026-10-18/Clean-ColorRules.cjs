const fs = require('node:fs');
const postcss = require('../../Frontend/node_modules/postcss');
for (const file of ['Frontend/src/app/features/reports/reports.css','Frontend/src/app/features/test-cases/test-documents.css']) {
  const root = postcss.parse(fs.readFileSync(file, 'utf8'));
  root.walkRules(rule => {
    if (/^\.rp-page \.cat-kpi-block-(ok|ng|pending|unexec|na)$/.test(rule.selector)) {
      rule.nodes.filter(item => item.type === 'decl' && item.prop === 'border-left-color').forEach(item => item.remove());
    }
    if (rule.selector === '.td-result-unexecuted') {
      rule.nodes.filter(item => item.type === 'decl' && item.prop === 'border-color').forEach(item => item.remove());
    }
  });
  fs.writeFileSync(file, root.toString());
}
console.log('Removed obsolete border-color declarations superseded by the shared palette.');
