const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkFq, acceptsSchemaInstance } = require('./Check-Contracts.cjs');
const root = path.resolve(__dirname, '..');
const java = 'backend/src/main/java/vn/syp/tms/';
const controllerFiles = {
  'file-work': ['filework/FileWorkController.java', 'filework/FileWorkSessionController.java', 'filework/FileWorkExecutionController.java', 'filework/ActionInboxController.java'],
  qa: ['qa/QaController.java', 'qa/HandoffController.java'],
};
const fixtureFiles = ['docs/api/openapi.yaml', 'docs/api/file-work.openapi.json', 'docs/api/qa.openapi.json', 'docs/api/work-items.openapi.json',
  ...Object.values(controllerFiles).flat().map(f => java + f),
  java + 'filework/FileWorkDtos.java', java + 'filework/FileWorkExecutionService.java', java + 'qa/QaDtos.java'];
function readSpec(name, directory = root) { return JSON.parse(fs.readFileSync(path.join(directory, 'docs/api/' + name + '.openapi.json'), 'utf8')); }
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tms-fq-contracts-'));
  t.after(() => {
    const absolute = path.resolve(directory), temp = path.resolve(os.tmpdir()) + path.sep;
    assert.ok(absolute.startsWith(temp) && path.basename(absolute).startsWith('tms-fq-contracts-'), 'cleanup remains inside its own temporary tree');
    fs.rmSync(absolute, { recursive: true, force: true });
  });
  for (const file of fixtureFiles) {
    const destination = path.join(directory, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, file), destination);
  }
  return directory;
}
function mutate(directory, name, action) {
  const spec = readSpec(name, directory); action(spec);
  fs.writeFileSync(path.join(directory, 'docs/api/' + name + '.openapi.json'), JSON.stringify(spec));
}
const base = '/api/v1/projects/{projectId}';
for (const [group, owner, field, valid] of [['file-work','HistoryEvent','fromState','DOING'],['file-work','HistoryEvent','toState','COMPLETED'],['qa','Create','priority','MEDIUM']]) {
  test(owner+'.'+field+' nullable enum accepts null and known values but rejects invalid non-null values', () => {
    const spec=readSpec(group), schema=spec.components.schemas[owner].properties[field];
    assert.equal(acceptsSchemaInstance(spec,schema,null),true);
    assert.equal(acceptsSchemaInstance(spec,schema,valid),true);
    for(const value of ['INVALID',0,false,{},[]])assert.equal(acceptsSchemaInstance(spec,schema,value),false);
  });
}
test('standalone ADMIN authentication names agree with configured cookie and returned CSRF headerName', () => {
  const security=fs.readFileSync(path.join(root,java+'config/SecurityConfig.java'),'utf8');
  const cookie=/setCookieName\("([^"]+)"\)/.exec(security)[1];
  assert.equal(cookie,'TMS_SESSION');
  for(const name of ['admin-management','device-inventory']) {
    const text=fs.readFileSync(path.join(root,'docs/api/'+name+'.openapi.yaml'),'utf8');
    assert.match(text,new RegExp('in: cookie, name: '+cookie+'[}\\s]'));
    assert.doesNotMatch(text,/X-XSRF-TOKEN/);
  }
  const admin=fs.readFileSync(path.join(root,'docs/api/admin-management.openapi.yaml'),'utf8');
  assert.match(admin,/X-CSRF-TOKEN/);assert.match(admin,/headerName/);
  assert.match(fs.readFileSync(path.join(root,'docs/api/openapi.yaml'),'utf8'),/name: X-CSRF-TOKEN/);
});
test('GroupSummary keeps explicit nullable milestone context and separate saved activity timestamp', () => {
  const spec=readSpec('file-work'), schema=spec.components.schemas.GroupSummary;
  for(const key of ['milestoneId','milestoneName','milestoneDueOn','latestActivityAt'])assert.ok(schema.required.includes(key));
  for(const [key,value] of [['milestoneId',6],['milestoneName','Release'],['milestoneDueOn','2026-10-06']]) {
    assert.equal(acceptsSchemaInstance(spec,schema.properties[key],null),true);
    assert.equal(acceptsSchemaInstance(spec,schema.properties[key],value),true);
    assert.equal(acceptsSchemaInstance(spec,schema.properties[key],{}),false);
  }
  assert.equal(schema.properties.milestoneDueOn.format,'date');
  assert.equal(schema.properties.latestActivityAt.format,'date-time');
  assert.match(schema.properties.latestActivityAt.description,/canonical attempt on any build/);
  assert.match(schema.properties.updatedAt.description,/Group metadata update only/);
});
test('nullable DTO enum consistency still rejects extra non-null values', t => {
  const directory=fixture(t);mutate(directory,'qa',s=>s.components.schemas.Create.properties.priority.enum.push('CRITICAL'));
  assert.throws(()=>checkFq(directory),/DTO pattern mismatch: qa\/Create.priority/);
});
test('required DTO enums cannot gain a null branch through pattern comparison', t => {
  const directory=fixture(t);mutate(directory,'file-work',s=>{s.components.schemas.FileAttempt.properties.resultCode.enum.push(null);s.components.schemas.FileAttempt.properties.resultCode.nullable=true;});
  assert.throws(()=>checkFq(directory),/DTO pattern mismatch: file-work\/FileAttempt.resultCode/);
});
const nullableObjects = [
  { group: 'qa', owner: 'QaDetail', field: 'currentAnswer', target: 'QaAnswer', value: { id: 10, workItemId: 2, generation: 0, answerVersion: 1, body: 'Verified explanation', basisReference: '', authorMembershipId: 3, authorName: 'Dev', answeredAt: '2026-10-06T00:00:00Z' } },
  { group: 'qa', owner: 'QaDetail', field: 'currentConfirmation', target: 'QaConfirmation', value: { id: 11, workItemId: 2, generation: 0, answerId: 10, answerVersion: 1, body: 'Confirmed', confirmedBy: 4, confirmerName: 'Tester', confirmedAt: '2026-10-06T01:00:00Z' } },
  { group: 'file-work', owner: 'ExecutionRow', field: 'physicalAsset', target: 'PhysicalAsset', value: { id: 5, assetCode: 'IPAD-5', type: 'IPAD', model: 'iPad', serial: null, osName: 'iPadOS', osVersion: null } },
];
for (const entry of nullableObjects) {
  test(entry.owner + '.' + entry.field + ' accepts null and complete objects, rejects malformed non-null values', () => {
    const spec = readSpec(entry.group), schema = spec.components.schemas[entry.owner].properties[entry.field];
    assert.equal(acceptsSchemaInstance(spec, schema, null), true, 'legitimate missing current object must validate');
    assert.equal(acceptsSchemaInstance(spec, schema, entry.value), true, 'populated read model must validate');
    for (const value of [{}, { ...entry.value, id: 'wrong type' }, { ...entry.value, id: 0 }, [], 'invalid', 1, false]) assert.equal(acceptsSchemaInstance(spec, schema, value), false, 'invalid non-null value must not bypass referenced object constraints');
    const historySchema = spec.components.schemas[entry.target];
    assert.equal(acceptsSchemaInstance(spec, historySchema, null), false, 'history/snapshot object schema stays non-nullable');
    assert.equal(acceptsSchemaInstance(spec, historySchema, entry.value), true);
    assert.equal(acceptsSchemaInstance(spec, historySchema, {}), false);
  });
  test('fixture original nullable/allOf regression fails for ' + entry.field, t => {
    const directory = fixture(t);
    mutate(directory, entry.group, spec => { spec.components.schemas[entry.owner].properties[entry.field] = { type: 'object', nullable: true, allOf: [{ $ref: '#/components/schemas/' + entry.target }] }; });
    assert.throws(() => checkFq(directory), /Nullable object composition rejects null/);
  });
}
test('focused evaluator keeps nullable type separate from allOf and enum constraints', () => {
  const spec = readSpec('qa'), ref = { $ref: '#/components/schemas/QaAnswer' };
  assert.equal(acceptsSchemaInstance(spec, { type: 'object', nullable: true, allOf: [ref] }, null), false);
  assert.equal(acceptsSchemaInstance(spec, { type: 'object', nullable: true, enum: [null] }, null), true);
  assert.equal(acceptsSchemaInstance(spec, { type: 'object', nullable: true, enum: [null] }, {}), false);
});

