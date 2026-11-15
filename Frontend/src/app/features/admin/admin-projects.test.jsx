import {fireEvent as refreshEvent} from '@testing-library/react';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect, vi } from 'vitest';
import { AdminProjects, AdminProjectDetail } from './AdminProjects';

const metrics={total:3,na:1,applicable:2,ok:1,ng:0,pending:1,notRun:0,executionPercent:50,passPercent:50};
const row={id:1,code:'P1',name:'A project',pmNames:null,activeMembers:2,overdueMilestones:1,metrics,openBugs:1,awaitingVerification:1,timezone:'Asia/Ho_Chi_Minh',archivedAt:null};
test('search and pagination are requested on server and search resets page',async()=>{
 const api={projects:vi.fn().mockResolvedValue({items:[row],totalElements:21})};
 render(<AdminProjects projectId="1" api={api}/>);const user=userEvent.setup();
 await screen.findByRole('link',{name:'P1 · A project'});await user.click(screen.getByRole('button',{name:'Trang sau'}));
 await waitFor(()=>expect(api.projects).toHaveBeenLastCalledWith(expect.objectContaining({page:1,sort:'newest'}),expect.anything()));
 expect(api.projects.mock.calls.at(-1)[0]).not.toHaveProperty('projectId');
 await user.type(screen.getByLabelText('Tìm mã hoặc tên dự án'),'missing');
 await waitFor(()=>expect(api.projects).toHaveBeenLastCalledWith(expect.objectContaining({page:0,keyword:'missing'}),expect.anything()));
 expect(screen.getByRole('link',{name:'P1 · A project'})).toHaveAttribute('href','#/admin/projects/1');
});
test('created date and sort filters reset pagination, reject reversed dates and can be cleared',async()=>{
 const api={projects:vi.fn().mockResolvedValue({items:[row],totalElements:21})};
 render(<AdminProjects api={api}/>);const user=userEvent.setup();
 await screen.findByRole('link',{name:'P1 · A project'});await user.click(screen.getByRole('button',{name:'Trang sau'}));
 fireEvent.change(screen.getByLabelText('Từ ngày'),{target:{value:'2026-11-10'}});
 await waitFor(()=>expect(api.projects).toHaveBeenLastCalledWith(expect.objectContaining({page:0,createdFrom:'2026-11-10'}),expect.anything()));
 fireEvent.change(screen.getByLabelText('Đến ngày'),{target:{value:'2026-11-09'}});
 expect(await screen.findByRole('alert')).toHaveTextContent('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
 const count=api.projects.mock.calls.length;
 await new Promise(resolve=>setTimeout(resolve,20));expect(api.projects).toHaveBeenCalledTimes(count);
 fireEvent.change(screen.getByLabelText('Đến ngày'),{target:{value:'2026-11-15'}});
 fireEvent.change(screen.getByLabelText('Sắp xếp'),{target:{value:'oldest'}});
 await waitFor(()=>expect(api.projects).toHaveBeenLastCalledWith(expect.objectContaining({sort:'oldest',createdFrom:'2026-11-10',createdTo:'2026-11-15',page:0}),expect.anything()));
 await user.click(screen.getByRole('button',{name:'Xóa bộ lọc'}));
 await waitFor(()=>expect(api.projects).toHaveBeenLastCalledWith(expect.objectContaining({sort:'newest',createdFrom:'',createdTo:'',page:0}),expect.anything()));
});
test('empty list is visible and retry fetches after error',async()=>{
 const api={projects:vi.fn().mockRejectedValueOnce(new Error('Not permitted')).mockResolvedValueOnce({items:[],totalElements:0})};
 render(<AdminProjects api={api}/>);await screen.findByRole('alert');
 await userEvent.setup().click(screen.getByRole('button',{name:'Thử lại'}));
 await screen.findByText('Không có dự án phù hợp.');expect(screen.getByRole('button',{name:'Trang sau'})).toBeDisabled();
});
test('detail shows deadline warnings without the verification bug list',async()=>{
 const api={project:vi.fn().mockResolvedValue({...row,description:'Read summary',milestones:[{id:1,name:'Late',dueOn:'2000-01-01',deadlineStatus:'OVERDUE'},{id:2,name:'Unknown',dueOn:null,deadlineStatus:'INSUFFICIENT_DATA'},{id:3,name:'Later',dueOn:'2099-01-01',deadlineStatus:'NO_OVERDUE_WARNING'}],verificationBugs:[{id:1,itemKey:'P1-1',title:'Needs verification'}]})};
 render(<AdminProjectDetail id="1" api={api}/>);
 await screen.findByRole('heading',{name:'P1 · A project'});
 expect(screen.getByText('Quá hạn')).toBeInTheDocument();expect(screen.getByText('Chưa đủ dữ liệu')).toBeInTheDocument();
 expect(screen.getByText('Không có cảnh báo quá hạn')).toBeInTheDocument();expect(screen.queryByText(/Needs verification/)).toBeNull();
 expect(screen.queryByRole('heading',{name:/Bug đã xử lý, chờ xác minh/})).toBeNull();
 await refreshEvent.focus(window);await waitFor(()=>expect(api.project).toHaveBeenCalledTimes(2));
});
test('empty archived project explains missing schedule scope',async()=>{
 render(<AdminProjectDetail id="2" api={{project:vi.fn().mockResolvedValue({...row,archivedAt:'2026-10-01T00:00:00Z',milestones:[],verificationBugs:[],metrics:{...metrics,executionPercent:null,passPercent:null}})}}/>);
 await screen.findByText('Chưa có mốc. Chưa đủ dữ liệu để đánh giá hạn.');
 expect(screen.getByText(/Lưu trữ/)).toBeInTheDocument();
});
