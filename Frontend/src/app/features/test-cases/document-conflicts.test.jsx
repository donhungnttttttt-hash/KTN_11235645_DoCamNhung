import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {DocumentCellEditor} from './DocumentCellEditor';
import {DocumentSecondTestDialog} from './DocumentSecondTestDialog';
import {testCasesApi} from '../../services/api/testCases';
import {executionApi} from '../../services/api/execution';
import {projectsApi} from '../../services/api/projects';

vi.mock('../../services/api/testCases',()=>({testCasesApi:{getDocument:vi.fn(),editDocumentCell:vi.fn(),documentCellHistory:vi.fn(),assignSecondTest:vi.fn(),approveRevision:vi.fn()}}));
vi.mock('../../services/api/execution',()=>({executionApi:{cycles:vi.fn(),cycle:vi.fn(),configurations:vi.fn()}}));
vi.mock('../../services/api/projects',()=>({projectsApi:{listMembers:vi.fn()}}));
const row={rowId:4,rowNumber:2,caseId:8,sourceId:'1',revisionId:9,approved:true,archived:false,cells:['1','Original','Extra'],sourceCells:['1','Original','Extra']};
const assignment={rowId:4,runItemId:20,cycleId:10,cycleName:'R2',configurationId:11,assigneeMembershipId:12,assigneeName:'Tester 2',cycleStatus:'ACTIVE',version:1,runVersion:2,note:'Before',resultCode:'NOT_RUN'};
const conflict=()=>Object.assign(new Error('Dữ liệu đã thay đổi'),{status:409,code:'VERSION_CONFLICT'});
const detail=(current=row,secondTests=[])=>({document:{id:2,fileName:'Test.xlsx',format:'CUSTOMER_V1'},headers:['ID','Đối tượng test','Bổ sung'],columns:{sourceId:0,titleVi:1},rows:[current],cellVersions:{4:{2:3}},secondTests});
beforeEach(()=>{
 vi.resetAllMocks();testCasesApi.documentCellHistory.mockResolvedValue([]);
 executionApi.cycles.mockResolvedValue({items:[{id:10,name:'R2',code:'R2',statusCode:'ACTIVE'}],totalPages:1,page:0});
 executionApi.cycle.mockResolvedValue({id:10,statusCode:'ACTIVE',version:3});
 executionApi.configurations.mockResolvedValue([{id:11,environmentName:'QA',deviceName:'iPad',versionLabel:'2'}]);
 projectsApi.listMembers.mockResolvedValue([{membershipId:12,displayName:'Tester 2',active:true,enabled:true,projectRole:'TESTER',systemRole:'TESTER'},{membershipId:13,displayName:'Tester 3',active:true,enabled:true,projectRole:'TESTER',systemRole:'TESTER'}]);
});

it('reloads a newer canonical revision after a conflict and saves the preserved draft only on explicit submit',async()=>{
 const user=userEvent.setup(),close=vi.fn(),saved=vi.fn();
 testCasesApi.editDocumentCell.mockImplementation((_p,_d,_r,_c,input)=>input.expectedRevisionId===10?Promise.resolve({saved:true}):Promise.reject(conflict()));
 testCasesApi.getDocument.mockResolvedValue(detail({...row,revisionId:10,cells:['1','Server title','Extra']}));
 render(<DocumentCellEditor projectId={1} documentId={2} cell={{row,index:1,label:'Title',value:'Original',canonical:true,maxLength:255,version:0}} onClose={close} onSaved={saved}/>);
 fireEvent.change(screen.getByRole('textbox',{name:'Nội dung'}),{target:{value:'My draft'}});
 await user.click(screen.getByRole('button',{name:'Lưu nội dung'}));await screen.findByRole('alert');
 expect(screen.getByRole('button',{name:'Lưu nội dung'})).toBeDisabled();
 await user.click(screen.getByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'}));
 expect(await screen.findByText('Server title')).toBeVisible();expect(screen.getByRole('textbox',{name:'Nội dung'})).toHaveValue('My draft');
 expect(testCasesApi.editDocumentCell).toHaveBeenCalledTimes(1);expect(close).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'Lưu nội dung'}));await waitFor(()=>expect(close).toHaveBeenCalledOnce());
 expect(testCasesApi.editDocumentCell).toHaveBeenLastCalledWith(1,2,4,1,{value:'My draft',expectedVersion:0,expectedRevisionId:10});expect(saved).toHaveBeenCalledOnce();
});

