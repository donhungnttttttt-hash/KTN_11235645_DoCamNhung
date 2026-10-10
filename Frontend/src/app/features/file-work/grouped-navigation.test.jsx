import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExecutionRunnerPage } from '../test-execution/ExecutionRunnerPage';
import { DocumentExecutionControls, useDocumentExecution } from '../test-cases/DocumentExecution';
import { TestDocumentsPage } from '../test-cases/TestDocumentsPage';
import { executionApi } from '../../services/api/execution';
import { projectsApi } from '../../services/api/projects';
import { testCasesApi } from '../../services/api/testCases';

const state = vi.hoisted(() => ({ currentProject: null, user: { id: 'tester' }, hasRole: () => false }));
vi.mock('../projects/ProjectProvider', () => ({ useProject: () => state }));
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => state }));
vi.mock('../../services/api/execution', () => ({ executionApi: {
  cycles: vi.fn(), cycle: vi.fn(), configurations: vi.fn(), runs: vi.fn(), attempts: vi.fn(), record: vi.fn(),
  assignments: vi.fn(), assign: vi.fn(), decideScope: vi.fn(), scopeDecisions: vi.fn(), cycleDecisions: vi.fn(),
} }));
vi.mock('../../services/api/projects', () => ({ projectsApi: { listMembers: vi.fn(), listCatalog: vi.fn() } }));
vi.mock('../../services/api/testCases', () => ({ testCasesApi: { listDocuments: vi.fn() } }));
const empty = { items: [], page: 0, totalItems: 0, totalPages: 0 };
const run = { id: 77, testCaseId: 21, caseNo: 'TC-1', titleVi: 'Đăng nhập', configurationId: 2,
  defaultBuildId: 3, revisionNo: 1, version: 0, resultCode: 'NOT_RUN', assigneeUserId: 'tester', assigneeMembershipId: 8 };
const grouped = { ...run, fileWorkGroupId: 40 };
const document = { id: 9, fileName: 'Nguồn.xlsx', sheetName: 'Nguồn', totalRows: 1, resultCounts: { OK: 1 } };

beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear();
  state.currentProject = { id: 1, name: 'Dự án A', projectRole: 'TESTER', timezone: 'Asia/Ho_Chi_Minh' };
  state.hasRole = () => false;
  executionApi.cycles.mockResolvedValue({ ...empty, items: [{ id: 8, name: 'Regression', statusCode: 'ACTIVE' }], totalPages: 1 });
  executionApi.cycle.mockResolvedValue({ id: 8, name: 'Regression', statusCode: 'ACTIVE', runCount: 1 });
  executionApi.configurations.mockResolvedValue([{ id: 2, environmentName: 'QA', deviceName: 'iPad' }]);
  executionApi.runs.mockResolvedValue({ ...empty, items: [grouped], totalItems: 1, totalPages: 1 });
  executionApi.attempts.mockResolvedValue(empty);
  executionApi.assignments.mockResolvedValue([]);
  executionApi.record.mockResolvedValue({ id: 99, attemptNo: 1, resultCode: 'OK' });
  projectsApi.listMembers.mockResolvedValue([{ membershipId: 8, projectRole: 'TESTER', active: true, displayName: 'Tester' }]);
  projectsApi.listCatalog.mockImplementation((_id, type) => Promise.resolve(type === 'builds' ? [{ id: 3, platform: 'iOS', versionLabel: '1.0' }] : []));
  testCasesApi.listDocuments.mockResolvedValue({ ...empty, items: [document], totalItems: 1, totalPages: 1 });
});

function Source({ project, navigate, historyOnly = false }) {
  const e = useDocumentExecution(project, 9);
  return <><button onClick={() => e.show({ caseId: 21, sourceId: '1', historyOnly })}>Mở kết quả nguồn</button>
    <DocumentExecutionControls execution={e} project={project} navigate={navigate} /></>;
}
async function openSource(user) {
  await user.click(screen.getByRole('button', { name: 'Mở kết quả nguồn' }));
  await user.selectOptions(await screen.findByRole('combobox', { name: 'Đợt ghi kết quả' }), '8');
}

