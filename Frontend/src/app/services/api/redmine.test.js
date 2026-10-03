import { beforeEach, expect, it, vi } from 'vitest';
import { redmineApi } from './redmine';
import { apiRequest } from './client';
vi.mock('./client',()=>({apiRequest:vi.fn()}));
beforeEach(()=>{vi.resetAllMocks();apiRequest.mockResolvedValue({headerName:'X-CSRF-TOKEN',token:'test-token'});});
it('reads configuration and state in the selected project',async()=>{
  await redmineApi.configuration(2);expect(apiRequest).toHaveBeenLastCalledWith('/projects/2/integrations/redmine');
  await redmineApi.state(2,7);expect(apiRequest).toHaveBeenLastCalledWith('/projects/2/work-items/7/redmine');
});
it.each([['publish','/projects/2/work-items/7/redmine-deliveries'],['reconcile','/projects/2/work-items/7/redmine-reconciliations'],['retry','/projects/2/redmine-deliveries/7/retry']])('protects %s with CSRF',async(method,path)=>{
  const body={reason:'Kiểm tra',expectedVersion:3};await redmineApi[method](2,7,body);
  expect(apiRequest).toHaveBeenNthCalledWith(1,'/auth/csrf');expect(apiRequest).toHaveBeenLastCalledWith(path,{method:'POST',headers:{'X-CSRF-TOKEN':'test-token'},body:JSON.stringify(body)});
});
