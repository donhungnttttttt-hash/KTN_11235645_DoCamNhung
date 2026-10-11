import React from 'react';
import {beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {TestDocumentPage} from './TestDocumentPage';
import {DocumentSecondTestDialog} from './DocumentSecondTestDialog';
import {DocumentCellEditor} from './DocumentCellEditor';
import {testCasesApi} from '../../services/api/testCases';
import {executionApi} from '../../services/api/execution';
import {projectsApi} from '../../services/api/projects';
const state=vi.hoisted(()=>({currentProject:{id:1,name:'A',projectRole:'PM'},role:'PM'}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>state}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({hasRole:r=>r===state.role})}));
vi.mock('../../services/api/testCases',()=>({testCasesApi:{getDocument:vi.fn(),editDocumentCell:vi.fn(),documentCellHistory:vi.fn(),assignSecondTest:vi.fn(),approveRevision:vi.fn(),updateDocumentResult:vi.fn()}}));
vi.mock('../../services/api/execution',()=>({executionApi:{cycles:vi.fn(),cycle:vi.fn(),configurations:vi.fn()}}));
vi.mock('../../services/api/projects',()=>({projectsApi:{listMembers:vi.fn()}}));
const row={rowId:4,rowNumber:2,caseId:8,sourceId:'1',revisionId:9,approved:true,cells:['1','Đăng nhập','Điều kiện','Các bước','Kết quả'],sourceCells:['1','Đăng nhập','Điều kiện','Các bước','Kết quả']};
beforeEach(()=>{
 vi.resetAllMocks();state.currentProject={id:1,name:'A',projectRole:'PM'};state.role='PM';sessionStorage.clear();window.location.hash='';
 testCasesApi.getDocument.mockResolvedValue({document:{id:2,fileName:'Test.xlsx',format:'CUSTOMER_V1'},headers:['ID','Đối tượng test','Điều kiện tiên quyết','Các bước test','Kết quả mong đợi'],columns:{sourceId:0,titleVi:1,preconditionsVi:2,stepsVi:3,expectedVi:4},rows:[row],cellVersions:{},secondTests:[]});
 testCasesApi.documentCellHistory.mockResolvedValue([]);testCasesApi.editDocumentCell.mockResolvedValue({saved:true});testCasesApi.assignSecondTest.mockResolvedValue({saved:true});
 testCasesApi.approveRevision.mockResolvedValue({id:9,approved:true});
 executionApi.cycles.mockResolvedValue({items:[{id:10,name:'Kiểm thử lại',code:'R2',statusCode:'DRAFT'}],totalPages:1,page:0});
 executionApi.cycle.mockResolvedValue({id:10,statusCode:'DRAFT',version:3});executionApi.configurations.mockResolvedValue([{id:11,environmentName:'QA',deviceName:'iPad',versionLabel:'2'}]);
 projectsApi.listMembers.mockResolvedValue([{membershipId:12,displayName:'Tester 2',active:true,projectRole:'TESTER',systemRole:'TESTER'},{membershipId:13,displayName:'Dev',active:true,projectRole:'DEV',systemRole:'DEV'}]);
});
it('retries cell history in place without losing the edit draft or submitting it',async()=>{
 testCasesApi.documentCellHistory.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([{actor:'PM',beforeValue:'old',afterValue:'new'}]);
 render(<DocumentCellEditor projectId={1} documentId={2} cell={{row,index:1,label:'Title',value:'Original',maxLength:100,version:0}} onClose={vi.fn()} onSaved={vi.fn()}/>);
 fireEvent.change(screen.getByRole('textbox',{name:'Nội dung'}),{target:{value:'Draft text'}});
 expect(await screen.findByText('Chưa tải được lịch sử ô.')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Thử lại lịch sử ô'}));
 expect(await screen.findByText('new')).toBeVisible();
 expect(screen.getByRole('textbox',{name:'Nội dung'})).toHaveValue('Draft text');
 expect(testCasesApi.documentCellHistory).toHaveBeenCalledTimes(2);
 expect(testCasesApi.editDocumentCell).not.toHaveBeenCalled();
});
it.each([
 ['archived row',{rowArchived:true},/Case đã lưu trữ/],
 ['archived project',{projectArchived:true},/Dự án đã lưu trữ/],
 ['missing document row',{missingRowId:true},/Dòng tài liệu chưa có mã/],
])('explains why a document result is disabled for %s',async(_label,stateOverride,reason)=>{
 const detail=await testCasesApi.getDocument();
 testCasesApi.getDocument.mockResolvedValue({...detail,headers:[...detail.headers,'iPad'],columns:{...detail.columns,result:5},rows:[{...row,rowId:stateOverride.missingRowId?null:row.rowId,archived:!!stateOverride.rowArchived,cells:[...row.cells,'Unexecuted']}]});
 if(stateOverride.projectArchived)state.currentProject={...state.currentProject,archived:true};
 render(<TestDocumentPage documentId={2} navigate={vi.fn()}/>);
 const result=await screen.findByRole('button',{name:'Kết quả test case 1'});
 expect(result).toBeDisabled();expect(result.title).toMatch(reason);
});
it('edits by double click with revision concurrency and keeps the draft when saving fails',async()=>{
 const user=userEvent.setup();render(<TestDocumentPage documentId={2} navigate={vi.fn()}/>);
 await user.dblClick(await screen.findByText('Đăng nhập'));
 const input=screen.getByRole('textbox',{name:'Nội dung'});await user.clear(input);await user.type(input,'Tiêu đề mới');
 testCasesApi.editDocumentCell.mockRejectedValueOnce(new Error('Dữ liệu đã thay đổi'));
 await user.click(screen.getByRole('button',{name:'Lưu nội dung'}));expect(await screen.findByRole('alert')).toHaveTextContent('Dữ liệu đã thay đổi');expect(input).toHaveValue('Tiêu đề mới');
 await user.click(screen.getByRole('button',{name:'Lưu nội dung'}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 expect(testCasesApi.editDocumentCell).toHaveBeenLastCalledWith(1,2,4,1,{value:'Tiêu đề mới',expectedVersion:0,expectedRevisionId:9});
});
it('supports keyboard editing for a global admin without membership',async()=>{
 const {unmount}=render(<TestDocumentPage documentId={2} navigate={vi.fn()}/>);
 const td=(await screen.findByText('Đăng nhập')).closest('td');fireEvent.keyDown(td,{key:'Enter'});expect(screen.getByRole('dialog')).toBeVisible();unmount();
 state.currentProject.projectRole=null;state.role='ADMIN';render(<TestDocumentPage documentId={2} navigate={vi.fn()}/>);
 fireEvent.doubleClick(await screen.findByText('Đăng nhập'));expect(screen.getByRole('dialog')).toBeVisible();expect(screen.getByRole('button',{name:'Giao test lần 2'})).toBeInTheDocument();
});
it('PM selects a real draft cycle, configuration and Tester and saves second-test assignment',async()=>{
 const onSaved=vi.fn(),onClose=vi.fn(),user=userEvent.setup();render(<DocumentSecondTestDialog projectId={1} documentId={2} row={row} onSaved={onSaved} onClose={onClose} navigate={vi.fn()}/>);
 await screen.findByRole('option',{name:'R2 · Kiểm thử lại'});await user.selectOptions(screen.getByLabelText('Đợt kiểm thử'),'10');
 await screen.findByRole('option',{name:'QA / iPad · 2'});await user.selectOptions(screen.getByLabelText('Cấu hình chạy'),'11');await user.selectOptions(screen.getByLabelText('Người test lần 2'),'12');
 expect(screen.queryByRole('option',{name:'Dev'})).not.toBeInTheDocument();await user.type(screen.getByLabelText('Ghi chú 2'),'Sau sửa');await user.click(screen.getByRole('button',{name:'Lưu phân công'}));
 expect(testCasesApi.assignSecondTest).toHaveBeenCalledWith(1,2,4,{cycleId:10,configurationId:11,assigneeMembershipId:12,note:'Sau sửa',expectedVersion:0,expectedCycleVersion:3,expectedRunVersion:null,expectedRevisionId:9});expect(onSaved).toHaveBeenCalledOnce();
});
it('shows persisted assignment/result on the same document and links to the execution cycle',async()=>{
 const detail=await testCasesApi.getDocument();testCasesApi.getDocument.mockResolvedValue({...detail,secondTests:[{rowId:4,assigneeName:'Tester 2',cycleId:10,cycleName:'R2',note:'Sau sửa',resultCode:'OK'}]});
 const navigate=vi.fn();render(<TestDocumentPage documentId={2} navigate={navigate}/>);
 expect(await screen.findByText('Tester 2')).toBeVisible();expect(screen.getByText('Sau sửa')).toBeVisible();
 expect(screen.getByText('Đợt: R2')).toBeVisible();expect(screen.getByText('Kết quả lượt được giao: OK')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Mở lượt kiểm thử'}));expect(navigate).toHaveBeenCalledWith('/tests/cycles/10');
});
it('waits for a pending result save before opening another document mutation',async()=>{
 const detail=await testCasesApi.getDocument();testCasesApi.getDocument.mockResolvedValue({...detail,headers:[...detail.headers,'iPad'],columns:{...detail.columns,result:5},rows:[{...row,cells:[...row.cells,'Unexecuted']} ]});
 let finish;testCasesApi.updateDocumentResult.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 render(<TestDocumentPage documentId={2} navigate={vi.fn()}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Kết quả test case 1'}));await waitFor(()=>expect(testCasesApi.updateDocumentResult).toHaveBeenCalledOnce());
 fireEvent.doubleClick(screen.getByText('Đăng nhập'));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Giao test lần 2'})).toBeDisabled();
 finish({status:'OK',version:1});await waitFor(()=>expect(screen.getByRole('button',{name:'Giao test lần 2'})).toBeEnabled());
 fireEvent.doubleClick(screen.getByText('Đăng nhập'));expect(screen.getByRole('dialog')).toBeVisible();
});
it('lets PM double-click the second-test note to edit the assignment',async()=>{
 const detail=await testCasesApi.getDocument();testCasesApi.getDocument.mockResolvedValue({...detail,secondTests:[{rowId:4,assigneeName:'Tester 2',cycleId:10,configurationId:11,assigneeMembershipId:12,cycleName:'R2',note:'Sau sửa',resultCode:'OK',version:1,runVersion:2}]});
 render(<TestDocumentPage documentId={2} navigate={vi.fn()}/>);
 fireEvent.doubleClick(await screen.findByText('Sau sửa'));expect(screen.getByRole('dialog')).toBeVisible();
 expect(await screen.findByLabelText('Ghi chú 2')).toHaveValue('Sau sửa');
});
it.each(['ADMIN','PM'])('%s can open second-test assignment for an imported draft and approve it there',async role=>{
 state.role=role;state.currentProject.projectRole=role==='ADMIN'?null:'PM';
 const detail=await testCasesApi.getDocument();testCasesApi.getDocument.mockResolvedValue({...detail,rows:[{...row,approved:false}]});
 const user=userEvent.setup();render(<TestDocumentPage documentId={2} navigate={vi.fn()}/>);
 const assign=await screen.findByRole('button',{name:'Giao test lần 2'});expect(assign).toBeEnabled();await user.click(assign);
 expect(screen.getByRole('dialog',{name:'Phân công test lần 2'})).toBeVisible();
 await screen.findByRole('option',{name:'R2 · Kiểm thử lại'});await user.selectOptions(screen.getByLabelText('Đợt kiểm thử'),'10');
 await screen.findByRole('option',{name:'QA / iPad · 2'});await user.selectOptions(screen.getByLabelText('Cấu hình chạy'),'11');await user.selectOptions(screen.getByLabelText('Người test lần 2'),'12');
 expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeDisabled();
 await user.click(screen.getByRole('button',{name:'Duyệt phiên bản này'}));
 expect(testCasesApi.approveRevision).toHaveBeenCalledWith(1,8,9);await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeEnabled());
 await user.click(screen.getByRole('button',{name:'Lưu phân công'}));
 expect(testCasesApi.assignSecondTest).toHaveBeenCalledWith(1,2,4,expect.objectContaining({assigneeMembershipId:12,expectedRevisionId:9}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
it('keeps the selected assignee and note when approval fails, then lets PM retry',async()=>{
 testCasesApi.approveRevision.mockRejectedValueOnce(new Error('Không duyệt được phiên bản'));
 const user=userEvent.setup();render(<DocumentSecondTestDialog projectId={1} documentId={2} row={{...row,approved:false}} onClose={vi.fn()} onSaved={vi.fn()} navigate={vi.fn()}/>);
 await screen.findByRole('option',{name:'Tester 2'});await user.selectOptions(screen.getByLabelText('Người test lần 2'),'12');await user.type(screen.getByLabelText('Ghi chú 2'),'Kiểm tra lại đăng nhập');
 await user.click(screen.getByRole('button',{name:'Duyệt phiên bản này'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Không duyệt được phiên bản');expect(screen.getByLabelText('Người test lần 2')).toHaveValue('12');expect(screen.getByLabelText('Ghi chú 2')).toHaveValue('Kiểm tra lại đăng nhập');
 expect(testCasesApi.assignSecondTest).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'Duyệt phiên bản này'}));expect(await screen.findByText('Đã duyệt phiên bản này.')).toBeVisible();
});
it('keeps a successful approval visible after closing and reopening without assigning',async()=>{
 const detail=await testCasesApi.getDocument();testCasesApi.getDocument.mockResolvedValue({...detail,rows:[{...row,approved:false}]});
 const user=userEvent.setup();render(<TestDocumentPage documentId={2} navigate={vi.fn()}/>);
 await user.click(await screen.findByRole('button',{name:'Giao test lần 2'}));await user.click(screen.getByRole('button',{name:'Duyệt phiên bản này'}));
 await screen.findByText('Đã duyệt phiên bản này.');await user.click(screen.getByRole('button',{name:'Đóng',exact:true}));
 await user.click(screen.getByRole('button',{name:'Giao test lần 2'}));expect(screen.queryByRole('button',{name:'Duyệt phiên bản này'})).not.toBeInTheDocument();
 expect(testCasesApi.assignSecondTest).not.toHaveBeenCalled();
});
it('explains missing draft cycles and Testers instead of presenting a silent blocked action',async()=>{
 executionApi.cycles.mockResolvedValue({items:[],totalPages:1});projectsApi.listMembers.mockResolvedValue([{membershipId:12,displayName:'Đã khóa',enabled:false,active:true,projectRole:'TESTER',systemRole:'TESTER'}]);
 const navigate=vi.fn(),onClose=vi.fn(),user=userEvent.setup();render(<DocumentSecondTestDialog projectId={1} documentId={2} row={row} onClose={onClose} onSaved={vi.fn()} navigate={navigate}/>);
 expect(await screen.findByText(/Chưa có đợt nháp/)).toBeVisible();expect(screen.getByText(/Chưa có Tester đang hoạt động/)).toBeVisible();expect(screen.queryByRole('option',{name:'Đã khóa'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeDisabled();await user.click(screen.getByRole('button',{name:'Mở đợt kiểm thử'}));expect(navigate).toHaveBeenCalledWith('/tests/cycles');expect(onClose).toHaveBeenCalledOnce();
});
it('recovers failed choices and links missing configuration directly to the selected cycle',async()=>{
 executionApi.cycles.mockRejectedValueOnce(new Error('Không tải được lựa chọn'));executionApi.configurations.mockResolvedValue([]);
 const navigate=vi.fn(),user=userEvent.setup();render(<DocumentSecondTestDialog projectId={1} documentId={2} row={row} onClose={vi.fn()} onSaved={vi.fn()} navigate={navigate}/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được lựa chọn');expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeDisabled();
 await user.click(screen.getByRole('button',{name:'Tải lại lựa chọn'}));await screen.findByRole('option',{name:'R2 · Kiểm thử lại'});await user.selectOptions(screen.getByLabelText('Đợt kiểm thử'),'10');
 expect(await screen.findByText(/Đợt này chưa có cấu hình/)).toBeVisible();await user.click(screen.getByRole('button',{name:'Mở đợt kiểm thử'}));expect(navigate).toHaveBeenCalledWith('/tests/cycles/10');
});
it('uses the current closed-cycle state and offers its reopen screen without allowing a write',async()=>{
 executionApi.cycle.mockResolvedValue({id:10,statusCode:'CLOSED',version:4});
 const assignment={cycleId:10,cycleName:'R2',configurationId:11,assigneeMembershipId:12,cycleStatus:'ACTIVE',version:1,runVersion:2};
 const navigate=vi.fn(),user=userEvent.setup();render(<DocumentSecondTestDialog projectId={1} documentId={2} row={row} assignment={assignment} onClose={vi.fn()} onSaved={vi.fn()} navigate={navigate}/>);
 expect(await screen.findByText(/Đợt đã chốt/)).toBeVisible();expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeDisabled();
 await user.click(screen.getByRole('button',{name:'Mở đợt kiểm thử'}));expect(navigate).toHaveBeenCalledWith('/tests/cycles/10');expect(testCasesApi.assignSecondTest).not.toHaveBeenCalled();
});
it('retries a context error and preserves the assignment draft after a failed save',async()=>{
 executionApi.cycle.mockRejectedValueOnce(new Error('Không tải được đợt'));testCasesApi.assignSecondTest.mockRejectedValueOnce(new Error('Phân công đã thay đổi'));
 const onSaved=vi.fn(),onClose=vi.fn(),user=userEvent.setup();render(<DocumentSecondTestDialog projectId={1} documentId={2} row={row} onClose={onClose} onSaved={onSaved} navigate={vi.fn()}/>);
 await screen.findByRole('option',{name:'R2 · Kiểm thử lại'});await user.selectOptions(screen.getByLabelText('Đợt kiểm thử'),'10');expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được đợt');
 expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeDisabled();await user.click(screen.getByRole('button',{name:'Tải lại lựa chọn'}));
 await screen.findByRole('option',{name:'QA / iPad · 2'});await user.selectOptions(screen.getByLabelText('Cấu hình chạy'),'11');await user.selectOptions(screen.getByLabelText('Người test lần 2'),'12');await user.type(screen.getByLabelText('Ghi chú 2'),'Giữ ghi chú');
 await user.click(screen.getByRole('button',{name:'Lưu phân công'}));expect(await screen.findByRole('alert')).toHaveTextContent('Phân công đã thay đổi');expect(screen.getByLabelText('Ghi chú 2')).toHaveValue('Giữ ghi chú');expect(onClose).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'Lưu phân công'}));await waitFor(()=>expect(onSaved).toHaveBeenCalledOnce());expect(onClose).toHaveBeenCalledOnce();
});
it('allows finding a draft on the next cycle page and clears the previous context on page changes',async()=>{
 executionApi.cycles.mockImplementation((_p,page)=>Promise.resolve({items:page?[{id:10,code:'R2',name:'Kiểm thử lại',statusCode:'DRAFT'}]:[],totalPages:2,page}));
 const user=userEvent.setup();render(<DocumentSecondTestDialog projectId={1} documentId={2} row={row} onClose={vi.fn()} onSaved={vi.fn()} navigate={vi.fn()}/>);
 await screen.findByText(/Chưa có đợt nháp/);await user.click(screen.getByRole('button',{name:'Đợt sau'}));await screen.findByRole('option',{name:'R2 · Kiểm thử lại'});
 await user.selectOptions(screen.getByLabelText('Đợt kiểm thử'),'10');await screen.findByRole('option',{name:'QA / iPad · 2'});await user.selectOptions(screen.getByLabelText('Cấu hình chạy'),'11');
 await user.click(screen.getByRole('button',{name:'Đợt trước'}));expect(screen.getByLabelText('Đợt kiểm thử')).toHaveValue('');expect(screen.getByLabelText('Cấu hình chạy')).toHaveValue('');expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeDisabled();
});
