import React, {useState} from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
import {FeatureIssueDetail} from '../features/work-items/FeatureIssueDetail';
import {ProjectNotes} from '../features/projects/ProjectNotes';
import {AdminFormDialog, useAdminFormClose} from '../features/admin/AdminFormDialog';
import {ExecutionRunnerPage} from '../features/test-execution/ExecutionRunnerPage';
import {executionApi} from '../services/api/execution';
import {projectsApi} from '../services/api/projects';

vi.mock('../features/projects/ProjectProvider', () => ({
 useProject: () => ({currentProject: {id:1, name:'Dự án A', projectRole:'PM'}}),
}));
vi.mock('../features/auth/AuthProvider', async importOriginal => ({
 ...await importOriginal(),
 useAuth: () => ({user:{id:'u1',displayName:'Tester'}, hasRole:role=>role==='PM'}),
}));
vi.mock('../services/api/execution', () => ({executionApi:{
 cycle:vi.fn(), configurations:vi.fn(), runs:vi.fn(), activate:vi.fn(),
}}));
vi.mock('../services/api/projects', () => ({projectsApi:{listMembers:vi.fn(),listCatalog:vi.fn()}}));
vi.mock('../features/test-execution/ScopeSetup', () => ({ScopeSetup:()=>null}));

const ticket={id:7,key:'P-7',title:'Keep ticket',type:'BUG',ticketState:'NEW',boardColumn:'new',version:2,
 canComment:true,canAssign:true,allowedTransitions:[{state:'IN_PROGRESS',columnId:'inProgress',label:'Đang xử lý'}]};
const makeTicketApi=(item=ticket)=>({
 get:vi.fn().mockResolvedValue(item),comments:vi.fn().mockResolvedValue([]),
 responsibilities:vi.fn().mockResolvedValue({canManage:true,currentUserId:'u1',members:[
  {membershipId:11,userId:'u1',displayName:'Tester',projectRole:'USER',duties:['BUG_COORDINATOR']},
 ]}),
 options:vi.fn().mockResolvedValue({assignees:[]}),
 action:vi.fn().mockResolvedValue({...item,version:3}),remove:vi.fn().mockResolvedValue(undefined),
});

async function popupOutsidePage(view, name) {
 const popup=await screen.findByRole('dialog',{name});
 expect(popup).toHaveAttribute('aria-modal','true');
 expect(document.body).toContainElement(popup);
 expect(view.container).not.toContainElement(popup);
 return popup;
}

beforeEach(()=>vi.clearAllMocks());

it('confirms Ticket changes in a popup, preserves the draft on cancel and submits only after confirmation', async()=>{
 const api=makeTicketApi();
 const view=render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);
 const comment=await screen.findByLabelText('Ghi chú Ticket');
 fireEvent.focus(comment);
 fireEvent.change(comment,{target:{value:'Draft stays when confirmation is cancelled'}});
 fireEvent.change(screen.getByLabelText('Trạng thái mới'),{target:{value:'IN_PROGRESS'}});
 fireEvent.click(screen.getByRole('button',{name:'Đăng'}));
 const popup=await popupOutsidePage(view,'Xác nhận cập nhật Ticket');
 expect(api.action).not.toHaveBeenCalled();
 fireEvent.click(within(popup).getByRole('button',{name:'Hủy xác nhận'}));
 expect(comment).toHaveValue('Draft stays when confirmation is cancelled');
 expect(screen.getByLabelText('Trạng thái mới')).toHaveValue('IN_PROGRESS');
 expect(api.action).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Đăng'}));
 const reopened=await popupOutsidePage(view,'Xác nhận cập nhật Ticket');
 fireEvent.click(within(reopened).getByRole('button',{name:'Xác nhận cập nhật'}));
 await waitFor(()=>expect(api.action).toHaveBeenCalledTimes(1));
 expect(api.action.mock.calls[0][2]).toMatchObject({body:'Draft stays when confirmation is cancelled',state:'IN_PROGRESS'});
});

