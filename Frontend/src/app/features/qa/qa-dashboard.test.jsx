import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectOverview } from '../../modules/ProjectOverview';
import BoardPage from '../work-items/BoardPage';
import { workItemsApi } from '../../services/api/workItems';
import { qaApi } from '../../services/api/qa';

const state = vi.hoisted(() => ({ projectId: 1, writable: true, loading: false, error: '', metadata: { canCreate: true, canTriage: true } }));
vi.mock('../work-items/ProjectData', async original => ({ ...await original(), useProjectData: () => state }));
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 2, displayName: 'PM' }, hasRole:r=>r===state.role }) }));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:state.project})}));
vi.mock('../../services/api/workItems', () => ({ workItemsApi: { overview: vi.fn() } }));
vi.mock('../../services/api/qa', () => ({ qaApi: { handoff: vi.fn() } }));
const overview = { items: [{ id: 7, key: 'BUG-7', type: 'BUG', title: 'Existing bug', status: 'resolved', priority: 'MEDIUM', creator: 'Tester', createdAt: '2026-10-06T00:00:00Z' }], statuses: [{ status: 'open', count: 40 }, { status: 'closed', count: 60 }], milestones: [] };
const handoff = { items: [{ workItemId: 7, key: 'BUG-7', title: 'Current round bug', roundNo: 3, fixedBuildId: 6, state: 'VERIFYING', applicableCount: 1, requestedCount: 1, pendingCount: 0, passCount: 1, failCount: 0, requestIds: [71], canPrepareRetest: false, canClose: false }], page: 0, totalPages: 1, totalItems: 1 };
beforeEach(() => {
  vi.resetAllMocks(); Object.assign(state, { projectId: 1, writable: true, loading: false, error: '', metadata: { canCreate: true, canTriage: true } });
  workItemsApi.overview.mockResolvedValue(overview); qaApi.handoff.mockResolvedValue(handoff);
});

describe('FR05 read-only project overview replaces the retired handoff dashboard',()=>{
  it.each(['PM','TESTER','DEV','ADMIN','archived'])('does not fetch hidden management/queue data for %s',role=>{
    state.role=role;state.project={id:1,code:'ACTUAL',name:'Dự án thật',description:'Mô tả đã lưu',projectRole:role,archived:role==='archived'};
    render(<ProjectOverview navigate={vi.fn()}/>);
    expect(screen.getByText('Mô tả đã lưu')).toBeVisible();
    expect(screen.queryByRole('region',{name:'Hàng chờ bàn giao'})).toBeNull();
    expect(screen.queryByRole('button',{name:'Thêm công việc'})).toBeNull();
    expect(workItemsApi.overview).not.toHaveBeenCalled();expect(qaApi.handoff).not.toHaveBeenCalled();
  });
});

