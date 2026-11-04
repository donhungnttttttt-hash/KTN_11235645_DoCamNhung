import {beforeEach,expect,it,vi} from 'vitest';
import {apiRequest} from './client';
import {featureIssuesApi} from './featureIssues';
vi.mock('./client',()=>({apiRequest:vi.fn()}));
beforeEach(()=>{vi.resetAllMocks();apiRequest.mockImplementation(async path=>path==='/auth/csrf'?{headerName:'X-CSRF',token:'test-csrf'}:{version:3});});
it('serializes canonical board columns and scoped contacts, responsibilities and notifications to actual routes',async()=>{
 await featureIssuesApi.board(42,{type:'QA',keyword:'A & B',column:''});
 expect(apiRequest.mock.calls[0][0]).toBe('/projects/42/issues/board?type=QA&keyword=A+%26+B');
 await featureIssuesApi.list(42,{column:'processed',page:2,size:20});expect(apiRequest.mock.calls[1][0]).toBe('/projects/42/issues?column=processed&page=2&size=20');
 await featureIssuesApi.options(42,'BUG');expect(apiRequest.mock.calls[2][0]).toBe('/projects/42/issues/options?type=BUG');
 await featureIssuesApi.responsibilities(42);expect(apiRequest.mock.calls[3][0]).toBe('/projects/42/ticket-responsibilities');
 await featureIssuesApi.notifications({page:1,size:20});expect(apiRequest.mock.calls[4][0]).toBe('/me/ticket-notifications?page=1&size=20');
});
it('uses CSRF with atomic actions, duties and notification acknowledgement, with state distinct from returned ticketState',async()=>{
 const signal=new AbortController().signal,command={body:'Keep state',expectedVersion:2,requestKey:'d6f66392-fc72-4a74-a425-c54748821663'};
 await featureIssuesApi.action(42,7,command,{signal});
 expect(apiRequest).toHaveBeenCalledWith('/projects/42/issues/7/actions',{signal,method:'POST',headers:{'X-CSRF':'test-csrf'},body:JSON.stringify(command)});
 const mutation={state:'CLOSED',closureReason:'PROCESSED',assigneeMembershipId:11,verifierUserId:'u',expectedVersion:3,requestKey:command.requestKey};
 await featureIssuesApi.action(42,7,mutation);expect(JSON.parse(apiRequest.mock.lastCall[1].body)).toEqual(mutation);
 await featureIssuesApi.updateResponsibilities(42,11,{duties:['SPEC_REVIEWER'],expectedVersion:2});expect(apiRequest.mock.lastCall).toEqual(['/projects/42/ticket-responsibilities/11',expect.objectContaining({method:'PUT',body:JSON.stringify({duties:['SPEC_REVIEWER'],expectedVersion:2})})]);
 await featureIssuesApi.readNotification(9);expect(apiRequest.mock.lastCall).toEqual(['/me/ticket-notifications/9/read',{method:'PUT',headers:{'X-CSRF':'test-csrf'}}]);
});
it('requests initial combinations for a chosen contact without leaking query fields into fetch options',async()=>{
 const signal=new AbortController().signal;await featureIssuesApi.options(42,'BUG',{assigneeMembershipId:11,signal});expect(apiRequest).toHaveBeenCalledWith('/projects/42/issues/options?type=BUG&assigneeMembershipId=11',{signal});
});
it('uses deleted-only scope and CSRF versioned explicit Monkey restore',async()=>{
 await featureIssuesApi.list(42,{deleted:true,page:2});expect(apiRequest.mock.lastCall[0]).toBe('/projects/42/issues?deleted=true&page=2');const input={expectedVersion:7,requestKey:'a44f1485-82ed-40d4-b719-42f3f28ea72b'};await featureIssuesApi.restore(42,8,input);expect(apiRequest.mock.lastCall).toEqual(['/projects/42/issues/8/restore',{method:'POST',headers:{'X-CSRF':'test-csrf'},body:JSON.stringify(input)}]);
});
