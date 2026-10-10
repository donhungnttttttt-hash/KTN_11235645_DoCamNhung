import React from 'react';
import {render,screen,waitFor,act} from '@testing-library/react';
import {test,expect,vi} from 'vitest';
import userEvent from '@testing-library/user-event';
import {ProjectStatusReports} from './ProjectStatusReports';
import {AdminAudit} from './AdminAudit';

const history=canPost=>({canPost,milestones:[{id:1,name:'Release',dueOn:'2026-01-01',deadlineStatus:'OVERDUE'}],reports:{items:[],page:0,size:20,totalElements:0}});
test('PM submits narrative, retains failed draft and idempotency key, and cannot submit twice',async()=>{
 const user=userEvent.setup();const api={statusReports:vi.fn().mockResolvedValue(history(true)),createStatusReport:vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({id:1})};
 render(<ProjectStatusReports projectId="1" api={api}/>);
 await user.type(await screen.findByLabelText('Nội dung cập nhật'),'Progress');
 expect(screen.getByLabelText('Nguyên nhân / khó khăn')).toBeRequired();
 await user.type(screen.getByLabelText('Nguyên nhân / khó khăn'),'Blocked');await user.type(screen.getByLabelText('Kế hoạch xử lý'),'Recover');
 await user.click(screen.getByRole('button',{name:'Gửi báo cáo'}));await screen.findByText('Offline');
 expect(screen.getByLabelText('Nội dung cập nhật')).toHaveValue('Progress');
 await user.click(screen.getByRole('button',{name:'Gửi báo cáo'}));
 await waitFor(()=>expect(api.createStatusReport).toHaveBeenCalledTimes(2));
 expect(api.createStatusReport.mock.calls[0][1].requestKey).toBe(api.createStatusReport.mock.calls[1][1].requestKey);
});
test('read-only member/admin sees history and automatic warning without posting form',async()=>{
 const data=history(false);data.reports.items=[{id:1,summary:'Current update',delayReason:'Cause',recoveryPlan:'Plan',authorName:'PM One',createdAt:'2026-10-05T00:00:00Z'}];
 render(<ProjectStatusReports projectId="1" admin api={{statusReports:vi.fn().mockResolvedValue(data)}}/>);
 await screen.findByText('Current update');expect(screen.getByText(/Quá hạn/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Gửi báo cáo'})).not.toBeInTheDocument();
});
test('audit local named project and dates are sent with explicit timezone and reset page',async()=>{
 const api={projects:vi.fn().mockResolvedValue({items:[{id:7,code:'P7',name:'Project Seven'}],totalElements:1}),audit:vi.fn().mockResolvedValue({items:[],totalElements:0})};
 render(<AdminAudit api={api}/>);const user=userEvent.setup();
 await user.click(screen.getByLabelText('Dự án trong nhật ký'));
 await user.click(await screen.findByRole('option',{name:'P7 · Project Seven'}));
 await waitFor(()=>expect(api.audit).toHaveBeenLastCalledWith(expect.objectContaining({projectId:'7',page:0,timezone:'Asia/Ho_Chi_Minh'}),expect.anything()));
 expect(screen.getByText(/Ngày lọc và thời gian hiển thị/)).toBeInTheDocument();
});
test('pending PM submission cannot erase another project draft',async()=>{
 let finish;const api={statusReports:vi.fn().mockResolvedValue(history(true)),createStatusReport:vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}))};const user=userEvent.setup();
 const view=render(<ProjectStatusReports projectId="1" api={api}/>);
 await user.type(await screen.findByLabelText('Nội dung cập nhật'),'First');await user.type(screen.getByLabelText('Nguyên nhân / khó khăn'),'Cause');await user.type(screen.getByLabelText('Kế hoạch xử lý'),'Plan');await user.click(screen.getByRole('button',{name:'Gửi báo cáo'}));
 expect(screen.getByRole('button',{name:'Đang gửi…'})).toBeDisabled();
 view.rerender(<ProjectStatusReports projectId="2" api={api}/>);await user.type(await screen.findByLabelText('Nội dung cập nhật'),'Second draft');
 await act(async()=>finish({id:1}));expect(screen.getByLabelText('Nội dung cập nhật')).toHaveValue('Second draft');
});
test('audit read failure stays visible and retry loads sanitized public rows',async()=>{
 const api={projects:vi.fn().mockResolvedValue({items:[],totalElements:0}),audit:vi.fn().mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({items:[{id:'project:1',entityType:'DEVICE_ASSET',entityId:'1',action:'CREATE',occurredAt:'2026-10-05T00:00:00Z',actorName:'Admin'}],totalElements:1})};
 render(<AdminAudit api={api}/>);await screen.findByText('Unavailable');await userEvent.setup().click(screen.getByRole('button',{name:'Thử lại'}));await screen.findByText('Tạo mới');expect(screen.getByText('Toàn hệ thống')).toBeInTheDocument();
});