const statuses = [{ id: 'open', label: 'Chưa xử lý' }, { id: 'progress', label: 'Đang xử lý' }, { id: 'resolved', label: 'Đã xử lý / chờ kiểm thử lại' }, { id: 'closed', label: 'Đóng', terminal: true }];
const qa = { id: 'QA-8', typeCode: 'QA', type: 'Hỏi đáp', status: 'resolved', statusLabel: 'Đã trả lời', title: 'QA question', assignee: 'Dev' };
const bug = { id: 'BUG-7', typeCode: 'BUG', type: 'Lỗi', status: 'open', title: 'BUG title', assignee: 'Dev' };
function board(props = {}) { return <BoardPage issues={[qa, bug]} statuses={statuses} canTriage canCreate navigate={vi.fn()} notify={vi.fn()} updateIssues={vi.fn()} hideControls {...props} />; }
describe('typed QA Kanban affordance', () => {
  it('shows canonical QA status, keeps detail navigation and excludes pointer/keyboard move affordances', async () => {
    const navigate = vi.fn(), user = userEvent.setup(); render(board({ navigate }));
    const card = screen.getByRole('button', { name: 'QA question' }).closest('article');
    expect(card).toHaveAttribute('draggable', 'false'); expect(within(card).getByText('Đã trả lời')).toBeVisible();
    expect(within(card).queryByRole('button', { name: 'Tùy chọn QA-8' })).toBeNull();
    screen.getByRole('button', { name: 'QA question' }).focus(); await user.keyboard('{Enter}');
    expect(navigate).toHaveBeenLastCalledWith('/board/issue/QA-8');
    expect(screen.queryByRole('button', { name: 'Chuyển công việc' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Đã xử lý / chờ kiểm thử lại' })).toBeVisible();
  });
  it('rejects forged QA drops and stale open-menu QA identity without a generic or local write', () => {
    const onMove = vi.fn(), updateIssues = vi.fn(); const { rerender } = render(board({ onMove, updateIssues }));
    const target = screen.getByRole('region', { name: 'Cột Đang xử lý' });
    fireEvent.drop(target, { dataTransfer: { getData: () => 'QA-8' } });
    expect(onMove).not.toHaveBeenCalled(); expect(updateIssues).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn BUG-7' }));
    rerender(board({ onMove, updateIssues, issues: [qa, { ...bug, typeCode: 'QA', statusLabel: 'Chờ xử lý QA' }] }));
    expect(screen.queryByRole('button', { name: 'Chuyển công việc' })).toBeNull();
  });
  it('retains non-QA PM menu/drag moves and typed QA-only column labels', async () => {
    const onMove = vi.fn(), user = userEvent.setup(); const { rerender } = render(board({ onMove }));
    expect(screen.getByRole('button', { name: 'BUG title' }).closest('article')).toHaveAttribute('draggable', 'true');
    screen.getByRole('button', { name: 'Tùy chọn BUG-7' }).focus(); await user.keyboard('{Enter}');
    fireEvent.change(screen.getByLabelText('Chuyển sang trạng thái'), { target: { value: 'progress' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển công việc' })); expect(onMove).toHaveBeenCalledWith('BUG-7', 'progress');
    fireEvent.drop(screen.getByRole('region', { name: 'Cột Đang xử lý' }), { dataTransfer: { getData: () => 'BUG-7' } });
    expect(onMove).toHaveBeenCalledTimes(2);
    rerender(board({ issues: [qa], statuses: [{ id: 'resolved', label: 'Đã trả lời' }] }));
    expect(screen.getByRole('heading', { name: 'Đã trả lời' })).toBeVisible();
  });
  it('retains ordinary local status moves and never invents a QA local move', () => {
    const updateIssues = vi.fn(), notify = vi.fn(), navigate = vi.fn(); render(board({ updateIssues, notify, navigate }));
    fireEvent.drop(screen.getByRole('region', { name: 'Cột Đang xử lý' }), { dataTransfer: { getData: () => 'QA-8' } });
    expect(updateIssues).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn BUG-7' }));
    fireEvent.change(screen.getByLabelText('Chuyển sang trạng thái'), { target: { value: 'progress' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển công việc' }));
    expect(updateIssues.mock.calls[0][0]([qa, bug])).toEqual([qa, { ...bug, status: 'progress' }]);
    expect(notify).toHaveBeenCalledWith('Đã chuyển BUG-7 sang “Đang xử lý”.');
    fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn BUG-7' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem chi tiết' })); expect(navigate).toHaveBeenCalledWith('/board/issue/BUG-7');
    fireEvent.click(screen.getByRole('button', { name: 'BUG-7' }));expect(navigate).toHaveBeenLastCalledWith('/board/issue/BUG-7');
  });
  it('permits non-QA drag/drop feedback and terminal/unknown drop guards, but rejects synthetic QA dragstart', () => {
    const onMove = vi.fn(); render(board({ onMove }));
    const qaCard = screen.getByRole('button', { name: 'QA question' }).closest('article');
    const bugCard = screen.getByRole('button', { name: 'BUG title' }).closest('article');
    const transfer = { setData: vi.fn(), getData: () => 'BUG-7' };
    fireEvent.dragStart(qaCard, { dataTransfer: transfer });expect(transfer.setData).not.toHaveBeenCalled();
    fireEvent.dragStart(bugCard, { dataTransfer: transfer });expect(transfer.setData).toHaveBeenCalledWith('text/plain', 'BUG-7');
    const target = screen.getByRole('region', { name: 'Cột Đang xử lý' });
    fireEvent.dragOver(target, { dataTransfer: transfer }); expect(target).toHaveClass('drop-target');
    fireEvent.dragLeave(target, { relatedTarget: document.body });expect(target).not.toHaveClass('drop-target');
    fireEvent.dragOver(screen.getByRole('region', { name: 'Cột Đóng' }), { dataTransfer: transfer });
    fireEvent.drop(screen.getByRole('region', { name: 'Cột Đóng' }), { dataTransfer: transfer });
    fireEvent.drop(target, { dataTransfer: { getData: () => 'gone' } });expect(onMove).not.toHaveBeenCalled();
    fireEvent.dragEnd(bugCard);expect(bugCard).not.toHaveClass('dragging');
  });
  it('removes an open non-QA menu on authority loss and excludes raw QA type too', () => {
    const onMove = vi.fn();const { rerender } = render(board({ onMove }));
    fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn BUG-7' }));
    rerender(board({ onMove, canTriage: false }));expect(screen.queryByRole('button', { name: 'Chuyển công việc' })).toBeNull();
    fireEvent.drop(screen.getByRole('region', { name: 'Cột Đang xử lý' }), { dataTransfer: { getData: () => 'BUG-7' } });expect(onMove).not.toHaveBeenCalled();
    rerender(board({ issues: [{ ...qa, typeCode: undefined, type: 'QA' }] }));
    expect(screen.getByRole('button', { name: 'QA question' }).closest('article')).toHaveAttribute('draggable', 'false');
    expect(screen.queryByRole('button', { name: 'Tùy chọn QA-8' })).toBeNull();
  });
  it('retains compact column collapse, progress expansion and non-QA creation navigation', () => {
    const navigate = vi.fn(); render(board({ navigate, issues: [qa, { ...bug, status: 'progress' }] }));
    fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn cột Đang xử lý' }));
    expect(screen.queryByRole('button', { name: 'BUG title' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Hiển thị 1 công việc' })); expect(screen.getByRole('button', { name: 'BUG title' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Đang thực hiện' }));fireEvent.click(screen.getByRole('button', { name: 'Đang thực hiện' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thêm công việc chưa xử lý' }));expect(navigate).toHaveBeenCalledWith('/board/new');
  });
  it('preserves ordinary local filters, reset, visibility and explicit session filter save', () => {
    const notify = vi.fn();render(board({ hideControls: false, notify }));
    fireEvent.change(screen.getByLabelText('Loại'), { target: { value: 'Lỗi' } });expect(screen.queryByRole('button', { name: 'QA question' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));expect(screen.getByRole('button', { name: 'QA question' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Chỉ hiển thị công việc của tôi' }));expect(screen.queryByRole('button', { name: 'BUG title' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ẩn bộ lọc' }));expect(screen.queryByLabelText('Loại')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Hiện bộ lọc' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bộ lọc' }));fireEvent.change(screen.getByLabelText('Tên bộ lọc'), { target: { value: 'My board' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu', exact: true }));expect(JSON.parse(sessionStorage.getItem('work-board-filter:2')).name).toBe('My board');expect(notify).toHaveBeenCalled();
  });
  it('preserves shared multiple filters and delegates ordinary filter changes/reset', () => {
    const onFiltersChange = vi.fn();render(board({ hideControls: false, sharedFilters: { type: ['Lỗi', 'Hỏi đáp'], category: [], milestone: [], assignee: [], status: [], priority: [], keyword: '' }, onFiltersChange }));
    expect(screen.getByLabelText('Loại')).toHaveValue('multiple');
    fireEvent.change(screen.getByLabelText('Loại'), { target: { value: 'Lỗi' } });
    expect(onFiltersChange.mock.calls[0][0]({ type: [] })).toEqual({ type: ['Lỗi'] });
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));expect(onFiltersChange.mock.calls[1][0].type).toEqual([]);
  });
});
