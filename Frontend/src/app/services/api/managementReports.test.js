import {afterEach,expect,it,vi} from 'vitest';
import {managementReportsApi as api} from './managementReports';
const json=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('reads project/optional Feature summaries and saved reports with server pagination',async()=>{
 const fetch=vi.fn().mockImplementation(async()=>json({items:[]}));vi.stubGlobal('fetch',fetch);const options={signal:new AbortController().signal};
 await api.summary(1,{},options);await api.summary(1,{featureId:42},options);await api.summary(1,{featureId:0},options);await api.list(1,{page:2,size:20},options);await api.get(1,7,options);
 expect(fetch.mock.calls.map(call=>call[0])).toEqual(['/api/v1/projects/1/management-reports/summary','/api/v1/projects/1/management-reports/summary?featureId=42','/api/v1/projects/1/management-reports/summary?featureId=0','/api/v1/projects/1/management-reports?page=2&size=20','/api/v1/projects/1/management-reports/7']);expect(fetch.mock.calls.every(call=>call[1].credentials==='same-origin')).toBe(true);
});
it('uses CSRF for manual create/update and preserves preview request identity separately',async()=>{
 const fetch=vi.fn().mockImplementation(async url=>json(url.endsWith('/csrf')?{headerName:'X-CSRF-TOKEN',token:'test-token'}:{}));vi.stubGlobal('fetch',fetch);
 const manual={featureId:null,title:'A',markdown:'8 lỗi'},edit={title:'A',markdown:'8 lỗi',expectedVersion:3},preview={featureId:42,provider:'OPENAI_API',model:'m',requestKey:'same-key'};
 await api.create(1,manual);await api.update(1,7,edit);await api.preview(1,preview);
 expect(fetch.mock.calls.filter(call=>call[1].method).map(call=>[call[0],call[1].method,JSON.parse(call[1].body)])).toEqual([['/api/v1/projects/1/management-reports','POST',manual],['/api/v1/projects/1/management-reports/7','PUT',edit],['/api/v1/projects/1/management-reports/preview','POST',preview]]);expect(fetch.mock.calls.filter(call=>call[1].method).every(call=>call[1].headers['X-CSRF-TOKEN']==='test-token')).toBe(true);
});
it('downloads saved bytes without generating from the current editor and propagates denied writes',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(new Response('8 lỗi\r\n',{headers:{'content-type':'text/markdown'}})).mockResolvedValueOnce(new Response('{}',{status:403,headers:{'content-type':'application/json'}}));vi.stubGlobal('fetch',fetch);
 const response=await api.download(1,7);expect(await response.text()).toBe('8 lỗi\r\n');expect(fetch.mock.calls[0][0]).toBe('/api/v1/projects/1/management-reports/7/download');await expect(api.create(1,{title:'A',markdown:'B'})).rejects.toMatchObject({status:403});expect(fetch).toHaveBeenCalledTimes(2);
});
it('allows AI preview beyond eight seconds and uses a bounded35second timeout',async()=>{
 vi.useFakeTimers();const fetch=vi.fn().mockResolvedValueOnce(json({headerName:'X-CSRF-TOKEN',token:'test-token'})).mockImplementation((_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Abort','AbortError')))));vi.stubGlobal('fetch',fetch);
 const promise=api.preview(1,{provider:'OPENAI_API',model:'m',requestKey:'one-key'}),assertion=expect(promise).rejects.toMatchObject({code:'TIMEOUT'});await vi.advanceTimersByTimeAsync(9000);expect(fetch.mock.calls[1][1].signal.aborted).toBe(false);await vi.advanceTimersByTimeAsync(35000);await assertion;
});
