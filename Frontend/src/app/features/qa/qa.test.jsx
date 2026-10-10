import React from 'react';
import userEvent from '@testing-library/user-event';
import { act, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { qaApi } from '../../services/api/qa';
import { apiRequest } from '../../services/api/client';
import { positiveId, QaForm } from './QaForm';
import { QaPanel } from './QaPanel';
import { HandoffPanel } from './HandoffPanel';

vi.mock('../../services/api/client', () => ({ apiRequest: vi.fn() }));
const page = items => ({ items, totalItems: items.length, page: 0, size: 20, totalPages: items.length ? 1 : 0 });
const answer = { id: 11, workItemId: 9, generation: 0, answerVersion: 1, body: 'Câu trả lời hiện tại', basisReference: 'javascript:alert(1)', authorName: 'Dev A' };
function detail(caps = {}, extra = {}) { return { item: { id: 9, projectId: 1, key: 'P-9', type: 'QA', title: 'QA nguồn', question: 'Câu hỏi gốc', status: 'resolved', statusLabel: 'Đã trả lời', version: 3, generation: 0, capabilities: caps, ...extra }, contextSnapshot: { document: { id: 4, fileName: 'nguon.xlsx' }, revision: { caseNo: 'TC01', title: 'Nguồn case' } }, currentAnswer: answer, currentConfirmation: null }; }
function networkError(status = 0) { return Object.assign(new Error(status === 409 ? 'Dữ liệu thay đổi' : 'Mất kết nối'), { status, code: status ? 'VERSION_CONFLICT' : 'NETWORK_ERROR' }); }
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function readTransport(current = detail()) {
  apiRequest.mockImplementation(async path => {
    if (path === '/auth/csrf') return { headerName: 'X-CSRF', token: 'test' };
    if (path.includes('/answers?') || path.includes('/confirmations?')) return page([]);
    return current;
  });
}
const click = name => fireEvent.click(screen.getByRole('button', { name, exact: true }));
const fill = (label, value) => fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
const posts = () => apiRequest.mock.calls.filter(([, options]) => options?.method && options.method !== 'GET');

beforeEach(() => vi.clearAllMocks());

// The mounted form is removed if a field action changes the application's hash route.
function HashQaFlow({ command = false }) {
  const [route, setRoute] = React.useState(window.location.hash);
  React.useEffect(() => {
    const changed = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  return route === '#/board/qa' ? command ? <QaPanel projectId={1} id={9} /> : <QaForm projectId={1} canCreateQa /> : <p>Route changed</p>;
}
describe('hash routed QA validation focus', () => {
  it.each(['mouse', 'keyboard'])('keeps create route and draft on %s field error activation', async mode => {
    window.history.replaceState(null, '', '#/board/qa');
    const user = userEvent.setup(); render(<HashQaFlow />);
    fill('Tiêu đề QA', 'Kept draft'); click('Tạo QA');
    const entry = within(await screen.findByRole('alert')).getByText('Nhập câu hỏi từ 1 đến 20000 ký tự.');
    if (mode === 'mouse') await user.click(entry); else { entry.focus(); await user.keyboard('{Enter}'); }
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(window.location.hash).toBe('#/board/qa'); expect(screen.getByLabelText('Câu hỏi')).toHaveFocus();
    expect(screen.getByLabelText('Tiêu đề QA')).toHaveValue('Kept draft');
  });
  it.each(['mouse', 'keyboard'])('keeps shared command route and draft on %s server field error activation', async mode => {
    window.history.replaceState(null, '', '#/board/qa'); readTransport(detail({ canAnswer: true }));
    const user = userEvent.setup(); render(<HashQaFlow command />);
    await screen.findByRole('button', { name: 'Trả lời QA' }); click('Trả lời QA'); fill('Nội dung trả lời', 'Kept answer');
    apiRequest.mockImplementation(async path => path === '/auth/csrf' ? { headerName: 'X-CSRF', token: 'test' } : Promise.reject(Object.assign(new Error('Invalid answer'), { fieldErrors: { body: 'Check answer body' } })));
    click('Gửi câu trả lời'); const entry = within(await screen.findByRole('alert')).getByText('Check answer body');
    if (mode === 'mouse') await user.click(entry); else { entry.focus(); await user.keyboard('{Enter}'); }
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(window.location.hash).toBe('#/board/qa'); expect(screen.getByLabelText('Nội dung trả lời')).toHaveFocus();
    expect(screen.getByLabelText('Nội dung trả lời')).toHaveValue('Kept answer');
  });
});

describe('current QA read notifications', () => {
  it('notifies initial/manual loading/success/error without command callbacks or history notifications/fetch loops', async () => {
    const onReadState = vi.fn(), onChanged = vi.fn(); readTransport(detail({ canAnswer: true }));
    const props = { projectId: 1, id: 9, onReadState, onChanged };
    const view = render(<QaPanel {...props} />); await screen.findByText('Câu hỏi gốc');
    expect(onReadState).toHaveBeenCalledTimes(2);
    expect(onReadState.mock.calls[0][0]).toMatchObject({ projectId: 1, id: 9, loading: true, error: '', detail: null });
    expect(onReadState.mock.lastCall[0]).toMatchObject({ projectId: 1, id: 9, loading: false, error: '', detail: detail({ canAnswer: true }) });
    const replacement = vi.fn(); view.rerender(<QaPanel {...props} onReadState={replacement} />); await act(async () => {});
    expect(apiRequest.mock.calls.filter(([path]) => path === '/projects/1/qa/9')).toHaveLength(1);
    expect(replacement).not.toHaveBeenCalled();
    apiRequest.mockRejectedValueOnce(networkError()); click('Tải lại QA'); await screen.findByText('Mất kết nối');
    expect(replacement).toHaveBeenCalledTimes(2);
    expect(replacement.mock.lastCall[0]).toMatchObject({ projectId: 1, id: 9, loading: false, error: 'Mất kết nối', detail: null });
    readTransport(detail()); click('Tải lại QA'); await waitFor(() => expect(replacement).toHaveBeenCalledTimes(4));
    expect(onChanged).not.toHaveBeenCalled();
  });
  it('only reports current scope reads and rejects mismatched response identity', async () => {
    const old = deferred(), onReadState = vi.fn(); apiRequest.mockReturnValueOnce(old.promise);
    const view = render(<QaPanel projectId={1} id={9} onReadState={onReadState} />);
    readTransport(detail({}, { projectId: 2, id: 10, question: 'QA hiện tại' }));
    view.rerender(<QaPanel projectId={2} id={10} onReadState={onReadState} />); await screen.findByText('QA hiện tại');
    const count = onReadState.mock.calls.length;
    await act(async () => old.resolve(detail({ canComment: true }))); expect(onReadState).toHaveBeenCalledTimes(count);
    apiRequest.mockResolvedValueOnce(detail()); click('Tải lại QA'); await screen.findByText('Chi tiết QA không khớp ngữ cảnh hiện tại.');
    expect(onReadState.mock.lastCall[0]).toMatchObject({ projectId: 2, id: 10, loading: false, detail: null, error: 'Chi tiết QA không khớp ngữ cảnh hiện tại.' });
  });
  it('history paging/retry never emits current detail read notifications', async () => {
    let historyFails = true;
    apiRequest.mockImplementation(async path => {
      if (path.includes('/answers?')) {
        if (historyFails) throw networkError();
        const index = Number(new URLSearchParams(path.split('?')[1]).get('page'));
        return { ...page([{ ...answer, body: `Trang lịch sử ${index}` }]), page: index, totalPages: 2, totalItems: 21 };
      }
      if (path.includes('?')) return page([]);
      return detail();
    });
    const onReadState = vi.fn(); render(<QaPanel projectId={1} id={9} onReadState={onReadState} />);
    await screen.findByRole('button', { name: 'Tải lại lịch sử câu trả lời' }); expect(onReadState).toHaveBeenCalledTimes(2);
    historyFails = false; click('Tải lại lịch sử câu trả lời'); await screen.findByText('Trang lịch sử 0');
    click('Lịch sử câu trả lời tiếp'); await screen.findByText('Trang lịch sử 1'); expect(onReadState).toHaveBeenCalledTimes(2);
    expect(apiRequest.mock.calls.filter(([path]) => path === '/projects/1/qa/9')).toHaveLength(1);
  });
  it('command read recovery reports denial/error and retains fresh-success-only onChanged with one mutation', async () => {
    let accepted = false, fails = true;
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/auth/csrf') return { headerName: 'X-CSRF', token: 'test' };
      if (options?.method) { accepted = true; return detail(); }
      if (path.includes('?')) return page([]);
      if (accepted && fails) throw networkError();
      return detail(accepted ? { canComment: false, canUploadEvidence: false } : { canAnswer: true });
    });
    const onReadState = vi.fn(), onChanged = vi.fn(); render(<QaPanel projectId={1} id={9} onReadState={onReadState} onChanged={onChanged} />);
    await screen.findByRole('button', { name: 'Trả lời QA' }); click('Trả lời QA'); fill('Nội dung trả lời', 'Một lệnh'); click('Gửi câu trả lời'); await screen.findByText('Mất kết nối');
    expect(onReadState.mock.lastCall[0]).toMatchObject({ loading: false, error: 'Mất kết nối', detail: null }); expect(onChanged).not.toHaveBeenCalled();
    fails = false; click('Tải lại QA'); await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
    expect(onReadState.mock.lastCall[0]).toMatchObject({ loading: false, error: '', detail: { item: { capabilities: { canComment: false, canUploadEvidence: false } } } });
    expect(posts()).toHaveLength(1); expect(onChanged).toHaveBeenCalledWith(onReadState.mock.lastCall[0].detail);
  });
});

describe('typed QA transport', () => {
  it('uses actual typed routes, CSRF and exact DTO with literal page filters', async () => {
    readTransport();
    const body = { answerId: 11, answerVersion: 1, body: 'Xác nhận', expectedVersion: 3, requestKey: 'retry_123' };
    await qaApi.confirm(1, 9, body);
    expect(apiRequest).toHaveBeenLastCalledWith('/projects/1/qa/9/confirmations', expect.objectContaining({ method: 'POST', body: JSON.stringify(body), headers: { 'X-CSRF': 'test' } }));
    await qaApi.assign(1, 9, { assigneeMembershipId: 8, reason: 'Điều tra', expectedVersion: 3, requestKey: 'assign_123' });
    expect(apiRequest).toHaveBeenLastCalledWith('/projects/1/qa/9/assignment', expect.objectContaining({ method: 'PUT' }));
    await qaApi.list(1, { mine: false, keyword: '%_?', status: 'resolved', page: 2 });
    expect(apiRequest.mock.lastCall[0]).toBe('/projects/1/qa?mine=false&keyword=%25_%3F&status=resolved&page=2');
  });
});

describe('QA create', () => {
  it('accepted creation read retry survives current create-capability downgrade without another POST', async () => {
    let reads = 0;
    const read = deferred(); const fresh = detail({}, { version: 8, generation: 1 }); const onCreated = vi.fn();
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/auth/csrf') return { headerName: 'X-CSRF', token: 'test' };
      if (options?.method) return detail();
      reads++;
      if (reads === 1) throw networkError();
      return read.promise;
    });
    const view = render(<QaForm projectId={1} canCreateQa context={{ documentId: 4 }} onCreated={onCreated} />);
    fill('Tiêu đề QA', 'Đã tạo'); fill('Câu hỏi', 'Giữ câu hỏi'); click('Tạo QA'); await screen.findByText('Mất kết nối');
    expect(posts()).toHaveLength(1); expect(onCreated).not.toHaveBeenCalled();
    view.rerender(<QaForm projectId={1} canCreateQa={false} context={{ documentId: 4 }} onCreated={onCreated} />);
    expect(screen.getByRole('button', { name: 'Tải lại QA đã tạo' })).toBeEnabled(); click('Tải lại QA đã tạo');
    fireEvent.submit(screen.getByRole('form', { name: 'Tạo QA' })); await waitFor(() => expect(reads).toBe(2));
    await act(async () => read.resolve(fresh));
    await waitFor(() => expect(onCreated).toHaveBeenCalledExactlyOnceWith(fresh));
    expect(posts()).toHaveLength(1);
    expect(apiRequest.mock.calls.filter(([path]) => path === '/projects/1/qa/9')).toHaveLength(2);
    expect(apiRequest.mock.calls.filter(([path]) => path === '/auth/csrf')).toHaveLength(1);
    view.rerender(<QaForm projectId={2} canCreateQa={false} context={{ documentId: 4 }} onCreated={onCreated} />);
    expect(screen.getByRole('button', { name: 'Tải lại QA đã tạo' })).toBeDisabled();
    view.rerender(<QaForm projectId={1} canCreateQa={false} context={{ documentId: 4 }} onCreated={onCreated} />);
    click('Tạo bản nháp mới'); expect(screen.getByRole('button', { name: 'Tạo QA' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Tạo QA' })); expect(posts()).toHaveLength(1);
  });
  it.each([{ label: 'array', value: [4] }, { label: 'coercible object', value: { toString: () => '4' } }, { label: 'boxed number', value: new Number(4) }])('rejects nonprimitive source ID $label with a visible validation error and no write', async ({ value }) => {
    readTransport();
    render(<QaForm projectId={1} canCreateQa context={{ documentId: value }} />);
    fill('Tiêu đề QA', 'QA'); fill('Câu hỏi', 'Nguồn sai kiểu'); click('Tạo QA');
    expect(await screen.findByRole('alert')).toHaveFocus();
    expect(within(screen.getByRole('alert')).getByText(/documentId.*không phải ID/)).toBeInTheDocument();
    expect(within(screen.getByRole('alert')).queryByRole('link')).toBeNull(); expect(posts()).toHaveLength(0);
    expect(positiveId(value)).toBeUndefined(); expect(positiveId(4)).toBe(4); expect(positiveId('4')).toBe(4);
  });
  it('focuses one error summary, keeps title/question and rejects malformed URL source IDs', async () => {
    readTransport();
    render(<QaForm projectId={1} canCreateQa context={{ documentId: '-4' }} />);
    fill('Tiêu đề QA', 'Nội dung giữ'); fill('Câu hỏi', 'Cần giải thích'); click('Tạo QA');
    expect(await screen.findByRole('alert')).toHaveFocus();
    expect(screen.getByLabelText('Tiêu đề QA')).toHaveValue('Nội dung giữ');
    expect(within(screen.getByRole('alert')).getByText(/documentId.*-4/)).toBeInTheDocument();
    expect(within(screen.getByRole('alert')).queryByRole('link')).toBeNull();
    expect(posts()).toHaveLength(0);
  });
  it('sends QA context without BUG fields and retries identical create key after network failure', async () => {
    readTransport(); let fail = true;
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/auth/csrf') return { headerName: 'X-CSRF', token: 'test' };
      if (options?.method) { if (fail) throw networkError(); return detail(); }
      return detail();
    });
    const onCreated = vi.fn();
    render(<QaForm projectId={1} canCreateQa context={{ documentId: '4', revisionId: 6, contextSnapshot: { document: { fileName: 'nguon.xlsx' } } }} onCreated={onCreated} />);
    fill('Tiêu đề QA', 'QA'); fill('Câu hỏi', 'Hỏi'); click('Tạo QA');
    await screen.findByText('Mất kết nối'); const first = posts()[0][1].body; fail = false; click('Tạo QA');
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(posts()[1][1].body).toBe(first);
    expect(JSON.parse(first)).toMatchObject({ title: 'QA', question: 'Hỏi', documentId: 4, revisionId: 6 });
    expect(JSON.parse(first)).not.toHaveProperty('actualResult');
  });
  it('requires strict create capability and never retargets retained draft to a different project', async () => {
    readTransport(); const view = render(<QaForm projectId={1} canCreateQa />);
    fill('Tiêu đề QA', 'Nháp dự án 1'); fill('Câu hỏi', 'Hỏi');
    view.rerender(<QaForm projectId={2} canCreateQa />);
    expect(screen.getByLabelText('Tiêu đề QA')).toHaveValue('Nháp dự án 1');
    expect(screen.getByRole('button', { name: 'Tạo QA' })).toBeDisabled();
    view.rerender(<QaForm projectId={1} canCreateQa="true" />);
    expect(screen.getByRole('button', { name: 'Tạo QA' })).toBeDisabled();
  });
  it('reports server source consistency failure without dropping supplied fields or question', async () => {
    apiRequest.mockImplementation(async (path, options) => path === '/auth/csrf' ? { headerName: 'X-CSRF', token: 'test' } : options?.method ? Promise.reject(Object.assign(new Error('Nguồn không nhất quán'), { status: 422, fieldErrors: { question: 'Đối chiếu nguồn' } })) : detail());
    render(<QaForm projectId={1} canCreateQa context={{ documentId: 4, groupId: 5, runItemId: 6, revisionId: 7 }} />);
    fill('Tiêu đề QA', 'Hỏi'); fill('Câu hỏi', 'Giữ câu hỏi'); click('Tạo QA');
    expect(await screen.findByRole('alert')).toHaveFocus(); expect(screen.getByLabelText('Câu hỏi')).toHaveValue('Giữ câu hỏi');
    expect(JSON.parse(posts()[0][1].body)).toMatchObject({ documentId: 4, groupId: 5, runItemId: 6, revisionId: 7 });
  });
  it('retries only GET after accepted create and failed refresh, then reports actual fresh detail', async () => {
    let accepted = false, fail = true;
    const fresh = detail({}, { version: 7, generation: 1 }); const onCreated = vi.fn();
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/auth/csrf') return { headerName: 'X-CSRF', token: 'test' };
      if (options?.method) { accepted = true; return detail(); }
      if (accepted && fail) throw networkError();
      return fresh;
    });
    render(<QaForm projectId={1} canCreateQa onCreated={onCreated} />); fill('Tiêu đề QA', 'Hỏi'); fill('Câu hỏi', 'Nguồn độc lập'); click('Tạo QA');
    await screen.findByText('Mất kết nối'); expect(onCreated).not.toHaveBeenCalled(); expect(screen.getByLabelText('Câu hỏi')).toBeDisabled();
    fail = false; click('Tải lại QA đã tạo'); await waitFor(() => expect(onCreated).toHaveBeenCalledWith(fresh)); expect(posts()).toHaveLength(1);
  });
  it('explicit new draft changes project/context and resets request key after a changed draft', async () => {
    apiRequest.mockImplementation(async path => path === '/auth/csrf' ? { headerName: 'X-CSRF', token: 'test' } : Promise.reject(networkError()));
    const view = render(<QaForm projectId={1} canCreateQa />); fill('Tiêu đề QA', 'Hỏi'); fill('Câu hỏi', 'Nháp 1'); click('Tạo QA'); await screen.findByText('Mất kết nối');
    const first = JSON.parse(posts()[0][1].body); fill('Câu hỏi', 'Nháp 2'); click('Tạo QA'); await waitFor(() => expect(posts()).toHaveLength(2));
    expect(JSON.parse(posts()[1][1].body).requestKey).not.toBe(first.requestKey);
    view.rerender(<QaForm projectId={2} canCreateQa context={{ documentId: 10 }} />); click('Tạo bản nháp mới');
    expect(screen.getByLabelText('Tiêu đề QA')).toHaveValue(''); fill('Tiêu đề QA', 'Hỏi mới'); fill('Câu hỏi', 'Nháp dự án 2'); click('Tạo QA');
    await waitFor(() => expect(posts()).toHaveLength(3)); expect(posts()[2][0]).toBe('/projects/2/qa'); expect(JSON.parse(posts()[2][1].body).documentId).toBe(10);
  });
});