describe('grouped legacy runner navigation', () => {
  it.each(['case', 'result'])('routes the grouped %s action without opening or writing a legacy attempt', async action => {
    const navigate = vi.fn(), user = userEvent.setup();
    render(<ExecutionRunnerPage cycleId={8} navigate={navigate} />);
    await screen.findByRole('button', { name: 'TC-1' });
    expect(executionApi.record).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: action === 'case' ? 'TC-1' : 'Công việc theo file' }));
    expect(navigate).toHaveBeenCalledWith('/tests/file-work/40');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(executionApi.attempts).not.toHaveBeenCalled(); expect(executionApi.record).not.toHaveBeenCalled();
  });

  it.each([0, -1, '040', '40/extra', Number.MAX_SAFE_INTEGER + 1, [[40]]])('fails closed for malformed server group ID %s', async fileWorkGroupId => {
    executionApi.runs.mockResolvedValue({ ...empty, items: [{ ...run, fileWorkGroupId }], totalItems: 1, totalPages: 1 });
    const navigate = vi.fn(), user = userEvent.setup();
    render(<ExecutionRunnerPage cycleId={8} navigate={navigate} />);
    await user.click(await screen.findByRole('button', { name: 'TC-1' }));
    expect(navigate).not.toHaveBeenCalled(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ghi kết quả' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Công việc theo file' })).toBeDisabled();
    expect(executionApi.record).not.toHaveBeenCalled();
  });

  it('keeps ungrouped legacy recording', async () => {
    executionApi.runs.mockResolvedValue({ ...empty, items: [run], totalItems: 1, totalPages: 1 });
    const user = userEvent.setup(); render(<ExecutionRunnerPage cycleId={8} navigate={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'TC-1' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Thực thi TC-1' }));
    await user.selectOptions(dialog.getByLabelText('Kết quả'), 'OK');
    await user.click(dialog.getByRole('button', { name: 'Ghi kết quả' }));
    await waitFor(() => expect(executionApi.record).toHaveBeenCalledWith(1, 77, expect.objectContaining({ resultCode: 'OK', expectedVersion: 0 })));
  });

  it('discards a late grouped result from the previous project', async () => {
    let finish; executionApi.runs.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const navigate = vi.fn(), view = render(<ExecutionRunnerPage cycleId={8} navigate={navigate} />);
    state.currentProject = { id: 2, name: 'Dự án B', projectRole: 'TESTER' };
    executionApi.runs.mockResolvedValue({ ...empty, items: [{ ...grouped, caseNo: 'TC-B', fileWorkGroupId: 60 }], totalItems: 1, totalPages: 1 });
    view.rerender(<ExecutionRunnerPage cycleId={8} navigate={navigate} />);
    await screen.findByRole('button', { name: 'TC-B' });
    await act(async () => finish({ ...empty, items: [grouped], totalItems: 1, totalPages: 1 }));
    expect(screen.queryByRole('button', { name: 'TC-1' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Công việc theo file' }));
    expect(navigate).toHaveBeenCalledWith('/tests/file-work/60');
  });

  it('preserves PM assignment and scope decisions for a grouped run', async () => {
    state.currentProject.projectRole = 'PM'; const user = userEvent.setup();
    render(<ExecutionRunnerPage cycleId={8} navigate={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Phân công', exact: true }));
    expect(await screen.findByRole('dialog', { name: 'Phân công lượt kiểm thử' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Đóng' }));
    await user.click(screen.getByRole('button', { name: 'Đánh dấu NA' }));
    expect(screen.getByRole('dialog', { name: 'Xác nhận NA' })).toBeVisible();
    expect(executionApi.assign).not.toHaveBeenCalled(); expect(executionApi.decideScope).not.toHaveBeenCalled();
  });
});

describe('source grouped result controls', () => {
  it('offers the real file group rather than a writable legacy attempt', async () => {
    const navigate = vi.fn(), user = userEvent.setup();
    render(<Source project={state.currentProject} navigate={navigate} />); await openSource(user);
    const button = await screen.findByRole('button', { name: 'Công việc theo file' });
    expect(screen.getByRole('dialog', { name: 'Công việc theo file · TC-1' })).toContainElement(window.document.activeElement);
    expect(screen.queryByRole('button', { name: 'Ghi kết quả' })).not.toBeInTheDocument();
    expect(executionApi.record).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
    await user.click(button); expect(navigate).toHaveBeenCalledWith('/tests/file-work/40');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(executionApi.attempts).not.toHaveBeenCalled(); expect(executionApi.record).not.toHaveBeenCalled();
  });

  it('closes the grouped handoff with Escape without navigating or writing', async () => {
    const navigate = vi.fn(), user = userEvent.setup();
    render(<Source project={state.currentProject} navigate={navigate} />); await openSource(user);
    await screen.findByRole('button', { name: 'Công việc theo file' }); await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(navigate).not.toHaveBeenCalled();
    expect(executionApi.record).not.toHaveBeenCalled();
  });

  it('keeps requested grouped history truly read-only including NG bug actions', async () => {
    executionApi.attempts.mockResolvedValue({ ...empty, items: [{ id: 99, attemptNo: 1, resultCode: 'NG', actualResult: 'Lỗi trước', executorName: 'Tester' }], totalItems: 1, totalPages: 1 });
    const navigate = vi.fn(), user = userEvent.setup();
    render(<Source project={state.currentProject} navigate={navigate} historyOnly />); await openSource(user);
    const dialog = await screen.findByRole('dialog', { name: 'Thực thi TC-1' });
    expect(await within(dialog).findByText('Lỗi trước')).toBeVisible();
    expect(within(dialog).queryByRole('button', { name: 'Ghi kết quả' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Tạo bug|Gắn bug/ })).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled(); expect(executionApi.record).not.toHaveBeenCalled();
  });

  it('does not turn an invalid group ID into a writable legacy run', async () => {
    executionApi.runs.mockResolvedValue({ ...empty, items: [{ ...run, fileWorkGroupId: 'undefined' }], totalItems: 1, totalPages: 1 });
    const user = userEvent.setup(), navigate = vi.fn();
    render(<Source project={state.currentProject} navigate={navigate} />); await openSource(user);
    expect(await screen.findByRole('button', { name: 'Công việc theo file' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Ghi kết quả' })).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled(); expect(executionApi.record).not.toHaveBeenCalled();
  });

  it('keeps ungrouped source execution writable', async () => {
    executionApi.runs.mockResolvedValue({ ...empty, items: [run], totalItems: 1, totalPages: 1 });
    const user = userEvent.setup(); render(<Source project={state.currentProject} navigate={vi.fn()} />); await openSource(user);
    await screen.findByRole('dialog', { name: 'Thực thi TC-1' });
    await user.selectOptions(screen.getByLabelText('Kết quả'), 'OK'); await user.click(screen.getByRole('button', { name: 'Ghi kết quả' }));
    await waitFor(() => expect(executionApi.record).toHaveBeenCalledWith(1, 77, expect.objectContaining({ resultCode: 'OK' })));
  });
});

describe('document library contextual links', () => {
  it('keeps filename annotation navigation and separate file-work navigation accessible to a tester', async () => {
    const user = userEvent.setup(), navigate = vi.fn(); render(<TestDocumentsPage navigate={navigate} />);
    await user.click(await screen.findByRole('button', { name: document.fileName }));
    expect(navigate).toHaveBeenLastCalledWith('/tests/documents/9');
    await user.click(screen.getByRole('button', { name: 'Công việc theo file' }));
    expect(navigate).toHaveBeenLastCalledWith('/tests/file-work');
    await user.click(screen.getByRole('button', { name: 'Công việc theo file của Nguồn.xlsx' }));
    expect(navigate).toHaveBeenLastCalledWith('/tests/file-work?documentId=9');
    expect(screen.getByText(/Kết quả tài liệu đã lưu/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Tạo nhóm/ })).not.toBeInTheDocument();
    expect(executionApi.record).not.toHaveBeenCalled();
  });

  it('does not construct a contextual query from an invalid server document ID', async () => {
    testCasesApi.listDocuments.mockResolvedValue({ ...empty, items: [{ ...document, id: '9/extra' }], totalItems: 1, totalPages: 1 });
    render(<TestDocumentsPage navigate={vi.fn()} />); await screen.findByRole('button', { name: document.fileName });
    expect(screen.queryByRole('button', { name: 'Công việc theo file của Nguồn.xlsx' })).not.toBeInTheDocument();
  });

  it('discards an old contextual document link on project change', async () => {
    let finish; testCasesApi.listDocuments.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const navigate = vi.fn(), view = render(<TestDocumentsPage navigate={navigate} />);
    state.currentProject = { id: 2, name: 'Dự án B', projectRole: 'TESTER' };
    testCasesApi.listDocuments.mockResolvedValue({ ...empty, items: [{ ...document, id: 19, fileName: 'Mới.xlsx' }], totalItems: 1, totalPages: 1 });
    view.rerender(<TestDocumentsPage navigate={navigate} />); await screen.findByRole('button', { name: 'Mới.xlsx' });
    await act(async () => finish({ ...empty, items: [document], totalItems: 1, totalPages: 1 }));
    expect(screen.queryByRole('button', { name: 'Công việc theo file của Nguồn.xlsx' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Công việc theo file của Mới.xlsx' }));
    expect(navigate).toHaveBeenCalledWith('/tests/file-work?documentId=19');
  });
});
