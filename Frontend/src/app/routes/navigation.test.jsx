import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { pageTitle, routeInfo } from './routeInfo';
import { Sidebar } from '../components/Sidebar';
import { AppRouter } from './AppRouter';
import { createApiClient, ApiError, onUnauthorized } from '../services/api/client';
import { fileWorkApi, executionDownload } from '../services/api/fileWork';

vi.mock('../features/file-work/FileWorkPage', () => ({
  FileWorkPage: ({ documentId, navigate }) => <button onClick={() => navigate('/tests/file-work/27')}>File list: {documentId ?? 'all'}</button>,
}));
vi.mock('../features/file-work/FileWorkDetail', () => ({
  FileWorkDetail: ({ groupId, navigate }) => <button onClick={() => navigate('/tests/file-work')}>File group: {groupId}</button>,
}));
vi.mock('../pages/TestRunnerGridPage', () => ({ TestRunnerGridPage: ({ specId }) => <p>Cycle runner: {specId}</p> }));
vi.mock('../features/test-cases/TestDocumentPage', () => ({ TestDocumentPage: ({ documentId }) => <p>Document: {documentId}</p> }));
vi.mock('../features/test-cases/TestDocumentsPage', () => ({ TestDocumentsPage: () => <p>Document library</p> }));
vi.mock('../pages/TestSpecsPage', () => ({ TestSpecsPage: () => <p>Case library</p> }));
vi.mock('../features/test-execution/TestCyclesPage', () => ({ TestCyclesPage: () => <p>Cycle list</p> }));
vi.mock('../features/retest/RetestQueuePage', () => ({ RetestQueuePage: () => <p>Retest queue</p> }));
vi.mock('../pages/DashboardPage', () => ({ DashboardPage: ({ activeRoute }) => <p>Dashboard: {activeRoute}</p> }));
vi.mock('../pages/WorkBoardPage', () => ({ WorkBoardPage: ({ activeRoute }) => <p>Work board: {activeRoute}</p> }));
vi.mock('../pages/ProgressPage', () => ({ ProgressPage: () => <p>Project progress</p> }));
vi.mock('../pages/AnalysisPage', () => ({ AnalysisPage: () => <p>Project analysis</p> }));
vi.mock('../features/projects/ProjectSettingsPage', () => ({ ProjectSettingsPage: ({ activeRoute }) => <p>Settings: {activeRoute}</p> }));
vi.mock('../features/projects/CatalogPage', () => ({ CatalogPage: () => <p>Project catalogs</p> }));

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

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

