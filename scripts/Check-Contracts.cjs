// Structural checks only; not a full OpenAPI, Spring mapping, HTTP, policy or database validator.
const fs = require('node:fs');
const path = require('node:path');
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const LEGACY = ['project-settings', 'test-cases', 'execution', 'work-items', 'retest', 'reporting', 'redmine'];
const JAVA = 'backend/src/main/java/vn/syp/tms/';
const CONTROLLERS = {
 'file-work': ['filework/FileWorkController.java', 'filework/FileWorkSessionController.java', 'filework/FileWorkExecutionController.java'],
 qa: ['qa/QaController.java', 'qa/HandoffController.java'],
};
const fail = message => { throw Error(message); };
function loader(root) {
 const read = file => fs.readFileSync(path.resolve(root, file), 'utf8'), cache = new Map();
 const json = file => { if (!cache.has(file)) cache.set(file, JSON.parse(read(file))); return cache.get(file); };
 function resolve(file, reference) {
  if (typeof reference !== 'string' || /^(?:https?:|file:)/.test(reference)) fail('Unsupported reference: ' + reference);
  const [target, fragment] = reference.split('#');
  const destination = target ? path.relative(root, path.resolve(root, path.dirname(file), target)).replaceAll('\\', '/') : file;
  if (destination.startsWith('../') || !fragment?.startsWith('/')) fail('Unsupported reference: ' + reference);
  // Legacy test-case contracts point to the shared YAML Error response. Check its mapping hierarchy
  // without pretending to parse/validate all YAML or its Schema Objects.
  if (destination === 'docs/api/openapi.yaml' && fragment === '/components/responses/Error') {
   const yaml = read(destination);
   if (!/^components:\r?\n[\s\S]*?^  responses:\r?\n[\s\S]*?^    Error:\s*$/m.test(yaml)) fail('Unresolved reference: ' + file + ' ' + reference);
   return { description: 'Shared YAML Error response (mapping existence only)' };
  }
  if (!destination.endsWith('.json')) fail('Unsupported reference: ' + reference);
  const value = fragment.slice(1).split('/').reduce((node, part) => node?.[part.replace(/~1/g, '/').replace(/~0/g, '~')], json(destination));
  if (value === undefined) fail('Unresolved reference: ' + file + ' ' + reference);
  return value;
 }
 function refs(value, file) {
  if (!value || typeof value !== 'object') return;
  if (value.$ref) resolve(file, value.$ref);
  Object.values(value).forEach(child => refs(child, file));
 }
 return { read, json, resolve, refs };
}
/** Scoped parser: the actual controllers use single literal class/method mappings. */
function controllerInventory(root, group) {
 const { read } = loader(root), result = [];
 for (const file of CONTROLLERS[group]) {
  const source = read(JAVA + file), base = source.match(/@RequestMapping\("([^"]+)"\)/)?.[1];
  if (!base) fail('Controller base missing: ' + file);
  const mappings = [...source.matchAll(/@(Get|Post|Put|Patch|Delete)Mapping(?:\("([^"]*)"\))?\s+public\s+([^{}]+?)\)\s*\{/g)];
  if (!mappings.length) fail('Controller operations missing: ' + file);
  for (const [, verb, suffix = '', signature] of mappings) {
   const queries = [...signature.matchAll(/@RequestParam(?:\(([^)]*)\))?\s+(int|long|boolean|Long|String)\s+(\w+)/g)].map(([, annotation = '', type, name]) => ({
    name, type, required: !annotation.includes('required=false') && !annotation.includes('defaultValue='),
    default: annotation.match(/defaultValue="([^"]*)"/)?.[1],
   }));
   result.push({ method: verb.toLowerCase(), route: base + suffix, queries, body: signature.match(/@RequestBody\s+([\w.]+)\s+\w+/)?.[1]?.split('.').pop(), file });
  }
 }
 return result;
}
function splitFields(value) {
 let depth = 0, start = 0, result = [];
 for (let i = 0; i < value.length; i++) {
  if ('(<'.includes(value[i])) depth++;
  if (')>'.includes(value[i])) depth--;
  if (value[i] === ',' && depth === 0) { result.push(value.slice(start, i).trim()); start = i + 1; }
 }
 result.push(value.slice(start).trim());
 return result;
}
function records(source) {
 return new Map([...source.matchAll(/record\s+(\w+)(?:<[^>]+>)?\s*\(([\s\S]*?)\)\s*(?:\{|;)/g)].map(([, name, fields]) => [name, splitFields(fields)]));
}
function checkDto(schema, fields, label, response = false) {
 if (!schema || !fields) fail('DTO missing: ' + label);
 const names = fields.map(field => field.match(/(\w+)$/)?.[1]);
 if (JSON.stringify(Object.keys(schema.properties).sort()) !== JSON.stringify([...names].sort())) fail('DTO fields mismatch: ' + label);
 fields.forEach((field, index) => {
  const name = names[index], property = schema.properties[name], required = schema.required?.includes(name);
  if ((response || /@Not(?:Null|Blank|Empty)/.test(field)) && !required) fail('DTO required mismatch: ' + label + '.' + name);
  const clean = field.replace(/@\w+(?:\([^)]*\))?\s*/g, '').trim();
  const type = clean.slice(0, clean.lastIndexOf(name)).trim();
  const expected = /^(Long|long|int)$/.test(type) ? 'integer' : type === 'boolean' ? 'boolean' : type === 'String' || type === 'Instant' ? 'string' : type.startsWith('List<') ? 'array' : null;
  if (expected && property.type !== expected) fail('DTO type mismatch: ' + label + '.' + name);
  if (response && type === 'Long' && !property.nullable) fail('DTO nullable mismatch: ' + label + '.' + name);
  if (!response) {
   const max = field.match(/@Size\(max=(\d+)\)/)?.[1];
   if (max && property[expected === 'array' ? 'maxItems' : 'maxLength'] !== Number(max)) fail('DTO limit mismatch: ' + label + '.' + name);
   if (expected === 'integer' && /@Positive\b/.test(field) && property.minimum !== 1) fail('DTO minimum mismatch: ' + label + '.' + name);
   if (expected === 'integer' && /@PositiveOrZero\b/.test(field) && property.minimum !== 0) fail('DTO version mismatch: ' + label + '.' + name);
   if (expected === 'array' && /@NotEmpty/.test(field) && property.minItems !== 1) fail('DTO array minimum mismatch: ' + label + '.' + name);
   const pattern = field.match(/@Pattern\(regexp="([^"]*)"\)/)?.[1];
   // Bean Validation @Pattern permits null unless a separate required constraint forbids it.
   const enumValues = property.nullable && !/@Not(?:Null|Blank|Empty)/.test(field) ? property.enum?.filter(value => value !== null) : property.enum;
   if (pattern && property.pattern?.replace(/^\^|\$$/g, '') !== pattern && enumValues?.join('|') !== pattern) fail('DTO pattern mismatch: ' + label + '.' + name);
  }
 });
}
function invariant(value, name) { if (!value) fail('F/Q invariant: ' + name); }
// Focused Schema Object instance check for the nullable response compositions below. This is
// intentionally limited to their local refs/types/composition/enum/object/array/bounds vocabulary.
// Nullable affects only this schema's explicit type; it never bypasses allOf/anyOf or enum.
function acceptsSchemaInstance(spec, schema, value) {
 if (schema.$ref) {
  if (!schema.$ref.startsWith('#/')) fail('Unsupported instance reference: ' + schema.$ref);
  const target = schema.$ref.slice(2).split('/').reduce((node, part) => node?.[part.replace(/~1/g, '/').replace(/~0/g, '~')], spec);
  if (!target) fail('Unresolved instance reference: ' + schema.$ref);
  return acceptsSchemaInstance(spec, target, value);
 }
 if (schema.type) {
  const matches = value === null ? schema.nullable === true
   : schema.type === 'object' ? typeof value === 'object' && !Array.isArray(value)
   : schema.type === 'array' ? Array.isArray(value)
   : schema.type === 'integer' ? Number.isInteger(value)
   : schema.type === 'number' ? typeof value === 'number' && Number.isFinite(value)
   : typeof value === schema.type;
  if (!matches) return false;
 }
 if (schema.enum && !schema.enum.some(option => JSON.stringify(option) === JSON.stringify(value))) return false;
 if (schema.allOf && !schema.allOf.every(child => acceptsSchemaInstance(spec, child, value))) return false;
 if (schema.anyOf && !schema.anyOf.some(child => acceptsSchemaInstance(spec, child, value))) return false;
 if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
  if (schema.required?.some(name => !Object.hasOwn(value, name))) return false;
  for (const [name, child] of Object.entries(value)) {
   if (schema.properties?.[name] && !acceptsSchemaInstance(spec, schema.properties[name], child)) return false;
   if (!schema.properties?.[name] && schema.additionalProperties === false) return false;
  }
 }
 if (Array.isArray(value)) {
  if (schema.minItems !== undefined && value.length < schema.minItems || schema.maxItems !== undefined && value.length > schema.maxItems) return false;
  if (schema.items && !value.every(item => acceptsSchemaInstance(spec, schema.items, item))) return false;
 }
 if (typeof value === 'number' && (schema.minimum !== undefined && value < schema.minimum || schema.maximum !== undefined && value > schema.maximum)) return false;
 if (typeof value === 'string' && (schema.minLength !== undefined && value.length < schema.minLength || schema.maxLength !== undefined && value.length > schema.maxLength || schema.pattern && !new RegExp(schema.pattern).test(value))) return false;
 return true;
}
function checkFq(root) {
 const { read, json, resolve, refs } = loader(root), main = read('docs/api/openapi.yaml').replaceAll('\r\n', '\n'), ids = new Set(), counts = {};
 for (const group of ['file-work', 'qa']) {
  const file = 'docs/api/' + group + '.openapi.json', spec = json(file), inventory = controllerInventory(root, group);
  invariant(spec.openapi === '3.0.3', group + ' OpenAPI version');
  refs(spec, file);
  const actual = Object.entries(spec.paths).flatMap(([route, item]) => METHODS.filter(method => item[method]).map(method => ({ route, method })));
  const expectedKeys = new Set(inventory.map(v => v.method + ' ' + v.route));
  for (const entry of actual) if (!expectedKeys.has(entry.method + ' ' + entry.route)) fail('Unexpected operation: ' + entry.method + ' ' + entry.route);
  for (const expected of inventory) {
   const item = spec.paths[expected.route], operation = item?.[expected.method];
   if (!operation) fail('Missing controller operation: ' + expected.method + ' ' + expected.route);
   const encoded = expected.route.replaceAll('~', '~0').replaceAll('/', '~1');
   const index = '  ' + expected.route + ':\n    $ref: "./' + group + '.openapi.json#/paths/' + encoded + '"';
   if (!main.includes(index)) fail('Main contract index mismatch: ' + expected.route);
   resolve('docs/api/openapi.yaml', './' + group + '.openapi.json#/paths/' + encoded);
   if (!operation.operationId || ids.has(operation.operationId)) fail('Invalid operation ID: ' + operation.operationId);
   ids.add(operation.operationId);
   const parameters = [...(item.parameters || []), ...(operation.parameters || [])].map(p => p.$ref ? resolve(file, p.$ref) : p);
   for (const [, name] of expected.route.matchAll(/\{(\w+)\}/g)) {
    const parameter = parameters.find(p => p.name === name && p.in === 'path');
    if (!parameter?.required || parameter.schema?.type !== 'integer' || parameter.schema?.format !== 'int64' || parameter.schema?.minimum !== 1) fail('Path parameter mismatch: ' + expected.route + '/' + name);
   }
   const queries = parameters.filter(p => p.in === 'query');
   if (JSON.stringify(queries.map(p => p.name).sort()) !== JSON.stringify(expected.queries.map(p => p.name).sort())) fail('Query parameter inventory mismatch: ' + expected.route);
   for (const expectedQuery of expected.queries) {
    const parameter = queries.find(p => p.name === expectedQuery.name), schema = parameter.schema;
    const type = expectedQuery.type === 'String' ? 'string' : expectedQuery.type === 'boolean' ? 'boolean' : 'integer';
    if (schema.type !== type || !!parameter.required !== expectedQuery.required || expectedQuery.default !== undefined && String(schema.default) !== expectedQuery.default) fail('Query parameter mismatch: ' + expected.route + '/' + expectedQuery.name);
    if (parameter.name === 'page' && schema.minimum !== 0 || parameter.name === 'size' && (schema.minimum !== 1 || schema.maximum !== 100)) fail('Paging limit mismatch: ' + expected.route);
   }
   const body = operation.requestBody?.content?.['application/json']?.schema;
   if (!!body !== !!expected.body) fail('Request body mismatch: ' + expected.route);
   if (body) {
    const name = expected.body === 'SessionCommand' && /\/(pause|cancel)$/.test(expected.route) ? expected.route.endsWith('/pause') ? 'PauseCommand' : 'CancelCommand' : expected.body;
    if (!operation.requestBody.required || body.$ref !== '#/components/schemas/' + name) fail('Request DTO mismatch: ' + expected.route);
   }
   const status = expected.method === 'post' && /\/(qa|file-work-groups|sessions|attempts)$/.test(expected.route) ? '201' : '200';
   if (!operation.responses?.[status]?.content) fail('Success response missing: ' + expected.route);
   const suffix = expected.route.split('/projects/{projectId}')[1];
   const responseName = group === 'qa' ? suffix === '/handoff-queue' ? 'HandoffPage' : suffix === '/qa' && expected.method === 'get' ? 'QaPage' : expected.method === 'get' && suffix.endsWith('/answers') ? 'AnswerPage' : expected.method === 'get' && suffix.endsWith('/confirmations') ? 'ConfirmationPage' : 'QaDetail'
    : suffix.endsWith('/metadata') ? 'Metadata' : suffix.endsWith('/preview') ? 'Preview' : suffix.endsWith('/history') ? 'History' : suffix.endsWith('/eligible-allocations') ? 'EligibleAllocations' : suffix.endsWith('/execution') ? 'ExecutionView' : suffix.endsWith('/attempts') ? 'Attempt' : suffix.endsWith('/sessions') ? expected.method === 'get' ? 'SessionPage' : 'Session' : suffix.startsWith('/file-work-sessions/') ? 'Session' : suffix === '/file-work-groups' && expected.method === 'get' ? 'GroupPage' : 'GroupDetail';
   if (!suffix.endsWith('/export') && operation.responses[status].content['application/json']?.schema.$ref !== '#/components/schemas/' + responseName) fail('Response schema mismatch: ' + expected.route);
   if (status === '201' && !operation.responses[status].headers?.Location) fail('Location header missing: ' + expected.route);
   for (const code of ['400', '401', '403', '404', '409', '422']) if (!operation.responses[code]?.content?.['application/json']?.schema?.$ref) fail('Error schema missing: ' + expected.route + '/' + code);
   if (!operation.security?.[0]?.sessionCookie || expected.method !== 'get' && !operation.security[0].csrfHeader) fail('Security mismatch: ' + expected.route);
   for (const response of Object.values(operation.responses)) for (const media of Object.values(response.content || {})) {
    const schema = media.schema.$ref ? resolve(file, media.schema.$ref) : media.schema;
    if (schema.type === 'object' && !Object.keys(schema.properties || {}).length && !schema.allOf) fail('Empty response placeholder: ' + expected.route);
   }
  }
  const dtoRecords = records(read(JAVA + (group === 'qa' ? 'qa/QaDtos.java' : 'filework/FileWorkDtos.java')));
  if (group === 'file-work') dtoRecords.set('FileAttempt', records(read(JAVA + 'filework/FileWorkExecutionService.java')).get('FileAttempt'));
  for (const name of group === 'qa' ? ['Create', 'Assign', 'Command', 'ProvideInfo', 'Answer', 'Confirm', 'Close'] : ['Scope', 'Create', 'RunVersion', 'Assignment', 'Start', 'SessionCommand', 'FileAttempt']) checkDto(spec.components.schemas[name], dtoRecords.get(name), group + '/' + name);
  if (group === 'qa') for (const name of ['QaSummary', 'QaDetail', 'QaAnswer', 'QaConfirmation', 'Capabilities']) checkDto(spec.components.schemas[name], dtoRecords.get(name), 'qa/' + name, true);
  counts[group] = actual.length;
 }
 const f = json('docs/api/file-work.openapi.json'), q = json('docs/api/qa.openapi.json'), w = json('docs/api/work-items.openapi.json');
 const schema = (s, n) => s.components.schemas[n];
 for (const [spec, owner, name, target] of [[q, 'QaDetail', 'currentAnswer', 'QaAnswer'], [q, 'QaDetail', 'currentConfirmation', 'QaConfirmation'], [f, 'ExecutionRow', 'physicalAsset', 'PhysicalAsset']]) {
  const property = schema(spec, owner).properties[name];
  if (!acceptsSchemaInstance(spec, property, null)) fail('Nullable object composition rejects null: ' + owner + '.' + name);
  invariant(property.anyOf?.some(branch => branch.$ref === '#/components/schemas/' + target), 'nullable object retains strict reference: ' + owner + '.' + name);
  invariant(!acceptsSchemaInstance(spec, schema(spec, target), null), 'history object remains non-nullable: ' + target);
  invariant([{}, [], 'invalid', 1, false].every(value => !acceptsSchemaInstance(spec, property, value)), 'nullable object rejects malformed non-null values: ' + owner + '.' + name);
 }
 const metadata = w.paths['/api/v1/projects/{projectId}/work-items/metadata'].get.responses['200'].content['application/json'].schema;
 invariant(metadata.properties.canCreateQa?.type === 'boolean' && metadata.required.includes('canCreateQa'), 'required canCreateQa discovery separate from canCreate');
 invariant(metadata.properties.statusesByType?.properties.QA?.items?.required.includes('terminal'), 'actual statusesByType.QA metadata shape');
 invariant(!metadata.properties.qaStatuses && !metadata.properties.canUpdate, 'no phantom generic metadata');
 const genericCreate = w.paths['/api/v1/projects/{projectId}/work-items'].post;
 invariant(genericCreate.description.includes('QA không được tạo') && genericCreate.responses['409'] && w.components.schemas.CreateWorkItem.properties.type.description.includes('QA_COMMAND_REQUIRED'), 'generic POST rejects QA with conflict response');
 invariant(w.components.schemas.WorkItem.properties.type.enum.includes('QA'), 'generic reads include QA');
 invariant(JSON.stringify(Object.keys(w.components.schemas.WorkItem.properties.capabilities.properties).sort()) === JSON.stringify(Object.keys(schema(q, 'Capabilities').properties).sort()), 'generic/typed QA capabilities');
 invariant(schema(f, 'Metadata').properties.canCreate.type === 'boolean' && !schema(f, 'Metadata').properties.canCreateQa, 'file discovery distinct from QA');
 invariant(schema(f, 'GroupPage').properties.pageSize && !schema(f, 'GroupPage').properties.size && schema(q, 'QaPage').properties.size && !schema(q, 'QaPage').properties.pageSize, 'pageSize versus size');
 invariant(schema(f, 'FileAttempt').properties.resultCode.enum.join('|') === 'OK|NG|P' && !schema(f, 'FileAttempt').properties.origin && !schema(f, 'FileAttempt').properties.actor, 'canonical public file attempt');
 const exp = f.paths['/api/v1/projects/{projectId}/file-work-groups/{groupId}/export'].get.responses['200'];
 invariant(exp.content['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']?.schema.format === 'binary' && exp.headers['Cache-Control'].schema.enum.includes('private, no-store') && exp.headers['Content-Disposition'], 'binary export mime/cache/disposition');
 invariant(schema(f, 'Counts').properties.executionRate.nullable && schema(f, 'Counts').properties.passRate.nullable, 'zero-denominator nullable percentages');
 invariant(schema(q, 'HandoffRow').properties.canClose.type === 'boolean' && schema(q, 'HandoffRow').properties.canPrepareRetest.type === 'boolean', 'handoff capability versus state');
 return { operations: counts, schemas: { 'file-work': Object.keys(f.components.schemas).length, qa: Object.keys(q.components.schemas).length } };
}
function checkAll(root = path.resolve(__dirname, '..')) {
 const { read, json, resolve, refs } = loader(root), main = read('docs/api/openapi.yaml'), status = json('docs/planning/STATUS.json'), ids = new Set();
 let operations = 0;
 for (const name of LEGACY) {
  const file = 'docs/api/' + name + '.openapi.json', spec = json(file);
  for (const [route, item] of Object.entries(spec.paths)) {
   if (!main.includes('  ' + route + ':')) fail('Main contract lacks ' + route);
   for (const method of METHODS) {
    const operation = item[method]; if (!operation) continue;
    if (!operation.operationId || ids.has(operation.operationId)) fail('Invalid operation ID: ' + operation.operationId);
    ids.add(operation.operationId); operations++;
    const parameters = [...(item.parameters || []), ...(operation.parameters || [])].map(p => p.$ref ? resolve(file, p.$ref) : p);
    for (const [, name] of route.matchAll(/\{(\w+)\}/g)) if (!parameters.some(p => p.name === name && p.in === 'path' && p.required)) fail('Missing path parameter: ' + route + '/' + name);
   }
  }
  refs(spec, file);
 }
 const fq = checkFq(root);
 for (const name of ['file-work', 'qa']) for (const item of Object.values(json('docs/api/' + name + '.openapi.json').paths)) for (const method of METHODS) if (item[method]) {
  if (ids.has(item[method].operationId)) fail('Duplicate legacy/FQ operation ID: ' + item[method].operationId);
  ids.add(item[method].operationId);
 }
 // Resolve every quoted JSON path-item index reference. Entire YAML is not parsed/validated.
 for (const [, reference] of main.matchAll(/\$ref:\s*["'](\.\/[^"']+\.json#\/[^"']+)["']/g)) resolve('docs/api/openapi.yaml', reference);
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
  'docs/api/file-work.md', 'docs/api/qa.md',
];
 for (const file of documents) for (const [, target] of read(file).matchAll(/\]\(([^)]+)\)/g)) {
  if (/^(https?:|#)/.test(target)) continue;
  if (!fs.existsSync(path.resolve(root, path.dirname(file), target.split('#')[0]))) fail('Broken link: ' + file + ' -> ' + target);
 }
 return { activeSprint: status.activeSprint, legacyOperations: operations, ...fq, documents: documents.length };
}
module.exports = { checkAll, checkFq, controllerInventory, acceptsSchemaInstance };
if (require.main === module) {
 const result = checkAll();
 console.log('PASS: STATUS JSON (' + result.activeSprint + '), ' + result.legacyOperations + ' S03–S10 operations, ' + result.operations['file-work'] + ' file-work + ' + result.operations.qa + ' QA/handoff operations, ' + result.schemas['file-work'] + '+' + result.schemas.qa + ' F/Q schemas, local references, controller routes/parameters, DTO constraints and ' + result.documents + ' documents local links. Structural only; not full OpenAPI or HTTP verification.');
}
