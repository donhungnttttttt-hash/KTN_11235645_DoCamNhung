import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,within,fireEvent} from '@testing-library/react';
import {AdminDashboard} from './AdminDashboard';
vi.mock('./AdminHealthCharts',()=>({AdminHealthCharts:()=>null}));
const metrics={total:10,tested:5,ok:2,ng:1,pending:1,na:1,notRun:5,executionPercent:50,passPercent:20};
const data={asOf:'2026-11-15T00:00:00Z',totalProjects:12,activeProjects:11,totalUsers:20,enabledUsers:19,openBugs:1,awaitingVerification:0,metrics,byRole:[],byProject:Array.from({length:12},(_,i)=>({id:i+1,name:'Project '+(i+1),code:'P'+i,activeMembers:2,archivedAt:i===11?'2026-11-01':null,metrics})),attention:{overdueMilestones:[],withoutPm:[],awaitingVerification:[]},inventory:{allocated:3,available:2,maintenance:1,retired:1,byTypeAndStatus:[{type:'ANDROID',status:'ALLOCATED',total:3},{type:'ANDROID',status:'AVAILABLE',total:2},{type:'ANDROID',status:'MAINTENANCE',total:1},{type:'ANDROID',status:'RETIRED',total:1},{type:'OTHER',status:'AVAILABLE',total:2}]}};
it('shows all active projects, removes redundant KPI/refresh and labels memberships by project',async()=>{
 render(<AdminDashboard api={{overview:vi.fn().mockResolvedValue(data)}}/>);
 await screen.findByText('Hiển thị 11/11 dự án đang hoạt động.');
 const progress=screen.getByRole('heading',{name:'Tiến độ theo dự án'}).closest('section');
 expect(within(progress).getAllByRole('link')).toHaveLength(11);expect(within(progress).queryByText('Project 12')).toBeNull();
 expect(screen.queryByRole('heading',{name:'Tiến độ kiểm thử'})).toBeNull();expect(screen.queryByRole('button',{name:'Tải lại'})).toBeNull();
 expect(within(screen.getByLabelText('Membership theo dự án')).getByRole('columnheader',{name:'Tên dự án'})).toBeVisible();
 expect(screen.getByRole('img',{name:/Phân bố Status test case: OK 2, NG 1/})).toBeVisible();
});
it('uses exactly four inventory rows with every status shown on hover, keyboard and click',async()=>{
 render(<AdminDashboard api={{overview:vi.fn().mockResolvedValue(data)}}/>);
 const inventory=await screen.findByRole('group',{name:'Kho thiết bị theo loại'});
 expect(within(inventory).getAllByRole('button')).toHaveLength(4);
 const android=within(inventory).getByRole('button',{name:'Android: 7 máy. Xem tình trạng'});
 fireEvent.mouseEnter(android);const popup=screen.getByRole('tooltip');
 for(const label of ['Đã bàn giao','Sẵn sàng','Bảo trì','Ngưng sử dụng'])expect(within(popup).getByText(label)).toBeVisible();
 fireEvent.mouseLeave(android);expect(screen.queryByRole('tooltip')).toBeNull();
 const tablet=within(inventory).getByRole('button',{name:'Tablet: 0 máy. Xem tình trạng'});
 fireEvent.focus(tablet);expect(screen.getByRole('tooltip')).toHaveTextContent('Chưa có thiết bị');fireEvent.keyDown(tablet,{key:'Escape'});expect(screen.queryByRole('tooltip')).toBeNull();
 fireEvent.click(android);expect(screen.getByRole('tooltip')).toBeVisible();fireEvent.click(android);expect(screen.queryByRole('tooltip')).toBeNull();
 expect(screen.getByText(/2 máy loại Khác/)).toBeVisible();
});
