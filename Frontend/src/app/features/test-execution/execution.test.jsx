import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttemptDialog } from './AttemptDialog';
import { TestCyclesPage } from './TestCyclesPage';
import { ScopeSetup } from './ScopeSetup';
import { ExecutionRunnerPage } from './ExecutionRunnerPage';
import { executionApi } from '../../services/api/execution';
import { testCasesApi } from '../../services/api/testCases';
import { projectsApi } from '../../services/api/projects';

const ctx=vi.hoisted(()=>({currentProject:{id:1,name:'Dự án A',projectRole:'PM'}}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>ctx}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({user:{id:'tester'},hasRole:()=>false})}));
vi.mock('../../services/api/execution',()=>({executionApi:{cycles:vi.fn(),create:vi.fn(),attempts:vi.fn(),record:vi.fn(),run:vi.fn(),scope:vi.fn(),configure:vi.fn(),cycle:vi.fn(),configurations:vi.fn(),runs:vi.fn(),assignments:vi.fn(),assign:vi.fn(),activate:vi.fn()}}));
vi.mock('../../services/api/testCases',()=>({testCasesApi:{listCases:vi.fn()}}));
vi.mock('../../services/api/projects',()=>({projectsApi:{listMembers:vi.fn(),listCatalog:vi.fn()}}));
const run={id:9,caseNo:'TC-01',titleVi:'Đăng nhập',revisionNo:1,revisionId:12,version:0,assigneeUserId:'tester',assigneeName:'Tester',defaultBuildId:3,environmentName:'QA',deviceName:'Web',stepsVi:'Nhập tài khoản',expectedVi:'Mở trang chủ'};
const builds=[{id:3,versionLabel:'1.0',buildNumber:'1',platform:'WEB'}];
const empty={items:[],page:0,totalItems:0,totalPages:0};
beforeEach(()=>{vi.resetAllMocks();ctx.currentProject={id:1,name:'Dự án A',projectRole:'PM'};executionApi.attempts.mockResolvedValue(empty);executionApi.cycles.mockResolvedValue(empty);testCasesApi.listCases.mockResolvedValue(empty);});
function dialog(extra={}) { const saved=vi.fn();render(<AttemptDialog projectId={1} run={run} builds={builds} active currentUserId="tester" onClose={vi.fn()} onSaved={saved} {...extra}/>);return saved; }

