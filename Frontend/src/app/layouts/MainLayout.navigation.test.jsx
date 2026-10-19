import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MainLayout } from './MainLayout';

vi.mock('../features/projects/ProjectProvider', () => ({useProject: () => ({currentProject:{id:1}})}));
vi.mock('../components/Header', () => ({Header: () => <header><button>Chọn dự án</button></header>}));
vi.mock('../components/Sidebar', () => ({Sidebar: () => <nav><button>Điều hướng</button></nav>}));
vi.mock('../components/Footer', () => ({Footer: () => <footer>Thông tin hệ thống</footer>}));

beforeEach(() => {window.location.hash='#/dashboard';});
afterEach(() => {vi.restoreAllMocks();});

it('offers a keyboard shortcut to main content without changing the application route', async () => {
  const user=userEvent.setup();
  render(<MainLayout activeRoute="/dashboard" navigate={vi.fn()}><h1>Tổng quan</h1></MainLayout>);
  await user.tab();
  const skip=screen.getByRole('link',{name:'Đến nội dung chính'});
  expect(skip).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('main',{name:'Nội dung chính'})).toHaveFocus();
  expect(window.location.hash).toBe('#/dashboard');
});

it('focuses new screen content after navigation and keeps filter interactions in place', async () => {
  const user=userEvent.setup();
  const view=render(<MainLayout activeRoute="/dashboard" navigate={vi.fn()}><h1>Tổng quan</h1></MainLayout>);
  await user.click(screen.getByRole('button',{name:'Điều hướng'}));
  view.rerender(<MainLayout activeRoute="/issues" navigate={vi.fn()}><h1>Quản lý lỗi</h1></MainLayout>);
  expect(screen.getByRole('main',{name:'Nội dung chính'})).toHaveFocus();
  const projectButton=screen.getByRole('button',{name:'Chọn dự án'});
  await user.click(projectButton);
  view.rerender(<MainLayout activeRoute="/issues?status=open" navigate={vi.fn()}><h1>Quản lý lỗi</h1></MainLayout>);
  expect(projectButton).toHaveFocus();
});