it('confirms monkey Ticket deletion outside the detail layout and cancellation leaves the Ticket intact', async()=>{
 const api=makeTicketApi({...ticket,monkey:true,canDelete:true,canComment:false,canAssign:false});
 const view=render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Xóa Bug monkey'}));
 const popup=await popupOutsidePage(view,'Xác nhận xóa Bug monkey');
 fireEvent.click(within(popup).getByRole('button',{name:'Giữ lại Bug monkey'}));
 expect(api.remove).not.toHaveBeenCalled();
 expect(screen.getByText('P-7 · Keep ticket')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Xóa Bug monkey'}));
 const reopened=await popupOutsidePage(view,'Xác nhận xóa Bug monkey');
 fireEvent.click(within(reopened).getByRole('button',{name:'Xác nhận xóa mềm'}));
 await waitFor(()=>expect(api.remove).toHaveBeenCalledTimes(1));
 expect(api.remove.mock.calls[0].slice(0,3)).toEqual([1,7,2]);
});

it('confirms Note deletion in a popup instead of growing the Note card', async()=>{
 const note={id:7,projectId:1,title:'Lịch trao đổi',body:'Keep this note',version:3};
 const api={list:vi.fn().mockResolvedValue({items:[note],page:0,size:20,totalItems:1,totalPages:1}),remove:vi.fn().mockResolvedValue(undefined)};
 const view=render(<ProjectNotes projectId={1} canEdit api={api}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Xóa Note Lịch trao đổi'}));
 const popup=await popupOutsidePage(view,'Xác nhận xóa Note Lịch trao đổi');
 fireEvent.click(within(popup).getByRole('button',{name:'Giữ Note'}));
 expect(api.remove).not.toHaveBeenCalled();
 expect(screen.getByText('Keep this note')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Xóa Note Lịch trao đổi'}));
 const reopened=await popupOutsidePage(view,'Xác nhận xóa Note Lịch trao đổi');
 fireEvent.click(within(reopened).getByRole('button',{name:'Xác nhận xóa Note'}));
 await waitFor(()=>expect(api.remove).toHaveBeenCalledTimes(1));
 expect(api.remove.mock.calls[0].slice(0,3)).toEqual([1,7,3]);
});

function UnsavedAdminEditor({onClose}) {
 const [draft,setDraft]=useState('');
 const {close,confirmation}=useAdminFormClose(onClose,false,!!draft);
 return <AdminFormDialog title="Sửa thông tin" onClose={close} confirmation={confirmation}>
  <label>Tên hiển thị<input value={draft} onChange={event=>setDraft(event.target.value)}/></label>
 </AdminFormDialog>;
}

it('portals unsaved-admin-form confirmation outside its editor and preserves entered data when continuing', async()=>{
 const onClose=vi.fn();
 const view=render(<UnsavedAdminEditor onClose={onClose}/>);
 fireEvent.change(screen.getByLabelText('Tên hiển thị'),{target:{value:'Unsaved display name'}});
 fireEvent.click(screen.getByRole('button',{name:'Đóng'}));
 const popup=await popupOutsidePage(view,'Bỏ nội dung chưa lưu?');
 fireEvent.click(within(popup).getByRole('button',{name:'Tiếp tục soạn'}));
 expect(onClose).not.toHaveBeenCalled();
 expect(screen.getByLabelText('Tên hiển thị')).toHaveValue('Unsaved display name');
 fireEvent.click(screen.getByRole('button',{name:'Đóng'}));
 const reopened=await popupOutsidePage(view,'Bỏ nội dung chưa lưu?');
 fireEvent.click(within(reopened).getByRole('button',{name:'Bỏ bản nháp'}));
 expect(onClose).toHaveBeenCalledTimes(1);
});

it('starts a test cycle only from the popup confirmation, not when opening or cancelling it', async()=>{
 executionApi.cycle.mockResolvedValue({id:5,name:'Đợt kiểm thử',code:'CYCLE-1',statusCode:'DRAFT',runCount:2,version:4});
 executionApi.configurations.mockResolvedValue([]);
 executionApi.runs.mockResolvedValue({items:[],page:0,totalItems:0,totalPages:0});
 executionApi.activate.mockResolvedValue(undefined);
 projectsApi.listMembers.mockResolvedValue([]);
 projectsApi.listCatalog.mockResolvedValue([]);
 const view=render(<ExecutionRunnerPage cycleId={5} navigate={vi.fn()}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Bắt đầu đợt kiểm thử'}));
 const popup=await popupOutsidePage(view,'Xác nhận bắt đầu đợt');
 fireEvent.click(within(popup).getByRole('button',{name:'Hủy'}));
 expect(executionApi.activate).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Bắt đầu đợt kiểm thử'}));
 const reopened=await popupOutsidePage(view,'Xác nhận bắt đầu đợt');
 fireEvent.click(within(reopened).getByRole('button',{name:'Xác nhận bắt đầu'}));
 await waitFor(()=>expect(executionApi.activate).toHaveBeenCalledTimes(1));
 expect(executionApi.activate).toHaveBeenCalledWith(1,5,4);
});