describe('execution results',()=>{
  it('keeps the draft and the same idempotency key when retrying an uncertain network result',async()=>{
    const saved=dialog(),user=userEvent.setup();
    executionApi.record.mockRejectedValueOnce(new Error('Mất kết nối')).mockResolvedValueOnce({id:41,attemptNo:1,resultCode:'NG'});
    await user.type(screen.getByLabelText('Kết quả thực tế'),'Trang trắng');
    await user.click(screen.getByRole('button',{name:'Ghi kết quả'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');expect(saved).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Kết quả thực tế')).toHaveValue('Trang trắng');
    await user.click(screen.getByRole('button',{name:'Ghi kết quả'}));
    expect(await screen.findByRole('status')).toHaveTextContent('Đã lưu lần chạy #1');
    expect(executionApi.record.mock.calls[0][2]).toEqual(executionApi.record.mock.calls[1][2]);
    expect(saved).toHaveBeenCalledOnce();
  });
  it('requires explicit refresh and confirmation after 409 without discarding the draft',async()=>{
    dialog();const user=userEvent.setup();
    executionApi.record.mockRejectedValueOnce(Object.assign(new Error('Phiên bản đã đổi'),{status:409})).mockResolvedValueOnce({id:43,attemptNo:3,resultCode:'NG'});
    executionApi.run.mockResolvedValue({...run,version:2});
    await user.type(screen.getByLabelText('Kết quả thực tế'),'Chưa tải được');await user.click(screen.getByRole('button',{name:'Ghi kết quả'}));
    expect(await screen.findByRole('button',{name:'Ghi kết quả'})).toBeDisabled();
    await user.click(screen.getByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'}));
    await waitFor(()=>expect(screen.getByRole('button',{name:'Ghi kết quả'})).toBeEnabled());
    expect(screen.getByLabelText('Kết quả thực tế')).toHaveValue('Chưa tải được');expect(executionApi.record).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button',{name:'Ghi kết quả'}));
    await waitFor(()=>expect(executionApi.record).toHaveBeenCalledTimes(2));
    expect(executionApi.record.mock.calls[1][2]).toMatchObject({expectedVersion:2,actualResult:'Chưa tải được'});
  });
  it('does not offer write controls to someone else and has no Fix or NA verdict',async()=>{
    dialog({currentUserId:'another'});
    expect(screen.queryByRole('button',{name:'Ghi kết quả'})).not.toBeInTheDocument();
    expect(screen.getByText(/Chỉ người được phân công/)).toBeVisible();
    expect(executionApi.record).not.toHaveBeenCalled();
  });
  it('renders the historical snapshot rather than relabeling old execution from current catalog',async()=>{
    executionApi.attempts.mockResolvedValue({...empty,totalItems:1,totalPages:1,items:[{id:1,attemptNo:1,resultCode:'NG',executedAt:'2026-09-28T12:00:00Z',actualResult:'Lỗi cũ',contextSnapshot:JSON.stringify({build:{versionLabel:'0.9',platform:'WEB'},executor:{displayName:'Tester trước'},device:{name:'Thiết bị trước'}})}]});
    dialog();expect(await screen.findByText('Lỗi cũ')).toBeVisible();expect(screen.getByText(/Tester trước.*0.9.*Thiết bị trước/)).toBeVisible();
    expect(screen.queryByRole('option',{name:/Fix/})).not.toBeInTheDocument();
  });
});

describe('runner assignment', () => {
  beforeEach(() => {
    executionApi.cycle.mockResolvedValue({ id: 5, name: 'Đợt kiểm thử', code: 'CYCLE-1', statusCode: 'ACTIVE', runCount: 2 });
    executionApi.configurations.mockResolvedValue([]);
    executionApi.runs.mockResolvedValue({ ...empty, totalItems: 2, totalPages: 1, items: [
      { ...run, assigneeMembershipId: 8 }, { ...run, id: 10, caseNo: 'TC-02', assigneeMembershipId: 8 },
    ] });
    projectsApi.listMembers.mockResolvedValue([
      { membershipId: 8, displayName: 'Tester hiện tại', projectRole: 'TESTER', active: true },
      { membershipId: 11, displayName: 'Tester tiếp theo', projectRole: 'TESTER', active: true },
    ]);
    projectsApi.listCatalog.mockResolvedValue([]);
    executionApi.assignments.mockResolvedValue([]);
  });

  async function openFirst() {
    render(<ExecutionRunnerPage cycleId={5} navigate={vi.fn()} />);
    await userEvent.click((await screen.findAllByRole('button', { name: 'Phân công', exact: true }))[0]);
    return within(screen.getByRole('dialog', { name: 'Phân công lượt kiểm thử' }));
  }

  it('keeps a single history control after repeated refreshes and closing a cycle', async () => {
    render(<ExecutionRunnerPage cycleId={5} navigate={vi.fn()} />);
    await screen.findByRole('button', { name: 'Chốt đợt kiểm thử' });
    for (let index=0;index<5;index++) {
      await userEvent.click(screen.getByRole('button', { name: 'Tải lại', exact: true }));
      await waitFor(()=>expect(screen.queryByRole('status')).not.toBeInTheDocument());
      expect(screen.getAllByRole('button', { name: 'Lịch sử chốt / mở đợt' })).toHaveLength(1);
    }
    executionApi.cycle.mockResolvedValue({ id:5,name:'Đợt đã chốt',statusCode:'CLOSED',runCount:2 });
    await userEvent.click(screen.getByRole('button', { name: 'Tải lại', exact: true }));
    await screen.findByRole('button', { name:'Mở lại đợt' });
    expect(screen.getAllByRole('button', { name: 'Lịch sử chốt / mở đợt' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name:'Đánh dấu NA' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name:'Phân công',exact:true })).not.toBeInTheDocument();
  });

  it('does not duplicate cycle history when saving a run whose id matches the refresh counter', async () => {
    projectsApi.listCatalog.mockImplementation((_p,kind)=>Promise.resolve(kind==='builds'?builds:[]));
    executionApi.runs.mockResolvedValue({...empty,totalItems:1,totalPages:1,items:[{...run,id:1}]});
    executionApi.record.mockResolvedValue({id:10,attemptNo:1,resultCode:'NG'});
    render(<ExecutionRunnerPage cycleId={5} navigate={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button',{name:'Ghi kết quả',exact:true}));
    const dialog=within(screen.getByRole('dialog',{name:'Thực thi TC-01'}));
    await userEvent.type(dialog.getByLabelText('Kết quả thực tế'),'Kiểm tra cập nhật dữ liệu');
    await userEvent.click(dialog.getByRole('button',{name:'Ghi kết quả',exact:true}));
    await waitFor(()=>expect(executionApi.record).toHaveBeenCalledOnce());
    await userEvent.click(dialog.getByRole('button',{name:'Đóng',exact:true}));
    expect(screen.getAllByRole('button',{name:'Lịch sử chốt / mở đợt'})).toHaveLength(1);
  });

  it('requires confirmation to activate a prepared cycle and supports retry after rejection', async () => {
    const user = userEvent.setup();
    executionApi.cycle.mockResolvedValue({ id: 5, code: 'DRAFT', name: 'Bản chuẩn bị', version: 2, statusCode: 'DRAFT', runCount: 2 });
    executionApi.activate.mockRejectedValueOnce(new Error('Case không còn được phép chạy')).mockResolvedValueOnce({});
    render(<ExecutionRunnerPage cycleId={5} navigate={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Bắt đầu đợt kiểm thử' }));
    expect(executionApi.activate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Hủy', exact: true }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bắt đầu đợt kiểm thử' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận bắt đầu' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Case không còn được phép chạy');
    executionApi.cycle.mockResolvedValue({ id: 5, code: 'DRAFT', name: 'Bản chuẩn bị', version: 3, statusCode: 'ACTIVE', runCount: 2 });
    await user.click(screen.getByRole('button', { name: 'Xác nhận bắt đầu' }));
    expect(await screen.findByText(/Đang thực hiện · Phạm vi đã khóa/)).toBeVisible();
    expect(executionApi.activate).toHaveBeenLastCalledWith(1, 5, 2);
  });

  it('filters assigned and pending runs and opens a read-only history for another tester', async () => {
    ctx.currentProject.projectRole = 'TESTER';
    executionApi.runs.mockResolvedValue({ ...empty, totalItems: 1, totalPages: 1, items: [{ ...run, assigneeUserId: 'other' }] });
    const navigate = vi.fn(), user = userEvent.setup();
    render(<ExecutionRunnerPage cycleId={5} navigate={navigate} />);
    await user.click(await screen.findByRole('checkbox', { name: 'Được giao cho tôi' }));
    await user.click(screen.getByRole('checkbox', { name: 'NG chờ liên kết bug' }));
    await waitFor(() => expect(executionApi.runs).toHaveBeenLastCalledWith(1, 5, { page: 0, mine: true, pendingBug: true }));
    await user.click(screen.getByRole('button', { name: 'Chi tiết / lịch sử' }));
    expect(screen.getByText(/Chỉ người được phân công/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Phân công', exact: true })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Đóng', exact: true }));
    await user.click(screen.getByRole('button', { name: 'Danh sách đợt' }));
    expect(navigate).toHaveBeenCalledWith('/tests/cycles');
  });

  it('reports runner load failures and recovers without prototype rows', async () => {
    executionApi.cycle.mockRejectedValueOnce(new Error('Không tìm thấy đợt')).mockResolvedValueOnce({ id: 5, name: 'Đợt thật', statusCode: 'ACTIVE' });
    executionApi.runs.mockResolvedValue(empty);
    render(<ExecutionRunnerPage cycleId={5} navigate={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy đợt');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Chưa có lượt kiểm thử phù hợp.')).toBeVisible();
  });

  it('refreshes a conflicting assignment explicitly, preserves input, and saves only after reconfirmation', async () => {
    const dialog = await openFirst(), user = userEvent.setup();
    executionApi.assign.mockRejectedValueOnce(Object.assign(new Error('Phân công đã thay đổi'), { status: 409 })).mockResolvedValueOnce({});
    executionApi.run.mockResolvedValue({ ...run, version: 2, assigneeMembershipId: 8 });
    await user.selectOptions(dialog.getByLabelText('Người thực hiện'), '11');
    await user.type(dialog.getByLabelText('Lý do phân công'), 'Chuyển cho ca chiều');
    await user.click(dialog.getByRole('button', { name: 'Lưu phân công' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('Phân công đã thay đổi');
    expect(dialog.getByRole('button', { name: 'Lưu phân công' })).toBeDisabled();
    await user.click(dialog.getByRole('button', { name: 'Tải bản hiện hành, giữ bản nháp' }));
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Lưu phân công' })).toBeEnabled());
    expect(dialog.getByLabelText('Lý do phân công')).toHaveValue('Chuyển cho ca chiều');
    expect(dialog.getByLabelText('Người thực hiện')).toHaveValue('11');
    expect(executionApi.assign).toHaveBeenCalledTimes(1);
    await user.click(dialog.getByRole('button', { name: 'Lưu phân công' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(executionApi.assign).toHaveBeenLastCalledWith(1, 9, {
      assigneeMembershipId: 11, reason: 'Chuyển cho ca chiều', expectedVersion: 2,
    });
  });

  it('ignores assignment history arriving after a different run has been opened', async () => {
    let resolveOld;
    executionApi.assignments.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValueOnce([{ id: 2, assigneeName: 'Tester B', reason: 'Lịch sử TC-02' }]);
    const dialog = await openFirst(), user = userEvent.setup();
    await user.click(dialog.getByRole('button', { name: 'Đóng' }));
    await user.click(screen.getAllByRole('button', { name: 'Phân công', exact: true })[1]);
    expect(await screen.findByText(/Lịch sử TC-02/)).toBeVisible();
    await act(async () => resolveOld([{ id: 1, assigneeName: 'Tester A', reason: 'Lịch sử TC-01' }]));
    expect(screen.queryByText(/Lịch sử TC-01/)).not.toBeInTheDocument();
    expect(screen.getByText(/Lịch sử TC-02/)).toBeVisible();
  });

  it('keeps saving disabled when refreshing a conflict fails and allows retrying the refresh', async () => {
    const dialog = await openFirst(), user = userEvent.setup();
    executionApi.assign.mockRejectedValueOnce(Object.assign(new Error('Bản cũ'), { status: 409 }));
    executionApi.run.mockRejectedValueOnce(new Error('Mất kết nối khi tải lại')).mockResolvedValueOnce({ ...run, version: 3 });
    await user.type(dialog.getByLabelText('Lý do phân công'), 'Đổi ca');
    await user.click(dialog.getByRole('button', { name: 'Lưu phân công' }));
    await user.click(await dialog.findByRole('button', { name: 'Tải bản hiện hành, giữ bản nháp' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('Mất kết nối khi tải lại');
    expect(dialog.getByRole('button', { name: 'Lưu phân công' })).toBeDisabled();
    expect(dialog.getByLabelText('Lý do phân công')).toHaveValue('Đổi ca');
    await user.click(dialog.getByRole('button', { name: 'Tải bản hiện hành, giữ bản nháp' }));
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Lưu phân công' })).toBeEnabled());
    expect(executionApi.assign).toHaveBeenCalledTimes(1);
  });

  it('retries failed history loading inside the dialog without losing the assignment draft', async () => {
    executionApi.assignments.mockRejectedValueOnce(new Error('Không tải được lịch sử')).mockResolvedValueOnce([]);
    const dialog = await openFirst(), user = userEvent.setup();
    expect(await dialog.findByRole('alert')).toHaveTextContent('Không tải được lịch sử');
    await user.type(dialog.getByLabelText('Lý do phân công'), 'Bổ sung người kiểm thử');
    await user.click(dialog.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(dialog.queryByRole('alert')).not.toBeInTheDocument());
    expect(dialog.getByLabelText('Lý do phân công')).toHaveValue('Bổ sung người kiểm thử');
    expect(executionApi.assignments).toHaveBeenCalledTimes(2);
  });
});

describe('cycle scope and loading',()=>{
  it('creates a draft only after server success and preserves the form after rejection', async () => {
    const navigate = vi.fn(), user = userEvent.setup();
    executionApi.create.mockRejectedValueOnce(new Error('Mã đợt đã tồn tại')).mockResolvedValueOnce({ id: 42 });
    render(<TestCyclesPage navigate={navigate} />);
    await user.click(screen.getByRole('button', { name: /Tạo đợt kiểm thử/ }));
    await user.type(screen.getByLabelText('Mã đợt'), 'REGRESSION');
    await user.type(screen.getByLabelText('Tên đợt'), 'Kiểm thử hồi quy');
    await user.click(screen.getByRole('button', { name: 'Tạo bản nháp' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mã đợt đã tồn tại');
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Tên đợt')).toHaveValue('Kiểm thử hồi quy');
    await user.clear(screen.getByLabelText('Mã đợt')); await user.type(screen.getByLabelText('Mã đợt'), 'REGRESSION-2');
    await user.click(screen.getByRole('button', { name: 'Tạo bản nháp' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/tests/cycles/42'));
  });
  it('can cancel creating a cycle and page through existing cycles', async () => {
    const user = userEvent.setup(), navigate = vi.fn();
    executionApi.cycles.mockResolvedValueOnce({ ...empty, totalItems: 2, totalPages: 2, items: [{ id: 1, code: 'A', name: 'Đợt đầu', statusCode: 'ACTIVE', runCount: 1 }] })
      .mockResolvedValueOnce({ ...empty, page: 1, totalItems: 2, totalPages: 2, items: [{ id: 2, code: 'B', name: 'Đợt sau', statusCode: 'DRAFT', runCount: 0 }] });
    render(<TestCyclesPage navigate={navigate} />);
    await screen.findByText('Đợt đầu');
    await user.click(screen.getByRole('button', { name: /Tạo đợt kiểm thử/ }));
    await user.click(screen.getByRole('button', { name: 'Hủy', exact: true }));
    expect(screen.queryByLabelText('Mã đợt')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tiếp', exact: true }));
    expect(await screen.findByText('Đợt sau')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'B', exact: true }));
    expect(navigate).toHaveBeenCalledWith('/tests/cycles/2');
  });
  it('does not request cycles without a selected project', () => {
    ctx.currentProject = null;
    render(<TestCyclesPage navigate={vi.fn()} />);
    expect(screen.getByText('Chọn dự án để xem các đợt kiểm thử.')).toBeVisible();
    expect(executionApi.cycles).not.toHaveBeenCalled();
  });
  it('loads case choices again after a failed request and clears the obsolete error', async () => {
    testCasesApi.listCases.mockRejectedValueOnce(new Error('Không tải được case')).mockResolvedValueOnce(empty);
    render(<ScopeSetup projectId={1} cycle={{ id: 5, version: 1 }} configs={[]} catalogs={{ builds: [], devices: [], environments: [] }} members={[]} onSaved={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được case');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText(/Chưa có test case/)).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('keeps configuration selections on failure and retries using the current cycle version', async () => {
    const saved = vi.fn(), user = userEvent.setup();
    executionApi.configure.mockRejectedValueOnce(new Error('Mất kết nối')).mockResolvedValueOnce({ version: 2 });
    render(<ScopeSetup projectId={1} cycle={{ id: 5, version: 1 }} configs={[]} catalogs={{ builds, environments: [{ id: 4, name: 'QA', active: true }], devices: [{ id: 6, name: 'Web', active: true }] }} members={[]} onSaved={saved} />);
    await user.selectOptions(screen.getByLabelText('Môi trường'), '4');
    await user.selectOptions(screen.getByLabelText('Thiết bị'), '6');
    await user.selectOptions(screen.getByLabelText('Build mặc định'), '3');
    await user.click(screen.getByRole('button', { name: 'Thêm cấu hình' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');
    expect(saved).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Môi trường')).toHaveValue('4');
    await user.click(screen.getByRole('button', { name: 'Thêm cấu hình' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(executionApi.configure).toHaveBeenLastCalledWith(1, 5, { environmentId: 4, deviceId: 6, buildId: 3, expectedVersion: 1 });
  });
  it('disables draft revisions and sends only the approved revision selected with the version',async()=>{
    testCasesApi.listCases.mockResolvedValue({...empty,totalItems:2,totalPages:1,items:[{id:1,caseNo:'A',currentRevisionId:10,titleVi:'Đã duyệt',approved:true},{id:2,caseNo:'B',currentRevisionId:11,titleVi:'Nháp',approved:false}]});
    const saved=vi.fn(),user=userEvent.setup();executionApi.scope.mockResolvedValue({version:2});
    render(<ScopeSetup projectId={1} cycle={{id:5,version:1}} configs={[{id:7,environmentName:'QA',deviceName:'Web'}]} catalogs={{builds:[],devices:[],environments:[]}} members={[{id:8,displayName:'Tester',projectRole:'TESTER',active:true}]} onSaved={saved}/>);
    expect(await screen.findByLabelText('Chọn B')).toBeDisabled();
    await user.click(screen.getByLabelText('Chọn A'));await user.selectOptions(screen.getByLabelText('Cấu hình chạy'),'7');await user.selectOptions(screen.getByLabelText('Người thực hiện'),'8');
    await user.click(screen.getByRole('button',{name:'Thêm case vào phạm vi'}));
    await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
    expect(executionApi.scope).toHaveBeenCalledWith(1,5,{configurationId:7,revisionIds:[10],assigneeMembershipId:8,expectedVersion:1});
  });
  it('shows permission failures with retry and no prototype data',async()=>{
    executionApi.cycles.mockRejectedValueOnce(new Error('Không có quyền')).mockResolvedValueOnce(empty);
    render(<TestCyclesPage navigate={vi.fn()}/>);const user=userEvent.setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không có quyền');await user.click(screen.getByRole('button',{name:'Thử lại'}));
    expect(await screen.findByText('Chưa có đợt kiểm thử trong dự án.')).toBeVisible();
  });
  it('ignores a late response from a previous project',async()=>{
    let resolve;executionApi.cycles.mockReturnValueOnce(new Promise(r=>{resolve=r;})).mockResolvedValueOnce({...empty,items:[{id:2,code:'NEW',name:'Dữ liệu B'}]});
    const view=render(<TestCyclesPage navigate={vi.fn()}/>);
    ctx.currentProject={id:2,name:'Dự án B',projectRole:'TESTER'};view.rerender(<TestCyclesPage navigate={vi.fn()}/>);
    expect(await screen.findByText('Dữ liệu B')).toBeVisible();
    await act(async()=>resolve({...empty,items:[{id:1,code:'OLD',name:'Dữ liệu A'}]}));
    expect(screen.queryByText('Dữ liệu A')).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:/Tạo đợt kiểm thử/})).not.toBeInTheDocument();
  });
});
