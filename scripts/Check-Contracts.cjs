// Structural checks for the implemented S03–S10 contracts, not a full OpenAPI validator.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const main = read('docs/api/openapi.yaml');
const status = JSON.parse(read('docs/planning/STATUS.json'));
const operationIds = new Set();
let operations = 0;

for (const file of ['docs/api/project-settings.openapi.json', 'docs/api/test-cases.openapi.json', 'docs/api/execution.openapi.json', 'docs/api/work-items.openapi.json', 'docs/api/retest.openapi.json', 'docs/api/reporting.openapi.json', 'docs/api/redmine.openapi.json']) {
  const spec = JSON.parse(read(file));
  for (const [route, item] of Object.entries(spec.paths)) {
    if (!main.includes(`  ${route}:`)) throw Error(`Main contract lacks ${route}`);
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const operation = item[method];
      if (!operation) continue;
      if (!operation.operationId || operationIds.has(operation.operationId)) throw Error(`Invalid operation ID: ${operation.operationId}`);
      operationIds.add(operation.operationId);
      operations++;
      const parameters = [...(item.parameters || []), ...(operation.parameters || [])];
      for (const [, name] of route.matchAll(/\{(\w+)\}/g)) {
        if (!parameters.some(parameter => parameter.name === name && parameter.in === 'path' && parameter.required)) throw Error(`Missing path parameter: ${route}/${name}`);
      }
    }
  }
  function checkRefs(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref' && child.startsWith('#/')) {
        const resolved = child.slice(2).split('/').reduce((node, part) => node?.[part.replace(/~1/g, '/').replace(/~0/g, '~')], spec);
        if (resolved === undefined) throw Error(`Unresolved reference: ${file} ${child}`);
      }
      checkRefs(child);
    }
  }
  checkRefs(spec);
}

const documents = [
  'docs/database/mysql-workbench.md', 'docs/reviews/2026-10-01-database-native-mysql.md',
  'docs/deployment.md', 'docs/user-guide.md', 'docs/evaluation.md', 'docs/operations/support.md',
  'docs/uat/pilot.md', 'docs/uat/demo-data.md', 'docs/reviews/2026-09-30-sprint-11.md', 'docs/security/sprint-11-dependencies.md',
  'docs/reviews/2026-09-30-review-completion.md', 'docs/api/project-settings.md', 'docs/planning/sprints/SPRINT-03.md', 'docs/planning/sprints/SPRINT-04.md', 'docs/planning/sprints/SPRINT-10.md', 'docs/development.md',
  'docs/reviews/2026-09-30-sprint-10.md', 'docs/uat/sprint-10-internal.md', 'docs/operations/recovery.md', 'docs/performance/sprint-10.md', 'docs/security/sprint-10-review.md', 'docs/security/sprint-10-dependencies.md', 'docs/api/project-validation.md',
  'docs/operations/integration.md', 'docs/api/redmine.md', 'docs/integrations/redmine-mapping.md', 'docs/decisions/ADR-009-redmine-sandbox.md', 'docs/operations/redmine-sandbox.md',
  'docs/api/reporting.md', 'docs/business/metrics.md', 'AGENTS.md', 'README.md', 'docs/development-skills.md',
  'docs/database/README.md', 'docs/database/system-design.md',
  'docs/business/execution-results.md', 'docs/decisions/ADR-005-execution-database.md',
  'docs/api/execution.md', 'docs/api/test-cases.md',
  'docs/planning/README.md', 'docs/planning/06-execution-guide.md', 'docs/planning/sprints/SPRINT-05.md',
  'docs/reviews/2026-09-29-sprint-05.md',
  'docs/api/work-items.md', 'docs/business/defect-lifecycle.md', 'docs/decisions/ADR-006-internal-work-items.md',
  'docs/api/retest.md', 'docs/business/retest-policy.md', 'docs/decisions/ADR-007-internal-retest.md', 'docs/decisions/ADR-008-internal-reporting.md',
];
for (const file of documents) {
  for (const [, target] of read(file).matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|#)/.test(target)) continue;
    if (!fs.existsSync(path.resolve(root, path.dirname(file), target.split('#')[0]))) throw Error(`Broken link: ${file} -> ${target}`);
  }
}
console.log(`PASS: STATUS JSON (${status.activeSprint}), ${operations} S03–S10 operations, local schema references, path parameters and ${documents.length} documents' local links.`);
