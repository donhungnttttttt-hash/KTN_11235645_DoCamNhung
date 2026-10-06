import { test, expect, vi } from 'vitest';
import { adminApi } from './admin';
import { apiRequest } from './client';
vi.mock('./client',()=>({apiRequest:vi.fn()}));
test('admin scope and literal keyword are encoded with pagination',()=>{
 adminApi.projects({projectId:2,keyword:'A&B %',page:0,size:20});
 expect(apiRequest).toHaveBeenCalledWith('/admin/projects?projectId=2&keyword=A%26B+%25&page=0&size=20',undefined);
 adminApi.overview();expect(apiRequest).toHaveBeenLastCalledWith('/admin/overview',undefined);
 adminApi.overview(2,{signal:'signal'});expect(apiRequest).toHaveBeenLastCalledWith('/admin/overview?projectId=2',{signal:'signal'});
 adminApi.project(2);expect(apiRequest).toHaveBeenLastCalledWith('/admin/projects/2',undefined);
});
test('management writes obtain CSRF and preserve expected versions',async()=>{
 apiRequest.mockResolvedValue({headerName:'X-CSRF',token:'csrf'});
 await adminApi.createProject({project:{code:'AA'},members:[{userId:'pm',projectRole:'PM'}]});
 expect(apiRequest).toHaveBeenLastCalledWith('/admin/projects',expect.objectContaining({method:'POST',headers:{'X-CSRF':'csrf'},body:JSON.stringify({project:{code:'AA'},members:[{userId:'pm',projectRole:'PM'}]})}));
 await adminApi.setMember(1,'person',{projectRole:'DEV',expectedVersion:4});
 expect(apiRequest).toHaveBeenLastCalledWith('/admin/projects/1/members/person',expect.objectContaining({method:'PUT',body:JSON.stringify({projectRole:'DEV',expectedVersion:4})}));
 await adminApi.removeMember(1,'person',4);
 expect(apiRequest).toHaveBeenLastCalledWith('/admin/projects/1/members/person?expectedVersion=4',expect.objectContaining({method:'DELETE'}));
 await adminApi.updateUser('person',{enabled:false,expectedVersion:2});
 expect(apiRequest).toHaveBeenLastCalledWith('/users/person',expect.objectContaining({method:'PATCH',body:JSON.stringify({enabled:false,expectedVersion:2})}));
});