it('refreshes the separate cell version before saving an additional document column',async()=>{
 testCasesApi.editDocumentCell.mockImplementation((_p,_d,_r,_c,input)=>input.expectedVersion===3?Promise.resolve({saved:true}):Promise.reject(conflict()));
 testCasesApi.getDocument.mockResolvedValue(detail({...row,cells:['1','Original','Server extra']}));
 const close=vi.fn(),user=userEvent.setup();render(<DocumentCellEditor projectId={1} documentId={2} cell={{row,index:2,label:'Extra',value:'Extra',canonical:false,maxLength:8000,version:0}} onClose={close} onSaved={vi.fn()}/>);
 fireEvent.change(screen.getByRole('textbox',{name:'Nội dung'}),{target:{value:'Draft extra'}});
 await user.click(screen.getByRole('button',{name:'Lưu nội dung'}));await screen.findByRole('alert');
 await user.click(screen.getByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'}));await screen.findByText('Server extra');
 await user.click(screen.getByRole('button',{name:'Lưu nội dung'}));await waitFor(()=>expect(close).toHaveBeenCalledOnce());
 expect(testCasesApi.editDocumentCell).toHaveBeenLastCalledWith(1,2,4,2,{value:'Draft extra',expectedVersion:3,expectedRevisionId:9});
});

it.each([{...row,archived:true},{...row,caseId:99}])('retains the cell draft but blocks a retired or remapped case after reload',async current=>{
 testCasesApi.editDocumentCell.mockRejectedValue(conflict());testCasesApi.getDocument.mockResolvedValue(detail(current));
 const user=userEvent.setup();render(<DocumentCellEditor projectId={1} documentId={2} cell={{row,index:1,label:'Title',value:'Original',maxLength:255,version:0}} onClose={vi.fn()} onSaved={vi.fn()}/>);
 fireEvent.change(screen.getByRole('textbox',{name:'Nội dung'}),{target:{value:'My draft'}});await user.click(screen.getByRole('button',{name:'Lưu nội dung'}));await screen.findByRole('alert');
 await user.click(screen.getByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'})).toBeEnabled());
 expect(screen.getByRole('button',{name:'Lưu nội dung'})).toBeDisabled();expect(screen.getByRole('textbox',{name:'Nội dung'})).toHaveValue('My draft');expect(testCasesApi.editDocumentCell).toHaveBeenCalledTimes(1);
});

it('reloads the assignment and run versions after a concurrent execution while retaining the chosen Tester and note',async()=>{
 const user=userEvent.setup(),close=vi.fn(),saved=vi.fn();
 testCasesApi.assignSecondTest.mockImplementation((_p,_d,_r,input)=>input.expectedVersion===3&&input.expectedRunVersion===5?Promise.resolve({saved:true}):Promise.reject(conflict()));
 testCasesApi.getDocument.mockResolvedValue(detail(row,[{...assignment,version:3,runVersion:5,assigneeMembershipId:13,assigneeName:'Tester 3',resultCode:'NG'}]));
 render(<DocumentSecondTestDialog projectId={1} documentId={2} row={row} assignment={assignment} onClose={close} onSaved={saved} navigate={vi.fn()}/>);
 await screen.findByRole('option',{name:'Tester 2'});await user.clear(screen.getByLabelText('Ghi chú 2'));await user.type(screen.getByLabelText('Ghi chú 2'),'Keep my note');
 await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeEnabled());await user.click(screen.getByRole('button',{name:'Lưu phân công'}));await screen.findByRole('alert');
 expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeDisabled();
 await user.click(screen.getByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'}));await screen.findByText(/Đang được giao: Tester 3/);
 expect(screen.getByLabelText('Người test lần 2')).toHaveValue('12');expect(screen.getByLabelText('Ghi chú 2')).toHaveValue('Keep my note');expect(testCasesApi.assignSecondTest).toHaveBeenCalledTimes(1);
 await user.click(screen.getByRole('button',{name:'Lưu phân công'}));await waitFor(()=>expect(close).toHaveBeenCalledOnce());
 expect(testCasesApi.assignSecondTest).toHaveBeenLastCalledWith(1,2,4,expect.objectContaining({expectedVersion:3,expectedRunVersion:5,assigneeMembershipId:12,note:'Keep my note'}));expect(saved).toHaveBeenCalledOnce();
});

it.each([{...assignment,runItemId:999},{...assignment,rowId:99}])('does not silently adopt a different second-test run or source row',async current=>{
 testCasesApi.assignSecondTest.mockRejectedValue(conflict());testCasesApi.getDocument.mockResolvedValue(detail(row,[current]));
 const user=userEvent.setup();render(<DocumentSecondTestDialog projectId={1} documentId={2} row={row} assignment={assignment} onClose={vi.fn()} onSaved={vi.fn()} navigate={vi.fn()}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeEnabled());await user.click(screen.getByRole('button',{name:'Lưu phân công'}));await screen.findByRole('alert');
 await user.click(screen.getByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'})).toBeEnabled());
 expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeDisabled();expect(testCasesApi.assignSecondTest).toHaveBeenCalledTimes(1);
});

it('keeps a conflicted cell draft blocked during a failed reload and lets the user retry the read',async()=>{
 testCasesApi.editDocumentCell.mockRejectedValue(conflict());testCasesApi.getDocument.mockRejectedValueOnce(new Error('Read offline')).mockResolvedValueOnce(detail({...row,revisionId:10,cells:['1','Server title','Extra']}));
 const user=userEvent.setup();render(<DocumentCellEditor projectId={1} documentId={2} cell={{row,index:1,label:'Title',value:'Original',maxLength:255,version:0}} onClose={vi.fn()} onSaved={vi.fn()}/>);
 fireEvent.change(screen.getByRole('textbox',{name:'Nội dung'}),{target:{value:'My draft'}});await user.click(screen.getByRole('button',{name:'Lưu nội dung'}));await screen.findByRole('alert');
 await user.click(screen.getByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'}));expect(await screen.findByRole('alert')).toHaveTextContent('Read offline');
 expect(screen.getByRole('textbox',{name:'Nội dung'})).toHaveValue('My draft');expect(screen.getByRole('button',{name:'Lưu nội dung'})).toBeDisabled();
 await user.click(screen.getByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'}));await screen.findByText('Server title');expect(screen.getByRole('button',{name:'Lưu nội dung'})).toBeEnabled();expect(testCasesApi.editDocumentCell).toHaveBeenCalledTimes(1);
});

it('blocks cell writes after permission revocation while retaining the draft',async()=>{
 testCasesApi.editDocumentCell.mockRejectedValue(Object.assign(new Error('Forbidden'),{status:403}));
 const user=userEvent.setup();render(<DocumentCellEditor projectId={1} documentId={2} cell={{row,index:1,label:'Title',value:'Original',maxLength:255,version:0}} onClose={vi.fn()} onSaved={vi.fn()}/>);
 fireEvent.change(screen.getByRole('textbox',{name:'Nội dung'}),{target:{value:'My draft'}});await user.click(screen.getByRole('button',{name:'Lưu nội dung'}));
 await screen.findByText(/Không còn quyền lưu/);expect(screen.getByRole('button',{name:'Lưu nội dung'})).toBeDisabled();expect(screen.getByRole('textbox',{name:'Nội dung'})).toHaveValue('My draft');
 fireEvent.submit(screen.getByRole('textbox',{name:'Nội dung'}).closest('form'));expect(testCasesApi.editDocumentCell).toHaveBeenCalledTimes(1);
});

it.each([{...row,archived:true},{...row,caseId:99}])('blocks assignment recovery for a retired or remapped case',async current=>{
 testCasesApi.assignSecondTest.mockRejectedValue(conflict());testCasesApi.getDocument.mockResolvedValue(detail(current,[assignment]));
 const user=userEvent.setup();render(<DocumentSecondTestDialog projectId={1} documentId={2} row={row} assignment={assignment} onClose={vi.fn()} onSaved={vi.fn()} navigate={vi.fn()}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeEnabled());await user.click(screen.getByRole('button',{name:'Lưu phân công'}));await screen.findByRole('alert');
 await user.click(screen.getByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'}));expect(await screen.findByRole('alert')).toHaveTextContent(/Case đã lưu trữ|dòng nguồn/);expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeDisabled();
 expect(screen.getByLabelText('Ghi chú 2')).toHaveValue('Before');expect(testCasesApi.assignSecondTest).toHaveBeenCalledTimes(1);
});

it('blocks second-test writes after permission revocation while retaining the note',async()=>{
 testCasesApi.assignSecondTest.mockRejectedValue(Object.assign(new Error('Forbidden'),{status:403}));
 const user=userEvent.setup();render(<DocumentSecondTestDialog projectId={1} documentId={2} row={row} assignment={assignment} onClose={vi.fn()} onSaved={vi.fn()} navigate={vi.fn()}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeEnabled());await user.click(screen.getByRole('button',{name:'Lưu phân công'}));await screen.findByText(/Không còn quyền lưu/);
 expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeDisabled();expect(screen.getByLabelText('Ghi chú 2')).toHaveValue('Before');
 fireEvent.submit(screen.getByLabelText('Ghi chú 2').closest('form'));expect(testCasesApi.assignSecondTest).toHaveBeenCalledTimes(1);
});

it('does not switch a new second-test draft to an unreviewed case revision after reload',async()=>{
 executionApi.cycles.mockResolvedValue({items:[{id:10,name:'R2',code:'R2',statusCode:'DRAFT'}],totalPages:1,page:0});executionApi.cycle.mockResolvedValue({id:10,statusCode:'DRAFT',version:3});
 testCasesApi.assignSecondTest.mockRejectedValue(conflict());testCasesApi.getDocument.mockResolvedValue(detail({...row,revisionId:10,approved:false,cells:['1','Unreviewed new content','Extra']}));
 const user=userEvent.setup();render(<DocumentSecondTestDialog projectId={1} documentId={2} row={row} onClose={vi.fn()} onSaved={vi.fn()} navigate={vi.fn()}/>);
 await screen.findByRole('option',{name:'R2 · R2'});await user.selectOptions(screen.getByLabelText('Đợt kiểm thử'),'10');await screen.findByRole('option',{name:'QA / iPad · 2'});
 await user.selectOptions(screen.getByLabelText('Cấu hình chạy'),'11');await user.selectOptions(screen.getByLabelText('Người test lần 2'),'12');await user.type(screen.getByLabelText('Ghi chú 2'),'Keep original intent');
 await user.click(screen.getByRole('button',{name:'Lưu phân công'}));await screen.findByRole('alert');await user.click(screen.getByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Đóng',exact:true})).toBeEnabled());
 const approve=screen.queryByRole('button',{name:'Duyệt phiên bản này'});if(approve)expect(approve).toBeDisabled();
 expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeDisabled();expect(screen.getByLabelText('Ghi chú 2')).toHaveValue('Keep original intent');expect(screen.getByLabelText('Người test lần 2')).toHaveValue('12');
 expect(screen.getByRole('alert')).toHaveTextContent(/phiên bản.*thay đổi/i);expect(testCasesApi.approveRevision).not.toHaveBeenCalled();expect(testCasesApi.assignSecondTest).toHaveBeenCalledTimes(1);
});
