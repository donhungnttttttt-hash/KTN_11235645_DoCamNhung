import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import {ActionInbox} from './ActionInbox';
import {fileWorkApi} from '../../services/api/fileWork';
const context=vi.hoisted(()=>({currentProject:{id:1,name:'Project'}}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>context}));
vi.mock('../../services/api/fileWork',()=>({fileWorkApi:{inbox:vi.fn()}}));
const page=(items,extra={})=>({items,totalItems:items.length,page:0,totalPages:1,asOf:'2026-10-08T00:00:00Z',...extra});
beforeEach(()=>{vi.resetAllMocks();context.currentProject={id:1,name:'Project'};});
it('opens the assigned QA and refreshes the queue without marking the work done',async()=>{
 fileWorkApi.inbox.mockResolvedValue({items:[{id:3,kind:'QA',title:'Question',status:'resolved',ownerName:'Lan',updatedAt:'2026-10-08T00:00:00Z'}],totalItems:1,page:0,totalPages:1,asOf:'2026-10-08T00:00:00Z'});
 const navigate=vi.fn();render(<ActionInbox navigate={navigate}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Question'}));expect(navigate).toHaveBeenCalledWith('/board/issue/3?view=list');
 fireEvent.click(screen.getByRole('button',{name:'Cập nhật danh sách'}));
 await waitFor(()=>expect(fileWorkApi.inbox).toHaveBeenCalledTimes(2));
 expect(screen.getByText('Cần xác nhận câu trả lời')).toBeInTheDocument();
});
it('recovers from a failed read and opens a retest through its parent bug',async()=>{
 fileWorkApi.inbox.mockRejectedValueOnce(new Error('Không tải được')).mockResolvedValue(page([{id:12,kind:'RETEST',title:'Verify fix',targetId:34,status:'OPEN'}]));
 const navigate=vi.fn();render(<ActionInbox navigate={navigate}/>);
 await screen.findByText('Không tải được');fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));
 fireEvent.click(await screen.findByRole('button',{name:'Verify fix'}));expect(navigate).toHaveBeenCalledWith('/board/issue/34?view=list');
 fireEvent.change(screen.getByLabelText('Loại việc cần xử lý'),{target:{value:'RETEST'}});
 await waitFor(()=>expect(fileWorkApi.inbox).toHaveBeenLastCalledWith(1,{page:0,size:20,kind:'RETEST'},expect.anything()));
});
it('returns to the last available page when completed work disappears during refresh',async()=>{
 fileWorkApi.inbox.mockImplementation(async(_p,filters)=>page([{id:filters.page+1,kind:'FILE',title:`File ${filters.page+1}`,status:'READY'}],{page:filters.page,totalItems:21,totalPages:2}));
 render(<ActionInbox navigate={vi.fn()}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Trang sau công việc'}));await screen.findByRole('button',{name:'File 2'});
 fileWorkApi.inbox.mockImplementation(async(_p,filters)=>page(filters.page?[]:[{id:1,kind:'FILE',title:'Remaining file',status:'READY'}],{page:filters.page,totalItems:1,totalPages:1}));
 fireEvent.click(screen.getByRole('button',{name:'Cập nhật danh sách'}));
 expect(await screen.findByRole('button',{name:'Remaining file'})).toBeInTheDocument();
});
it('ignores an old project response after switching scope',async()=>{
 let finish;fileWorkApi.inbox.mockImplementation(p=>p===1?new Promise(r=>{finish=r;}):Promise.resolve(page([],{archived:true})));
 const view=render(<ActionInbox navigate={vi.fn()}/>);await waitFor(()=>expect(finish).toBeTypeOf('function'));
 context.currentProject={id:2,name:'Other'};view.rerender(<ActionInbox navigate={vi.fn()}/>);
 await screen.findByText('Dự án đã lưu trữ. Bạn vẫn có thể xem lịch sử ở các màn nghiệp vụ.');
 finish(page([{id:99,kind:'QA',title:'Old confidential question'}]));
 await waitFor(()=>expect(screen.queryByText('Old confidential question')).toBeNull());
});
