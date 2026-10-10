import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,test,vi} from 'vitest';
import {AdminProjectDetail} from './AdminProjectDetail';

test('archive refreshes the real detail, locks its edit actions and focuses the confirmed outcome',async()=>{
 let archived=false;
 const project=()=>({id:7,code:'APP',name:'iPad',description:'',timezone:'UTC',version:archived?4:3,archivedAt:archived?'2026-10-08T02:00:00Z':null,metrics:{},milestones:[],verificationBugs:[]});
 const readiness=()=>({projectId:7,projectCode:'APP',projectName:'iPad',version:archived?4:3,archived,canArchive:!archived,canReopen:archived,blockers:[],asOf:'2026-10-08T02:00:00Z'});
 const api={project:vi.fn(async()=>project()),members:vi.fn().mockResolvedValue([]),users:vi.fn().mockResolvedValue({items:[],totalElements:0}),archiveReadiness:vi.fn(async()=>readiness()),archiveProject:vi.fn(async()=>{archived=true;return readiness();})};
 render(<AdminProjectDetail id="7" api={api}/>);
 await userEvent.click(await screen.findByRole('button',{name:'Kiểm tra lưu trữ'}));
 await screen.findByRole('dialog');
 fireEvent.change(screen.getByLabelText('Lý do lưu trữ'),{target:{value:'Hoàn tất bàn giao'}});
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận lưu trữ'}));
 const outcome=await screen.findByText('Đã lưu trữ dự án. Dữ liệu đã lưu vẫn có thể xem và xuất.');
 await waitFor(()=>expect(outcome).toHaveFocus());
 expect(await screen.findByRole('button',{name:'Sửa dự án'})).toBeDisabled();
 expect(await screen.findByRole('button',{name:'Mở lại dự án'})).toBeEnabled();
 expect(api.project.mock.calls.length).toBeGreaterThanOrEqual(4);
});
test('does not allow lifecycle changes to discard an open project edit',async()=>{
 const project={id:7,code:'APP',name:'iPad',description:'',timezone:'UTC',version:3,archivedAt:null,metrics:{},milestones:[],verificationBugs:[]};
 const api={project:vi.fn().mockResolvedValue(project),members:vi.fn().mockResolvedValue([]),users:vi.fn().mockResolvedValue({items:[],totalElements:0}),archiveReadiness:vi.fn().mockResolvedValue({projectId:7,version:3,archived:false,canArchive:true,canReopen:false,blockers:[]})};
 render(<AdminProjectDetail id="7" api={api}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Sửa dự án'}));
 fireEvent.change(screen.getByLabelText('Tên dự án'),{target:{value:'Bản nháp chưa lưu'}});
 expect(screen.getByRole('button',{name:'Kiểm tra lưu trữ'})).toBeDisabled();
 expect(screen.getByLabelText('Tên dự án')).toHaveValue('Bản nháp chưa lưu');
 fireEvent.click(screen.getByRole('button',{name:'Hủy'}));
 expect(screen.getByRole('button',{name:'Kiểm tra lưu trữ'})).toBeEnabled();
});
