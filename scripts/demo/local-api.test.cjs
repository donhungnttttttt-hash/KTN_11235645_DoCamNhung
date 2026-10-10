const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { LocalApi, Journal, validateBaseUrl } = require('./local-api.cjs');

test('demo client refuses remote destinations and redirects', async () => {
  for (const url of ['https://example.com', 'http://127.0.0.1.evil', 'http://user:pw@localhost', 'http://localhost/api', 'http://localhost?x=1']) {
    assert.throws(() => validateBaseUrl(url));
  }
  assert.equal(validateBaseUrl('http://127.0.0.1:8080'), 'http://127.0.0.1:8080');
  const client = new LocalApi('http://localhost:8080', async (_, options) => {
    assert.equal(options.redirect, 'error');
    return new Response(JSON.stringify({ code: 'FORBIDDEN', message: 'sensitive detail' }), {status: 403});
  });
  await assert.rejects(client.get('//external'), /path/);
  await assert.rejects(client.get('/users'), error => error.message === 'GET /users: HTTP 403 FORBIDDEN');
});

test('client keeps session and obtains CSRF for every mutation without printing credentials', async () => {
  let count = 0;
  const client = new LocalApi('http://localhost:8080', async (url, options) => {
    count++;
    if (url.endsWith('/auth/csrf')) return new Response(JSON.stringify({token:'csrf-test',headerName:'X-CSRF-TOKEN'}), {headers: {'set-cookie':'TMS_SESSION=session-test; HttpOnly'}});
    assert.equal(options.headers.Cookie, 'TMS_SESSION=session-test');
    assert.equal(options.headers['X-CSRF-TOKEN'], 'csrf-test');
    return new Response(null, {status: 204});
  });
  assert.equal(await client.write('POST','/auth/logout'), null);
  assert.equal(count, 2);
});

test('journal resumes confirmed operations, rejects wrong target and stops uncertain writes', async () => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'tms-seed-')), 'journal.json');
  const identity = {schema:1, origin:'http://localhost:8080', projectCode:'DEMO-PILOT'};
  const journal = new Journal(file, identity);
  let calls=0;
  assert.deepEqual(await journal.once('project', async()=>{calls++;return {id:42};}), {id:42});
  const again = new Journal(file, identity);
  assert.deepEqual(await again.once('project',async()=>{calls++;}),{id:42});
  assert.equal(calls,1);
  assert.throws(()=>new Journal(file,{...identity,origin:'http://localhost:8180'}),/target/);
  await assert.rejects(again.once('uncertain',async()=>{throw Error('connection lost');}), /connection lost/);
  await assert.rejects(again.once('uncertain',async()=>calls++), /Unconfirmed/);
  assert.equal(JSON.parse(readFileSync(file)).pending,'uncertain');
});
