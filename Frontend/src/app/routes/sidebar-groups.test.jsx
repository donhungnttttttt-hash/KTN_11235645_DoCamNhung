import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../components/Sidebar';

const props = { activeRoute: '/issues', navigate: vi.fn(), collapsed: false, onToggle: vi.fn(), onClose: vi.fn() };

describe('sidebar page groups', () => {
  it.each([
    ['Tổng quan', 'Tổng quan kiểm thử', '/dashboard/testing'],
    ['Quản lý kiểm thử', 'Thư viện test case', '/tests'],
    ['Quản lý kiểm thử', 'Đợt kiểm thử', '/tests/cycles'],
    ['Quản lý kiểm thử', 'Kiểm thử lại', '/tests/retests'],
    ['Cài đặt dự án', 'Thành viên', '/settings/members'],
    ['Cài đặt dự án', 'Quy tắc báo lỗi', '/settings/rules'],
    ['Cài đặt dự án', 'Sổ tay dự án', '/settings/handbook'],
  ])('opens %s before selecting %s', async (parent, child, route) => {
    const user = userEvent.setup();
    const navigate = vi.fn(), onClose = vi.fn();
    render(<Sidebar {...props} navigate={navigate} onClose={onClose} />);
    const group = screen.getByRole('button', { name: parent, exact: true });
    expect(group).toHaveAttribute('aria-expanded', 'false');
    await user.click(group);
    expect(navigate).not.toHaveBeenCalled();
    expect(group).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: child, exact: true }));
    expect(navigate).toHaveBeenCalledWith(route);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each([
    ['/dashboard', 'Tổng quan dự án'],
    ['/dashboard/testing', 'Tổng quan kiểm thử'],
    ['/board/issue/7', 'Bảng Kanban'],
    ['/board/new', 'Bảng Kanban'],
    ['/tests', 'Thư viện test case'],
    ['/tests/cycles/15?caseId=2', 'Đợt kiểm thử'],
    ['/tests/15?caseId=2', 'Đợt kiểm thử'],
    ['/tests/retests', 'Kiểm thử lại'],
    ['/settings', 'Thông tin chung'],
    ['/settings/members', 'Thành viên'],
    ['/settings/catalogs', 'Danh mục'],
    ['/settings/rules', 'Quy tắc báo lỗi'],
    ['/settings/handbook', 'Sổ tay dự án'],
  ])('restores the selected page for %s', (route, label) => {
    render(<Sidebar {...props} activeRoute={route} />);
    expect(screen.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it('follows Back navigation and can close an active group using the keyboard', async () => {
    const user = userEvent.setup();
    const view = render(<Sidebar {...props} activeRoute='/tests/retests' />);
    view.rerender(<Sidebar {...props} activeRoute='/settings/rules' />);
    expect(screen.getByRole('button', { name: 'Quy tắc báo lỗi' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: 'Kiểm thử lại' })).not.toBeInTheDocument();
    const parent = screen.getByRole('button', { name: 'Cài đặt dự án' });
    parent.focus();
    await user.keyboard('{Enter}');
    expect(parent).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Quy tắc báo lỗi' })).not.toBeInTheDocument();
  });

  it('expands a collapsed sidebar before displaying children', async () => {
    const user = userEvent.setup(), onToggle = vi.fn();
    const view = render(<Sidebar {...props} collapsed onToggle={onToggle} />);
    await user.click(screen.getByRole('button', { name: 'Quản lý kiểm thử' }));
    expect(onToggle).toHaveBeenCalledOnce();
    view.rerender(<Sidebar {...props} collapsed={false} onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: 'Đợt kiểm thử' })).toBeInTheDocument();
  });
});
