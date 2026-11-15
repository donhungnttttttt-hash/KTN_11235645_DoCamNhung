import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,within,waitFor} from '@testing-library/react';
import {TicketActionComposer} from './TicketActionComposer';
import {FeatureIssueBoard} from './FeatureIssueBoard';
import {DraftAttachments,TicketAttachments} from './TicketAttachments';
const item={id:1,key:'T-1',type:'BUG',version:2,canComment:true,canEdit:true,canAssign:true,allowedTransitions:[]};
const directory={canManage:true,currentUserId:'self',members:[{membershipId:5,userId:'self',displayName:'Tôi',projectRole:'PM',duties:[]}],milestones:[{id:9,name:'Release 1'}]};
afterEach(()=>vi.unstubAllGlobals());
it.each([['NEW','Chưa xử lý'],['SPEC_CONFIRM','Xác nhận spec'],['IN_PROGRESS','Đang xử lý'],['WAITING_CONFIRM','Chờ xác nhận'],['CLOSED','Đóng']])('shows the current %s status without submitting an unrequested transition',async(ticketState,label)=>{
 const current={...item,ticketState,allowedTransitions:[{state:'IN_PROGRESS',columnId:'progress'}]};
 const api={responsibilities:vi.fn().mockResolvedValue(directory),action:vi.fn().mockResolvedValue({...current,version:3})};
 render(<TicketActionComposer projectId={1} item={current} api={api} onSaved={vi.fn()}/>);
 fireEvent.focus(screen.getByLabelText('Ghi chú Ticket'));
 const status=screen.getByLabelText('Trạng thái mới');
 expect(status.selectedOptions[0]).toHaveTextContent(label);
 expect(within(status).queryByRole('option',{name:'Giữ nguyên trạng thái'})).toBeNull();
 fireEvent.change(screen.getByLabelText('Ghi chú Ticket'),{target:{value:'Ghi chú mới'}});
 fireEvent.click(screen.getByRole('button',{name:'Đăng',exact:true}));
 await waitFor(()=>expect(api.action).toHaveBeenCalled());
 expect(api.action.mock.calls[0][2]).not.toHaveProperty('state');
});
it('selects an allowed completion reason directly and confirms before closing the ticket',async()=>{
 const closingItem={...item,ticketState:'NEW',allowedTransitions:[{state:'CLOSED',closureReason:'FIXED',columnId:'fixed'},{state:'CLOSED',closureReason:'WONT_FIX',columnId:'wont_fix'}]};
 const api={responsibilities:vi.fn().mockResolvedValue(directory),action:vi.fn().mockResolvedValue({...closingItem,version:3})};
 render(<TicketActionComposer projectId={1} item={closingItem} api={api} onSaved={vi.fn()}/>);
 fireEvent.focus(screen.getByLabelText('Ghi chú Ticket'));
 const reasons=screen.getByLabelText('Lý do đóng');
 expect(reasons).toBeEnabled();expect(within(reasons).getByRole('option',{name:'Đã sửa'})).toBeInTheDocument();
 expect(within(reasons).queryByRole('option',{name:'Không được hỗ trợ'})).toBeNull();
 fireEvent.change(reasons,{target:{value:'FIXED'}});
 expect(screen.getByLabelText('Trạng thái mới')).toHaveValue('CLOSED');
 expect(screen.getByLabelText('Trạng thái mới').parentElement.querySelector('.ticket-selected-status-dot')).toHaveStyle({backgroundColor:'#22c55e'});
 fireEvent.click(screen.getByRole('button',{name:'Đăng',exact:true}));expect(api.action).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận cập nhật'}));
 await waitFor(()=>expect(api.action).toHaveBeenCalledWith(1,1,expect.objectContaining({state:'CLOSED',closureReason:'FIXED'}),expect.anything()));
});
it('previews an MP4 draft with playback controls and releases its object URL',async()=>{
 const revoke=vi.fn();vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:vi.fn(()=>'blob:video-draft'),revokeObjectURL:revoke}));
 const file=new File(['video'],'recording.mp4',{type:'video/mp4'});
 const view=render(<DraftAttachments files={[file]} preview/>);
 const video=await screen.findByLabelText('Xem video recording.mp4');
 expect(video.tagName).toBe('VIDEO');expect(video).toHaveAttribute('controls');expect(video).toHaveAttribute('src','blob:video-draft');
 view.unmount();expect(revoke).toHaveBeenCalledWith('blob:video-draft');
});
it('previews a saved MP4 via the authorized attachment API and retains download',async()=>{
 vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:vi.fn(()=>'blob:video-saved'),revokeObjectURL:vi.fn()}));
 const api={attachment:vi.fn().mockResolvedValue(new Blob(['video'],{type:'video/mp4'}))};
 render(<TicketAttachments files={[{id:9,name:'recording.mp4',mediaType:'video/mp4'}]} projectId={1} issueId={2} api={api}/>);
 const video=await screen.findByLabelText('Xem video recording.mp4');
 expect(video).toHaveAttribute('controls');expect(video).toHaveAttribute('src','blob:video-saved');
 expect(api.attachment).toHaveBeenCalledWith(1,2,9,expect.objectContaining({signal:expect.anything()}));
 fireEvent.error(video);expect(screen.getByText(/Trình duyệt không phát được video này/)).toBeVisible();
 expect(screen.getByRole('link',{name:'recording.mp4'})).toHaveAttribute('download','recording.mp4');
});
it('has no add-ticket plus button on Kanban',()=>{
 render(<FeatureIssueBoard items={[]} onCreate={vi.fn()}/>);
 expect(screen.queryByRole('button',{name:/Thêm Ticket/})).toBeNull();
});
it('previews an attached image and sends files with the comment once',async()=>{
 vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:vi.fn(()=> 'blob:preview'),revokeObjectURL:vi.fn()}));
 const api={responsibilities:vi.fn().mockResolvedValue(directory),actionWithFiles:vi.fn().mockResolvedValue({...item,version:3})};
 render(<TicketActionComposer projectId={1} item={item} api={api} onSaved={vi.fn()}/>);
 fireEvent.focus(screen.getByLabelText('Ghi chú Ticket'));
 const file=new File(['image'],'proof.png',{type:'image/png'});
 fireEvent.change(screen.getByLabelText('Đính kèm file và ảnh'),{target:{files:[file]}});
 fireEvent.click(screen.getByRole('button',{name:'Xem trước',exact:true}));
 expect(within(screen.getByRole('region',{name:'Xem trước bình luận'})).getByRole('img',{name:'proof.png'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Đăng'}));
 await waitFor(()=>expect(api.actionWithFiles).toHaveBeenCalledWith(1,1,expect.objectContaining({expectedVersion:2,requestKey:expect.any(String)}),[file],expect.anything()));
});
it('edits dates and self-assignment while preserving hidden milestones and hours',async()=>{
 const api={responsibilities:vi.fn().mockResolvedValue(directory),action:vi.fn().mockResolvedValue({...item,version:3})};
 render(<TicketActionComposer projectId={1} item={{...item,estimatedHours:8,actualHours:2.5,milestones:[{id:9,name:'Release 1'}]}} api={api} onSaved={vi.fn()}/>);
 fireEvent.focus(screen.getByLabelText('Ghi chú Ticket'));
 expect(screen.queryByLabelText('Dự kiến (giờ)')).toBeNull();
 expect(screen.queryByLabelText('Thực tế (giờ)')).toBeNull();
 expect(screen.queryByLabelText('Mốc quan trọng')).toBeNull();
 fireEvent.change(screen.getByLabelText('Ngày bắt đầu'),{target:{value:'2026-11-15'}});
 fireEvent.change(screen.getByLabelText('Hạn chót'),{target:{value:'2026-11-20'}});
 fireEvent.click(await screen.findByRole('button',{name:'Tôi phụ trách'}));
 fireEvent.click(screen.getByRole('button',{name:'Đăng'}));
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận cập nhật'}));
 await waitFor(()=>expect(api.action).toHaveBeenCalledWith(1,1,expect.objectContaining({assigneeMembershipId:5,planning:{startOn:'2026-11-15',dueOn:'2026-11-20',estimatedHours:8,actualHours:2.5,milestoneIds:[9]}}),expect.anything()));
});
it('retains attached files on failure and retries with the same request key',async()=>{
 const api={responsibilities:vi.fn().mockResolvedValue(directory),actionWithFiles:vi.fn().mockRejectedValue(new Error('Kết nối lỗi'))};
 render(<TicketActionComposer projectId={1} item={item} api={api} onSaved={vi.fn()}/>);fireEvent.focus(screen.getByLabelText('Ghi chú Ticket'));
 const file=new File(['log'],'trace.log',{type:'text/plain'});fireEvent.change(screen.getByLabelText('Đính kèm file và ảnh'),{target:{files:[file]}});fireEvent.click(screen.getByRole('button',{name:'Đăng'}));
 await screen.findByRole('alert');expect(screen.getByRole('button',{name:'Bỏ tệp trace.log'})).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Đăng'}));
 await waitFor(()=>expect(api.actionWithFiles).toHaveBeenCalledTimes(2));expect(api.actionWithFiles.mock.calls[1][2].requestKey).toBe(api.actionWithFiles.mock.calls[0][2].requestKey);
});
it('does not silently overwrite refreshed planning when there was no local edit',async()=>{
 const api={responsibilities:vi.fn().mockResolvedValue(directory),action:vi.fn()};const props={projectId:1,item,api,onSaved:vi.fn()};const view=render(<TicketActionComposer {...props}/>);fireEvent.focus(screen.getByLabelText('Ghi chú Ticket'));
 view.rerender(<TicketActionComposer {...props} item={{...item,version:3,startOn:'2026-11-18'}}/>);
 expect(screen.getByLabelText('Ngày bắt đầu')).toHaveValue('2026-11-18');expect(screen.getByRole('button',{name:'Đăng'})).toBeDisabled();
});