describe('QA actions and histories', () => {
  it('renders current typed content, sources, immutable paged history and no role-guessed controls', async () => {
    readTransport(); render(<QaPanel projectId={1} id={9} canTriage catalogs={{ members: [] }} />);
    await screen.findByText('Câu hỏi gốc');
    expect(screen.getByText('Đã trả lời')).toBeInTheDocument();
    expect(screen.getByText('nguon.xlsx')).toBeInTheDocument();
    expect(screen.getByText('Câu trả lời hiện tại', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'javascript:alert(1)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xác nhận câu trả lời' })).not.toBeInTheDocument();
    await waitFor(() => expect(apiRequest.mock.calls.some(([p]) => p.endsWith('/confirmations?page=0&size=20'))).toBe(true));
  });
  it('pins confirmation network retries and refreshes instead of applying saved replay detail', async () => {
    let current = detail({ canConfirm: true }); let fail = true; const onChanged = vi.fn();
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/auth/csrf') return { headerName: 'X-CSRF', token: 'test' };
      if (path.includes('?')) return page([]);
      if (options?.method) { if (fail) throw networkError(); current = detail({}, { status: 'recheck', statusLabel: 'Tester đã xác nhận', version: 5 }); return detail({ canConfirm: true }); }
      return current;
    });
    render(<QaPanel projectId={1} id={9} onChanged={onChanged} />);
    await screen.findByRole('button', { name: 'Xác nhận câu trả lời' }); click('Xác nhận câu trả lời');
    fill('Nội dung xác nhận', 'Đã đối chiếu'); click('Gửi xác nhận');
    await screen.findByText('Mất kết nối'); const first = posts()[0][1].body; fail = false; click('Gửi xác nhận');
    await screen.findByText('Tester đã xác nhận');
    expect(posts()[1][1].body).toBe(first);
    expect(JSON.parse(first)).toMatchObject({ expectedVersion: 3, answerId: 11, answerVersion: 1, body: 'Đã đối chiếu' });
    expect(onChanged).toHaveBeenCalledWith(current);
  });
  it('refresh after 409 retains stale confirmation and requires explicit review of replacement answer', async () => {
    let current = detail({ canConfirm: true });
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/auth/csrf') return { headerName: 'X-CSRF', token: 'test' };
      if (path.includes('?')) return page([]);
      if (options?.method) throw networkError(409);
      return current;
    });
    render(<QaPanel projectId={1} id={9} />); await screen.findByRole('button', { name: 'Xác nhận câu trả lời' });
    click('Xác nhận câu trả lời'); fill('Nội dung xác nhận', 'Nháp xác nhận cũ'); click('Gửi xác nhận'); await screen.findByText('Dữ liệu thay đổi');
    current = { ...detail({ canConfirm: true }, { version: 4 }), currentAnswer: { ...answer, id: 12, answerVersion: 2, body: 'Câu trả lời thay thế' } };
    click('Tải lại QA'); await screen.findByText('Câu trả lời thay thế');
    expect(screen.getByLabelText('Nội dung xác nhận')).toHaveValue('Nháp xác nhận cũ');
    expect(screen.getByRole('button', { name: 'Gửi xác nhận' })).toBeDisabled(); expect(posts()).toHaveLength(1);
    click('Đã đối chiếu dữ liệu hiện tại'); click('Gửi xác nhận'); await waitFor(() => expect(posts()).toHaveLength(2));
    const before = JSON.parse(posts()[0][1].body), after = JSON.parse(posts()[1][1].body);
    expect(after).toMatchObject({ expectedVersion: 4, answerId: 12, answerVersion: 2 }); expect(after.requestKey).not.toBe(before.requestKey);
  });
  it('409 never offers current-data acknowledgement until an explicit successful detail refresh', async () => {
    const current = detail({ canConfirm: true });
    apiRequest.mockImplementation(async (path, options) => path === '/auth/csrf' ? { headerName: 'X-CSRF', token: 'test' } : options?.method ? Promise.reject(networkError(409)) : path.includes('?') ? page([]) : current);
    render(<QaPanel projectId={1} id={9} />); await screen.findByRole('button', { name: 'Xác nhận câu trả lời' });
    click('Xác nhận câu trả lời'); fill('Nội dung xác nhận', 'Giữ nháp'); click('Gửi xác nhận'); await screen.findByText('Dữ liệu thay đổi');
    expect(screen.queryByRole('button', { name: 'Đã đối chiếu dữ liệu hiện tại' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi xác nhận' })).toBeDisabled();
    click('Tải lại QA'); await screen.findByRole('button', { name: 'Đã đối chiếu dữ liệu hiện tại' });
  });
  it('blocks confirmation after reassignment generation even if a stale cap says true', async () => {
    let current = detail({ canConfirm: true }); readTransport(current);
    apiRequest.mockImplementation(async path => path === '/auth/csrf' ? { headerName: 'X-CSRF', token: 'test' } : path.includes('?') ? page([]) : current);
    render(<QaPanel projectId={1} id={9} />); await screen.findByRole('button', { name: 'Xác nhận câu trả lời' });
    click('Xác nhận câu trả lời'); fill('Nội dung xác nhận', 'Giữ nguyên');
    current = { ...detail({ canConfirm: true }, { generation: 1, version: 4, assigneeMembershipId: 22 }), currentAnswer: { ...answer, generation: 1, id: 12, answerVersion: 2 } };
    click('Tải lại QA'); await screen.findByText(/Vòng QA: 1/);
    expect(screen.getByRole('button', { name: 'Gửi xác nhận' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Đã đối chiếu dữ liệu hiện tại' })).not.toBeInTheDocument(); expect(posts()).toHaveLength(0);
  });
  it('shows only active effective global/project DEV candidates and sends separate exception closure', async () => {
    readTransport(detail({ canAssign: true, canCloseException: true }));
    render(<QaPanel projectId={1} id={9} catalogs={{ members: [ { membershipId: 7, projectRole: 'DEV', systemRole: 'DEV', active: true, displayName: 'Dev hợp lệ' }, { membershipId: 8, projectRole: 'TESTER', systemRole: 'TESTER', active: true, displayName: 'Tester' }, { membershipId: 10, projectRole: 'DEV', systemRole: 'DEV', active: true, enabled: false, displayName: 'Dev khóa' } ] }} />);
    await screen.findByRole('button', { name: 'Phân công Dev' }); click('Phân công Dev');
    expect(screen.getByRole('option', { name: 'Dev hợp lệ' })).toBeInTheDocument(); expect(screen.queryByRole('option', { name: 'Tester' })).not.toBeInTheDocument(); expect(screen.queryByRole('option', { name: 'Dev khóa' })).not.toBeInTheDocument();
    click('Bỏ bản nháp'); click('Kết thúc ngoại lệ'); fill('Lý do', 'PM quyết định'); click('Gửi kết thúc ngoại lệ');
    await waitFor(() => expect(posts()).toHaveLength(1)); expect(JSON.parse(posts()[0][1].body)).toMatchObject({ exception: true, reason: 'PM quyết định', expectedVersion: 3 });
  });
  it('ignores old detail requests after switching QA and keeps old pinned draft disabled', async () => {
    const slow = deferred(); readTransport();
    const view = render(<QaPanel projectId={1} id={9} />); await screen.findByText('Câu hỏi gốc');
    apiRequest.mockImplementation(path => path.includes('?') ? Promise.resolve(page([])) : path.endsWith('/9') ? slow.promise : Promise.resolve(detail({}, { id: 10, title: 'QA mới', question: 'Câu hỏi mới' })));
    click('Tải lại QA'); view.rerender(<QaPanel projectId={1} id={10} />); await screen.findByText('Câu hỏi mới');
    await act(async () => slow.resolve(detail({ canConfirm: true }, { title: 'Cũ tới trễ' })));
    expect(screen.queryByText('Cũ tới trễ')).not.toBeInTheDocument();
  });
  it('retains a QA9 confirmation draft when QA10 opens and never targets the new item', async () => {
    let current = detail({ canConfirm: true }); readTransport(current);
    const view = render(<QaPanel projectId={1} id={9} />); await screen.findByRole('button', { name: 'Xác nhận câu trả lời' });
    click('Xác nhận câu trả lời'); fill('Nội dung xác nhận', 'Bản nháp QA9');
    apiRequest.mockImplementation(async path => path.includes('?') ? page([]) : detail({ canConfirm: true }, { id: 10, title: 'QA10' }));
    view.rerender(<QaPanel projectId={1} id={10} />); await screen.findByText('P-9 · QA10');
    expect(screen.getByLabelText('Nội dung xác nhận')).toHaveValue('Bản nháp QA9');
    expect(screen.getByRole('button', { name: 'Gửi xác nhận' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Đã đối chiếu dữ liệu hiện tại' })).not.toBeInTheDocument(); expect(posts()).toHaveLength(0);
  });
  it('accepted command with failed fresh read permits only read retry, never another mutation', async () => {
    let accepted = false, readFail = true;
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/auth/csrf') return { headerName: 'X-CSRF', token: 'test' };
      if (path.includes('?')) return page([]);
      if (options?.method) { accepted = true; return detail(); }
      if (accepted && readFail) throw networkError();
      return detail({ canAnswer: true });
    });
    const onChanged = vi.fn(); render(<QaPanel projectId={1} id={9} onChanged={onChanged} />); await screen.findByRole('button', { name: 'Trả lời QA' });
    click('Trả lời QA'); fill('Nội dung trả lời', 'Trả lời'); click('Gửi câu trả lời'); await screen.findByText('Mất kết nối');
    expect(screen.getByRole('button', { name: 'Gửi câu trả lời' })).toBeDisabled(); expect(onChanged).not.toHaveBeenCalled();
    readFail = false; click('Tải lại QA'); await waitFor(() => expect(onChanged).toHaveBeenCalled()); expect(posts()).toHaveLength(1);
  });
  it('busy suppresses duplicate submit and changed body obtains a new key after network error', async () => {
    let first = true; const slow = deferred(); readTransport(detail({ canAnswer: true }));
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/auth/csrf') return { headerName: 'X-CSRF', token: 'test' };
      if (path.includes('?')) return page([]);
      if (options?.method) { if (first) { first = false; await slow.promise; } throw networkError(); }
      return detail({ canAnswer: true });
    });
    render(<QaPanel projectId={1} id={9} />); await screen.findByRole('button', { name: 'Trả lời QA' });
    click('Trả lời QA'); fill('Nội dung trả lời', 'Bản đầu'); click('Gửi câu trả lời');
    fireEvent.submit(screen.getByRole('form', { name: 'Bản nháp Trả lời QA' })); await waitFor(() => expect(posts()).toHaveLength(1));
    await act(async () => slow.resolve()); await screen.findByText('Mất kết nối');
    const firstBody = JSON.parse(posts()[0][1].body); fill('Nội dung trả lời', 'Bản chỉnh'); click('Gửi câu trả lời'); await waitFor(() => expect(posts()).toHaveLength(2));
    expect(JSON.parse(posts()[1][1].body).requestKey).not.toBe(firstBody.requestKey);
  });
  it.each([
    ['canStart', 'Bắt đầu xác minh', 'Gửi bắt đầu', 'Lý do', 'start', { reason: 'Nội dung lệnh' }],
    ['canRequestInfo', 'Yêu cầu bổ sung', 'Gửi yêu cầu bổ sung', 'Lý do', 'request-info', { reason: 'Nội dung lệnh' }],
    ['canProvideInfo', 'Bổ sung thông tin', 'Gửi bổ sung', 'Nội dung bổ sung', 'provide-info', { body: 'Nội dung lệnh' }],
    ['canAnswer', 'Trả lời QA', 'Gửi câu trả lời', 'Nội dung trả lời', 'answers', { body: 'Nội dung lệnh', basisReference: 'Căn cứ cụ thể' }],
    ['canClose', 'PM kết thúc', 'Gửi kết thúc', 'Lý do', 'close', { reason: 'Nội dung lệnh', exception: false }],
    ['canReopen', 'Mở lại QA', 'Gửi mở lại', 'Lý do', 'reopen', { reason: 'Nội dung lệnh' }],
  ])('sends real %s DTO and refreshes current detail after success', async (cap, label, send, field, path, expected) => {
    readTransport(detail({ [cap]: true }, cap === 'canReopen' ? { status: 'closed' } : {}));
    const onChanged = vi.fn(); render(<QaPanel projectId={1} id={9} onChanged={onChanged} />); await screen.findByRole('button', { name: label });
    click(label); fill(field, 'Nội dung lệnh'); if (cap === 'canAnswer') fill('Tham chiếu căn cứ', 'Căn cứ cụ thể'); click(send);
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(posts()[0][0]).toBe(`/projects/1/qa/9/${path}`); expect(JSON.parse(posts()[0][1].body)).toMatchObject({ ...expected, expectedVersion: 3 });
  });
  it('assigns actual membershipId and preserves inline server validation without clearing input', async () => {
    readTransport(detail({ canAssign: true }));
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/auth/csrf') return { headerName: 'X-CSRF', token: 'test' };
      if (path.includes('?')) return page([]);
      if (options?.method) throw Object.assign(new Error('Dev không còn hợp lệ'), { status: 422, fieldErrors: [{ field: 'assigneeMembershipId', message: 'Chọn lại Dev' }] });
      return detail({ canAssign: true });
    });
    render(<QaPanel projectId={1} id={9} catalogs={{ members: [{ membershipId: 7, systemRole: 'DEV', projectRole: 'DEV', active: true, displayName: 'Dev A' }] }} />);
    await screen.findByRole('button', { name: 'Phân công Dev' }); click('Phân công Dev'); fill('Dev phụ trách', '7'); fill('Lý do', 'Phân công'); click('Gửi phân công');
    expect(await screen.findByRole('alert')).toHaveFocus(); expect(screen.getByLabelText('Dev phụ trách')).toHaveAttribute('aria-invalid', 'true'); expect(screen.getByLabelText('Lý do')).toHaveValue('Phân công');
    expect(JSON.parse(posts()[0][1].body)).toMatchObject({ assigneeMembershipId: 7, reason: 'Phân công' });
  });
  it('pages immutable histories independently and retries history read failure', async () => {
    let fail = true;
    apiRequest.mockImplementation(async path => {
      if (path.includes('/answers?')) { if (fail) throw networkError(); const index = Number(new URLSearchParams(path.split('?')[1]).get('page')); return { ...page([{ ...answer, id: index + 50, body: `Lịch sử trang ${index}` }]), page: index, totalItems: 21, totalPages: 2 }; }
      if (path.includes('/confirmations?')) return page([{ id: 66, answerId: 11, answerVersion: 1, generation: 0, body: 'Xác nhận cũ', confirmerName: 'Tester' }]);
      return detail();
    });
    render(<QaPanel projectId={1} id={9} />); await screen.findByRole('button', { name: 'Tải lại lịch sử câu trả lời' }); fail = false; click('Tải lại lịch sử câu trả lời');
    await screen.findByText('Lịch sử trang 0'); click('Lịch sử câu trả lời tiếp'); await screen.findByText('Lịch sử trang 1');
    expect(screen.getByText('Xác nhận cũ')).toBeInTheDocument(); expect(screen.queryByText('Lịch sử trang 0')).not.toBeInTheDocument();
  });
  it.each([401, 403, 404])('shows initial %s denial with explicit read retry and no actions', async status => {
    apiRequest.mockRejectedValueOnce(Object.assign(new Error(`Lỗi ${status}`), { status }));
    render(<QaPanel projectId={1} id={9} />); await screen.findByText(`Lỗi ${status}`);
    expect(screen.queryByRole('button', { name: 'Trả lời QA' })).not.toBeInTheDocument(); readTransport(detail()); click('Tải lại QA'); await screen.findByText('Câu hỏi gốc');
  });
  it('keeps an old draft disabled when refreshed capabilities remove confirmation permission', async () => {
    let current = detail({ canConfirm: true }); apiRequest.mockImplementation(async path => path.includes('?') ? page([]) : current);
    render(<QaPanel projectId={1} id={9} />); await screen.findByRole('button', { name: 'Xác nhận câu trả lời' }); click('Xác nhận câu trả lời'); fill('Nội dung xác nhận', 'Giữ nháp');
    current = detail({}, { version: 4 }); click('Tải lại QA'); await screen.findByText(/Phiên bản: 4/);
    expect(screen.getByLabelText('Nội dung xác nhận')).toHaveValue('Giữ nháp'); expect(screen.getByRole('button', { name: 'Gửi xác nhận' })).toBeDisabled(); expect(posts()).toHaveLength(0);
  });
  it('closed QA renders shared readable content and only current reopen control', async () => {
    readTransport(detail({ canReopen: true }, { status: 'closed', statusLabel: 'PM kết thúc' })); render(<QaPanel projectId={1} id={9} />);
    await screen.findByText('QA đã kết thúc; nội dung chỉ đọc.'); expect(screen.getByRole('button', { name: 'Mở lại QA' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Trả lời QA' })).not.toBeInTheDocument();
  });
});

describe('PM handoff queue', () => {
  it('renders literal server state/counts/eligibility and real work item link', async () => {
    const navigate = vi.fn();
    apiRequest.mockResolvedValue(page([{ workItemId: 30, key: 'P-30', title: 'Bug', state: 'VERIFYING', roundNo: 2, applicableCount: 2, requestedCount: 2, pendingCount: 0, passCount: 2, failCount: 0, requestIds: [77, 76], canPrepareRetest: false, canClose: false }]));
    render(<HandoffPanel projectId={1} navigate={navigate} />);
    await screen.findByText('P-30'); expect(screen.getByText('PM đối chiếu yêu cầu, kết quả và điều kiện kết thúc hiện hành.')).toBeInTheDocument(); expect(screen.getByText('PASS: 2')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'P-30' }), event = createEvent.click(link, { button: 0 });
    expect(link).toHaveAttribute('href', '#/board/issue/30');
    fireEvent(link, event); expect(event.defaultPrevented).toBe(true); expect(navigate).toHaveBeenCalledExactlyOnceWith('/board/issue/30');
    expect(screen.queryByRole('link', { name: '#77' })).not.toBeInTheDocument();
    fill('Trạng thái bàn giao', 'RETRY_REQUIRED'); await waitFor(() => expect(apiRequest.mock.lastCall[0]).toContain('state=RETRY_REQUIRED'));
  });
  it('provides a hash detail link and preserves default navigation when no callback is supplied', async () => {
    apiRequest.mockResolvedValue(page([{ workItemId: 30, key: 'P-30', title: 'Bug', state: 'ASSIGNED' }]));
    render(<HandoffPanel projectId={1} />);
    const link = await screen.findByRole('link', { name: 'P-30' }), event = createEvent.click(link, { button: 0 });
    expect(link).toHaveAttribute('href', '#/board/issue/30');
    fireEvent(link, event); expect(event.defaultPrevented).toBe(false);
  });
  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])('preserves browser-owned hash navigation for modified/non-left click %j', async modifiers => {
    const navigate = vi.fn(); apiRequest.mockResolvedValue(page([{ workItemId: 30, key: 'P-30', title: 'Bug', state: 'ASSIGNED' }]));
    render(<HandoffPanel projectId={1} navigate={navigate} />);
    const link = await screen.findByRole('link', { name: 'P-30' }), event = createEvent.click(link, { button: 0, ...modifiers });
    expect(link).toHaveAttribute('href', '#/board/issue/30');
    fireEvent(link, event); expect(event.defaultPrevented).toBe(false); expect(navigate).not.toHaveBeenCalled();
  });
  it('shows queue 403/retry/empty and ignores a late project result', async () => {
    apiRequest.mockRejectedValueOnce(Object.assign(new Error('Không có quyền'), { status: 403 }));
    const view = render(<HandoffPanel projectId={1} />); await screen.findByText('Không có quyền');
    const slow = deferred(); apiRequest.mockReturnValueOnce(slow.promise); click('Thử lại');
    apiRequest.mockResolvedValue(page([])); view.rerender(<HandoffPanel projectId={2} />); await screen.findByText('Chưa có BUG trong hàng chờ này.');
    await act(async () => slow.resolve(page([{ workItemId: 99, key: 'Cũ', title: 'Cũ', state: 'ASSIGNED' }])));
    expect(screen.queryByText('Cũ')).not.toBeInTheDocument();
  });
  it('preserves server totals/paging, resets page on filter, and keeps archived readiness read-only', async () => {
    apiRequest.mockImplementation(async path => {
      const filters = new URLSearchParams(path.split('?')[1]); const index = Number(filters.get('page'));
      return { items: [{ workItemId: 30 - index, key: `P-${30 - index}`, title: 'Bug', state: 'READY_TO_CLOSE', passCount: 2, canClose: false, canPrepareRetest: false }], totalItems: 21, page: index, size: 20, totalPages: 2 };
    });
    render(<HandoffPanel projectId={1} />); await screen.findByText('P-30');
    expect(screen.getByText(/21 BUG/)).toBeInTheDocument(); expect(screen.getByText('Đủ kết quả xác minh', { exact: false, selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText(/Hiện chưa được phép kết thúc/)).toBeInTheDocument();
    click('Bàn giao tiếp'); await screen.findByText('P-29'); fill('Tìm BUG bàn giao', '%_'); await screen.findByText('P-30');
    expect(apiRequest.mock.lastCall[0]).toContain('page=0'); expect(apiRequest.mock.lastCall[0]).toContain('keyword=%25_');
    expect(within(screen.getByRole('region', { name: 'Hàng chờ bàn giao' })).queryByRole('button', { name: 'Kết thúc' })).not.toBeInTheDocument();
  });
});
