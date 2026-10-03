import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routeInfo } from './routeInfo';
import { Sidebar } from '../components/Sidebar';
import { TestRunnerGridPage } from '../pages/TestRunnerGridPage';
import { AppRouter } from './AppRouter';

describe('existing navigation regression', () => {
  it.each(['/tests/documents/9','/tests/cases'])('keeps the test library selected for %s', path => {
    render(<Sidebar activeRoute={path} navigate={vi.fn()} collapsed={false} onToggle={vi.fn()} onClose={vi.fn()}/>);
    expect(screen.getByRole('button',{name:'Thư viện test case'})).toHaveAttribute('aria-current','page');
    expect(screen.getByRole('button',{name:'Đợt kiểm thử'})).not.toHaveAttribute('aria-current');
  });
  it('keeps query parameters out of board and test identifiers', () => {
    expect(routeInfo('/board?filter=mine').path).toBe('/board');
    expect(routeInfo('/tests/504?caseId=2')).toMatchObject({ path: '/tests/504', specId: '504', caseId: '2' });
    expect(routeInfo('/tests/504/extra').specId).toBeNull();
  });

  it('expands Board and navigates using its submenu', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    const props = { activeRoute: '/dashboard', navigate, collapsed: false, onToggle: vi.fn(), onClose: vi.fn() };
    const view = render(<Sidebar {...props}/>);
    expect(screen.queryByRole('button', { name: 'Danh sách' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bảng công việc' }));
    expect(navigate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Danh sách' }));
    expect(navigate).toHaveBeenCalledWith('/board/list');
    view.rerender(<Sidebar {...props} activeRoute='/board?view=list'/>);
    expect(screen.getByRole('button', { name: 'Danh sách' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Bảng Kanban' })).not.toHaveAttribute('aria-current');
  });

  it('does not fall back to the first spec for an invalid ID', () => {
    render(<AppRouter activeRoute='/tests/missing?caseId=2' testSpecs={[{ no: 504, name: 'Existing spec' }]} navigate={vi.fn()}/>);
    expect(screen.getByText('Không tìm thấy đợt kiểm thử này.')).toBeInTheDocument();
    expect(screen.queryByText('Existing spec')).not.toBeInTheDocument();
  });

  it('shows not-found for an unknown page', () => {
    render(<AppRouter activeRoute='/unknown' testSpecs={[]} navigate={vi.fn()}/>);
    expect(screen.getByText('Không tìm thấy trang bạn yêu cầu.')).toBeInTheDocument();
  });

  it('resolves real cycle routes without using prototype case IDs', () => {
    expect(routeInfo('/tests/cycles/15')).toMatchObject({specId:'15'});
    expect(routeInfo('/tests/cycles/15/extra').specId).toBeNull();
  });
});
