// Scan resolved public Maven runtime coordinates; never sends source, config or credentials.
// Generate input with dependency:list -DincludeScope=runtime -DoutputFile=target/runtime-dependencies.txt.
const fs = require('node:fs');
const path = require('node:path');

async function post(queries) {
  const response = await fetch('https://api.osv.dev/v1/querybatch', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }), signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`OSV HTTP ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body.results) || body.results.length !== queries.length) throw new Error('Incomplete OSV response');
  return body.results;
}

async function main() {
  const input = process.argv[2] || 'Backend/target/runtime-dependencies.txt';
  const output = process.argv[3] || 'Backend/target/security/runtime-advisories.json';
  const dependencies = new Map();
  for (const line of fs.readFileSync(input, 'utf8').split(/\r?\n/)) {
    const match = line.trim().match(/^([^:\s]+):([^:\s]+):jar:(?:([^:\s]+):)?([^:\s]+):(compile|runtime)(?:\s|$)/);
    if (match) {
      const name = `${match[1]}:${match[2]}`, version = match[4];
      dependencies.set(`${name}@${version}`, { package: { ecosystem: 'Maven', name }, version });
    }
  }
  const queries = [...dependencies.values()];
  if (!queries.length) throw new Error('No resolved runtime dependencies; scan was not performed');
  const results = [];
  for (let offset = 0; offset < queries.length; offset += 50) {
    const batch = queries.slice(offset, offset + 50), responses = await post(batch);
    for (let index = 0; index < batch.length; index++) {
      let response = responses[index], pages = 0;
      const vulnerabilities = new Map();
      while (true) {
        for (const item of response.vulns || []) vulnerabilities.set(item.id, item);
        if (!response.next_page_token) break;
        if (++pages > 100) throw new Error('OSV pagination limit; scan is incomplete');
        [response] = await post([{ ...batch[index], page_token: response.next_page_token }]);
      }
      results.push({ ...batch[index], vulnerabilities: [...vulnerabilities.values()] });
    }
  }
  const affected = results.filter(item => item.vulnerabilities.length);
  const report = { checkedAt: new Date().toISOString(), source: 'https://api.osv.dev/v1/querybatch',
    scope: 'Resolved Maven runtime dependencies; excludes tests, build plugins, JDK, OS and container images',
    complete: true, dependencyCount: results.length, affectedDependencyCount: affected.length, results };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(`OSV: ${results.length} runtime dependencies, ${affected.length} with advisories. Report: ${output}`);
  for (const item of affected) console.log(`${item.package.name}@${item.version}: ${item.vulnerabilities.map(v => v.id).join(', ')}`);
  process.exitCode = affected.length ? 1 : 0;
}
main().catch(error => { console.error(`Scan incomplete: ${error.message}`); process.exitCode = 2; });