describe('file-work navigation', () => {
  it.each([
    ['/tests/file-work', 'File list: all'],
    ['/tests/file-work?documentId=9', 'File list: 9'],
    ['/tests/file-work?documentId=9&caseId=2', 'File list: 9'],
    ['/tests/file-work/27?caseId=2&buildId=8', 'File group: 27'],
  ])('dispatches the actual router for %s', (activeRoute, label) => {
    render(<AppRouter activeRoute={activeRoute} navigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    expect(screen.queryByText(/Cycle runner/)).not.toBeInTheDocument();
  });

  it.each([
    '/tests/file-work/0', '/tests/file-work/-1', '/tests/file-work/nope',
    '/tests/file-work/27/extra', '/tests/file-work/', '/tests/file-work/1.5',
    '/tests/file-work/01', '/tests/file-work/9007199254740993',
    '/tests/file-work?documentId=0', '/tests/file-work?documentId=-9',
    '/tests/file-work?documentId=abc', '/tests/file-work?documentId=',
    '/tests/file-work?documentId=9/extra', '/tests/file-work?documentId=9%3FcaseId%3D2',
    '/tests/file-work?documentId=9&documentId=10', '/tests/file-work?documentId=9007199254740993',
  ])('rejects invalid file context rather than falling into a runner: %s', activeRoute => {
    render(<AppRouter activeRoute={activeRoute} navigate={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Không tìm thấy' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /File (list|group)/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Cycle runner/)).not.toBeInTheDocument();
  });

  it('separates path identifiers from query context and legacy cycles', () => {
    expect(routeInfo('/tests/file-work?documentId=9')).toMatchObject({ specId: null, documentId: 9 });
    expect(routeInfo('/tests/file-work/27?groupId=88&caseId=2')).toMatchObject({ path: '/tests/file-work/27', groupId: 27, specId: null, caseId: '2' });
    expect(routeInfo('/tests/file-work/0').groupId).toBeNull();
  });

  it.each([
    ['/tests/file-work?documentId=9', 'Công việc theo file · TMS'],
    ['/tests/file-work/27?caseId=2', 'Thực thi theo file · TMS'],
    ['/tests/file-work/27/extra', 'Không tìm thấy trang · TMS'],
    ['/tests/file-work?documentId=nope', 'Không tìm thấy trang · TMS'],
    ['/tests/cycles/15', 'Thực thi kiểm thử · TMS'],
    ['/tests/documents/9', 'Tài liệu test case · TMS'],
  ])('sets the title for %s', (route, title) => { expect(pageTitle(route)).toBe(title); });

  it('passes navigate to both core page boundaries and follows detail changes', async () => {
    const navigate = vi.fn(), user = userEvent.setup();
    const view = render(<AppRouter activeRoute='/tests/file-work' navigate={navigate} />);
    await user.click(screen.getByRole('button', { name: 'File list: all' }));
    expect(navigate).toHaveBeenCalledWith('/tests/file-work/27');
    view.rerender(<AppRouter activeRoute='/tests/file-work/27' navigate={navigate} />);
    await user.click(screen.getByRole('button', { name: 'File group: 27' }));
    expect(navigate).toHaveBeenLastCalledWith('/tests/file-work');
    view.rerender(<AppRouter activeRoute='/tests/file-work/28' navigate={navigate} />);
    expect(screen.getByRole('button', { name: 'File group: 28' })).toBeInTheDocument();
  });

  it.each(['/tests/file-work', '/tests/file-work?documentId=9', '/tests/file-work/27?buildId=8'])('selects exactly the file child for %s', activeRoute => {
    render(<Sidebar activeRoute={activeRoute} navigate={vi.fn()} collapsed={false} onToggle={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Công việc theo file' })).toHaveAttribute('aria-current', 'page');
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Đợt kiểm thử' })).not.toHaveAttribute('aria-current');
  });

  it('preserves collapsed expansion and mobile close after choosing the file child', async () => {
    const user = userEvent.setup(), navigate = vi.fn(), onClose = vi.fn(), onToggle = vi.fn();
    const props = { activeRoute: '/issues', navigate, onClose, onToggle };
    const view = render(<Sidebar {...props} collapsed />);
    await user.click(screen.getByRole('button', { name: 'Quản lý kiểm thử' }));
    expect(onToggle).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
    view.rerender(<Sidebar {...props} collapsed={false} overlayOpen />);
    expect(screen.getByRole('dialog', { name: 'Menu dự án' })).toHaveAttribute('aria-modal', 'true');
    await user.click(screen.getByRole('button', { name: 'Công việc theo file' }));
    expect(navigate).toHaveBeenCalledWith('/tests/file-work');
    expect(onClose).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Đóng menu' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['/tests', 'Document library'], ['/tests/cases', 'Case library'],
    ['/tests/documents/9?caseId=2', 'Document: 9'], ['/tests/cycles', 'Cycle list'],
    ['/tests/cycles/15?caseId=2', 'Cycle runner: 15'], ['/tests/15?caseId=2', 'Cycle runner: 15'],
    ['/tests/retests', 'Retest queue'],
    ['/dashboard', 'Dashboard: /dashboard'], ['/dashboard/testing', 'Dashboard: /dashboard/testing'],
    ['/board', 'Work board: /board'], ['/board/list', 'Work board: /board/list'],
    ['/issues', 'Work board: /issues'], ['/progress', 'Project progress'], ['/analysis', 'Project analysis'],
    ['/settings/catalogs', 'Project catalogs'], ['/settings', 'Settings: /settings'],
    ['/settings/members', 'Settings: /settings/members'], ['/settings/rules', 'Settings: /settings/rules'],
    ['/settings/handbook', 'Settings: /settings/handbook'],
  ])('preserves router dispatch for %s', (activeRoute, label) => {
    render(<AppRouter activeRoute={activeRoute} navigate={vi.fn()} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('preserves existing title and default route resolution', () => {
    expect(routeInfo().path).toBe('/dashboard');
    expect(pageTitle('/board?view=list')).toBe('Danh sách công việc · TMS');
    expect(pageTitle('/board/issue/7')).toBe('Chi tiết công việc · TMS');
    expect(pageTitle('/board')).toBe('Bảng Kanban · TMS');
    expect(pageTitle('/tests/15')).toBe('Thực thi kiểm thử · TMS');
    expect(pageTitle('/unknown')).toBe('Không tìm thấy trang · TMS');
  });

  it('follows Back navigation from detail and toggles the file submenu by keyboard', async () => {
    const user = userEvent.setup(), props = { navigate: vi.fn(), onToggle: vi.fn(), onClose: vi.fn(), collapsed: false };
    const view = render(<Sidebar {...props} activeRoute='/tests/file-work/27' />);
    view.rerender(<Sidebar {...props} activeRoute='/tests/documents/9' />);
    expect(screen.getByRole('button', { name: 'Thư viện test case' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Công việc theo file' })).not.toHaveAttribute('aria-current');
    const parent = screen.getByRole('button', { name: 'Quản lý kiểm thử' });
    parent.focus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('button', { name: 'Công việc theo file' })).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Công việc theo file' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thu gọn menu' }));
    expect(props.onToggle).toHaveBeenCalledOnce();
  });
});

describe('file-work download transport', () => {
  const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const workbook = () => new Response('xlsx-bytes', { headers: {
    'Content-Type': mime,
    'Content-Disposition': "attachment; filename*=UTF-8''K%E1%BA%BFt%20qu%E1%BA%A3.xlsx",
  } });

  it('returns the actual successful Response with metadata and an unread body', async () => {
    const response = workbook(), fetchImpl = vi.fn().mockResolvedValue(response);
    const result = await createApiClient({ fetchImpl })('/download', { responseType: 'response' });
    expect(result).toBe(response);
    expect(result.bodyUsed).toBe(false);
    expect(result.headers.get('Content-Disposition')).toContain('filename*');
    expect(fetchImpl).toHaveBeenCalledWith('/api/v1/download', expect.objectContaining({
      credentials: 'same-origin', headers: expect.objectContaining({ Accept: '*/*' }),
    }));
    const download = await executionDownload(result);
    expect(download.fileName).toBe('Kết quả.xlsx');
    expect(download.blob.size).toBe(10);
  });

  it('integrates real fileWorkApi.export, shared client and executionDownload', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(workbook());
    vi.stubGlobal('fetch', fetchImpl);
    const response = await fileWorkApi.export(3, 27, 8);
    expect(response.bodyUsed).toBe(false);
    const download = await executionDownload(response);
    expect(download.fileName).toBe('Kết quả.xlsx');
    expect(download.blob.type).toBe(mime);
    expect(fetchImpl).toHaveBeenCalledWith('/api/v1/projects/3/file-work-groups/27/export?buildId=8', expect.objectContaining({ credentials: 'same-origin' }));
  });

  it.each([403, 409, 401])('keeps HTTP %i typed at the real export boundary', async status => {
    const expired = vi.fn(), off = onUnauthorized(expired);
    const payload = { code: 'EXPORT_DENIED', message: 'Server refused export', fieldErrors: [{ field: 'buildId', message: 'Unavailable' }] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), {
      status, headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'export-request' },
    })));
    try {
      const error = await fileWorkApi.export(3, 27, 8).catch(error => error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status, ...payload, requestId: 'export-request' });
      expect(expired).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
    } finally { off(); }
  });

  it('keeps malformed raw-mode 401 typed and notifies the expired session', async () => {
    const expired = vi.fn(), off = onUnauthorized(expired);
    try {
      const fetchImpl = vi.fn().mockResolvedValue(new Response('{broken', { status: 401, headers: { 'Content-Type': 'application/json' } }));
      await expect(createApiClient({ fetchImpl })('/download', { responseType: 'response' })).rejects.toMatchObject({ status: 401, code: 'HTTP_ERROR' });
      expect(expired).toHaveBeenCalledOnce();
    } finally { off(); }
  });

  it('leaves successful JSON unread in raw mode and preserves 204 behavior', async () => {
    const response = new Response('{broken', { headers: { 'Content-Type': 'application/json' } });
    const result = await createApiClient({ fetchImpl: vi.fn().mockResolvedValue(response) })('/raw', { responseType: 'response' });
    expect(result).toBe(response);
    expect(result.bodyUsed).toBe(false);
    await expect(createApiClient({ fetchImpl: vi.fn().mockResolvedValue(new Response(null, { status: 204 })) })('/empty', { responseType: 'response' })).resolves.toBeNull();
  });

  it('keeps raw-mode timeout and caller cancellation distinct', async () => {
    const fetchImpl = vi.fn((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }));
    await expect(createApiClient({ fetchImpl, timeoutMs: 5 })('/slow', { responseType: 'response' })).rejects.toMatchObject({ code: 'TIMEOUT' });
    const controller = new AbortController();
    const pending = createApiClient({ fetchImpl })('/cancel', { responseType: 'response', signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
