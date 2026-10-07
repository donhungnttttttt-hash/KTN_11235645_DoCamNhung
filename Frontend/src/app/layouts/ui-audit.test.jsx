import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MainLayout } from './MainLayout';
import { ProjectSelector } from '../features/projects/ProjectSelector';
import { AccountMenu } from '../features/auth/AccountMenu';
import { Modal } from '../features/work-items/components';

const context = vi.hoisted(() => ({ project: {
  projects: [{ id: 1, name: 'Dự án A' }, { id: 2, name: 'Dự án B' }],
  currentProject: { id: 1, name: 'Dự án A' }, selectProject: vi.fn(), loading: false,
}, auth: { user: { displayName: 'Tester', username: 'tester', roles: ['TESTER'] }, hasRole: () => false } }));
vi.mock('../features/projects/ProjectProvider', () => ({ useProject: () => context.project }));
vi.mock('../features/auth/AuthProvider', () => ({ useAuth: () => context.auth, initials: () => 'TE', roleLabels: {TESTER:'Tester'} }));
beforeEach(() => { vi.clearAllMocks(); context.auth.hasRole = () => false; context.project.currentProject={id:1,name:'Dự án A'}; context.project.projects=[{id:1,name:'Dự án A'},{id:2,name:'Dự án B'}]; window.location.hash=''; });

it('labels archived projects and explains their read-only workspace while keeping history accessible',async()=>{
 context.project.currentProject={id:1,name:'Dự án A',archived:true};context.project.projects=[context.project.currentProject];
 const user=userEvent.setup();render(<MainLayout activeRoute="/tests" navigate={vi.fn()}><button>Xem lịch sử</button></MainLayout>);
 expect(screen.getByRole('status')).toHaveTextContent('Dự án đã lưu trữ');
 expect(screen.getByRole('status')).toHaveTextContent('Admin');
 expect(screen.getByRole('button',{name:'Xem lịch sử'})).toBeEnabled();
 await user.click(screen.getByRole('button',{name:/Dự án: Dự án A.*Đã lưu trữ/}));
 expect(screen.getByRole('button',{name:'Dự án A · Đã lưu trữ'})).toBeInTheDocument();
});

it('selects a project and routes ADMIN creation to central administration with menu closed', async () => {
  context.auth.hasRole = role => role === 'ADMIN';
  const user=userEvent.setup(); render(<ProjectSelector/>);
  const trigger=screen.getByRole('button',{name:'Dự án: Dự án A'});
  await user.click(trigger);
  await user.click(screen.getByRole('button',{name:'Dự án B',exact:true}));
  expect(context.project.selectProject).toHaveBeenCalledWith(2);
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  await user.click(screen.getByRole('button',{name:'Tạo dự án',exact:true}));
  expect(window.location.hash).toBe('#/admin/projects');
  expect(screen.queryByRole('group',{name:'Chọn dự án'})).toBeNull();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(trigger).toHaveFocus();
});

it('does not offer project creation to PM', async () => {
  context.auth.hasRole=role=>role==='PM';
  const user=userEvent.setup();render(<ProjectSelector/>);
  await user.click(screen.getByRole('button',{name:'Dự án: Dự án A'}));
  expect(screen.queryByRole('button',{name:'Tạo dự án',exact:true})).toBeNull();
  expect(window.location.hash).toBe('');
});

it('closes project choices with Escape and returns focus to the trigger', async () => {
  const user = userEvent.setup(); render(<ProjectSelector/>);
  const trigger = screen.getByRole('button', {name:'Dự án: Dự án A'});
  await user.click(trigger); await user.tab();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('button', {name:'Dự án B', exact:true})).toBeNull();
  expect(trigger).toHaveFocus();
});

it('closes project choices when tabbing outside without trapping keyboard navigation', async () => {
  const user = userEvent.setup(); render(<><ProjectSelector/><button>Sau menu</button></>);
  await user.click(screen.getByRole('button', {name:'Dự án: Dự án A'}));
  await user.tab(); await user.tab(); await user.tab();
  expect(screen.getByText('Sau menu')).toHaveFocus();
  expect(screen.queryByRole('button',{name:'Dự án B',exact:true})).toBeNull();
});

it('restores focus after Escape from the account popup', async () => {
  const user = userEvent.setup(); render(<AccountMenu/>);
  const trigger = screen.getByRole('button',{name:'Tài khoản: Tester'});
  await user.click(trigger); await user.tab();
  expect(screen.getByRole('button',{name:'Đăng xuất'})).toHaveFocus();
  await user.keyboard('{Escape}'); expect(trigger).toHaveFocus();
});

it('opens a full navigation drawer after desktop collapse and closes it using Escape', async () => {
  const user = userEvent.setup();
  render(<MainLayout activeRoute="/tests" navigate={vi.fn()}><button>Nội dung trang</button></MainLayout>);
  await user.click(screen.getByRole('button',{name:'Thu gọn menu'}));
  await user.click(screen.getByRole('button',{name:'Mở menu dự án'}));
  const drawer = screen.getByRole('dialog',{name:'Menu dự án'});
  expect(within(drawer).getByRole('button',{name:'Thư viện test case',exact:true})).toBeVisible();
  expect(drawer.contains(document.activeElement)).toBe(true);
  await user.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button',{name:'Mở menu dự án'})).toHaveFocus();
});

it('recognizes a document focus route with a case deep link', () => {
  const { container } = render(<MainLayout activeRoute="/tests/documents/5?caseId=405" navigate={vi.fn()}/>);
  expect(container.querySelector('.app-shell')).toHaveClass('document-focus');
});

it('work-item modals wrap Tab past a disabled last action', async () => {
  const user = userEvent.setup();
  render(<Modal title="Công việc" onClose={vi.fn()}><button>Thao tác</button><button disabled>Đang lưu</button></Modal>);
  await user.click(screen.getByRole('button',{name:'Thao tác'}));
  await user.tab(); expect(screen.getByRole('button',{name:'Đóng hộp thoại'})).toHaveFocus();
});
