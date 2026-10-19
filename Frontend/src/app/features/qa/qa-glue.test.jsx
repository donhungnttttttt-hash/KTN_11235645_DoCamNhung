import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { WorkBoardPage } from '../../pages/WorkBoardPage';
import { NewWorkItemForm } from '../work-items/WorkItemForm';
import { WorkItemDetail } from '../work-items/WorkItemDetail';
import { workItemsApi } from '../../services/api/workItems';
import { qaApi } from '../../services/api/qa';
import { FeatureIssueForm } from '../work-items/FeatureIssueForm';
import { CaseIssueAction } from '../work-items/CaseIssueAction';
import { featureIssuesApi } from '../../services/api/featureIssues';
import { featuresApi } from '../../services/api/features';
vi.mock('../../services/api/workItems', () => ({ workItemsApi: Object.fromEntries(['get', 'comments', 'history', 'comment', 'attachments', 'upload', 'create', 'source', 'transition', 'batch'].map(key => [key, vi.fn()])) }));
vi.mock('../../services/api/qa', () => ({ qaApi: Object.fromEntries(['create', 'get', 'answers', 'confirmations', 'answer', 'confirm'].map(key => [key, vi.fn()])) }));
vi.mock('../../services/api/testCases', () => ({ testCasesApi: { listCases: vi.fn().mockResolvedValue({ items: [] }) } }));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:{id:1,name:'Actual project',projectRole:'PM'}})}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({hasRole:r=>r==='PM'})}));
vi.mock('../../services/api/featureIssues',()=>({featureIssuesApi:{list:vi.fn(),context:vi.fn(),create:vi.fn()}}));
vi.mock('../../services/api/features',()=>({featuresApi:{list:vi.fn()}}));
const qa = { id: 7, projectId: 1, key: 'DEMO-7', type: 'QA', title: 'Câu hỏi nguồn', question: 'Quy tắc nào?', status: 'open', statusLabel: 'Câu hỏi mới', version: 2, generation: 1, priority: 'MEDIUM', capabilities: { canComment: false, canUploadEvidence: false, canAnswer: true } };
const detail = { item: qa, contextSnapshot: {}, currentAnswer: null, currentConfirmation: null };
const catalogs = { members: [], categories: [], milestones: [], builds: [] };
beforeEach(() => {
  vi.clearAllMocks();
  // Clear queued legacy reads too: an earlier rejected test must not poison the next test.
  qaApi.get.mockReset();
  featureIssuesApi.list.mockResolvedValue({items:[],totalItems:0,totalPages:0});
  featuresApi.list.mockResolvedValue({items:[],totalPages:0});
  qaApi.get.mockResolvedValue(detail); qaApi.create.mockResolvedValue(detail);
  qaApi.answers.mockResolvedValue({ items: [], page: 0, totalPages: 0, totalItems: 0 }); qaApi.confirmations.mockResolvedValue({ items: [], page: 0, totalPages: 0, totalItems: 0 });
  workItemsApi.get.mockResolvedValue({ ...qa, description: qa.question, links: [], externalReferences: [], clarifications: [], canComment: false, canAttach: false, allowedTransitions: [{ id: 'progress', label: 'Đang xử lý' }] });
  workItemsApi.comments.mockResolvedValue([]); workItemsApi.history.mockResolvedValue([]); workItemsApi.attachments.mockResolvedValue([]);
});
function fillQa() {
  fireEvent.change(screen.getByLabelText('Tiêu đề QA'), { target: { value: 'Nguồn cần xác minh' } });
  fireEvent.change(screen.getByLabelText('Câu hỏi'), { target: { value: 'Quy tắc mong đợi?' } });
}





it('generic chooser dispatches standalone QA with no nested forms and preserves it on capability downgrade', async () => {
  const onCreated = vi.fn(); const { container, rerender } = render(<NewWorkItemForm projectId={1} catalogs={catalogs} canCreateQa onCreated={onCreated} />);
  fireEvent.change(screen.getByLabelText('Loại công việc'), { target: { value: 'QA' } });
  fillQa(); expect(container.querySelectorAll('form')).toHaveLength(1); expect(container.querySelector('form form')).toBeNull(); expect(screen.queryByLabelText('Các bước tái hiện')).not.toBeInTheDocument();
  rerender(<NewWorkItemForm projectId={1} catalogs={catalogs} canCreateQa={false} onCreated={onCreated} />);
  expect(screen.getByLabelText('Câu hỏi')).toHaveValue('Quy tắc mong đợi?'); expect(screen.getByRole('button', { name: 'Tạo QA' })).toBeDisabled();
});

