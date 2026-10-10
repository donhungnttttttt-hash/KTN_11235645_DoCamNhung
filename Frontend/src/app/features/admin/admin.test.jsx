import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AdminDashboard } from './AdminDashboard';

const overview = name => ({asOf:'2026-10-05T00:00:00Z',totalProjects:1,activeProjects:1,totalUsers:2,enabledUsers:2,openBugs:0,awaitingVerification:0,metrics:{total:0,na:0,applicable:0,ok:0,ng:0,pending:0,notRun:0,executionPercent:null,passPercent:null},byRole:[],byProject:[{id:1,code:name,name,metrics:{executionPercent:null,total:0,na:0,ok:0,ng:0,pending:0,notRun:0}}],attention:{overdueMilestones:[],withoutPm:[],awaitingVerification:[]}});
describe('admin dashboard',()=>{
 test('attention links open admin summaries and reload reads fresh totals',async()=>{
  const data=overview('Project needing attention');data.attention={overdueMilestones:[{id:1,projectId:2,projectName:'Project',name:'Late milestone',dueOn:'2000-01-01'}],withoutPm:[{id:2,name:'Missing PM'}],awaitingVerification:[{id:1,projectId:2,projectName:'Project',itemKey:'P-1',title:'Verification needed'}]};
  const api={overview:vi.fn().mockResolvedValue(data)};render(<AdminDashboard projectId="2" api={api}/>);
  const link=await screen.findByRole('link',{name:'Project · Late milestone'});expect(link).toHaveAttribute('href','#/admin/projects/2?projectId=2');
  expect(screen.getByText(/Verification needed/)).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole('button',{name:'Tải lại'}));await waitFor(()=>expect(api.overview).toHaveBeenCalledTimes(2));
 });
 test('stale response cannot overwrite the selected project',async()=>{
  let first; const api={overview:vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{first=resolve;})).mockResolvedValueOnce(overview('Current project'))};
  const view=render(<AdminDashboard projectId="1" api={api}/>);
  view.rerender(<AdminDashboard projectId="2" api={api}/>);
  await screen.findByRole('link',{name:'Current project'});
  await act(async()=>first(overview('Old project')));
  expect(screen.queryByText('Old project')).not.toBeInTheDocument();
 });
 test('API failure is visible and does not become zero metrics',async()=>{
  render(<AdminDashboard api={{overview:vi.fn().mockRejectedValue(new Error('Service unavailable'))}}/>);
  await screen.findByRole('alert');
  expect(screen.getByText('Service unavailable')).toBeInTheDocument();
  expect(screen.queryByText('Dự án hoạt động')).not.toBeInTheDocument();
 });
 test('zero denominator is described as unavailable',async()=>{
  render(<AdminDashboard api={{overview:vi.fn().mockResolvedValue(overview('Empty project'))}}/>);
  await waitFor(()=>expect(screen.getAllByText('Chưa có phạm vi áp dụng').length).toBeGreaterThan(0));
 });
});
