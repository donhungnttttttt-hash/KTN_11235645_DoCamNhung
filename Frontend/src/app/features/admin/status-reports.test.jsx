import React from 'react';
import {render,screen,waitFor,act} from '@testing-library/react';
import {test,expect,vi,beforeEach} from 'vitest';
import userEvent from '@testing-library/user-event';
import {ProjectStatusReports} from './ProjectStatusReports';
import {AdminAudit} from './AdminAudit';
const permission=vi.hoisted(()=>({role:'PM',project:1,projectRole:'PM'}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({hasRole:(...roles)=>roles.includes(permission.role)})}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:{id:permission.project,projectRole:permission.projectRole}})}));
beforeEach(()=>{permission.role='PM';permission.project=1;permission.projectRole='PM';});

const history=canPost=>({canPost,milestones:[{id:1,name:'Release',dueOn:'2026-01-01',deadlineStatus:'OVERDUE'}],reports:{items:[],page:0,size:20,totalElements:0}});
test('PM reads legacy history and opens the new report workspace without a duplicate write form',async()=>{
 const api={statusReports:vi.fn().mockResolvedValue(history(false)),createStatusReport:vi.fn()};
 render(<ProjectStatusReports projectId="1" api={api}/>);
 expect(await screen.findByRole('link',{name:'Mở Tổng hợp & Phân tích'})).toHaveAttribute('href','#/analysis?projectId=1');
 expect(screen.queryByLabelText('Nội dung cập nhật')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Gửi báo cáo'})).not.toBeInTheDocument();expect(api.createStatusReport).not.toHaveBeenCalled();
});
test('read-only member/admin sees history and automatic warning without posting form',async()=>{
 permission.role='ADMIN';
 const data=history(false);data.reports.items=[{id:1,summary:'Current update',delayReason:'Cause',recoveryPlan:'Plan',authorName:'PM One',createdAt:'2026-10-05T00:00:00Z'}];
 render(<ProjectStatusReports projectId="1" admin api={{statusReports:vi.fn().mockResolvedValue(data)}}/>);
 await screen.findByText('Current update');expect(screen.getByText(/Quá hạn/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Gửi báo cáo'})).not.toBeInTheDocument();
});
test('central Admin history links to the selected project progress workspace',async()=>{
 permission.role='ADMIN';
 render(<ProjectStatusReports projectId="7" admin api={{statusReports:vi.fn().mockResolvedValue(history(false))}}/>);
 const link=await screen.findByRole('link',{name:'Mở Tổng hợp & Phân tích'});
 expect(link).toHaveAttribute('href','#/analysis?projectId=7');
 expect(screen.queryByRole('button',{name:'Gửi báo cáo'})).not.toBeInTheDocument();
});
test('audit named project and dates are sent with the fixed Vietnam contract and reset page',async()=>{
 const api={projects:vi.fn().mockResolvedValue({items:[{id:7,code:'P7',name:'Project Seven'}],totalElements:1}),audit:vi.fn().mockResolvedValue({items:[],totalElements:0})};
 render(<AdminAudit api={api}/>);const user=userEvent.setup();
 await user.click(screen.getByLabelText('Dự án trong nhật ký'));
 await user.click(await screen.findByRole('option',{name:'P7 · Project Seven'}));
 await waitFor(()=>expect(api.audit).toHaveBeenLastCalledWith(expect.objectContaining({projectId:'7',page:0,keyword:''}),expect.anything()));
 expect(api.audit.mock.calls.at(-1)[0]).not.toHaveProperty('timezone');
 expect(screen.getByText(/Ngày lọc và thời gian hiển thị/)).toBeInTheDocument();
});
test('a late legacy history read cannot overwrite the selected project',async()=>{
 let finish;const current=history(false);current.reports.items=[{id:2,summary:'Current history',authorName:'PM',createdAt:'2026-10-05T00:00:00Z'}];
 const api={statusReports:vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce(current)};
 const view=render(<ProjectStatusReports projectId="1" api={api}/>);
 permission.project=2;view.rerender(<ProjectStatusReports projectId="2" api={api}/>);await screen.findByText('Current history');
 const old=history(false);old.reports.items=[{id:1,summary:'Old project history',authorName:'PM',createdAt:'2026-10-05T00:00:00Z'}];await act(async()=>finish(old));expect(screen.queryByText('Old project history')).not.toBeInTheDocument();
});
test.each(['TESTER','DEV'])('worker %s does not fetch management history or see the legacy composer',async role=>{
 permission.role=role;permission.projectRole=role;const api={statusReports:vi.fn().mockResolvedValue(history(false))};
 render(<ProjectStatusReports projectId="1" api={api}/>);expect(await screen.findByText('Báo cáo quản lý dành cho PM của dự án và ADMIN.')).toBeInTheDocument();expect(api.statusReports).not.toHaveBeenCalled();expect(screen.queryByRole('link',{name:'Mở Tổng hợp & Phân tích'})).not.toBeInTheDocument();
});
test('audit read failure stays visible and retry loads sanitized public rows',async()=>{
 const api={projects:vi.fn().mockResolvedValue({items:[],totalElements:0}),audit:vi.fn().mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({items:[{id:'project:1',entityType:'DEVICE_ASSET',entityId:'1',action:'CREATE',occurredAt:'2026-10-05T00:00:00Z',actorName:'Admin'}],totalElements:1})};
 render(<AdminAudit api={api}/>);await screen.findByText('Unavailable');await userEvent.setup().click(screen.getByRole('button',{name:'Thử lại'}));await screen.findByText('Tạo mới');expect(screen.getByText('Toàn hệ thống')).toBeInTheDocument();
});
