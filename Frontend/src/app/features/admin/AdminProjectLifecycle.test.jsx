import React from 'react';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,expect,test,vi} from 'vitest';
import {AdminProjectLifecycle} from './AdminProjectLifecycle';

const ready={projectId:7,projectCode:'APP',projectName:'Kiểm thử iPad',version:3,archived:false,archivedAt:null,canArchive:true,canReopen:false,asOf:'2026-10-08T02:00:00Z',blockers:[],latestDecision:null};
let api;
beforeEach(()=>{api={archiveReadiness:vi.fn().mockResolvedValue(ready),archiveProject:vi.fn(),reopenProject:vi.fn(),lifecycleDecisions:vi.fn().mockResolvedValue({items:[],page:0,size:20,totalElements:0})};});
async function open(label='Kiểm tra lưu trữ') {
 await userEvent.click(await screen.findByRole('button',{name:label}));
 return screen.findByRole('dialog');
}
test('explains blockers with counts, correct project links, and never allows a blocked archive',async()=>{
 api.archiveReadiness.mockResolvedValue({...ready,canArchive:false,blockers:[{code:'ACTIVE_SESSIONS',count:2,label:'Phiên chưa kết thúc'},{code:'ALLOCATED_DEVICES',count:3,label:'Máy chưa thu hồi'},{code:'OPEN_WORK_ITEMS',count:4,label:'Ticket chưa kết thúc'}]});
 render(<AdminProjectLifecycle projectId={7} api={api}/>);
 const dialog=await open();
 expect(within(dialog).getByText('Phiên chưa kết thúc')).toBeInTheDocument();
 expect(within(dialog).getByText('3')).toBeInTheDocument();
 expect(within(dialog).getByRole('link',{name:'Thu hồi thiết bị'})).toHaveAttribute('href','#/admin/devices?projectId=7');
 expect(within(dialog).getByText(/PM kiểm tra Công việc theo file của dự án/)).toBeInTheDocument();
 fireEvent.change(within(dialog).getByLabelText('Lý do lưu trữ'),{target:{value:'Dự án đã bàn giao'}});
 expect(within(dialog).getByRole('button',{name:'Xác nhận lưu trữ'})).toBeDisabled();
 expect(api.archiveProject).not.toHaveBeenCalled();
});
test('requires a nonblank reason, obtains a fresh preview, and archives only once while saving',async()=>{
 let complete;api.archiveProject.mockReturnValue(new Promise(resolve=>{complete=resolve;}));
 const saved=vi.fn();render(<AdminProjectLifecycle projectId={7} api={api} onSaved={saved}/>);
 const dialog=await open();
 expect(api.archiveReadiness).toHaveBeenCalledTimes(2);
 const confirm=within(dialog).getByRole('button',{name:'Xác nhận lưu trữ'});
 expect(confirm).toBeDisabled();
 fireEvent.change(within(dialog).getByLabelText('Lý do lưu trữ'),{target:{value:'  Hoàn tất nghiệm thu  '}});
 fireEvent.click(confirm);fireEvent.click(confirm);
 expect(api.archiveProject).toHaveBeenCalledTimes(1);
 expect(api.archiveProject).toHaveBeenCalledWith(7,{expectedVersion:3,reason:'Hoàn tất nghiệm thu',requestKey:expect.any(String)});
 expect(within(dialog).getByRole('button',{name:'Hủy'})).toBeDisabled();
 complete({...ready,version:4,archived:true,canArchive:false,canReopen:true});
 await waitFor(()=>expect(saved).toHaveBeenCalledWith(expect.objectContaining({archived:true})));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 expect(screen.getByText(/Đã lưu trữ dự án/)).toBeInTheDocument();
});
test('keeps a reason after conflict and requires refreshing before retry with the current version',async()=>{
 api.archiveProject.mockRejectedValueOnce(Object.assign(new Error('Dữ liệu đã thay đổi'),{status:409,code:'VERSION_CONFLICT'})).mockResolvedValueOnce({...ready,archived:true,version:5,canReopen:true,canArchive:false});
 render(<AdminProjectLifecycle projectId={7} api={api}/>);await open();
 fireEvent.change(screen.getByLabelText('Lý do lưu trữ'),{target:{value:'Đã bàn giao'}});
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận lưu trữ'}));await screen.findByRole('alert');
 expect(screen.getByLabelText('Lý do lưu trữ')).toHaveValue('Đã bàn giao');
 expect(screen.getByRole('button',{name:'Xác nhận lưu trữ'})).toBeDisabled();
 api.archiveReadiness.mockResolvedValue({...ready,version:4});
 fireEvent.click(screen.getByRole('button',{name:'Kiểm tra lại, giữ lý do'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Xác nhận lưu trữ'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận lưu trữ'}));
 await waitFor(()=>expect(api.archiveProject).toHaveBeenLastCalledWith(7,expect.objectContaining({reason:'Đã bàn giao',expectedVersion:4})));
});
test('retries an uncertain save with the same request key and does not discard the typed reason',async()=>{
 api.archiveProject.mockRejectedValueOnce(Object.assign(new Error('Mất kết nối'),{code:'NETWORK_ERROR'})).mockResolvedValueOnce({...ready,archived:true,canArchive:false,canReopen:true});
 render(<AdminProjectLifecycle projectId={7} api={api}/>);await open();
 fireEvent.change(screen.getByLabelText('Lý do lưu trữ'),{target:{value:'Bàn giao xong'}});
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận lưu trữ'}));await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'Thử lưu lại'}));
 await waitFor(()=>expect(api.archiveProject).toHaveBeenCalledTimes(2));
 expect(api.archiveProject.mock.calls[1][1]).toEqual(api.archiveProject.mock.calls[0][1]);
});
test('reopen requires reason and shows preserved data plus the previous actor and decision',async()=>{
 api.archiveReadiness.mockResolvedValue({...ready,archived:true,archivedAt:'2026-10-08T02:00:00Z',canArchive:false,canReopen:true,latestDecision:{action:'ARCHIVE',reason:'Đã nghiệm thu',actorName:'Admin Lan',decidedAt:'2026-10-08T02:00:00Z'}});
 api.reopenProject.mockResolvedValue({...ready,version:4});
 render(<AdminProjectLifecycle projectId={7} api={api}/>);
 await screen.findByText(/Admin Lan/);expect(screen.getByText('Đã nghiệm thu')).toBeInTheDocument();
 await open('Mở lại dự án');
 expect(screen.getByText(/Lịch sử và dữ liệu đã lưu được giữ nguyên/)).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Lý do mở lại'),{target:{value:'Bổ sung vòng kiểm thử'}});
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận mở lại'}));
 await waitFor(()=>expect(api.reopenProject).toHaveBeenCalledWith(7,expect.objectContaining({reason:'Bổ sung vòng kiểm thử',expectedVersion:3})));
});
test('preview error retries without implying permission; forbidden save keeps the reason for review',async()=>{
 api.archiveReadiness.mockRejectedValueOnce(new Error('Không tải được điều kiện')).mockResolvedValue(ready);
 api.archiveProject.mockRejectedValue(Object.assign(new Error('Quyền Admin đã thay đổi'),{status:403}));
 render(<AdminProjectLifecycle projectId={7} api={api}/>);await screen.findByRole('alert');
 expect(screen.queryByRole('button',{name:'Kiểm tra lưu trữ'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));await open();
 fireEvent.change(screen.getByLabelText('Lý do lưu trữ'),{target:{value:'Đã xong'}});
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận lưu trữ'}));await screen.findByRole('alert');
 expect(screen.getByLabelText('Lý do lưu trữ')).toHaveValue('Đã xong');
 expect(screen.getByRole('button',{name:'Xác nhận lưu trữ'})).toBeDisabled();
});
test('cancel and Escape restore keyboard focus to the trigger without any mutation',async()=>{
 render(<AdminProjectLifecycle projectId={7} api={api}/>);
 const trigger=await screen.findByRole('button',{name:'Kiểm tra lưu trữ'});
 await userEvent.click(trigger);await screen.findByRole('dialog');
 await userEvent.keyboard('{Escape}');
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(trigger).toHaveFocus();
 await userEvent.click(trigger);await screen.findByRole('dialog');
 await userEvent.click(screen.getByRole('button',{name:'Hủy'}));expect(trigger).toHaveFocus();
 expect(api.archiveProject).not.toHaveBeenCalled();
});
test('shows paginated decision reasons and retries a failed history read without a write',async()=>{
 api.lifecycleDecisions.mockRejectedValueOnce(new Error('Không tải được lịch sử')).mockResolvedValue({items:[{id:11,action:'ARCHIVE',reason:'Đã bàn giao cho khách hàng',actorName:'Admin Mai',decidedAt:'2026-10-08T02:00:00Z'}],page:0,size:20,totalElements:21});
 render(<AdminProjectLifecycle projectId={7} api={api}/>);
 await userEvent.click(await screen.findByRole('button',{name:'Lịch sử lưu trữ / mở lại'}));
 await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));
 await screen.findByText('Đã bàn giao cho khách hàng');
 fireEvent.click(screen.getByRole('button',{name:'Lịch sử sau'}));
 await waitFor(()=>expect(api.lifecycleDecisions).toHaveBeenLastCalledWith(7,{page:1,size:20},expect.anything()));
 expect(api.archiveProject).not.toHaveBeenCalled();
});
test('refreshing after a race shows new blockers and keeps the reason',async()=>{
 render(<AdminProjectLifecycle projectId={7} api={api}/>);await open();
 fireEvent.change(screen.getByLabelText('Lý do lưu trữ'),{target:{value:'Đã hoàn tất'}});
 api.archiveReadiness.mockResolvedValue({...ready,canArchive:false,blockers:[{code:'UNFINISHED_CYCLES',count:1,label:'Đợt kiểm thử chưa chốt'},{code:'OPEN_RETESTS',count:1,label:'Lượt kiểm thử lại còn mở'},{code:'PENDING_PUBLICATIONS',count:1,label:'Lượt công bố đang xử lý'}]});
 fireEvent.click(screen.getByRole('button',{name:'Kiểm tra lại, giữ lý do'}));
 await screen.findByText('Đợt kiểm thử chưa chốt');
 expect(screen.getByLabelText('Lý do lưu trữ')).toHaveValue('Đã hoàn tất');
 expect(screen.getByRole('button',{name:'Xác nhận lưu trữ'})).toBeDisabled();
});
test('shows publication review warnings without blocking an otherwise ready archive',async()=>{
 api.archiveReadiness.mockResolvedValue({...ready,warnings:[{code:'PUBLICATION_REVIEW',label:'Công bố Redmine cần kiểm tra',count:3}]});
 api.archiveProject.mockResolvedValue({...ready,archived:true,canArchive:false,canReopen:true});
 render(<AdminProjectLifecycle projectId={7} api={api}/>);
 const dialog=await open();
 expect(within(dialog).getByRole('region',{name:'Lưu ý trước khi lưu trữ'})).toHaveTextContent('Công bố Redmine cần kiểm tra');
 expect(within(dialog).getByText(/Admin cần mở lại dự án để PM đối chiếu hoặc gửi lại/)).toBeVisible();
 fireEvent.change(within(dialog).getByLabelText('Lý do lưu trữ'),{target:{value:'Đã bàn giao, theo dõi công bố trong lịch sử'}});
 expect(within(dialog).getByRole('button',{name:'Xác nhận lưu trữ'})).toBeEnabled();
 fireEvent.click(within(dialog).getByRole('button',{name:'Xác nhận lưu trữ'}));
 await waitFor(()=>expect(api.archiveProject).toHaveBeenCalledWith(7,expect.objectContaining({expectedVersion:3})));
});
