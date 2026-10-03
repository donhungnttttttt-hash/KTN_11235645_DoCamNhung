import { beforeEach, expect, it, vi } from 'vitest';
import { apiRequest } from './client';
import { workItemsApi } from './workItems';
vi.mock('./client', () => ({ apiRequest: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
it('keeps project scope and encodes Vietnamese search', async () => {
  apiRequest.mockResolvedValue({ items: [] });
  await workItemsApi.list(7, { page: 2, type: 'BUG', keyword: 'lỗi & ảnh' });
  expect(apiRequest).toHaveBeenLastCalledWith('/projects/7/work-items?page=2&type=BUG&keyword=l%E1%BB%97i+%26+%E1%BA%A3nh');
});
it.each([
  ['create', [7, {requestKey: 'stable'}], '/projects/7/work-items', 'POST', {requestKey: 'stable'}],
  ['update', [7, 9, {expectedVersion: 2}], '/projects/7/work-items/9', 'PUT', {expectedVersion: 2}],
  ['transition', [7, 9, {status: 'ready', expectedVersion: 2}], '/projects/7/work-items/9/transitions', 'POST', {status: 'ready', expectedVersion: 2}],
  ['link', [7, 9, {attemptId: 4, expectedVersion: 2}], '/projects/7/work-items/9/execution-links', 'POST', {attemptId: 4, expectedVersion: 2}],
  ['comment', [7, 9, {body: 'Xin kiểm tra', visibility: 'INTERNAL'}], '/projects/7/work-items/9/comments', 'POST', {body: 'Xin kiểm tra', visibility: 'INTERNAL'}],
  ['external', [7, 9, {externalId: '42'}], '/projects/7/work-items/9/external-reference', 'PUT', {externalId: '42'}],
  ['clarify', [7, 9, {conclusion: 'Đã làm rõ'}], '/projects/7/work-items/9/clarifications', 'POST', {conclusion: 'Đã làm rõ'}],
  ['batch', [7, {items: []}], '/projects/7/work-items/batch-transitions', 'POST', {items: []}],
])('%s sends CSRF and exact versioned payload', async (method,args,path,verb,body) => {
  apiRequest.mockResolvedValueOnce({headerName: 'X-CSRF-TOKEN',token: 'fixture'}).mockResolvedValueOnce({id: 9});
  await expect(workItemsApi[method](...args)).resolves.toEqual({id: 9});
  expect(apiRequest).toHaveBeenLastCalledWith(path,{method:verb,headers:{'X-CSRF-TOKEN':'fixture'},body:JSON.stringify(body)});
});
it('uploads a real multipart file and surfaces storage errors', async () => {
  apiRequest.mockResolvedValueOnce({headerName:'X-CSRF-TOKEN',token:'fixture'}).mockRejectedValueOnce(new Error('Kho chứng cứ không sẵn sàng'));
  const file=new File(['proof'],'proof.png',{type:'image/png'});
  await expect(workItemsApi.upload(7,9,file)).rejects.toThrow('Kho chứng cứ');
  const [path,options]=apiRequest.mock.calls[1];
  expect(path).toBe('/projects/7/work-items/9/attachments'); expect(options.body.get('file')).toBe(file);
  expect(options.headers).toEqual({'X-CSRF-TOKEN':'fixture'});
});
it('scopes reads, cursors and evidence downloads to the selected project and item',async()=>{
  for(const [method,args,path] of [
    ['metadata',[7],'/projects/7/work-items/metadata'],['overview',[7],'/projects/7/work-items/overview'],
    ['source',[7,4],'/projects/7/work-items/sources/4'],['get',[7,9],'/projects/7/work-items/9'],
    ['history',[7,9],'/projects/7/work-items/9/history?before=0'],['comments',[7,9,51],'/projects/7/work-items/9/comments?before=51'],
    ['attachments',[7,9],'/projects/7/work-items/9/attachments'],
  ]){await workItemsApi[method](...args);expect(apiRequest).toHaveBeenLastCalledWith(path);}
  await workItemsApi.download(7,9,'proof/id');expect(apiRequest).toHaveBeenLastCalledWith('/projects/7/work-items/9/attachments/proof%2Fid/content',{responseType:'blob'});
  apiRequest.mockResolvedValueOnce({headerName:'X-CSRF-TOKEN',token:'fixture'}).mockResolvedValueOnce();
  await workItemsApi.removeAttachment(7,9,'proof/id');expect(apiRequest).toHaveBeenLastCalledWith('/projects/7/work-items/9/attachments/proof%2Fid',{method:'DELETE',headers:{'X-CSRF-TOKEN':'fixture'}});
  await workItemsApi.list(7,{status:'',assignee:null,page:0});expect(apiRequest).toHaveBeenLastCalledWith('/projects/7/work-items?page=0');
});
