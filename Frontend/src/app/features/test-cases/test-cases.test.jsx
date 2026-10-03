import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportExcelDialog } from './ImportExcelDialog';
import { CaseDetailModal } from './CaseDetailModal';
import { CreateSuiteDialog } from './CreateSuiteDialog';
import { TestSpecsPage } from '../../pages/TestSpecsPage';
import { testCasesApi } from '../../services/api/testCases';

const context = vi.hoisted(() => ({currentProject:{id:1,name:'Dự án A',projectRole:'PM'},systemRole:'TESTER'}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>context}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({hasRole:role=>role===context.systemRole})}));
vi.mock('../../services/api/testCases',()=>({testCasesApi:{createSuite:vi.fn(),createImportPreview:vi.fn(),commitImportPreview:vi.fn(),importTemplate:vi.fn(),getCase:vi.fn(),getRevision:vi.fn(),addRevision:vi.fn(),approveRevision:vi.fn(),listCases:vi.fn(),listSuites:vi.fn()}}));

beforeEach(()=> {
  vi.resetAllMocks(); context.currentProject={id:1,name:'Dự án A',projectRole:'PM'}; context.systemRole='TESTER';
  testCasesApi.listCases.mockResolvedValue({items:[],totalItems:0,totalPages:0}); testCasesApi.listSuites.mockResolvedValue([]);
});
async function preview(result) {
  testCasesApi.createImportPreview.mockResolvedValue(result);
  const user=userEvent.setup(); const onSuccess=vi.fn(); const onClose=vi.fn();
  render(<ImportExcelDialog projectId={1} onClose={onClose} onSuccess={onSuccess}/>);
  const file=new File(['workbook placeholder'],'test.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  await user.upload(screen.getByLabelText('Chọn tệp Excel'),file);
  await user.click(screen.getByRole('button',{name:/Xem trước kết quả/}));
  await screen.findByText('Tổng số dòng');
  expect(testCasesApi.createImportPreview).toHaveBeenCalledWith(1,file);
  return {user,onSuccess,onClose};
}
describe('Excel import workflow',()=> {
  it('blocks the entire commit when even one row is invalid',async()=> {
    await preview({id:9,status:'PREVIEW',totalRows:2,validRows:1,errorRows:1,rows:[{rowNumber:4,sourceCaseKey:'BAD',valid:false,errorMessage:'Thiếu kết quả mong đợi'}]});
    expect(screen.getByText('Thiếu kết quả mong đợi')).toBeVisible();
    expect(screen.getByRole('button',{name:/Xác nhận nhập/})).toBeDisabled();
    expect(testCasesApi.commitImportPreview).not.toHaveBeenCalled();
  });
  it('commits only after preview and keeps errors visible for retry',async()=> {
    const {user,onSuccess}=await preview({id:9,status:'PREVIEW',totalRows:1,validRows:1,errorRows:0,rows:[]});
    testCasesApi.commitImportPreview.mockRejectedValueOnce(new Error('Nhóm đã thay đổi')).mockResolvedValueOnce({status:'COMMITTED'});
    await user.click(screen.getByRole('button',{name:/Xác nhận nhập/}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nhóm đã thay đổi'); expect(onSuccess).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button',{name:/Xác nhận nhập/}));
    await waitFor(()=>expect(onSuccess).toHaveBeenCalledOnce());
    expect(testCasesApi.commitImportPreview).toHaveBeenCalledWith(1,9);
  });
  it('shows a previously committed file without offering another commit',async()=> {
    await preview({id:9,status:'COMMITTED',totalRows:1,validRows:1,errorRows:0,rows:[]});
    expect(screen.getByRole('status')).toHaveTextContent('đã được nhập trước đó');
    expect(screen.getByRole('button',{name:/Xác nhận nhập/})).toBeDisabled();
  });
});
describe('Project-scoped test case library',()=> {
  it('keeps a failed revision draft, locks pending edits and submits its original revision version',async()=> {
    const revision={id:4,revisionNo:1,titleVi:'Bản mới',stepsVi:'Các bước',expectedVi:'Mong đợi'};
    testCasesApi.getCase.mockResolvedValue({caseNo:'TC-1',currentRevisionId:4,currentRevision:revision,revisions:[]});
    let fail;
    testCasesApi.addRevision.mockImplementationOnce(()=>new Promise((resolve,reject)=>{fail=reject;})).mockResolvedValueOnce({id:5});
    const user=userEvent.setup(),onUpdated=vi.fn(),onClose=vi.fn();
    render(<CaseDetailModal projectId={1} caseId={1} onClose={onClose} onUpdated={onUpdated}/>);
    await user.click(await screen.findByRole('button',{name:/Thêm phiên bản/}));
    await user.clear(screen.getByLabelText('Tiêu đề kiểm thử (VI) *'));
    await user.type(screen.getByLabelText('Tiêu đề kiểm thử (VI) *'),'Sửa bản nháp');
    await user.type(screen.getByLabelText('Tiền điều kiện (VI)'),'Chuẩn bị');
    await user.type(screen.getByLabelText('Các bước thực hiện (VI) *'),' mới');
    await user.type(screen.getByLabelText('Kết quả mong đợi (VI) *'),' mới');
    await user.type(screen.getByLabelText('Tiêu đề gốc'),'原文');
    await user.click(screen.getByRole('button',{name:'Lưu phiên bản'}));
    expect(screen.getByLabelText('Tiêu đề kiểm thử (VI) *')).toBeDisabled();
    await user.keyboard('{Escape}');expect(onClose).not.toHaveBeenCalled();
    await act(async()=>fail(new Error('Mạng gián đoạn')));
    expect(screen.getByRole('alert')).toHaveTextContent('Mạng gián đoạn');
    expect(screen.getByLabelText('Tiêu đề kiểm thử (VI) *')).toHaveValue('Sửa bản nháp');
    await user.click(screen.getByRole('button',{name:'Lưu phiên bản'}));
    await waitFor(()=>expect(onUpdated).toHaveBeenCalledOnce());
    expect(testCasesApi.addRevision).toHaveBeenLastCalledWith(1,1,expect.objectContaining({titleVi:'Sửa bản nháp',titleJp:'原文',expectedCurrentRevisionId:4}));
    expect(screen.queryByRole('button',{name:'Lưu phiên bản'})).toBeNull();
  });
  it('requires confirmation for PM approval and supports retry after an API failure',async()=> {
    const revision={id:4,revisionNo:1,titleVi:'Chờ phê duyệt'};
    testCasesApi.getCase.mockResolvedValueOnce({caseNo:'TC-1',currentRevision:revision,revisions:[]})
      .mockResolvedValueOnce({caseNo:'TC-1',currentRevision:{...revision,approved:true},revisions:[]});
    testCasesApi.approveRevision.mockRejectedValueOnce(new Error('Không kết nối')).mockResolvedValueOnce({});
    const user=userEvent.setup(),onUpdated=vi.fn();
    render(<CaseDetailModal projectId={1} caseId={1} onClose={vi.fn()} onUpdated={onUpdated}/>);
    await user.click(await screen.findByRole('button',{name:'Phê duyệt bản này'}));
    expect(testCasesApi.approveRevision).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button',{name:'Hủy phê duyệt'}));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await user.click(screen.getByRole('button',{name:'Phê duyệt bản này'}));
    await user.click(screen.getByRole('button',{name:'Xác nhận phê duyệt'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối');
    await user.click(screen.getByRole('button',{name:'Xác nhận phê duyệt'}));
    expect(await screen.findByText('Đã phê duyệt (Rev 1)')).toBeVisible();
    expect(onUpdated).toHaveBeenCalledOnce();
    expect(testCasesApi.approveRevision).toHaveBeenLastCalledWith(1,1,4);
  });
  it('switches language, cancels revision editing and reports a failed historical read',async()=> {
    testCasesApi.getCase.mockResolvedValue({caseNo:'TC-1',currentRevision:{titleVi:'Nội dung',titleJp:'原文'},revisions:[{id:3,revisionNo:1,createdAt:'2026-09-01'}]});
    testCasesApi.getRevision.mockRejectedValue(new Error('Chưa tải được lịch sử'));
    const user=userEvent.setup(),onClose=vi.fn();
    render(<CaseDetailModal projectId={1} caseId={1} onClose={onClose}/>);
    await user.click(await screen.findByRole('button',{name:'Bản gốc tiếng Nhật (JP)'}));
    expect(screen.getByText('原文')).toBeVisible();
    await user.click(screen.getByRole('button',{name:'Bản tiếng Việt'}));
    await user.click(screen.getByRole('button',{name:/Thêm phiên bản/}));
    await user.click(screen.getByRole('button',{name:'Hủy',exact:true}));
    expect(testCasesApi.addRevision).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button',{name:'Xem phiên bản 1'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được lịch sử');
    await user.click(screen.getAllByRole('button',{name:'Đóng',exact:true})[0]);
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('keeps the case dialog dismissible while loading', async()=> {
    testCasesApi.getCase.mockReturnValue(new Promise(()=>{}));
    const user=userEvent.setup(),onClose=vi.fn();
    render(<CaseDetailModal projectId={1} caseId={1} onClose={onClose}/>);
    expect(screen.getByRole('dialog',{name:'Chi tiết test case'})).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải');
    await user.keyboard('{Escape}'); expect(onClose).toHaveBeenCalledOnce();
  });
  it('offers retry without invented revision content after a case load failure',async()=> {
    testCasesApi.getCase.mockRejectedValueOnce(new Error('Mất kết nối')).mockResolvedValueOnce({caseNo:'TC-1',currentRevision:{titleVi:'Tải lại thành công'},revisions:[]});
    const user=userEvent.setup();render(<CaseDetailModal projectId={1} caseId={1} onClose={vi.fn()}/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');
    expect(screen.queryByText(/Dự thảo/)).toBeNull();
    expect(screen.queryByRole('button',{name:/Thêm phiên bản/})).toBeNull();
    await user.click(screen.getByRole('button',{name:'Thử lại'}));
    expect(await screen.findByText('Tải lại thành công')).toBeVisible();
  });
  it('ignores an old case response after switching cases',async()=> {
    let finishOld;
    testCasesApi.getCase.mockImplementationOnce(()=>new Promise(resolve=>{finishOld=resolve;}))
      .mockResolvedValueOnce({caseNo:'TC-2',currentRevision:{titleVi:'Case mới'},revisions:[]});
    const view=render(<CaseDetailModal projectId={1} caseId={1} onClose={vi.fn()}/>);
    view.rerender(<CaseDetailModal projectId={1} caseId={2} onClose={vi.fn()}/>);
    await screen.findByText('Case mới');
    await act(async()=>finishOld({caseNo:'TC-1',currentRevision:{titleVi:'Case cũ'},revisions:[]}));
    expect(screen.queryByText('Case cũ')).toBeNull();
    expect(screen.getByText('Case mới')).toBeVisible();
  });
  it('opens the document returned by an import from the existing case library',async()=> {
    const navigate=vi.fn(),user=userEvent.setup();
    testCasesApi.createImportPreview.mockResolvedValue({id:19,status:'PREVIEW',totalRows:1,validRows:1,errorRows:0,rows:[]});
    testCasesApi.commitImportPreview.mockResolvedValue({id:17,status:'COMMITTED'});
    render(<TestSpecsPage navigate={navigate}/>);
    await user.click(await screen.findByRole('button',{name:/Nhập Excel/}));
    await user.upload(screen.getByLabelText('Chọn tệp Excel'),new File(['data'],'case.xlsx'));
    await user.click(screen.getByRole('button',{name:/Xem trước kết quả/}));
    await user.click(await screen.findByRole('button',{name:/Xác nhận nhập/}));
    await waitFor(()=>expect(navigate).toHaveBeenCalledWith('/tests/documents/17'));
  });
  it('keeps the suite dialog open until a pending save completes',async()=> {
    let finish;testCasesApi.createSuite.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
    const user=userEvent.setup(),onClose=vi.fn(),onSuccess=vi.fn();
    render(<CreateSuiteDialog projectId={1} onClose={onClose} onSuccess={onSuccess}/>);
    await user.type(screen.getByRole('textbox',{name:/Mã nhóm/}),'AUTH');
    await user.type(screen.getByRole('textbox',{name:/Tên nhóm/}),'Đăng nhập');
    await user.click(screen.getByRole('button',{name:'Tạo nhóm'}));
    expect(screen.getByRole('button',{name:'Hủy'})).toBeDisabled();
    await user.keyboard('{Escape}');expect(onClose).not.toHaveBeenCalled();
    await act(async()=>finish({id:1}));
    expect(onSuccess).toHaveBeenCalledOnce();expect(onClose).toHaveBeenCalledOnce();
  });
  it('does not expose approval just because the system role is ADMIN',async()=> {
    context.systemRole='ADMIN'; context.currentProject.projectRole='TESTER';
    testCasesApi.getCase.mockResolvedValue({id:1,caseNo:'TC-1',currentRevision:{id:4,titleVi:'Nội dung hiện tại'},revisions:[]});
    render(<CaseDetailModal projectId={1} caseId={1} onClose={vi.fn()}/>);
    await screen.findByText('Nội dung hiện tại');
    expect(screen.queryByRole('button',{name:/Phê duyệt/})).not.toBeInTheDocument();
  });
  it('allows the project PM and reads full old revision content',async()=> {
    testCasesApi.getCase.mockResolvedValue({id:1,caseNo:'TC-1',currentRevision:{id:4,titleVi:'Bản mới'},revisions:[{id:3,revisionNo:1,createdAt:'2026-09-01'}]});
    testCasesApi.getRevision.mockResolvedValue({id:3,revisionNo:1,titleVi:'Bản cũ nguyên vẹn',titleJp:'原文',approved:true});
    const user=userEvent.setup(); render(<CaseDetailModal projectId={1} caseId={1} onClose={vi.fn()}/>);
    expect(await screen.findByRole('button',{name:/Phê duyệt/})).toBeVisible();
    await user.click(screen.getByRole('button',{name:'Xem phiên bản 1'}));
    expect(await screen.findByText('Bản cũ nguyên vẹn')).toBeVisible();
    expect(testCasesApi.getRevision).toHaveBeenCalledWith(1,1,3);
  });
  it('shows a backend error and retry, never the old mock specifications',async()=> {
    testCasesApi.listCases.mockRejectedValueOnce(new Error('Không có quyền truy cập dự án'));
    render(<TestSpecsPage testSpecs={[{no:55,name:'Dữ liệu giả không được hiện'}]}/>);
    expect(await screen.findByText(/Không có quyền truy cập dự án/)).toBeVisible();
    expect(screen.getByRole('button',{name:'Thử lại'})).toBeVisible();
    expect(screen.queryByText('Dữ liệu giả không được hiện')).not.toBeInTheDocument();
  });
  it('discards a late response from the previous project',async()=> {
    let resolveOld; testCasesApi.listCases.mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;}));
    const view=render(<TestSpecsPage/>);
    context.currentProject={id:2,name:'Dự án B',projectRole:'TESTER'};
    testCasesApi.listCases.mockResolvedValue({items:[{id:2,caseNo:'B-1',titleVi:'Dữ liệu B',createdAt:'2026-09-01'}],totalItems:1,totalPages:1});
    view.rerender(<TestSpecsPage/>); await screen.findByText('Dữ liệu B');
    await act(async()=>resolveOld([{id:1,caseNo:'A-1',titleVi:'Dữ liệu A cũ',createdAt:'2026-09-01'}]));
    expect(screen.queryByText('Dữ liệu A cũ')).not.toBeInTheDocument();
    expect(screen.getByText('Dữ liệu B')).toBeVisible();
  });
});
