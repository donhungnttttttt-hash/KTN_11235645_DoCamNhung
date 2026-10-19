import {it,expect,vi,afterEach} from 'vitest';
import {aiApi} from './ai';
const response=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('reads AI-authorized project and Feature catalogs through scoped same-origin endpoints',async()=>{
 const fetch=vi.fn().mockImplementation(async()=>response([]));vi.stubGlobal('fetch',fetch);const abort=new AbortController();
 await aiApi.chatProjects({signal:abort.signal});await aiApi.chatFeatures('project / one',{signal:abort.signal});
 expect(fetch.mock.calls.map(call=>call[0])).toEqual(['/api/v1/ai/projects','/api/v1/ai/projects/project%20%2F%20one/features']);
 expect(fetch.mock.calls.every(call=>call[1].credentials==='same-origin')).toBe(true);abort.abort();
});
it('writes only after obtaining CSRF and sends same-origin credentials',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(response({headerName:'X-CSRF-TOKEN',token:'synthetic-token'})).mockResolvedValueOnce(response({id:1,state:'READY'}));
 vi.stubGlobal('fetch',fetch);const controller=new AbortController();
 expect(await aiApi.generate(3,{purpose:'TESTER_WORK_REPORT',requestKey:'test-request'},{signal:controller.signal})).toEqual({id:1,state:'READY'});
 expect(fetch.mock.calls[0][0]).toBe('/api/v1/auth/csrf');
 expect(fetch.mock.calls[1][0]).toBe('/api/v1/projects/3/ai-drafts');
 expect(fetch.mock.calls[1][1]).toMatchObject({method:'POST',credentials:'same-origin',headers:{'X-CSRF-TOKEN':'synthetic-token'}});
});
it('uses reviewed provider routes, encodes model catalog identity and never sends browser tokens',async()=>{
 const fetch=vi.fn().mockImplementation(async url=>response(url.endsWith('/auth/csrf')?{headerName:'X-CSRF-TOKEN',token:'csrf-only'}:[]));vi.stubGlobal('fetch',fetch);
 await aiApi.providers();await aiApi.models('CHATGPT','id / one');await aiApi.authorize({newAccount:false,enablePlanPermission:true});await aiApi.probe('id / one',{model:'m',requestKey:'probe-key'});await aiApi.disconnect('id / one',2);
 expect(fetch.mock.calls.map(call=>call[0])).toEqual(['/api/v1/ai/providers','/api/v1/ai/providers/CHATGPT/models?connectionId=id%20%2F%20one','/api/v1/auth/csrf','/api/v1/ai/providers/CHATGPT/authorizations','/api/v1/auth/csrf','/api/v1/ai/providers/CHATGPT/connections/id%20%2F%20one/probes','/api/v1/auth/csrf','/api/v1/ai/providers/CHATGPT/connections/id%20%2F%20one?expectedVersion=2']);expect(fetch.mock.calls[3][1].body).toBe(JSON.stringify({newAccount:false,enablePlanPermission:true}));
});
it('uses private chat cursors and CSRF for create/send and handles 202 pending as a DTO',async()=>{
 const fetch=vi.fn().mockImplementation(async url=>url.endsWith('/auth/csrf')?response({headerName:'X-CSRF-TOKEN',token:'csrf-only'}):url.endsWith('/messages')?new Response(JSON.stringify({state:'GENERATING'}),{status:202,headers:{'content-type':'application/json'}}):response({items:[],nextBefore:5}));vi.stubGlobal('fetch',fetch);
 await aiApi.chatCreate({provider:'OLLAMA',model:'m',projectId:null,purpose:null,targetId:null});await aiApi.chatList(5);await aiApi.chatGet(7,3);expect(await aiApi.chatSend(7,{text:'plain text',requestKey:'same-key'})).toEqual({state:'GENERATING'});expect(fetch.mock.calls.map(call=>call[0])).toContain('/api/v1/ai/chats/7?before=3');expect(fetch.mock.calls.at(-1)[1]).toMatchObject({credentials:'same-origin',method:'POST',headers:{'X-CSRF-TOKEN':'csrf-only'},body:JSON.stringify({text:'plain text',requestKey:'same-key'})});
});
it('does not send generation if CSRF is denied',async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response('{}',{status:403,headers:{'content-type':'application/json'}}));vi.stubGlobal('fetch',fetch);
 await expect(aiApi.generate(1,{})).rejects.toMatchObject({status:403});expect(fetch).toHaveBeenCalledTimes(1);
});
it('keeps the AI request alive past the normal eight-second timeout and cancels at 35 seconds',async()=>{
 vi.useFakeTimers();const fetch=vi.fn().mockResolvedValueOnce(response({headerName:'X-CSRF-TOKEN',token:'test'})).mockImplementation((_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Abort','AbortError')))));
 vi.stubGlobal('fetch',fetch);const promise=aiApi.generate(1,{});const assertion=expect(promise).rejects.toMatchObject({code:'TIMEOUT'});
 await vi.advanceTimersByTimeAsync(9000);expect(fetch.mock.calls[1][1].signal.aborted).toBe(false);
 await vi.advanceTimersByTimeAsync(35000);await assertion;
});
it('reads project drafts and targets, edits separately and reads/cancels a connection attempt with CSRF',async()=>{
 const fetch=vi.fn().mockImplementation(async url=>response(url.endsWith('/auth/csrf')?{headerName:'X-CSRF-TOKEN',token:'csrf-only'}:{}));vi.stubGlobal('fetch',fetch);const signal=new AbortController().signal;
 await aiApi.metadata('project / one',{signal});await aiApi.targets(1,'TESTER_BUG_DRAFT','xin chào',{signal});await aiApi.list(1,4,{signal});await aiApi.get(1,4,{signal});await aiApi.edit(1,4,{text:'edited',expectedVersion:2},{signal});await aiApi.authorization('attempt / one',{signal});await aiApi.cancelAuthorization('attempt / one',{signal});
 expect(fetch.mock.calls.map(call=>call[0])).toContain('/api/v1/projects/project%20%2F%20one/ai-drafts/metadata');expect(fetch.mock.calls.map(call=>call[0])).toContain('/api/v1/projects/1/ai-drafts/targets?purpose=TESTER_BUG_DRAFT&q=xin+ch%C3%A0o');expect(fetch.mock.calls.map(call=>call[0])).toContain('/api/v1/projects/1/ai-drafts?before=4');expect(fetch.mock.calls.find(call=>call[1].method==='PUT')[1]).toMatchObject({body:JSON.stringify({text:'edited',expectedVersion:2}),headers:{'X-CSRF-TOKEN':'csrf-only'}});expect(fetch.mock.calls.at(-1)[0]).toBe('/api/v1/ai/providers/CHATGPT/authorizations/attempt%20%2F%20one');expect(fetch.mock.calls.at(-1)[1].method).toBe('DELETE');
});
