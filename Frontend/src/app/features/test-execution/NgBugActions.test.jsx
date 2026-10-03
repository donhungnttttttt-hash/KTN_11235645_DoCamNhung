import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {ExistingBugLink,NgBugActions} from './NgBugActions';
import {workItemsApi} from '../../services/api/workItems';
vi.mock('../../services/api/workItems',()=>({workItemsApi:{list:vi.fn(),link:vi.fn()}}));
beforeEach(()=>vi.resetAllMocks());
it('links the chosen canonical bug with the attempt and version, reporting only confirmed success',async()=>{
  const saved=vi.fn();workItemsApi.list.mockResolvedValue({items:[{id:5,key:'D-5',title:'Lỗi đã có',version:2}],totalItems:1});workItemsApi.link.mockResolvedValue({id:5});
  render(<ExistingBugLink projectId={1} attemptId={8} onClose={()=>{}} onSaved={saved}/>);
  await screen.findByRole('option',{name:'D-5 · Lỗi đã có'});fireEvent.change(screen.getByLabelText('Bug cần liên kết'),{target:{value:'5'}});
  fireEvent.click(screen.getByRole('button',{name:'Liên kết bug'}));await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
  expect(workItemsApi.link).toHaveBeenCalledWith(1,5,{attemptId:8,expectedVersion:2});
});
it('handles list failure and stale link by reloading before a new selection',async()=>{
  workItemsApi.list.mockRejectedValueOnce(new Error('Không tải được bug')).mockResolvedValue({items:[{id:5,key:'D-5',title:'Lỗi',version:2}],totalItems:1});
  workItemsApi.link.mockRejectedValueOnce(Object.assign(new Error('Dữ liệu thay đổi'),{status:409}));const saved=vi.fn();
  render(<ExistingBugLink projectId={1} attemptId={8} onClose={()=>{}} onSaved={saved}/>);
  await screen.findByText('Không tải được bug');fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));
  await screen.findByRole('option',{name:'D-5 · Lỗi'});fireEvent.change(screen.getByLabelText('Bug cần liên kết'),{target:{value:'5'}});fireEvent.click(screen.getByRole('button',{name:'Liên kết bug'}));
  await screen.findByText('Dữ liệu thay đổi');expect(saved).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Liên kết bug'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));await waitFor(()=>expect(screen.getByLabelText('Bug cần liên kết')).toHaveValue(''));
  fireEvent.change(screen.getByLabelText('Tìm bug đã có'),{target:{value:'đăng nhập'}});await waitFor(()=>expect(workItemsApi.list).toHaveBeenLastCalledWith(1,expect.objectContaining({keyword:'đăng nhập'})));
});
it('opens a source-specific create route and can cancel the existing-bug dialog',async()=>{
  workItemsApi.list.mockResolvedValue({items:[],totalItems:0});render(<NgBugActions projectId={1} attempt={{id:8,attemptNo:3}} onLinked={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Tạo bug từ lần #3'}));expect(window.location.hash).toBe('#/board/new?attempt=8');
  fireEvent.click(screen.getByRole('button',{name:'Gắn bug đã có · lần #3'}));await screen.findByText('0/0 bug. Nhập từ khóa để thu hẹp kết quả.');
  fireEvent.click(screen.getByRole('button',{name:'Đóng hộp thoại'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
