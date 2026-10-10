const fs = require('node:fs');
const path = require('node:path');

function validateBaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)
      || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw Error('Demo requires a loopback HTTP origin without credentials or path.');
  }
  return url.origin;
}

class LocalApi {
  constructor(origin, transport = fetch) {
    this.origin = validateBaseUrl(origin);
    this.transport = transport;
    this.cookies = new Map();
  }
  async request(method, route, body, headers = {}, binary = false) {
    if (!route.startsWith('/') || route.startsWith('//') || route.includes('\\')) throw Error('Invalid API path');
    const response = await this.transport(this.origin + '/api/v1' + route, {
      method, redirect: 'error', signal: AbortSignal.timeout(60000),
      headers: {Cookie: [...this.cookies].map(([k,v]) => `${k}=${v}`).join('; '), ...headers},
      ...(body === undefined ? {} : {body}),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const first = cookie.split(';')[0], split = first.indexOf('=');
      this.cookies.set(first.slice(0,split), first.slice(split+1));
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      // Do not print response bodies, credentials, tokens or supplied content.
      const code = /^[A-Z_]+$/.test(error.code || '') ? error.code : 'API_ERROR';
      throw Error(`${method} ${route.split('?')[0]}: HTTP ${response.status} ${code}`);
    }
    if (response.status === 204) return null;
    return binary ? Buffer.from(await response.arrayBuffer()) : response.json();
  }
  get(route) { return this.request('GET', route); }
  async write(method, route, body) {
    const csrf = await this.get('/auth/csrf');
    return this.request(method, route, body === undefined ? undefined : JSON.stringify(body), {
      'Content-Type': 'application/json', [csrf.headerName]: csrf.token,
    });
  }
  async upload(route, name, bytes, type) {
    const csrf = await this.get('/auth/csrf');
    const form = new FormData();form.append('file', new Blob([bytes], {type}), name);
    return this.request('POST',route,form,{[csrf.headerName]:csrf.token});
  }
}

// A confirmed step is never repeated. An interrupted write must be reconciled
// against the server before proceeding; silently replaying it can corrupt a demo.
class Journal {
  constructor(file, identity) {
    this.file = file;
    this.state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,'utf8')) : {identity,done:{},pending:null};
    if (JSON.stringify(this.state.identity) !== JSON.stringify(identity)) throw Error('Journal target does not match.');
  }
  save() {
    fs.mkdirSync(path.dirname(this.file), {recursive:true});
    fs.writeFileSync(this.file+'.tmp', JSON.stringify(this.state,null,2)+'\n', {mode:0o600});
    fs.renameSync(this.file+'.tmp',this.file);
  }
  async once(key, action) {
    if (Object.hasOwn(this.state.done,key)) return this.state.done[key];
    if (this.state.pending) throw Error(`Unconfirmed step ${this.state.pending}; reconcile server state before resuming.`);
    this.state.pending=key;this.save();
    const result = await action();
    this.state.done[key]=result ?? null;this.state.pending=null;this.save();
    return result;
  }
}

module.exports = {LocalApi,Journal,validateBaseUrl};
