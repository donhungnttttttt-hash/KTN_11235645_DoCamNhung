import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { WorkBoardPage } from '../../pages/WorkBoardPage';
import { NewWorkItemForm } from '../work-items/WorkItemForm';
import { WorkItemDetail } from '../work-items/WorkItemDetail';
import { presentItem } from '../work-items/ProjectData';
import { workItemsApi } from '../../services/api/workItems';
import { qaApi } from '../../services/api/qa';
const shared = vi.hoisted(() => ({ data: null }));
vi.mock('../work-items/ProjectData', async original => ({ ...await original(), useProjectData: () => {
  const [query, setQuery] = React.useState({ page: 0, size: 50 });
  return { ...shared.data, query, setQuery };
} }));
vi.mock('../../services/api/workItems', () => ({ workItemsApi: Object.fromEntries(['get', 'comments', 'history', 'comment', 'attachments', 'upload', 'create', 'source', 'transition', 'batch'].map(key => [key, vi.fn()])) }));
vi.mock('../../services/api/qa', () => ({ qaApi: Object.fromEntries(['create', 'get', 'answers', 'confirmations', 'answer', 'confirm'].map(key => [key, vi.fn()])) }));
vi.mock('../../services/api/testCases', () => ({ testCasesApi: { listCases: vi.fn().mockResolvedValue({ items: [] }) } }));
vi.mock('../work-items/BoardPage', () => ({ default: ({ onMove }) => <button onClick={() => onMove('DEMO-7', 'progress')}>Drop QA</button> }));
const qa = { id: 7, projectId: 1, key: 'DEMO-7', type: 'QA', title: 'Câu hỏi nguồn', question: 'Quy tắc nào?', status: 'open', statusLabel: 'Câu hỏi mới', version: 2, generation: 1, priority: 'MEDIUM', capabilities: { canComment: false, canUploadEvidence: false, canAnswer: true } };
const detail = { item: qa, contextSnapshot: {}, currentAnswer: null, currentConfirmation: null };
const catalogs = { members: [], categories: [], milestones: [], builds: [] };
beforeEach(() => {
  vi.clearAllMocks();
  shared.data = { projectId: 1, issues: [presentItem(qa)], metadata: { canCreate: true, canCreateQa: true, types: [{ id: 'QA', label: 'QA' }], statuses: [{ id: 'open', label: 'Chưa xử lý' }], statusesByType: { QA: [{ id: 'open', label: 'Câu hỏi mới' }, { id: 'resolved', label: 'Đã trả lời' }] } }, catalogs, canTriage: true, writable: true, loading: false, error: '', refresh: vi.fn() };
  qaApi.get.mockResolvedValue(detail); qaApi.create.mockResolvedValue(detail);
  qaApi.answers.mockResolvedValue({ items: [], page: 0, totalPages: 0, totalItems: 0 }); qaApi.confirmations.mockResolvedValue({ items: [], page: 0, totalPages: 0, totalItems: 0 });
  workItemsApi.get.mockResolvedValue({ ...qa, description: qa.question, links: [], externalReferences: [], clarifications: [], canComment: false, canAttach: false, allowedTransitions: [{ id: 'progress', label: 'Đang xử lý' }] });
  workItemsApi.comments.mockResolvedValue([]); workItemsApi.history.mockResolvedValue([]); workItemsApi.attachments.mockResolvedValue([]);
});
function fillQa() {
  fireEvent.change(screen.getByLabelText('Tiêu đề QA'), { target: { value: 'Nguồn cần xác minh' } });
  fireEvent.change(screen.getByLabelText('Câu hỏi'), { target: { value: 'Quy tắc mong đợi?' } });
}
it('context route sends exact typed source IDs and navigates only using fresh .item identity', async () => {
  const navigate = vi.fn();
  render(<WorkBoardPage activeRoute="/board/list?create=QA&documentId=10&groupId=20&runItemId=30&revisionId=40&keyword=nguon" navigate={navigate} />);
  fillQa(); fireEvent.click(screen.getByRole('button', { name: 'Tạo QA' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/board/issue/7?view=list'));
  expect(qaApi.create).toHaveBeenCalledWith(1, expect.objectContaining({ documentId: 10, groupId: 20, runItemId: 30, revisionId: 40, question: 'Quy tắc mong đợi?' }));
  expect(workItemsApi.create).not.toHaveBeenCalled(); expect(shared.data.refresh).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Đóng hộp thoại' }));
  expect(navigate).toHaveBeenLastCalledWith('/board/list?keyword=nguon');
});
it.each([{ loading: true }, { error: 'Mất kết nối' }, { writable: false }, { metadata: { canCreate: true, canCreateQa: false } }])('context creation fails closed with current metadata %j', override => {
  Object.assign(shared.data, override);
  render(<WorkBoardPage activeRoute="/board/list?create=QA&documentId=10" navigate={vi.fn()} />);
  expect(screen.queryByLabelText('Tiêu đề QA')).not.toBeInTheDocument();
  expect(screen.getByRole('dialog')).toHaveTextContent(/quyền tạo QA|tải quyền tạo QA/i);
});
it.each(['documentId=1e2', 'revisionId=0', 'groupId=01', 'runItemId=9007199254740992', 'documentId=1&documentId=2', 'attempt=9&revisionId=4'])('invalid/contradictory source URL fails visibly: %s', source => {
  render(<WorkBoardPage activeRoute={'/board/list?create=QA&' + source} navigate={vi.fn()} />);
  expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(/ngữ cảnh QA/i);
  expect(screen.queryByLabelText('Tiêu đề QA')).not.toBeInTheDocument(); expect(qaApi.create).not.toHaveBeenCalled();
});
it.each(['create=QA&create=BUG', 'create=BUG&create=QA'])('duplicate QA create markers fail visibly in either order: %s', markers => {
  render(<WorkBoardPage activeRoute={'/board/list?' + markers + '&documentId=10'} navigate={vi.fn()} />);
  expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('Ngữ cảnh QA mâu thuẫn. Kiểm tra lại liên kết nguồn.');
  expect(screen.queryByLabelText('Tiêu đề QA')).not.toBeInTheDocument();
  expect(qaApi.create).not.toHaveBeenCalled(); expect(workItemsApi.create).not.toHaveBeenCalled();
});
it('ordinary BUG create marker retains the board list without a contextual QA form or writes', () => {
  render(<WorkBoardPage activeRoute="/board/list?create=BUG&documentId=10" navigate={vi.fn()} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.queryByLabelText('Tiêu đề QA')).not.toBeInTheDocument();
  expect(qaApi.create).not.toHaveBeenCalled(); expect(workItemsApi.create).not.toHaveBeenCalled();
});
it('generic chooser dispatches standalone QA with no nested forms and preserves it on capability downgrade', async () => {
  const onCreated = vi.fn(); const { container, rerender } = render(<NewWorkItemForm projectId={1} catalogs={catalogs} canCreateQa onCreated={onCreated} />);
  fireEvent.change(screen.getByLabelText('Loại công việc'), { target: { value: 'QA' } });
  fillQa(); expect(container.querySelectorAll('form')).toHaveLength(1); expect(container.querySelector('form form')).toBeNull(); expect(screen.queryByLabelText('Các bước tái hiện')).not.toBeInTheDocument();
  rerender(<NewWorkItemForm projectId={1} catalogs={catalogs} canCreateQa={false} onCreated={onCreated} />);
  expect(screen.getByLabelText('Câu hỏi')).toHaveValue('Quy tắc mong đợi?'); expect(screen.getByRole('button', { name: 'Tạo QA' })).toBeDisabled();
});
it('accepted contextual creation retains GET-only recovery when current creation permission is removed', async () => {
  qaApi.get.mockRejectedValueOnce(new Error('Lỗi đọc sau tạo')).mockResolvedValueOnce(detail);
  const navigate = vi.fn(); const props = { activeRoute: '/board/list?create=QA&documentId=10', navigate };
  const { rerender } = render(<WorkBoardPage {...props} />); fillQa(); fireEvent.click(screen.getByRole('button', { name: 'Tạo QA' }));
  await screen.findByText('Lỗi đọc sau tạo'); shared.data.metadata = { ...shared.data.metadata, canCreateQa: false }; shared.data.loading = true; rerender(<WorkBoardPage {...props} />);
  expect(screen.getByLabelText('Câu hỏi')).toHaveValue('Quy tắc mong đợi?'); fireEvent.click(screen.getByRole('button', { name: 'Tải lại QA đã tạo' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/board/issue/7?view=list')); expect(qaApi.create).toHaveBeenCalledOnce();
});
it('QA detail hides generic mutators/BUG properties and retains typed draft during shared reload', async () => {
  render(<WorkItemDetail projectId={1} id={7} catalogs={catalogs} canTriage writable membershipId={8} onChanged={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Trả lời QA' })); fireEvent.change(screen.getByLabelText('Nội dung trả lời'), { target: { value: 'Bản nháp đang giữ' } });
  for (const text of ['Sửa thông tin và phân công', 'Tham chiếu tracker và nội dung làm rõ', 'Build đã sửa', 'Build phát sinh', 'Chuyển trạng thái']) expect(screen.queryByText(text)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Nội dung bình luận')).not.toBeInTheDocument(); expect(screen.queryByLabelText('Chọn chứng cứ')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại chi tiết' }));
  await waitFor(() => expect(workItemsApi.get).toHaveBeenCalledTimes(2)); expect(screen.getByLabelText('Nội dung trả lời')).toHaveValue('Bản nháp đang giữ'); expect(qaApi.get).toHaveBeenCalledOnce();
});
it('QA canonical labels/filter and batch/drag boundary preserve original code without generic writes', () => {
  expect(presentItem(qa)).toMatchObject({ type: 'QA', typeCode: 'QA', statusLabel: 'Câu hỏi mới' });
  const { rerender } = render(<WorkBoardPage activeRoute="/board/list" navigate={vi.fn()} />);
  expect(screen.getByText('Câu hỏi mới')).toBeVisible(); expect(screen.queryByLabelText('Chọn DEMO-7')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Loại'), { target: { value: 'QA' } }); expect(within(screen.getByLabelText('Trạng thái')).getByText('Đã trả lời')).toBeInTheDocument();
  rerender(<WorkBoardPage activeRoute="/board" navigate={vi.fn()} />); fireEvent.click(screen.getByRole('button', { name: 'Drop QA' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(workItemsApi.transition).not.toHaveBeenCalled(); expect(workItemsApi.batch).not.toHaveBeenCalled();
});
it('a mixed selection that acquires QA cannot open a generic batch command', () => {
  shared.data.issues = [presentItem({ ...qa, type: 'BUG' }), presentItem({ ...qa, id: 8, key: 'DEMO-8', type: 'TASK' })];
  const props = { activeRoute: '/board/list', navigate: vi.fn() }; const { rerender } = render(<WorkBoardPage {...props} />);
  fireEvent.click(screen.getByLabelText('Chọn DEMO-7')); fireEvent.click(screen.getByLabelText('Chọn DEMO-8'));
  shared.data.issues = [presentItem(qa), shared.data.issues[1]]; rerender(<WorkBoardPage {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cập nhật hàng loạt' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.getByText('QA phải xử lý qua chi tiết QA.')).toBeVisible(); expect(workItemsApi.batch).not.toHaveBeenCalled();
});
it('NG-derived creation stays BUG and cannot select QA even with QA permission', async () => {
  workItemsApi.source.mockResolvedValue({ type: 'BUG', title: 'NG cần sửa', attemptId: 9 });
  render(<NewWorkItemForm projectId={1} catalogs={catalogs} canCreateQa attemptId={9} onCreated={vi.fn()} />);
  await screen.findByText('Tạo từ lần kiểm thử NG #9. Ngữ cảnh thực thi được giữ nguyên.');
  expect(screen.getByLabelText('Loại công việc')).toBeDisabled(); expect(within(screen.getByLabelText('Loại công việc')).queryByRole('option', { name: 'QA' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Các bước tái hiện')).toBeVisible(); expect(screen.queryByLabelText('Câu hỏi')).not.toBeInTheDocument();
});
it('generic QA dispatch adapts the fresh DTO to the existing item callback', async () => {
  const onCreated = vi.fn(); render(<NewWorkItemForm projectId={1} catalogs={catalogs} canCreateQa onCreated={onCreated} />);
  fireEvent.change(screen.getByLabelText('Loại công việc'), { target: { value: 'QA' } }); fillQa(); fireEvent.click(screen.getByRole('button', { name: 'Tạo QA' }));
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith(qa)); expect(workItemsApi.create).not.toHaveBeenCalled();
});
it('server source consistency rejection preserves all URL pins and entered question for exact retry', async () => {
  qaApi.create.mockRejectedValueOnce(new Error('Nguồn khác dự án')).mockResolvedValueOnce(detail);
  render(<WorkBoardPage activeRoute="/board/list?create=QA&documentId=10&groupId=99&revisionId=40" navigate={vi.fn()} />);
  fillQa(); fireEvent.click(screen.getByRole('button', { name: 'Tạo QA' })); await screen.findByText('Nguồn khác dự án');
  expect(screen.getByLabelText('Câu hỏi')).toHaveValue('Quy tắc mong đợi?'); fireEvent.click(screen.getByRole('button', { name: 'Tạo QA' }));
  await waitFor(() => expect(qaApi.create).toHaveBeenCalledTimes(2)); expect(qaApi.create.mock.calls[1]).toEqual(qaApi.create.mock.calls[0]);
  expect(qaApi.create.mock.calls[1][1]).toMatchObject({ documentId: 10, groupId: 99, revisionId: 40 });
});
it.each([
  { status: 'closed', canComment: true, canAttach: true, capabilities: { canComment: true, canUploadEvidence: true } },
  { canComment: true, canAttach: true, capabilities: {} },
  { canComment: false, canAttach: false, capabilities: { canComment: true, canUploadEvidence: true } },
])('QA shared writes fail closed for terminal/missing/current denied caps %j', async override => {
  workItemsApi.get.mockResolvedValue({ ...qa, ...override });
  render(<WorkItemDetail projectId={1} id={7} catalogs={catalogs} canTriage writable onChanged={vi.fn()} />);
  await screen.findByRole('region', { name: 'QA chi tiết' }); expect(screen.queryByLabelText('Nội dung bình luận')).not.toBeInTheDocument(); expect(screen.queryByLabelText('Chọn chứng cứ')).not.toBeInTheDocument();
});
it('current canonical shared caps permit only INTERNAL discussion and evidence beside typed QA', async () => {
  qaApi.get.mockResolvedValue({ ...detail, item: { ...qa, capabilities: { canComment: true, canUploadEvidence: true } } });
  workItemsApi.get.mockResolvedValue({ ...qa, canComment: true, canAttach: true, capabilities: { canComment: true, canUploadEvidence: true } }); workItemsApi.comment.mockResolvedValue({ id: 90 });
  render(<WorkItemDetail projectId={1} id={7} catalogs={catalogs} writable onChanged={vi.fn()} />);
  fireEvent.change(await screen.findByLabelText('Nội dung bình luận'), { target: { value: 'Trao đổi nội bộ' } }); fireEvent.click(screen.getByRole('button', { name: 'Đăng bình luận' }));
  await waitFor(() => expect(workItemsApi.comment).toHaveBeenCalledWith(1, 7, expect.objectContaining({ body: 'Trao đổi nội bộ', visibility: 'INTERNAL' })));
  expect(screen.getByLabelText('Chọn chứng cứ')).toBeVisible(); expect(qaApi.answer).not.toHaveBeenCalled();
});

const sharedCaps = { canComment: true, canUploadEvidence: true, canAnswer: true };
const genericAllowed = extra => ({ ...qa, canComment: true, canAttach: true, capabilities: sharedCaps, ...extra });
const typedAllowed = extra => ({ ...detail, item: { ...qa, capabilities: sharedCaps, ...extra } });
function deferredRead() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
async function openSharedQa() {
  workItemsApi.get.mockResolvedValue(genericAllowed()); qaApi.get.mockResolvedValue(typedAllowed());
  const props = { projectId: 1, id: 7, catalogs, writable: true, onChanged: vi.fn() };
  const view = render(<WorkItemDetail {...props} />);
  await screen.findByLabelText('Nội dung bình luận');
  await screen.findByRole('button', { name: 'Trả lời QA' });
  return { ...view, props };
}
function expectNoSharedWrites() {
  expect(screen.queryByLabelText('Nội dung bình luận')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Chọn chứng cứ')).not.toBeInTheDocument();
  expect(workItemsApi.comment).not.toHaveBeenCalled(); expect(workItemsApi.upload).not.toHaveBeenCalled();
}
it.each([
  { status: 'closed', version: 3, capabilities: { canComment: false, canUploadEvidence: false } },
  { version: 3, capabilities: { canAnswer: false, canComment: false, canUploadEvidence: false } },
])('current typed refresh revokes shared writes promptly and preserves pending drafts: %j', async denied => {
  await openSharedQa();
  fireEvent.click(screen.getByRole('button', { name: 'Trả lời QA' }));
  fireEvent.change(screen.getByLabelText('Nội dung trả lời'), { target: { value: 'Giữ nháp trả lời' } });
  fireEvent.change(screen.getByLabelText('Nội dung bình luận'), { target: { value: 'Giữ nháp bình luận' } });
  workItemsApi.attachments.mockResolvedValue([{ id: 4, name: 'chung-cu.pdf', size: 100, uploadedBy: 8 }]);
  qaApi.get.mockResolvedValue(typedAllowed(denied)); fireEvent.click(screen.getByRole('button', { name: 'Tải lại QA' }));
  await screen.findByText(/Phiên bản: 3/); expectNoSharedWrites();
  expect(screen.getByLabelText('Nội dung trả lời')).toHaveValue('Giữ nháp trả lời');
  expect(screen.getByRole('button', { name: 'Gửi câu trả lời' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại chi tiết' }));
  await waitFor(() => expect(workItemsApi.get).toHaveBeenCalledTimes(2)); expectNoSharedWrites();
  // A lower-version allow may arrive from a stale replica; it cannot undo the observed denial.
  qaApi.get.mockResolvedValue(typedAllowed()); fireEvent.click(screen.getByRole('button', { name: 'Tải lại QA' }));
  await waitFor(() => expect(qaApi.get).toHaveBeenCalledTimes(3)); expectNoSharedWrites();
  qaApi.get.mockResolvedValue(typedAllowed({ version: 4 })); workItemsApi.get.mockResolvedValue(genericAllowed({ version: 4 }));
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại chi tiết' }));
  await waitFor(() => expect(workItemsApi.get).toHaveBeenCalledTimes(3)); expectNoSharedWrites();
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại QA' }));
  expect(await screen.findByLabelText('Nội dung bình luận')).toHaveValue('Giữ nháp bình luận');
  expect(screen.getByLabelText('Nội dung trả lời')).toHaveValue('Giữ nháp trả lời');
  expect(qaApi.answer).not.toHaveBeenCalled();
});
it('typed initial/manual loading and errors fail closed, retain readable attachments and allow explicit retry', async () => {
  const slow = deferredRead(); workItemsApi.get.mockResolvedValue(genericAllowed()); qaApi.get.mockReturnValue(slow.promise);
  workItemsApi.attachments.mockResolvedValue([{ id: 4, name: 'da-luu.pdf', size: 100 }]);
  render(<WorkItemDetail projectId={1} id={7} catalogs={catalogs} writable onChanged={vi.fn()} />);
  await screen.findByRole('region', { name: 'QA chi tiết' }); expectNoSharedWrites();
  await act(async () => slow.resolve(typedAllowed())); await screen.findByLabelText('Nội dung bình luận');
  const pending = deferredRead(); qaApi.get.mockReturnValueOnce(pending.promise);
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại QA' })); expectNoSharedWrites();
  await act(async () => pending.resolve(Promise.reject(new Error('Lỗi đọc QA hiện tại'))));
  await screen.findByText('Lỗi đọc QA hiện tại'); expectNoSharedWrites(); expect(screen.getByRole('button', { name: 'da-luu.pdf' })).toBeVisible();
  qaApi.get.mockResolvedValue(typedAllowed()); fireEvent.click(screen.getByRole('button', { name: 'Tải lại QA' })); await screen.findByLabelText('Nội dung bình luận');
  expect(workItemsApi.get).toHaveBeenCalledOnce(); expect(qaApi.get).toHaveBeenCalledTimes(3);
});
it.each([{ id: 8 }, { projectId: 2 }, { type: 'BUG' }, { version: 1 }, { version: undefined }])('typed mismatched/older/invalid identity or version fails closed: %j', async extra => {
  await openSharedQa(); qaApi.get.mockResolvedValue(typedAllowed(extra));
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại QA' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tải lại QA' })).toBeEnabled()); expectNoSharedWrites();
  expect(screen.getByText(/Quyền QA dùng chung chưa được đối chiếu/)).toBeVisible();
});
it.each([
  [{ canComment: false, canUploadEvidence: true }, false, true],
  [{ canComment: true, canUploadEvidence: false }, true, false],
])('each shared operation follows its own current typed flag: %j', async (capabilities, commentAllowed, uploadAllowed) => {
  await openSharedQa(); qaApi.get.mockResolvedValue(typedAllowed({ capabilities }));
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại QA' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tải lại QA' })).toBeEnabled());
  expect(!!screen.queryByLabelText('Nội dung bình luận')).toBe(commentAllowed);
  expect(!!screen.queryByLabelText('Chọn chứng cứ')).toBe(uploadAllowed);
  expect(workItemsApi.comment).not.toHaveBeenCalled(); expect(workItemsApi.upload).not.toHaveBeenCalled();
});
it('typed true never overrules generic denial, and notifications/re-renders/shared reloads do not refetch typed detail', async () => {
  const { rerender, props } = await openSharedQa();
  workItemsApi.get.mockResolvedValue(genericAllowed({ canComment: false, canAttach: false }));
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại chi tiết' }));
  await waitFor(() => expect(workItemsApi.get).toHaveBeenCalledTimes(2)); expectNoSharedWrites();
  rerender(<WorkItemDetail {...props} onChanged={vi.fn()} />); await act(async () => {});
  expect(qaApi.get).toHaveBeenCalledOnce(); expect(workItemsApi.get).toHaveBeenCalledTimes(2);
});
it('confirmation and selected evidence survive permission notifications/shared reload without automatic mutations', async () => {
  workItemsApi.get.mockResolvedValue(genericAllowed());
  qaApi.get.mockResolvedValue({ ...typedAllowed(), item: { ...qa, capabilities: { ...sharedCaps, canConfirm: true } }, currentAnswer: { id: 11, answerVersion: 1, generation: 1, body: 'Câu trả lời cần xác nhận' } });
  workItemsApi.attachments.mockResolvedValue([{ id: 4, name: 'da-luu.pdf', size: 100 }]);
  render(<WorkItemDetail projectId={1} id={7} catalogs={catalogs} writable onChanged={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận câu trả lời' }));
  fireEvent.change(screen.getByLabelText('Nội dung xác nhận'), { target: { value: 'Giữ nháp xác nhận' } });
  const selected = new File(['chung cu'], 'nhap.pdf', { type: 'application/pdf' });
  fireEvent.change(screen.getByLabelText('Chọn chứng cứ'), { target: { files: [selected] } });
  const originalForm = screen.getByRole('form', { name: 'Bản nháp Xác nhận câu trả lời' });
  qaApi.get.mockResolvedValue({ ...typedAllowed({ version: 3, capabilities: { canConfirm: false, canComment: false, canUploadEvidence: false } }) });
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại QA' })); await screen.findByText(/Phiên bản: 3/);
  expectNoSharedWrites(); expect(screen.getByRole('button', { name: 'da-luu.pdf' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại chi tiết' })); await waitFor(() => expect(workItemsApi.get).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('form', { name: 'Bản nháp Xác nhận câu trả lời' })).toBe(originalForm);
  expect(screen.getByLabelText('Nội dung xác nhận')).toHaveValue('Giữ nháp xác nhận'); expect(screen.getByRole('button', { name: 'Gửi xác nhận' })).toBeDisabled();
  qaApi.get.mockResolvedValue(typedAllowed({ version: 3 })); fireEvent.click(screen.getByRole('button', { name: 'Tải lại QA' }));
  expect(await screen.findByRole('button', { name: 'Tải chứng cứ lên' })).toBeEnabled();
  expect(qaApi.confirm).not.toHaveBeenCalled(); expect(qaApi.answer).not.toHaveBeenCalled(); expect(workItemsApi.upload).not.toHaveBeenCalled();
  workItemsApi.upload.mockResolvedValue({ id: 5 }); fireEvent.click(screen.getByRole('button', { name: 'Tải chứng cứ lên' }));
  await waitFor(() => expect(workItemsApi.upload).toHaveBeenCalledExactlyOnceWith(1, 7, selected));
});
it.each([{}, { canComment: 'true', canUploadEvidence: 1 }])('typed shared capabilities require exact booleans: %j', async capabilities => {
  await openSharedQa(); qaApi.get.mockResolvedValue(typedAllowed({ capabilities }));
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại QA' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tải lại QA' })).toBeEnabled()); expectNoSharedWrites();
});
it('typed command recovery cannot replace canonical generic denial with allowed typed flags', async () => {
  await openSharedQa(); workItemsApi.get.mockResolvedValue(genericAllowed({ canComment: false, canAttach: false }));
  qaApi.answer.mockResolvedValue(detail); qaApi.get.mockResolvedValue(typedAllowed({ version: 3 }));
  fireEvent.click(screen.getByRole('button', { name: 'Trả lời QA' }));
  fireEvent.change(screen.getByLabelText('Nội dung trả lời'), { target: { value: 'Một lần gửi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi câu trả lời' }));
  await waitFor(() => expect(workItemsApi.get).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByLabelText('Nội dung trả lời')).not.toBeInTheDocument()); expectNoSharedWrites();
  expect(qaApi.answer).toHaveBeenCalledOnce(); expect(qaApi.get).toHaveBeenCalledTimes(2);
});
it('late old-project typed reads cannot reopen current shared controls', async () => {
  const { rerender, props } = await openSharedQa(); const old = deferredRead(); qaApi.get.mockReturnValueOnce(old.promise);
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại QA' }));
  const next = { ...qa, id: 8, projectId: 2, title: 'QA dự án mới', capabilities: { canComment: false, canUploadEvidence: false } };
  workItemsApi.get.mockResolvedValue({ ...next, canComment: true, canAttach: true }); qaApi.get.mockResolvedValue({ ...detail, item: next });
  rerender(<WorkItemDetail {...props} projectId={2} id={8} />); await screen.findByRole('heading', { name: 'QA dự án mới' });
  await act(async () => old.resolve(typedAllowed({ version: 50 }))); expectNoSharedWrites(); expect(qaApi.get).toHaveBeenCalledTimes(3);
});
it('typed successful callback refreshes shared identity/caps without remounting the detail flow', async () => {
  const onChanged = vi.fn(); qaApi.answer.mockResolvedValue(detail);
  render(<WorkItemDetail projectId={1} id={7} catalogs={catalogs} writable onChanged={onChanged} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Trả lời QA' })); fireEvent.change(screen.getByLabelText('Nội dung trả lời'), { target: { value: 'Đã đối chiếu' } });
  const updated = { ...qa, title: 'QA hiện hành', version: 3, capabilities: { canComment: false, canUploadEvidence: false } }; qaApi.get.mockResolvedValue({ ...detail, item: updated }); workItemsApi.get.mockResolvedValue(updated);
  fireEvent.click(screen.getByRole('button', { name: 'Gửi câu trả lời' }));
  await waitFor(() => expect(onChanged).toHaveBeenCalledOnce()); expect(screen.getByRole('heading', { name: 'QA hiện hành' })).toBeVisible(); expect(screen.queryByLabelText('Nội dung bình luận')).not.toBeInTheDocument(); expect(workItemsApi.get).toHaveBeenCalledTimes(2);
});
it('generic-route accepted QA keeps GET-only recovery after all creation caps downgrade', async () => {
  qaApi.get.mockRejectedValueOnce(new Error('Lỗi đọc đã tạo')).mockResolvedValueOnce(detail);
  const navigate = vi.fn(), props = { activeRoute: '/board/new?view=list', navigate }; const { rerender } = render(<WorkBoardPage {...props} />);
  fireEvent.change(screen.getByLabelText('Loại công việc'), { target: { value: 'QA' } }); fillQa(); fireEvent.click(screen.getByRole('button', { name: 'Tạo QA' })); await screen.findByText('Lỗi đọc đã tạo');
  shared.data.metadata = { ...shared.data.metadata, canCreate: false, canCreateQa: false }; rerender(<WorkBoardPage {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại QA đã tạo' })); await waitFor(() => expect(navigate).toHaveBeenCalledWith('/board/issue/7?view=list')); expect(qaApi.create).toHaveBeenCalledOnce();
});
it('same-QA failed generic reload preserves the typed draft while shared comments/evidence fail closed', async () => {
  workItemsApi.get.mockResolvedValue({ ...qa, canComment: true, canAttach: true });
  render(<WorkItemDetail projectId={1} id={7} catalogs={catalogs} writable onChanged={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Trả lời QA' })); fireEvent.change(screen.getByLabelText('Nội dung trả lời'), { target: { value: 'Giữ khi mất kết nối' } });
  workItemsApi.get.mockRejectedValue(new Error('Lỗi đọc chung')); fireEvent.click(screen.getByRole('button', { name: 'Tải lại chi tiết' })); await screen.findByText('Lỗi đọc chung');
  expect(screen.getByLabelText('Nội dung trả lời')).toHaveValue('Giữ khi mất kết nối'); expect(qaApi.get).toHaveBeenCalledOnce(); expect(screen.queryByLabelText('Nội dung bình luận')).not.toBeInTheDocument();
});
it('a late generic identity read cannot render the departed QA in the current project/item', async () => {
  let resolveOld; workItemsApi.get.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
  const props = { projectId: 1, id: 7, catalogs, writable: true, onChanged: vi.fn() }; const { rerender } = render(<WorkItemDetail {...props} />);
  const next = { ...qa, id: 8, projectId: 2, key: 'NEXT-8', title: 'Dự án hiện tại' };
  workItemsApi.get.mockResolvedValue(next); qaApi.get.mockResolvedValue({ ...detail, item: next }); rerender(<WorkItemDetail {...props} projectId={2} id={8} />);
  await screen.findByRole('heading', { name: 'Dự án hiện tại' }); await act(async () => resolveOld(qa));
  expect(screen.queryByRole('heading', { name: 'Câu hỏi nguồn' })).not.toBeInTheDocument(); expect(screen.getByRole('heading', { name: 'Dự án hiện tại' })).toBeVisible();
});