test('JSON schemas parse and operation inventory equals actual controllers, including shared GET/POST paths', () => {
  // Independent source annotation scan: do not infer completeness from a hardcoded operation count.
  for (const group of ['file-work', 'qa']) {
    const expected = controllerFiles[group].flatMap(file => {
      const source = fs.readFileSync(path.join(root, java + file), 'utf8');
      const prefix = /@RequestMapping\("([^"]+)"\)/.exec(source)[1];
      return [...source.matchAll(/@(Get|Post|Put|Patch|Delete)Mapping(?:\("([^"]*)"\))?/g)].map(([, method, suffix = '']) => method.toLowerCase() + ' ' + prefix + suffix);
    }).sort();
    const spec = readSpec(group);
    const actual = Object.entries(spec.paths).flatMap(([route, item]) => ['get', 'post', 'put', 'patch', 'delete'].filter(method => item[method]).map(method => method + ' ' + route)).sort();
    assert.deepEqual(actual, expected);
    for (const schema of Object.values(spec.components.schemas)) assert.ok(schema.type || schema.allOf, 'each named schema has an actual shape');
  }
  const result = checkFq(root);
  assert.deepEqual(result.operations, { 'file-work': 19, qa: 14 });
  assert.deepEqual(result.schemas, { 'file-work': 34, qa: 19 });
});
test('fixture removal of a controller operation fails', t => {
  const directory = fixture(t);
  mutate(directory, 'qa', s => { delete s.paths[base + '/qa/{id}/answers'].get; });
  assert.throws(() => checkFq(directory), /Missing controller operation: get .*\/answers/);
});
test('fixture phantom session GET fails', t => {
  const directory = fixture(t);
  mutate(directory, 'file-work', s => { s.paths[base + '/file-work-sessions/{sessionId}'] = { get: s.paths[base + '/file-work-groups/{groupId}'].get }; });
  assert.throws(() => checkFq(directory), /Unexpected operation/);
});
test('fixture unresolved local schema reference fails', t => {
  const directory = fixture(t);
  mutate(directory, 'qa', s => { s.components.schemas.QaDetail.properties.item.$ref = '#/components/schemas/MissingSummary'; });
  assert.throws(() => checkFq(directory), /Unresolved reference: .*MissingSummary/);
});
test('fixture shared project path parameter mismatch fails', t => {
  const directory = fixture(t);
  mutate(directory, 'file-work', s => { s.components.parameters.projectId.schema.minimum = 0; });
  assert.throws(() => checkFq(directory), /Path parameter mismatch: .*projectId/);
});
test('fixture query parameter binding default mismatch fails', t => {
  const directory = fixture(t);
  mutate(directory, 'qa', s => { s.paths[base + '/qa'].get.parameters.find(p => p.name === 'mine').schema.default = true; });
  assert.throws(() => checkFq(directory), /Query parameter mismatch: .*mine/);
});
test('fixture undocumented handoff query is detected by source inventory', t => {
  const directory = fixture(t);
  mutate(directory, 'qa', s => { s.paths[base + '/handoff-queue'].get.parameters = s.paths[base + '/handoff-queue'].get.parameters.filter(p => p.name !== 'keyword'); });
  assert.throws(() => checkFq(directory), /Query parameter inventory mismatch/);
});
test('fixture request DTO limit mismatch fails', t => {
  const directory = fixture(t);
  mutate(directory, 'qa', s => { s.components.schemas.Answer.properties.body.maxLength = 1000; });
  assert.throws(() => checkFq(directory), /DTO limit mismatch: qa\/Answer.body/);
});
test('fixture response DTO nullability mismatch fails', t => {
  const directory = fixture(t);
  mutate(directory, 'qa', s => { delete s.components.schemas.QaSummary.properties.currentAnswerId.nullable; });
  assert.throws(() => checkFq(directory), /DTO nullable mismatch: qa\/QaSummary.currentAnswerId/);
});
test('fixture empty success response placeholder fails', t => {
  const directory = fixture(t);
  mutate(directory, 'file-work', s => { s.components.schemas.Preview = { type: 'object', properties: {} }; });
  assert.throws(() => checkFq(directory), /Empty response placeholder/);
});
test('fixture valid but wrong success response schema fails', t => {
  const directory = fixture(t);
  mutate(directory, 'qa', s => { s.paths[base + '/qa'].get.responses['200'].content['application/json'].schema.$ref = '#/components/schemas/QaDetail'; });
  assert.throws(() => checkFq(directory), /Response schema mismatch/);
});
test('fixture lost typed QA discovery capability fails independently of ordinary canCreate', t => {
  const directory = fixture(t);
  mutate(directory, 'work-items', s => { delete s.paths[base + '/work-items/metadata'].get.responses['200'].content['application/json'].schema.properties.canCreateQa; });
  assert.throws(() => checkFq(directory), /required canCreateQa discovery separate/);
});
test('fixture wrong export MIME fails', t => {
  const directory = fixture(t);
  mutate(directory, 'file-work', s => { const content = s.paths[base + '/file-work-groups/{groupId}/export'].get.responses['200'].content; content['application/octet-stream'] = Object.values(content)[0]; delete content['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']; });
  assert.throws(() => checkFq(directory), /binary export mime\/cache\/disposition/);
});
