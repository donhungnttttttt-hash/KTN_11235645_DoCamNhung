import React from 'react';
import {act,render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,test,vi} from 'vitest';
import {AdminProjectDetail} from './AdminProjectDetail';

test('reload refreshes management and lifecycle after another Admin archives the project',async()=>{
 let archived=false;
 const project=()=>({id:7,code:'APP',name:'iPad',description:'',timezone:'UTC',version:archived?4:3,archivedAt:archived?'2026-10-08T02:00:00Z':null,metrics:{},milestones:[],verificationBugs:[]});
 const api={project:vi.fn(async()=>project()),members:vi.fn().mockResolvedValue([]),users:vi.fn().mockResolvedValue({items:[],totalElements:0}),archiveReadiness:vi.fn(async()=>({projectId:7,version:archived?4:3,archived,canArchive:!archived,canReopen:archived,blockers:[]}))};
 render(<AdminProjectDetail id="7" api={api}/>);
 expect(await screen.findByRole('button',{name:'Sửa dự án'})).toBeEnabled();
 await screen.findByRole('button',{name:'Kiểm tra lưu trữ'});
 archived=true;fireEvent.click(screen.getByRole('button',{name:'Tải lại',exact:true}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Sửa dự án'})).toBeDisabled());
 expect(await screen.findByRole('button',{name:'Mở lại dự án'})).toBeEnabled();
 expect(api.members).toHaveBeenCalledTimes(2);
 expect(screen.getByRole('button',{name:'+ Thêm'})).toBeDisabled();
});

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
 fireEvent.click(screen.getByRole('button',{name:'Tiếp tục soạn'}));
 expect(screen.getByLabelText('Tên dự án')).toHaveValue('Bản nháp chưa lưu');
 expect(screen.getByRole('button',{name:'Kiểm tra lưu trữ'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Hủy'}));
 fireEvent.click(screen.getByRole('button',{name:'Bỏ bản nháp'}));
 expect(screen.queryByLabelText('Tên dự án')).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Kiểm tra lưu trữ'})).toBeEnabled();
});

test('member roles stay read-only and lifecycle review waits only for pending removal',async()=>{
 const project={id:7,code:'APP',name:'iPad',description:'',timezone:'UTC',version:3,archivedAt:null,metrics:{},milestones:[],verificationBugs:[]};
 const first={userId:'first',displayName:'Tester One',username:'one',systemRole:'TESTER',projectRole:'TESTER',version:1};
 const other={userId:'other',displayName:'Tester Two',username:'two',systemRole:'TESTER',projectRole:'TESTER',version:2};
 let members=[first,other];
 let failRemoval,finishRemoval;
 const api={project:vi.fn().mockResolvedValue(project),members:vi.fn(async()=>members),users:vi.fn().mockResolvedValue({items:[],totalElements:0}),archiveReadiness:vi.fn().mockResolvedValue({projectId:7,version:3,archived:false,canArchive:true,canReopen:false,blockers:[]}),removeMember:vi.fn()
  .mockImplementationOnce(()=>new Promise((resolve,reject)=>{failRemoval=reject;}))
  .mockImplementationOnce(()=>new Promise(resolve=>{finishRemoval=()=>{members=[other];resolve();};}))};
 render(<AdminProjectDetail id="7" api={api}/>);
 const firstRow=await screen.findByRole('row',{name:/Tester One · one/});
 expect(within(firstRow).getByRole('cell',{name:'TESTER'})).toBeVisible();
 expect(within(firstRow).queryByRole('combobox')).not.toBeInTheDocument();
 expect(await screen.findByRole('button',{name:'Kiểm tra lưu trữ'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Gỡ Tester One'}));
 expect(screen.getByRole('button',{name:'Kiểm tra lưu trữ'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'Gỡ Tester Two'})).toBeDisabled();
 await act(async()=>failRemoval(new Error('Membership conflict')));
 await screen.findByText('Membership conflict');
 expect(within(await screen.findByRole('row',{name:/Tester One · one/})).getByRole('cell',{name:'TESTER'})).toBeVisible();
 expect(within(screen.getByRole('row',{name:/Tester Two · two/})).getByRole('cell',{name:'TESTER'})).toBeVisible();
 expect(await screen.findByRole('button',{name:'Kiểm tra lưu trữ'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Gỡ Tester One'}));
 expect(screen.getByRole('button',{name:'Kiểm tra lưu trữ'})).toBeDisabled();
 await act(async()=>finishRemoval());
 await waitFor(()=>expect(screen.queryByRole('button',{name:'Gỡ Tester One'})).not.toBeInTheDocument());
 const remainingRow=await screen.findByRole('row',{name:/Tester Two · two/});
 expect(within(remainingRow).getByRole('cell',{name:'TESTER'})).toBeVisible();
 expect(within(remainingRow).queryByRole('combobox')).not.toBeInTheDocument();
 expect(await screen.findByRole('button',{name:'Kiểm tra lưu trữ'})).toBeEnabled();
 expect(api.removeMember).toHaveBeenCalledWith('7','first',1);
 expect(api.removeMember).toHaveBeenCalledTimes(2);
 fireEvent.click(screen.getByRole('button',{name:'Kiểm tra lưu trữ'}));
 expect(await screen.findByRole('dialog')).toBeVisible();
});
