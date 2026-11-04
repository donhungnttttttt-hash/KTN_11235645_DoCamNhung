import {beforeEach,expect,test,vi} from 'vitest';
import {apiRequest} from './client';
import {featuresApi} from './features';
vi.mock('./client',()=>({apiRequest:vi.fn()}));
beforeEach(()=>vi.resetAllMocks());

test('passes calendar bounds and whitelisted sorting to the paginated server list',async()=>{
 await featuresApi.list(4,{page:2,keyword:'QA & Việt',archived:true,createdFrom:'2026-10-01',createdTo:'2026-10-19',sort:'created-asc'});
 const url=new URL(apiRequest.mock.calls[0][0],'http://test.local');
 expect(url.pathname).toBe('/projects/4/features');
 expect(Object.fromEntries(url.searchParams)).toEqual({page:'2',size:'20',keyword:'QA & Việt',archived:'true',createdFrom:'2026-10-01',createdTo:'2026-10-19',sort:'created-asc'});
});

test('omits empty calendar bounds for existing callers',async()=>{
 await featuresApi.list(4);
 const url=new URL(apiRequest.mock.calls[0][0],'http://test.local');
 expect(url.searchParams.has('createdFrom')).toBe(false);
 expect(url.searchParams.has('createdTo')).toBe(false);
 expect(url.searchParams.get('sort')).toBe('created-desc');
});
test('filters hidden documents and sends explicit versioned recovery with CSRF',async()=>{
 apiRequest.mockImplementation(async path=>path==='/auth/csrf'?{headerName:'X-CSRF',token:'test-token'}:{});
 await featuresApi.documents(4,8,{page:2,keyword:'A & B',archived:true});const url=new URL(apiRequest.mock.lastCall[0],'http://test.local');expect(Object.fromEntries(url.searchParams)).toEqual({page:'2',size:'20',keyword:'A & B',archived:'true'});
 const input={expectedVersion:7,requestKey:'a44f1485-82ed-40d4-b719-42f3f28ea72b'};await featuresApi.restoreDocument(4,8,9,input);expect(apiRequest.mock.lastCall).toEqual(['/projects/4/features/8/documents/9/restore',{method:'POST',headers:{'X-CSRF':'test-token'},body:JSON.stringify(input)}]);
});
