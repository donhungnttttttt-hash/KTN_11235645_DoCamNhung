import { beforeEach, expect, it, vi } from 'vitest';
import { retestApi } from './retest';
import { apiRequest } from './client';
vi.mock('./client',()=>({apiRequest:vi.fn()}));
beforeEach(()=>{vi.resetAllMocks();apiRequest.mockImplementation(path=>Promise.resolve(path==='/auth/csrf'?{headerName:'X-CSRF-TOKEN',token:'test-token'}:{items:[]}));});
it('scopes all reads to the project and encodes filter text',async()=>{
 await retestApi.summary(1,7);await retestApi.candidates(1,2,'a&b');await retestApi.queue(1,3,false,'SUBMITTED');await retestApi.request(1,11);
 expect(apiRequest.mock.calls.map(c=>c[0])).toEqual(['/projects/1/work-items/7/retest','/projects/1/retest-candidates?page=2&keyword=a%26b','/projects/1/retest-requests?page=3&mine=false&status=SUBMITTED','/projects/1/retest-requests/11']);
});
it('sends CSRF and untouched version/idempotency bodies on every write',async()=>{
 const body={expectedVersion:2,requestKey:'retry-key'};
 for(const [operation,id] of [['coverage',7],['create',7],['submit',11],['close',7],['reopen',7]])await retestApi[operation](1,id,body);
 const calls=apiRequest.mock.calls.filter(c=>c[1]);expect(calls.map(c=>c[0])).toEqual(['/projects/1/work-items/7/retest-coverage','/projects/1/work-items/7/retest-requests','/projects/1/retest-requests/11/results','/projects/1/work-items/7/closure','/projects/1/work-items/7/reopen']);
 calls.forEach(([,options])=>expect(options).toEqual({method:'POST',headers:{'X-CSRF-TOKEN':'test-token'},body:JSON.stringify(body)}));
});
