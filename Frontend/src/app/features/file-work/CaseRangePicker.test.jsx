import React from 'react';
import {beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {CreateFile} from './FileWorkPage';
import {testCasesApi} from '../../services/api/testCases';
import {projectsApi} from '../../services/api/projects';
import {executionApi} from '../../services/api/execution';
import {fileWorkApi} from '../../services/api/fileWork';
vi.mock('../../services/api/testCases',()=>({testCasesApi:{listDocuments:vi.fn(),getDocument:vi.fn(),approveDocumentRows:vi.fn()}}));
vi.mock('../../services/api/projects',()=>({projectsApi:{listMembers:vi.fn()}}));
vi.mock('../../services/api/execution',()=>({executionApi:{cycles:vi.fn(),cycle:vi.fn(),configurations:vi.fn()}}));
vi.mock('../../services/api/fileWork',()=>({fileWorkApi:{preview:vi.fn(),create:vi.fn()}}));
const rows=Array.from({length:70},(_,i)=>({sourceId:String(i+1),rowId:i+1,revisionId:101+i,caseNo:'XLSX-'+(i+1),approved:false}));
const page=items=>({items,page:0,totalPages:1,totalItems:items.length});
beforeEach(()=>{
 vi.resetAllMocks();testCasesApi.listDocuments.mockResolvedValue(page([{id:8,fileName:'Login.xlsx'}]));testCasesApi.getDocument.mockResolvedValue({document:{id:8,fileName:'Login.xlsx'},rows});testCasesApi.approveDocumentRows.mockResolvedValue({approvedCount:35});
 executionApi.cycles.mockResolvedValue(page([{id:3,name:'Cycle',statusCode:'DRAFT'}]));executionApi.cycle.mockResolvedValue({id:3,name:'Cycle',statusCode:'DRAFT',version:1});executionApi.configurations.mockResolvedValue([{id:5,environmentName:'QA',deviceName:'iPad',versionLabel:'1.0'}]);projectsApi.listMembers.mockResolvedValue([{membershipId:9,displayName:'Tester A',active:true,projectRole:'TESTER'}]);fileWorkApi.preview.mockResolvedValue({valid:true,selectedCount:35,cycleVersion:1});fileWorkApi.create.mockResolvedValue({group:{id:50}});
});
async function choose(){
 fireEvent.change(await screen.findByLabelText('Tài liệu đã nhập'),{target:{value:'8'}});
 fireEvent.change(await screen.findByLabelText('Khoảng ID case'),{target:{value:'1-35'}});fireEvent.click(screen.getByText('Chọn khoảng case'));
 await screen.findByRole('option',{name:/QA.*iPad/});fireEvent.change(screen.getByLabelText('Cấu hình'),{target:{value:'5'}});
 fireEvent.change(screen.getByLabelText('Tester nhận file'),{target:{value:'9'}});
}
it('assigns an inclusive file range after explicit bulk approval and preview',async()=>{
 const saved=vi.fn(),navigate=vi.fn();render(<CreateFile projectId={1} initialCycleId={3} authorized onSaved={saved} navigate={navigate}/>);await choose();
 expect(screen.getByText('35 case đã chọn')).toBeInTheDocument();expect(screen.getByText('Kiểm tra trước khi giao')).toBeDisabled();
 fireEvent.click(screen.getByText('Duyệt 35 case đã chọn'));
 await waitFor(()=>expect(screen.getByText('Kiểm tra trước khi giao')).toBeEnabled());
 expect(testCasesApi.approveDocumentRows).toHaveBeenCalledWith(1,8,{rows:rows.slice(0,35).map(r=>({rowId:r.rowId,expectedRevisionId:r.revisionId}))});
 fireEvent.click(screen.getByText('Kiểm tra trước khi giao'));await waitFor(()=>expect(screen.getByText('Tạo nhóm file')).toBeEnabled());fireEvent.click(screen.getByText('Tạo nhóm file'));
 await waitFor(()=>expect(saved).toHaveBeenCalledOnce());expect(fileWorkApi.create).toHaveBeenCalledWith(1,expect.objectContaining({documentId:8,cycleId:3,configurationId:5,assigneeMembershipId:9,revisionIds:rows.slice(0,35).map(r=>r.revisionId)}));expect(navigate).toHaveBeenCalledWith('/tests/file-work/50');
});
it('keeps range and recipient after approval failure, never assigns a partial selection',async()=>{
 testCasesApi.approveDocumentRows.mockRejectedValue(new Error('Phiên bản đã đổi'));render(<CreateFile projectId={1} initialCycleId={3} authorized onSaved={vi.fn()} navigate={vi.fn()}/>);await choose();fireEvent.click(screen.getByText('Duyệt 35 case đã chọn'));expect(await screen.findByRole('alert')).toHaveTextContent('Phiên bản đã đổi');expect(screen.getByLabelText('Khoảng ID case')).toHaveValue('1-35');expect(screen.getByLabelText('Tester nhận file')).toHaveValue('9');expect(fileWorkApi.create).not.toHaveBeenCalled();
});
it('invalidates the prior selection and preview as soon as the range text changes',async()=>{
 testCasesApi.getDocument.mockResolvedValue({document:{id:8,fileName:'Login.xlsx'},rows:rows.map(r=>({...r,approved:true}))});render(<CreateFile projectId={1} initialCycleId={3} authorized onSaved={vi.fn()} navigate={vi.fn()}/>);await choose();fireEvent.click(screen.getByText('Kiểm tra trước khi giao'));await waitFor(()=>expect(screen.getByText('Tạo nhóm file')).toBeEnabled());fireEvent.change(screen.getByLabelText('Khoảng ID case'),{target:{value:'36-70'}});expect(screen.getByText('Tạo nhóm file')).toBeDisabled();expect(screen.getByText('0 case đã chọn')).toBeInTheDocument();
});
it('generic retry after a lost create response repeats the original idempotency command',async()=>{
 testCasesApi.getDocument.mockResolvedValue({document:{id:8,fileName:'Login.xlsx'},rows:rows.map(r=>({...r,approved:true}))});fileWorkApi.create.mockRejectedValueOnce(new Error('Mất phản hồi')).mockResolvedValueOnce({group:{id:50}});
 render(<CreateFile projectId={1} initialCycleId={3} authorized onSaved={vi.fn()} navigate={vi.fn()}/>);await choose();
 fireEvent.click(screen.getByText('Kiểm tra trước khi giao'));await waitFor(()=>expect(screen.getByText('Tạo nhóm file')).toBeEnabled());fireEvent.click(screen.getByText('Tạo nhóm file'));await screen.findByText('Mất phản hồi');
 fireEvent.click(screen.getByRole('button',{name:'Thử lại',exact:true}));await waitFor(()=>expect(fileWorkApi.create).toHaveBeenCalledTimes(2));expect(fileWorkApi.create.mock.calls[1]).toEqual(fileWorkApi.create.mock.calls[0]);
});
