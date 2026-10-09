import {it,expect,vi,afterEach} from 'vitest';
import {aiApi} from './ai';
const response=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('writes only after obtaining CSRF and sends same-origin credentials',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(response({headerName:'X-CSRF-TOKEN',token:'synthetic-token'})).mockResolvedValueOnce(response({id:1,state:'READY'}));
 vi.stubGlobal('fetch',fetch);const controller=new AbortController();
 expect(await aiApi.generate(3,{purpose:'TESTER_WORK_REPORT',requestKey:'test-request'},{signal:controller.signal})).toEqual({id:1,state:'READY'});
 expect(fetch.mock.calls[0][0]).toBe('/api/v1/auth/csrf');
 expect(fetch.mock.calls[1][0]).toBe('/api/v1/projects/3/ai-drafts');
 expect(fetch.mock.calls[1][1]).toMatchObject({method:'POST',credentials:'same-origin',headers:{'X-CSRF-TOKEN':'synthetic-token'}});
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
