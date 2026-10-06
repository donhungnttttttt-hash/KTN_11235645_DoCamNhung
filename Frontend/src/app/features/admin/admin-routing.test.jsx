import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, test, expect, vi } from 'vitest';
import { RoleApp } from '../../../AppEntry';
import { AdminApp } from './AdminApp';

const mocks=vi.hoisted(()=>({id:'a',role:'ADMIN',projectProvider:vi.fn(),projects:vi.fn(),overview:vi.fn(),project:vi.fn(),logout:vi.fn()}));
vi.mock('../auth/AuthProvider',()=>({AuthProvider:({children})=>children,useAuth:()=>({user:{id:mocks.id,username:'admin.local',displayName:'Admin'},hasRole:role=>mocks.role===role,logout:mocks.logout})}));
vi.mock('../projects/ProjectProvider',()=>({ProjectProvider:({children})=>{mocks.projectProvider();return children;}}));
vi.mock('../work-items/ProjectData',()=>({ProjectDataProvider:({children})=>children}));
vi.mock('../../../App',()=>({default:()=> <div>Project workspace</div>}));
vi.mock('../../services/api/admin',()=>({adminApi:{projects:mocks.projects,overview:mocks.overview,project:mocks.project}}));
const empty={asOf:'2026-10-05T00:00:00Z',totalProjects:0,activeProjects:0,totalUsers:0,enabledUsers:0,openBugs:0,awaitingVerification:0,metrics:{total:0,na:0,applicable:0,ok:0,ng:0,pending:0,notRun:0,executionPercent:null,passPercent:null},byRole:[],byProject:[],attention:{overdueMilestones:[],withoutPm:[],awaitingVerification:[]}};
afterEach(()=>{window.history.replaceState(null,'','#');mocks.projectProvider.mockClear();mocks.role='ADMIN';mocks.id='a';});
describe('admin route boundary',()=>{
 test('different identity remount cannot inherit a retained explicit workspace query',async()=>{
  const workspaceIdentity={current:null};window.history.replaceState(null,'','#/dashboard?workspace=1');
  const first=render(<RoleApp workspaceIdentity={workspaceIdentity}/>);expect(screen.getByText('Project workspace')).toBeInTheDocument();first.unmount();
  mocks.projectProvider.mockClear();mocks.id='new-admin';mocks.overview.mockResolvedValue(empty);
  render(<RoleApp workspaceIdentity={workspaceIdentity}/>);await screen.findByRole('heading',{name:'Tổng quan hệ thống'});
  expect(mocks.projectProvider).not.toHaveBeenCalled();expect(window.location.hash).toBe('#/admin');
 });
 test.each(['/tests','/dashboard?projectId=2','/issues?note=workspace=1'])('PM logout followed by different ADMIN defaults to admin from %s',async hash=>{
  mocks.id='pm';mocks.role='PM';window.history.replaceState(null,'',`#${hash}`);
  const view=render(<RoleApp/>);expect(screen.getByText('Project workspace')).toBeInTheDocument();
  mocks.projectProvider.mockClear();mocks.id='new-admin';mocks.role='ADMIN';mocks.overview.mockResolvedValue(empty);
  view.rerender(<RoleApp/>);await screen.findByRole('heading',{name:'Tổng quan hệ thống'});
  expect(window.location.hash).toBe('#/admin');expect(mocks.projectProvider).not.toHaveBeenCalled();
 });
 test('workspace opt-in is retained for same identity project navigation and reset for a different identity',async()=>{
  window.history.replaceState(null,'','#/dashboard?workspace=1');const view=render(<RoleApp/>);
  await act(async()=>{window.location.hash='/tests';window.dispatchEvent(new HashChangeEvent('hashchange'));});
  expect(screen.getByText('Project workspace')).toBeInTheDocument();
  mocks.projectProvider.mockClear();mocks.id='second-admin';mocks.overview.mockResolvedValue(empty);view.rerender(<RoleApp/>);
  await screen.findByRole('heading',{name:'Tổng quan hệ thống'});expect(mocks.projectProvider).not.toHaveBeenCalled();
 });
 test('detail scope follows its project id and scope changes open the matching summary',async()=>{
  mocks.projects.mockResolvedValue({items:[{id:1,code:'P1',name:'First'},{id:2,code:'P2',name:'Second'}],totalElements:2});
  mocks.project.mockResolvedValue({id:1,code:'P1',name:'First',activeMembers:0,openBugs:0,awaitingVerification:0,metrics:empty.metrics,milestones:[],verificationBugs:[]});
  render(<AdminApp route="/admin/projects/1?projectId=2"/>);
  await screen.findByRole('heading',{name:'P1 · First'});
  expect(screen.getByLabelText('Phạm vi dự án')).toHaveValue('1');
  await userEvent.setup().selectOptions(screen.getByLabelText('Phạm vi dự án'),'2');
  expect(window.location.hash).toBe('#/admin/projects/2?projectId=2');
 });
 test('logout failure is retryable and keyboard skip preserves the hash route',async()=>{
  window.history.replaceState(null,'','#/admin');mocks.projects.mockResolvedValue({items:[],totalElements:0});mocks.overview.mockResolvedValue(empty);
  mocks.logout.mockRejectedValueOnce(new Error('Logout failed')).mockResolvedValueOnce(null);
  render(<AdminApp route="/admin"/>);const user=userEvent.setup();
  await user.click(screen.getByRole('link',{name:'Đến nội dung'}));expect(screen.getByRole('main')).toHaveFocus();expect(window.location.hash).toBe('#/admin');
  await user.click(screen.getByRole('button',{name:'Đăng xuất'}));await screen.findByText('Logout failed');
  await user.click(screen.getByRole('button',{name:'Đăng xuất'}));await waitFor(()=>expect(mocks.logout).toHaveBeenCalledTimes(2));
 });
 test('hash navigation switches between admin and project workspace',async()=>{
  window.history.replaceState(null,'','#/admin');mocks.projects.mockResolvedValue({items:[],totalElements:0});mocks.overview.mockResolvedValue(empty);render(<RoleApp/>);
  await act(async()=>{window.location.hash='/dashboard?workspace=1';window.dispatchEvent(new HashChangeEvent('hashchange'));});
  await screen.findByText('Project workspace');
  await act(async()=>{window.location.hash='/admin/projects';window.dispatchEvent(new HashChangeEvent('hashchange'));});
  await screen.findByRole('heading',{name:'Dự án'});
 });
 test('unknown admin URL gives a scoped recovery link',()=>{
  render(<AdminApp route="/admin/missing?projectId=2"/>);
  expect(screen.getByRole('heading',{name:'Không tìm thấy trang quản trị'})).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Về tổng quan'})).toHaveAttribute('href','#/admin');
 });
 test('ADMIN defaults to admin without mounting project providers',async()=>{
  window.history.replaceState(null,'','#');mocks.projects.mockResolvedValue({items:[],totalElements:0});mocks.overview.mockResolvedValue(empty);
  render(<RoleApp/>);
  await screen.findByRole('heading',{name:'Tổng quan hệ thống'});
  expect(window.location.hash).toBe('#/admin');expect(mocks.projectProvider).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Phạm vi dự án')).not.toBeInTheDocument();
 });
 test.each(['PM','TESTER'])('%s direct admin link is denied before project providers',async role=>{
  mocks.role=role;window.history.replaceState(null,'','#/admin/projects');render(<RoleApp/>);
  expect(screen.getByRole('heading',{name:'Không có quyền truy cập'})).toBeInTheDocument();expect(mocks.projectProvider).not.toHaveBeenCalled();
 });
 test('project filter lives in Projects tab and global navigation starts at all projects',async()=>{
  mocks.projects.mockResolvedValue({items:[{id:2,code:'P2',name:'Second',metrics:empty.metrics}],totalElements:1});mocks.overview.mockResolvedValue(empty);
  render(<AdminApp route="/admin/projects?projectId=2"/>);
  await waitFor(()=>expect(screen.getByRole('link',{name:'Dự án'})).toHaveAttribute('href','#/admin/projects'));
  expect(screen.getByLabelText('Phạm vi dự án').closest('header')).toBeNull();
  await userEvent.setup().selectOptions(screen.getByLabelText('Phạm vi dự án'),'');
  expect(window.location.hash).toBe('#/admin/projects');
 });
 test('explicit project workspace keeps existing project providers',()=>{
  window.history.replaceState(null,'','#/dashboard?workspace=1');render(<RoleApp/>);
  expect(screen.getByText('Project workspace')).toBeInTheDocument();expect(mocks.projectProvider).toHaveBeenCalled();
 });
});
