import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProjectOverview } from './ProjectOverview';
import { workItemsApi } from '../services/api/workItems';
const state=vi.hoisted(()=>({projectId:1,writable:true,metadata:{canCreate:true}}));
vi.mock('../features/work-items/ProjectData',async original=>({...await original(),useProjectData:()=>state}));
vi.mock('../services/api/workItems',()=>({workItemsApi:{overview:vi.fn()}}));
const result={items:[{id:7,key:'DEMO-7',title:'Lỗi đăng nhập',type:'BUG',priority:'MEDIUM',status:'open',creator:'Tester',createdAt:'2026-09-29T05:00:00Z'}],statuses:[{status:'open',count:40},{status:'closed',count:60}],milestones:[]};
beforeEach(()=>{vi.resetAllMocks();state.projectId=1;state.writable=true;state.metadata={canCreate:true};});
it('uses project totals rather than the recent page and opens the canonical detail',async()=>{
  workItemsApi.overview.mockResolvedValue(result);const navigate=vi.fn();render(<ProjectOverview navigate={navigate}/>);
  fireEvent.click(await screen.findByRole('button',{name:/DEMO-7 Lỗi đăng nhập/}));expect(navigate).toHaveBeenCalledWith('/board/issue/7');
  expect(screen.getByText('60/100 công việc hoàn thành · 60%')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Thêm công việc'}));expect(navigate).toHaveBeenLastCalledWith('/board/new');
});
it('retries a failed overview and discards an earlier project response',async()=>{
  let finish;workItemsApi.overview.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockRejectedValueOnce(new Error('Lỗi dự án B')).mockResolvedValueOnce({...result,items:[]});
  const {rerender}=render(<ProjectOverview navigate={()=>{}}/>);state.projectId=2;rerender(<ProjectOverview navigate={()=>{}}/>);
  await screen.findByText('Lỗi dự án B');finish(result);await waitFor(()=>expect(screen.queryByText('DEMO-7')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));await screen.findByText('60/100 công việc hoàn thành · 60%');expect(workItemsApi.overview).toHaveBeenLastCalledWith(2);
  state.projectId=null;rerender(<ProjectOverview navigate={()=>{}}/>);expect(screen.getByText('Chọn dự án để xem tổng quan.')).toBeVisible();
});
