import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDocumentExecution, DocumentExecutionControls } from './DocumentExecution';
import { CaseHistoryDialog } from './CaseHistoryDialog';
import { executionApi } from '../../services/api/execution';
import { projectsApi } from '../../services/api/projects';
import { testCasesApi } from '../../services/api/testCases';
const auth=vi.hoisted(()=>({user:{id:'tester'}}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>auth}));
vi.mock('../../services/api/execution',()=>({executionApi:{cycles:vi.fn(),cycle:vi.fn(),configurations:vi.fn(),runs:vi.fn(),attempts:vi.fn(),record:vi.fn(),run:vi.fn(),decideScope:vi.fn()}}));
vi.mock('../../services/api/projects',()=>({projectsApi:{listCatalog:vi.fn()}}));
vi.mock('../../services/api/testCases',()=>({testCasesApi:{getCase:vi.fn(),getRevision:vi.fn()}}));
const project={id:1,name:'Test',projectRole:'TESTER',timezone:'Asia/Ho_Chi_Minh'};
const row={caseId:21,sourceId:'1'};
const run={id:77,testCaseId:21,caseNo:'TC-1',configurationId:2,defaultBuildId:3,version:0,revisionNo:1,resultCode:'NOT_RUN',assigneeUserId:'tester',assigneeName:'Tester',titleVi:'Đăng nhập',stepsVi:'Mở ứng dụng',expectedVi:'Thành công'};
function Harness(){const e=useDocumentExecution(project,9);return <><button onClick={()=>e.show(row)}>Ô iPad</button><span data-testid="live-result">{e.byCase.get('21')?.resultCode || 'SOURCE'}</span><DocumentExecutionControls execution={e} project={project} navigate={vi.fn()}/></>;}
beforeEach(()=>{
  vi.resetAllMocks();sessionStorage.clear();auth.user={id:'tester'};
  executionApi.cycles.mockResolvedValue({items:[{id:8,name:'Regression',statusCode:'ACTIVE'}],totalPages:1});
  executionApi.cycle.mockResolvedValue({id:8,name:'Regression',statusCode:'ACTIVE'});
  executionApi.configurations.mockResolvedValue([{id:2,environmentName:'QA',deviceName:'iPad',versionLabel:'1.0'}]);
  executionApi.runs.mockResolvedValue({items:[run],totalPages:1});
  executionApi.attempts.mockResolvedValue({items:[],totalItems:0,totalPages:0,page:0});
  projectsApi.listCatalog.mockResolvedValue([{id:3,platform:'iOS',versionLabel:'1.0'}]);
});
async function openRun(user){await user.click(screen.getByRole('button',{name:'Ô iPad'}));await user.selectOptions(await screen.findByRole('combobox',{name:'Đợt ghi kết quả'}),'8');await screen.findByRole('dialog',{name:'Thực thi TC-1'});}
it('opens a focused dialog immediately when a source result has no execution context',async()=>{
  const user=userEvent.setup();render(<Harness/>);await user.click(screen.getByRole('button',{name:'Ô iPad'}));
  const dialog=await screen.findByRole('dialog',{name:'Ghi kết quả test case 1'});
  expect(dialog).toContainElement(document.activeElement);
  expect(dialog).toHaveTextContent('Chọn đợt và cấu hình');
  await user.keyboard('{Escape}');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.selectOptions(screen.getByRole('combobox',{name:'Đợt ghi kết quả'}),'8');
  await waitFor(()=>expect(screen.getByTestId('live-result')).toHaveTextContent('NOT_RUN'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('keeps a missing-scope explanation in the dialog and opens the run after choosing another cycle',async()=>{
  executionApi.cycles.mockResolvedValue({items:[{id:8,name:'Wrong',statusCode:'ACTIVE'},{id:9,name:'Right',statusCode:'ACTIVE'}],totalPages:1});
  executionApi.cycle.mockImplementation((p,id)=>Promise.resolve({id:Number(id),statusCode:'ACTIVE'}));
  executionApi.runs.mockImplementation((p,id)=>Promise.resolve({items:String(id)==='9'?[run]:[],totalPages:1}));
  const user=userEvent.setup();render(<Harness/>);await user.click(screen.getByRole('button',{name:'Ô iPad'}));
  await user.selectOptions(await screen.findByRole('combobox',{name:'Đợt ghi kết quả'}),'8');
  expect(await screen.findByRole('dialog',{name:'Ghi kết quả test case 1'})).toHaveTextContent('Chọn đợt');
  await screen.findByText(/chưa thuộc cấu hình này/);
  await user.selectOptions(screen.getByRole('combobox',{name:'Đợt ghi kết quả'}),'9');
  expect(await screen.findByRole('dialog',{name:'Thực thi TC-1'})).toBeVisible();
  await user.click(screen.getByRole('button',{name:'Đóng'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('records an actual attempt and reloads the result/history, keeping the selected context after remount',async()=>{
  const user=userEvent.setup();const view=render(<Harness/>);await openRun(user);
  await user.selectOptions(screen.getByLabelText('Kết quả'),'OK');
  executionApi.record.mockResolvedValue({id:99,attemptNo:1,resultCode:'OK'});
  executionApi.runs.mockResolvedValue({items:[{...run,version:1,resultCode:'OK'}],totalPages:1});
  executionApi.attempts.mockResolvedValue({items:[{id:99,attemptNo:1,resultCode:'OK',executorName:'Tester',executedAt:'2026-10-03T12:00:00Z',contextSnapshot:{}}],totalItems:1,totalPages:1,page:0});
  await user.click(screen.getByRole('button',{name:'Ghi kết quả'}));
  await waitFor(()=>expect(executionApi.record).toHaveBeenCalledWith(1,77,expect.objectContaining({resultCode:'OK',buildId:3,expectedVersion:0})));
  expect(await screen.findByText('Đã lưu lần chạy #1.')).toBeVisible();
  await waitFor(()=>expect(screen.getByTestId('live-result')).toHaveTextContent('OK'));
  expect(await screen.findByText('Lần #1')).toBeVisible();
  view.unmount();render(<Harness/>);await waitFor(()=>expect(screen.getByTestId('live-result')).toHaveTextContent('OK'));
});
it('loads subsequent run pages and does not allow another tester to record',async()=>{
  executionApi.runs.mockImplementation((p,id,options)=>Promise.resolve(options?.page===1?{items:[run],totalPages:2}:{items:[],totalPages:2}));
  auth.user={id:'different'};const user=userEvent.setup();render(<Harness/>);await openRun(user);
  expect(executionApi.runs).toHaveBeenCalledWith(1,'8',{page:1});
  expect(screen.queryByRole('button',{name:'Ghi kết quả'})).not.toBeInTheDocument();
  expect(screen.getByText(/Chỉ người được phân công/)).toBeVisible();
});
it('does not fabricate a run for imported draft cases',async()=>{
  executionApi.runs.mockResolvedValue({items:[],totalPages:0});
  const user=userEvent.setup();render(<Harness/>);await user.click(screen.getByRole('button',{name:'Ô iPad'}));
  await user.selectOptions(await screen.findByRole('combobox',{name:'Đợt ghi kết quả'}),'8');
  expect(await screen.findByText(/chưa thuộc cấu hình này/)).toBeVisible();expect(executionApi.record).not.toHaveBeenCalled();
});
it('keeps source mode when no cycle exists and reports load failure',async()=>{
  executionApi.cycles.mockRejectedValue(new Error('Không tải được đợt'));
  const user=userEvent.setup();render(<Harness/>);await user.click(screen.getByRole('button',{name:'Ô iPad'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được đợt');expect(screen.getByTestId('live-result')).toHaveTextContent('SOURCE');
});
it('does not use a late result from a previous cycle',async()=>{
  let finish;executionApi.cycle.mockImplementation(()=>new Promise(resolve=>finish=resolve));
  const user=userEvent.setup();render(<Harness/>);await user.click(screen.getByRole('button',{name:'Ô iPad'}));
  await user.selectOptions(await screen.findByRole('combobox',{name:'Đợt ghi kết quả'}),'8');
  await user.selectOptions(screen.getByRole('combobox',{name:'Đợt ghi kết quả'}),'');
  await act(async()=>finish({id:8,name:'Old',statusCode:'ACTIVE'}));
  expect(screen.getByTestId('live-result')).toHaveTextContent('SOURCE');expect(screen.queryByRole('dialog',{name:'Thực thi TC-1'})).not.toBeInTheDocument();
});
it('keeps the existing result when saving is rejected and allows closing the dialog',async()=>{
  const user=userEvent.setup();render(<Harness/>);await openRun(user);
  executionApi.record.mockRejectedValue(new Error('Lượt chạy đã thay đổi'));
  await user.selectOptions(screen.getByLabelText('Kết quả'),'OK');await user.click(screen.getByRole('button',{name:'Ghi kết quả'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Lượt chạy đã thay đổi');expect(screen.getByTestId('live-result')).toHaveTextContent('NOT_RUN');
  await user.click(screen.getByRole('button',{name:'Đóng'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('retries failed context loading and requires explicit selection for multiple configurations',async()=>{
  executionApi.cycle.mockRejectedValueOnce(new Error('Đợt tạm thời không tải được')).mockResolvedValue({id:8,name:'Regression',statusCode:'CLOSED'});
  executionApi.configurations.mockResolvedValue([{id:2,environmentName:'QA',deviceName:'iPad'},{id:3,environmentName:'QA',deviceName:'Android'}]);
  const user=userEvent.setup();render(<Harness/>);await user.click(screen.getByRole('button',{name:'Ô iPad'}));await user.selectOptions(await screen.findByRole('combobox',{name:'Đợt ghi kết quả'}),'8');
  expect(await screen.findByRole('alert')).toHaveTextContent('Đợt tạm thời không tải được');await user.click(screen.getByRole('button',{name:'Tải lại kết quả'}));
  await user.selectOptions(await screen.findByRole('combobox',{name:'Cấu hình ghi kết quả'}),'2');await screen.findByRole('dialog');
  expect(screen.queryByRole('button',{name:'Ghi kết quả'})).not.toBeInTheDocument();
});
it('shows history failures and retries against the API',async()=>{
  testCasesApi.getCase.mockRejectedValueOnce(new Error('Không tải được lịch sử')).mockResolvedValue({currentRevisionId:2,revisions:[{id:2,revisionNo:2},{id:1,revisionNo:1}]});
  testCasesApi.getRevision.mockResolvedValue({revisionNo:2,titleVi:'Không đổi'});
  const user=userEvent.setup();render(<CaseHistoryDialog projectId={1} row={row} onClose={vi.fn()} onExecution={vi.fn()}/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được lịch sử');await user.click(screen.getByRole('button',{name:'Thử lại'}));
  expect(await screen.findByText('Không có thay đổi nội dung giữa hai phiên bản.')).toBeVisible();
});
it('shows revision changes from the server with previous and current values',async()=>{
  testCasesApi.getCase.mockResolvedValue({currentRevisionId:2,revisions:[{id:2,revisionNo:2},{id:1,revisionNo:1}]});
  testCasesApi.getRevision.mockImplementation((p,c,id)=>Promise.resolve({id,revisionNo:Number(id),createdBy:7,createdAt:'2026-10-03T12:00:00Z',titleVi:Number(id)===2?'Tiêu đề mới':'Tiêu đề cũ',stepsVi:'Giữ nguyên'}));
  const user=userEvent.setup(),close=vi.fn();render(<CaseHistoryDialog projectId={1} row={row} onClose={close} onExecution={vi.fn()}/>);
  expect(await screen.findByText('Tiêu đề cũ')).toBeVisible();expect(screen.getByText('Tiêu đề mới')).toBeVisible();
  expect(screen.queryByText('Giữ nguyên')).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Phiên bản lịch sử'),'1');
  expect(await screen.findByText('Phiên bản đầu tiên được lưu trong hệ thống.')).toBeVisible();
  await user.keyboard('{Escape}');expect(close).toHaveBeenCalled();
});
