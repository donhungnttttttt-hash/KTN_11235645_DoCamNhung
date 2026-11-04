import React from 'react';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import userEvent from '@testing-library/user-event';
import {ProjectOverview} from './ProjectOverview';

const state=vi.hoisted(()=>({project:null,loading:false,error:''}));
const api=vi.hoisted(()=>({list:vi.fn(),board:vi.fn(),catalog:vi.fn()}));
vi.mock('../features/projects/ProjectProvider',()=>({useProject:()=>({currentProject:state.project,loading:state.loading,error:state.error})}));
vi.mock('../services/api/featureIssues',()=>({featureIssuesApi:{list:api.list,board:api.board}}));
vi.mock('../services/api/projects',()=>({projectsApi:{listCatalog:api.catalog}}));
beforeEach(()=>{
 state.project={id:12,code:'SPIDER-PLUS',name:'Spider Plus'};state.loading=false;state.error='';vi.clearAllMocks();
 api.list.mockImplementation(async(p,{status,page,size})=>{
  if(page!==0||size!==1)throw new Error('Overview reads counts, not all Issue pages');
  return {items:[],totalItems:status==='open'?4:status==='closed'?2:0,page,size,totalPages:0};
 });
 api.catalog.mockResolvedValue([{id:5,projectId:12,code:'R1',name:'Phát hành tháng 12',startsOn:null,dueOn:'2026-12-12',archived:false,version:0}]);
 api.board.mockResolvedValue({columns:[{id:'new',count:4},{id:'fixed',count:2}],legacyCount:0,totalItems:6});
});
it('ARENA-D01 uses canonical Ticket columns and excludes processed and historical records from final totals',async()=>{
 api.board.mockResolvedValue({columns:[{id:'new',count:1},{id:'processed',count:2},{id:'fixed',count:3},{id:'unsupported',count:1}],legacyCount:2,totalItems:9});
 const navigate=vi.fn();render(<ProjectOverview navigate={navigate}/>);
 expect(await screen.findByRole('button',{name:'Đóng – Đã xử lý 2'})).toBeVisible();
 expect(screen.getByText('4/9 Issue đã kết thúc · 44%')).toBeVisible();
 expect(screen.getByRole('button',{name:'Cần đối chiếu lịch sử 2'})).toBeVisible();
 expect(screen.queryByRole('button',{name:/SYP kiểm tra lại|Sẵn sàng xử lý|Lập kế hoạch|Hoàn thành/})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Đóng – Đã xử lý 2'}));
 expect(navigate).toHaveBeenCalledWith('/board/list?projectId=12&column=processed');
 expect(api.board).toHaveBeenCalledTimes(1);expect(api.list).not.toHaveBeenCalled();
});
it('replaces only the recent-work block while keeping the project overview and its status and milestone sections',async()=>{
 render(<ProjectOverview/>);
 expect(screen.getByRole('heading',{level:1,name:/Tổng quan dự án/})).toBeVisible();
 const information=screen.getByRole('region',{name:'Thông tin dự án'});
 expect(within(information).getByText(/Thực hiện System Test/)).toBeVisible();
 const statuses=screen.getByRole('region',{name:'Trạng thái công việc'});
 expect(await within(statuses).findByRole('button',{name:'Chưa xử lý 4'})).toBeVisible();
 expect(within(statuses).getByText(/2\/6 Issue/)).toBeVisible();
 const milestones=screen.getByRole('region',{name:'Mốc phát hành'});
 expect(await within(milestones).findByText('Phát hành tháng 12')).toBeVisible();
 expect(within(milestones).getByText(/12\/12\/2026/)).toBeVisible();
 expect(screen.queryByText('Công việc tạo gần đây')).toBeNull();
 expect(within(information).getByRole('heading',{name:'Mục tiêu và phạm vi',level:3})).toBeVisible();
});
it('opens the selected status in the current project rather than depending on the last stored project',async()=>{
 const navigate=vi.fn();render(<ProjectOverview navigate={navigate}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Chưa xử lý 4'}));
 expect(navigate).toHaveBeenCalledOnce();
 const [route,query]=navigate.mock.calls[0][0].split('?');
 expect(route).toBe('/board/list');expect(new URLSearchParams(query).get('projectId')).toBe('12');expect(new URLSearchParams(query).get('column')).toBe('new');
});
it('keeps the project information and milestones when status loading fails and retries only that read',async()=>{
 api.board.mockRejectedValueOnce(new Error('Không tải được trạng thái Issue'));
 render(<ProjectOverview/>);
 const statuses=screen.getByRole('region',{name:'Trạng thái công việc'});
 expect(await within(statuses).findByRole('alert')).toHaveTextContent('Không tải được trạng thái Issue');
 expect(screen.getByText(/Thực hiện System Test/)).toBeVisible();
 expect(await screen.findByText('Phát hành tháng 12')).toBeVisible();
 fireEvent.click(within(statuses).getByRole('button',{name:'Tải lại trạng thái'}));
 expect(await within(statuses).findByRole('button',{name:'Chưa xử lý 4'})).toBeVisible();
 expect(api.catalog).toHaveBeenCalledTimes(1);
});
it('shows empty states instead of sample counts or clickable milestone filters that are no longer supported',async()=>{
 api.board.mockResolvedValue({columns:[],legacyCount:0,totalItems:0});api.catalog.mockResolvedValue([]);
 render(<ProjectOverview/>);
 expect(await screen.findByText('Chưa có Bug hoặc QA trong dự án.')).toBeVisible();
 expect(await screen.findByText('Chưa có mốc phát hành được cấu hình.')).toBeVisible();
 expect(screen.queryByText(/395|3934/)).toBeNull();
});
it('does not show status or milestone responses from the previous project after switching',async()=>{
 let resolveOld;
 api.catalog.mockImplementation(p=>p===12?new Promise(resolve=>{resolveOld=resolve;}):Promise.resolve([{id:9,name:'Mốc dự án B',dueOn:null,archived:false}]));
 const view=render(<ProjectOverview/>);await waitFor(()=>expect(resolveOld).toBeTypeOf('function'));
 state.project={id:13,code:'OTHER',name:'Dự án B',description:'Thông tin B'};view.rerender(<ProjectOverview/>);
 expect(await screen.findByText('Mốc dự án B')).toBeVisible();
 await act(async()=>resolveOld([{id:5,name:'Mốc cũ không được hiện',dueOn:'2026-12-12',archived:false}]));
 expect(screen.queryByText('Mốc cũ không được hiện')).toBeNull();expect(screen.queryByText(/Thực hiện System Test/)).toBeNull();
});

it('makes the milestone list reachable by keyboard when its content needs scrolling',async()=>{
 const user=userEvent.setup();render(<ProjectOverview/>);
 const region=await screen.findByRole('region',{name:'Danh sách mốc phát hành'});
 expect(within(region).getByText('Phát hành tháng 12')).toBeVisible();
 region.focus();expect(region).toHaveFocus();
 await user.keyboard('{ArrowDown}');
 expect(region).toHaveFocus();
});
