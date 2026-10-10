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
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 2, displayName: 'PM' } }) }));
vi.mock('../../services/api/workItems', () => ({ workItemsApi: { overview: vi.fn() } }));
vi.mock('../../services/api/qa', () => ({ qaApi: { handoff: vi.fn() } }));
const overview = { items: [{ id: 7, key: 'BUG-7', type: 'BUG', title: 'Existing bug', status: 'resolved', priority: 'MEDIUM', creator: 'Tester', createdAt: '2026-10-06T00:00:00Z' }], statuses: [{ status: 'open', count: 40 }, { status: 'closed', count: 60 }], milestones: [] };
const handoff = { items: [{ workItemId: 7, key: 'BUG-7', title: 'Current round bug', roundNo: 3, fixedBuildId: 6, state: 'VERIFYING', applicableCount: 1, requestedCount: 1, pendingCount: 0, passCount: 1, failCount: 0, requestIds: [71], canPrepareRetest: false, canClose: false }], page: 0, totalPages: 1, totalItems: 1 };
beforeEach(() => {
  vi.resetAllMocks(); Object.assign(state, { projectId: 1, writable: true, loading: false, error: '', metadata: { canCreate: true, canTriage: true } });
  workItemsApi.overview.mockResolvedValue(overview); qaApi.handoff.mockResolvedValue(handoff);
});

describe('current PM dashboard handoff', () => {
  it('mounts the real current queue, canonical BUG target and file navigation while preserving all-item totals', async () => {
    const navigate = vi.fn(); render(<ProjectOverview navigate={navigate} />);
    const queue = await screen.findByRole('region', { name: 'Hàng chờ bàn giao' });
    await within(queue).findByText('Yêu cầu hiện tại: #71');
    expect(qaApi.handoff).toHaveBeenCalledWith(1, { page: 0, size: 20, state: '', keyword: '' }, expect.anything());
    expect(within(queue).getByText('Đang xác minh / PM đối chiếu · Vòng 3 · Build #6')).toBeVisible();
    expect(within(queue).getByText(/Hiện chưa được phép kết thúc/)).toBeVisible();
    const bug = within(queue).getByRole('link', { name: 'BUG-7' }); expect(bug).toHaveAttribute('href', '#/board/issue/7');
    fireEvent.click(bug); expect(navigate).toHaveBeenLastCalledWith('/board/issue/7');
    const file = screen.getByRole('link', { name: 'Công việc theo file' }); expect(file).toHaveAttribute('href', '#/tests/file-work');
    fireEvent.click(file); expect(navigate).toHaveBeenLastCalledWith('/tests/file-work');
    expect(screen.getByText('60/100 công việc hoàn thành · 60%')).toBeVisible();
    expect(within(queue).queryByRole('button', { name: /kết thúc|chuẩn bị/i })).toBeNull();
  });
  it.each([
    ['DEV', { metadata: { canCreate: false, canTriage: false } }],
    ['missing flag', { metadata: {} }], ['truthy flag', { metadata: { canTriage: 'true' } }],
    ['loading', { loading: true }], ['failed metadata', { error: 'Membership revoked' }],
  ])('does not mount or fetch a queue for current %s but retains member file navigation', async (_, change) => {
    Object.assign(state, change); render(<ProjectOverview navigate={vi.fn()} />);
    await screen.findByText('60/100 công việc hoàn thành · 60%');
    expect(screen.queryByRole('region', { name: 'Hàng chờ bàn giao' })).toBeNull(); expect(qaApi.handoff).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Công việc theo file' })).toHaveAttribute('href', '#/tests/file-work');
    if (state.loading || state.error) expect(screen.getByRole('button', { name: 'Thêm công việc' })).toBeDisabled();
  });
  it('keeps archived PM queue read-only while creation stays disabled', async () => {
    state.writable = false; qaApi.handoff.mockResolvedValue({ ...handoff, items: [{ ...handoff.items[0], state: 'READY_TO_CLOSE' }] });
    render(<ProjectOverview navigate={vi.fn()} />);
    await screen.findByText(/Đủ kết quả xác minh · Vòng 3/);
    expect(screen.getByRole('button', { name: 'Thêm công việc' })).toBeDisabled();
    expect(screen.getByText(/Hiện chưa được phép kết thúc/)).toBeVisible();
  });
  it('keeps the file deep link in the actual hash router for normal and modified browser navigation', async () => {
    const navigate=vi.fn();render(<ProjectOverview navigate={navigate}/>);
    const file=screen.getByRole('link',{name:'Công việc theo file'});
    expect(new URL(file.href).hash).toBe('#/tests/file-work');
    fireEvent.click(file,{ctrlKey:true});expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(file);expect(navigate).toHaveBeenCalledWith('/tests/file-work');
  });
  it('unmounts on authority loss and clears old queue/project filters before a new current read', async () => {
    const { rerender } = render(<ProjectOverview navigate={vi.fn()} />);
    await screen.findByText('Yêu cầu hiện tại: #71');
    fireEvent.change(screen.getByLabelText('Tìm BUG bàn giao'), { target: { value: 'old filter' } });
    await waitFor(() => expect(qaApi.handoff).toHaveBeenCalledWith(1, expect.objectContaining({ keyword: 'old filter' }), expect.anything()));
    state.loading = true; rerender(<ProjectOverview navigate={vi.fn()} />);
    expect(screen.queryByRole('region', { name: 'Hàng chờ bàn giao' })).toBeNull();
    let finish; qaApi.handoff.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    state.projectId = 2; state.loading = false; rerender(<ProjectOverview navigate={vi.fn()} />);
    expect(screen.queryByText('Yêu cầu hiện tại: #71')).toBeNull();
    expect(screen.getByLabelText('Tìm BUG bàn giao')).toHaveValue('');
    await waitFor(() => expect(qaApi.handoff).toHaveBeenLastCalledWith(2, expect.objectContaining({ keyword: '', page: 0 }), expect.anything()));
    state.metadata = { canTriage: false }; rerender(<ProjectOverview navigate={vi.fn()} />);
    finish(handoff); await waitFor(() => expect(screen.queryByText('Yêu cầu hiện tại: #71')).toBeNull());
    state.projectId = null; rerender(<ProjectOverview navigate={vi.fn()} />);
    expect(screen.queryByRole('link', { name: 'Công việc theo file' })).toBeNull();
  });
});

const statuses = [{ id: 'open', label: 'Chưa xử lý' }, { id: 'progress', label: 'Đang xử lý' }, { id: 'resolved', label: 'Đã xử lý / chờ kiểm thử lại' }, { id: 'closed', label: 'Đóng', terminal: true }];
const qa = { id: 'QA-8', typeCode: 'QA', type: 'Hỏi đáp', status: 'resolved', statusLabel: 'Đã trả lời', title: 'QA question', assignee: 'Dev' };
const bug = { id: 'BUG-7', typeCode: 'BUG', type: 'Lỗi', status: 'open', title: 'BUG title', assignee: 'Dev' };
function board(props = {}) { return <BoardPage issues={[qa, bug]} statuses={statuses} canTriage navigate={vi.fn()} notify={vi.fn()} updateIssues={vi.fn()} hideControls {...props} />; }
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
