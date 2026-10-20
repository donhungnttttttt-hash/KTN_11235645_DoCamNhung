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