it('QA detail hides generic mutators/BUG properties and retains typed draft during shared reload', async () => {
  render(<WorkItemDetail projectId={1} id={7} catalogs={catalogs} canTriage writable membershipId={8} onChanged={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Trả lời QA' })); fireEvent.change(screen.getByLabelText('Nội dung trả lời'), { target: { value: 'Bản nháp đang giữ' } });
  for (const text of ['Sửa thông tin và phân công', 'Tham chiếu tracker và nội dung làm rõ', 'Build đã sửa', 'Build phát sinh', 'Chuyển trạng thái']) expect(screen.queryByText(text)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Nội dung bình luận')).not.toBeInTheDocument(); expect(screen.queryByLabelText('Chọn chứng cứ')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại chi tiết' }));
  await waitFor(() => expect(workItemsApi.get).toHaveBeenCalledTimes(2)); expect(screen.getByLabelText('Nội dung trả lời')).toHaveValue('Bản nháp đang giữ'); expect(qaApi.get).toHaveBeenCalledOnce();
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

// FR11: the historical direct components above remain compatibility coverage.
// Active QA creation now belongs to a copied Feature case, never to old run/group URLs.
const copiedCase={featureName:'Feature copied A',fileName:'A.xlsx',caseNo:'CASE-2',title:'Imported condition',steps:'Open drawing',expectedResult:'Icon visible'};
function currentApi(){return {context:vi.fn().mockResolvedValue(copiedCase),create:vi.fn().mockResolvedValue({id:77,type:'QA',key:'REAL-77'}),list:vi.fn().mockResolvedValue({items:[],totalItems:0,totalPages:0})};}
const sourceProps={projectId:1,featureId:42,documentId:7,row:{rowId:1001,caseId:501}};
async function fillCurrentQa(){
 await waitFor(()=>expect(screen.getByLabelText('Tiêu đề')).toHaveValue(copiedCase.title));
 fireEvent.change(screen.getByLabelText('Loại Issue'),{target:{value:'QA'}});
 fireEvent.change(screen.getByLabelText('Tiêu đề'),{target:{value:'Question from copied case'}});
 fireEvent.change(screen.getByLabelText('Nội dung câu hỏi'),{target:{value:'Expected rule for icon?'}});
}
it('current case QA sends exact Feature/document/row identity and only Bug/QA types, without old execution IDs',async()=>{
 const api=currentApi(),saved=vi.fn();render(<FeatureIssueForm {...sourceProps} api={api} onSaved={saved}/>);await fillCurrentQa();
 expect(Array.from(screen.getByLabelText('Loại Issue').options).map(option=>option.value)).toEqual(['BUG','QA']);
 expect(api.context).toHaveBeenCalledWith(1,42,7,1001,expect.objectContaining({signal:expect.any(AbortSignal)}));
 fireEvent.click(screen.getByRole('button',{name:'Lưu Issue'}));await waitFor(()=>expect(saved).toHaveBeenCalledWith({id:77,type:'QA',key:'REAL-77'}));
 const payload=api.create.mock.calls[0][1];expect(payload).toMatchObject({featureId:42,documentId:7,rowId:1001,type:'QA',monkey:false,title:'Question from copied case',description:'Expected rule for icon?',steps:copiedCase.steps,expectedResult:copiedCase.expectedResult});
 for(const key of ['groupId','runItemId','revisionId','attemptId','caseId'])expect(payload).not.toHaveProperty(key);
 expect(qaApi.create).not.toHaveBeenCalled();expect(workItemsApi.create).not.toHaveBeenCalled();
});
it('current QA failure keeps its draft and retries the same command identity and copied source',async()=>{
 const api=currentApi(),saved=vi.fn();api.create.mockRejectedValueOnce(new Error('Source rejected by server'));
 render(<FeatureIssueForm {...sourceProps} api={api} onSaved={saved}/>);await fillCurrentQa();fireEvent.click(screen.getByRole('button',{name:'Lưu Issue'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Source rejected by server');expect(screen.getByLabelText('Nội dung câu hỏi')).toHaveValue('Expected rule for icon?');expect(saved).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Lưu Issue'}));await waitFor(()=>expect(saved).toHaveBeenCalledOnce());expect(api.create.mock.calls[1]).toEqual(api.create.mock.calls[0]);
});
it('editing a rejected QA draft creates a new request identity while retaining source pins',async()=>{
 const api=currentApi();api.create.mockRejectedValueOnce(new Error('Retryable failure'));render(<FeatureIssueForm {...sourceProps} api={api}/>);await fillCurrentQa();fireEvent.click(screen.getByRole('button',{name:'Lưu Issue'}));await screen.findByRole('alert');
 const first=api.create.mock.calls[0][1];fireEvent.change(screen.getByLabelText('Nội dung câu hỏi'),{target:{value:'Revised question'}});fireEvent.click(screen.getByRole('button',{name:'Lưu Issue'}));await waitFor(()=>expect(api.create).toHaveBeenCalledTimes(2));
 expect(api.create.mock.calls[1][1]).toMatchObject({featureId:42,documentId:7,rowId:1001,description:'Revised question'});expect(api.create.mock.calls[1][1].requestKey).not.toBe(first.requestKey);
});
it('QA cannot submit while the current case context is pending or failed',async()=>{
 const api=currentApi(),pending=deferredRead();api.context.mockReturnValue(pending.promise);const view=render(<FeatureIssueForm {...sourceProps} api={api}/>);
 expect(screen.getByRole('button',{name:'Lưu Issue'})).toBeDisabled();fireEvent.submit(view.container.querySelector('form'));expect(api.create).not.toHaveBeenCalled();
 await act(async()=>pending.resolve(Promise.reject(new Error('Case context forbidden'))));expect(screen.getByRole('alert')).toHaveTextContent('Case context forbidden');expect(screen.getByRole('button',{name:'Lưu Issue'})).toBeDisabled();fireEvent.submit(view.container.querySelector('form'));expect(api.create).not.toHaveBeenCalled();
});
it('an old copied-case response cannot prefill the newly selected project/case',async()=>{
 const api=currentApi(),pending=deferredRead();api.context.mockReturnValueOnce(pending.promise);const view=render(<FeatureIssueForm {...sourceProps} api={api}/>);const oldSignal=api.context.mock.calls[0][4].signal;
 api.context.mockResolvedValue({...copiedCase,title:'Current B case'});view.rerender(<FeatureIssueForm {...sourceProps} projectId={2} featureId={99} documentId={8} row={{rowId:2002}} api={api}/>);await waitFor(()=>expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Current B case'));
 await act(async()=>pending.resolve(copiedCase));expect(oldSignal.aborted).toBe(true);expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Current B case');
});
it('pending QA submits are locked and a departed project cannot accept late save callbacks',async()=>{
 const api=currentApi(),pending=deferredRead(),saved=vi.fn();api.create.mockReturnValue(pending.promise);const view=render(<FeatureIssueForm {...sourceProps} api={api} onSaved={saved}/>);await fillCurrentQa();const form=view.container.querySelector('form');
 fireEvent.submit(form);fireEvent.submit(form);expect(api.create).toHaveBeenCalledOnce();expect(screen.getByRole('button',{name:'Đang lưu…'})).toBeDisabled();expect(screen.getByLabelText('Nội dung câu hỏi')).toBeDisabled();
 view.rerender(<FeatureIssueForm {...sourceProps} projectId={2} api={api} onSaved={saved}/>);await act(async()=>pending.resolve({id:77,type:'QA'}));expect(saved).not.toHaveBeenCalled();
});
it('the current case Issue action creates QA then closes to the same case and refreshes only that context',async()=>{
 const api=currentApi(),refresh=vi.fn();api.list.mockResolvedValueOnce({items:[],totalItems:0,totalPages:0}).mockResolvedValue({items:[{id:77,key:'REAL-77',title:'Question',type:'QA',status:'closed'}],totalItems:1,totalPages:1});
 render(<CaseIssueAction {...sourceProps} api={api} refresh={refresh}/>);const badge=await screen.findByRole('button',{name:'Issue (0)'});fireEvent.click(badge);await fillCurrentQa();fireEvent.click(screen.getByRole('button',{name:'Lưu Issue'}));
 await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Tạo Issue từ case'})).toBeNull());expect(refresh).toHaveBeenCalledOnce();expect(badge).toHaveFocus();await screen.findByRole('button',{name:'Issue (1)'});
 expect(api.list).toHaveBeenLastCalledWith(1,{featureId:42,documentId:7,rowId:1001,page:0,size:20},expect.anything());expect(qaApi.create).not.toHaveBeenCalled();
});
it('DEV case Issue preview remains readable with closed QA and no create form/action',async()=>{
 const api=currentApi();api.list.mockResolvedValue({items:[{id:77,key:'REAL-77',title:'Closed QA',type:'QA',status:'closed'}],totalItems:1,totalPages:1});render(<CaseIssueAction {...sourceProps} api={api} canCreate={false}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Issue (1)'}));expect(screen.getByRole('button',{name:'REAL-77 · Closed QA'})).toBeVisible();expect(screen.queryByRole('button',{name:'Tạo Issue từ case'})).toBeNull();expect(api.create).not.toHaveBeenCalled();
 expect(api.list.mock.calls[0][1]).not.toHaveProperty('status');
});
it('a failed Issue badge read retries in place without creating QA',async()=>{
 const api=currentApi();api.list.mockRejectedValueOnce(new Error('Badge temporarily unavailable')).mockResolvedValue({items:[],totalItems:0,totalPages:0});render(<CaseIssueAction {...sourceProps} api={api} canCreate={false}/>);
 const badge=await screen.findByRole('button',{name:'Issue (?)'});fireEvent.click(badge);await screen.findByRole('button',{name:'Issue (0)'});expect(api.list).toHaveBeenCalledTimes(2);expect(api.create).not.toHaveBeenCalled();expect(api.context).not.toHaveBeenCalled();
});
it('Monkey creation stays Bug with its chosen Feature and no case/run source, while its title is free',async()=>{
 const api=currentApi(),saved=vi.fn();render(<FeatureIssueForm projectId={1} featureId={42} featureName='Feature copied A' monkey api={api} onSaved={saved}/>);
 const type=screen.getByLabelText('Loại Issue');expect(type).toHaveValue('BUG');expect(type).toBeDisabled();expect(Array.from(type.options).map(option=>option.value)).toEqual(['BUG','QA']);
 for(const [label,value]of [['Tiêu đề','Free Monkey title'],['Các bước thực hiện','Explore'],['Kết quả mong đợi','Expected'],['Kết quả thực tế','Observed']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu Issue'}));await waitFor(()=>expect(saved).toHaveBeenCalledOnce());expect(api.context).not.toHaveBeenCalled();expect(api.create).toHaveBeenCalledWith(1,expect.objectContaining({type:'BUG',title:'Free Monkey title',featureId:42,documentId:null,rowId:null,monkey:true}),expect.anything());expect(workItemsApi.create).not.toHaveBeenCalled();
});
it.each([
 'create=QA&documentId=10&groupId=20&runItemId=30&revisionId=40',
 'create=QA&documentId=1e2','create=QA&revisionId=0','create=QA&groupId=01',
 'create=QA&runItemId=9007199254740992','create=QA&documentId=1&documentId=2',
 'create=QA&attempt=9&revisionId=4','create=QA&create=BUG','create=BUG&create=QA',
 'create=BUG&documentId=10','create=TASK',
])('retired contextual marker gives explicit guidance without inferring copied-case identity: %s',query=>{
 const navigate=vi.fn();render(<WorkBoardPage activeRoute={'/board/list?'+query} navigate={navigate}/>);
 expect(screen.getByRole('heading',{name:'Tạo Issue tại ngữ cảnh kiểm thử'})).toBeVisible();expect(screen.queryByRole('dialog')).toBeNull();expect(screen.queryByLabelText('Loại công việc')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Mở Quản lý kiểm thử'}));expect(navigate).toHaveBeenCalledWith('/board/testing?projectId=1');
 expect(featureIssuesApi.list).not.toHaveBeenCalled();expect(featureIssuesApi.context).not.toHaveBeenCalled();expect(featureIssuesApi.create).not.toHaveBeenCalled();expect(qaApi.create).not.toHaveBeenCalled();expect(workItemsApi.create).not.toHaveBeenCalled();
});
