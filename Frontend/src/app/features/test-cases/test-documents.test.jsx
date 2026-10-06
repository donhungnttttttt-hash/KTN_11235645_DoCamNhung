import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestDocumentsPage } from './TestDocumentsPage';
import { TestDocumentPage } from './TestDocumentPage';
import { ImportExcelDialog } from './ImportExcelDialog';
import { testCasesApi } from '../../services/api/testCases';
import { documentDate } from './documentDownload';

const state=vi.hoisted(()=>({currentProject:{id:1,name:'Dự án A',projectRole:'PM'}}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>state}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({hasRole:()=>false})}));
vi.mock('../../services/api/testCases',()=>({testCasesApi:{listDocuments:vi.fn(),getDocument:vi.fn(),exportDocument:vi.fn(),createImportPreview:vi.fn(),commitImportPreview:vi.fn(),importTemplate:vi.fn(),getCase:vi.fn(),getRevision:vi.fn()}}));
vi.mock('./CaseDetailModal',()=>({CaseDetailModal:({caseId,onClose,onUpdated})=><div role="dialog" aria-label="Chi tiết test case">Case {caseId}<button onClick={onUpdated}>Cập nhật case</button><button onClick={onClose}>Đóng chi tiết</button></div>}));
const doc={id:9,projectId:1,fileName:'仕様書_VI.xlsx',sheetName:'タブレット',format:'CUSTOMER_V1',totalRows:1,caseCount:1,updatedAt:'2026-10-03T12:00:00Z',updatedBy:'PM dự án',hasSourceFile:true,sourceCounts:{Fixed:1}};
const headers=['ID','Đối tượng test','Điều kiện tiên quyết','Các bước test','Quan điểm test','Hạng mục xác nhận','Kết quả mong đợi','Ghi chú thiết kế','iPad*','Ghi chú thực thi&','ID redmine','Người test','',''];
const cells=['1','Đăng nhập','Có tài khoản','Bước 1\nBước 2','Chức năng','Mở trang','Thành công','Ghi chú','Fixed','Build cũ','123','Tester nguồn','NG','Người khác'];
const detail={document:doc,headers,rows:[{rowId:41,resultStatus:'UNEXECUTED',resultVersion:0,rowNumber:2,sourceId:'1',caseId:21,caseNo:'XLSX-9-2',revisionId:31,cells,sourceCells:cells}]};
beforeEach(()=>{
  sessionStorage.clear(); window.location.hash='';
  vi.resetAllMocks(); state.currentProject={id:1,name:'Dự án A',projectRole:'PM'};
  testCasesApi.listDocuments.mockResolvedValue({items:[doc],totalItems:1,totalPages:1});
  testCasesApi.getDocument.mockResolvedValue(detail);
  testCasesApi.exportDocument.mockResolvedValue(new Blob(['xlsx']));
  URL.createObjectURL=vi.fn(()=>'blob:download'); URL.revokeObjectURL=vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
});

it('lets Dev read document results but disables result changes',async()=>{
  state.currentProject={id:1,name:'Dev project',projectRole:'DEV'};
  render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
  const result=await screen.findByRole('button',{name:/Kết quả.*1/i});
  expect(result).toBeDisabled();
});

it('restores detail navigation, revision management and real history from the row menu',async()=>{
  testCasesApi.getDocument.mockResolvedValue({...detail,rows:[...detail.rows,{...detail.rows[0],rowNumber:3,sourceId:'2',caseId:22,cells:['2',...cells.slice(1)]}]});
  testCasesApi.getCase.mockResolvedValue({currentRevisionId:31,revisions:[{id:31,revisionNo:1}]});
  testCasesApi.getRevision.mockResolvedValue({id:31,revisionNo:1,titleVi:'Đăng nhập'});
  const user=userEvent.setup();render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
  await user.click(await screen.findByRole('button',{name:'Tùy chọn test case 1'}));
  await user.click(screen.getByRole('button',{name:'Hiển thị chi tiết'}));
  expect(screen.getByRole('button',{name:'‹ Trước'})).toBeDisabled();
  await user.click(screen.getByRole('button',{name:'Tiếp ›'}));expect(screen.getByRole('dialog')).toHaveAccessibleName('Chi tiết test case 2');
  await user.click(screen.getByRole('button',{name:'‹ Trước'}));
  await user.click(screen.getByRole('button',{name:'Nội dung / phiên bản'}));expect(screen.getByRole('dialog')).toHaveTextContent('Case 21');
  await user.click(screen.getByRole('button',{name:'Đóng chi tiết'}));
  await user.click(screen.getByRole('button',{name:'Tùy chọn test case 1'}));await user.click(screen.getByRole('button',{name:'Hiển thị lịch sử'}));
  expect(await screen.findByText('Phiên bản đầu tiên được lưu trong hệ thống.')).toBeVisible();
  await user.click(screen.getByRole('button',{name:'Đóng lịch sử'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('copies a deep link, reports clipboard refusal and dismisses the row menu with Escape or outside click',async()=>{
  const user=userEvent.setup();render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
  await user.click(await screen.findByRole('button',{name:'Tùy chọn test case 1'}));await user.keyboard('{Escape}');
  expect(screen.queryByRole('button',{name:'Sao chép URL'})).not.toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'Tùy chọn test case 1'}));await user.click(screen.getByRole('heading',{name:doc.fileName}));
  expect(screen.queryByRole('button',{name:'Sao chép URL'})).not.toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'Tùy chọn test case 1'}));await user.click(screen.getByRole('button',{name:'Sao chép URL'}));
  expect(await screen.findByText('Đã sao chép URL test case 1.')).toBeVisible();expect(await navigator.clipboard.readText()).toContain('#/tests/documents/9?caseId=21');
  vi.spyOn(navigator.clipboard,'writeText').mockRejectedValueOnce(new Error('Denied'));
  await user.click(screen.getByRole('button',{name:'Tùy chọn test case 1'}));await user.click(screen.getByRole('button',{name:'Sao chép URL'}));
  expect(await screen.findByText(/Không sao chép được liên kết/)).toBeVisible();
});
it('opens the linked case and resizes columns by keyboard and pointer without editing source data',async()=>{
  window.location.hash='#/tests/documents/9?caseId=21';
  const user=userEvent.setup();render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
  expect(await screen.findByRole('dialog')).toHaveAccessibleName('Chi tiết test case 1');
  await user.click(screen.getByRole('button',{name:'Đóng chi tiết tài liệu'}));
  const handle=screen.getByRole('separator',{name:'Độ rộng cột ID',exact:true});
  handle.focus();await user.keyboard('{ArrowRight}');expect(handle).toHaveAttribute('aria-valuenow','68');
  await user.keyboard('{ArrowLeft}');expect(handle).toHaveAttribute('aria-valuenow','48');
  handle.setPointerCapture=vi.fn();
  fireEvent.pointerDown(handle,{pointerId:1,clientX:10});fireEvent.pointerMove(handle,{pointerId:1,clientX:110});fireEvent.pointerUp(handle);
  fireEvent.pointerCancel(handle);expect(detail.rows[0].cells).toEqual(cells);
});
describe('Test document library',()=>{
  it('loads pages, resets pagination for keyword search and opens imports',async()=>{
    testCasesApi.listDocuments.mockResolvedValue({items:[doc],totalItems:21,totalPages:2});
    const user=userEvent.setup();render(<TestDocumentsPage navigate={vi.fn()}/>);
    await user.click(await screen.findByRole('button',{name:'Trang sau'}));
    await waitFor(()=>expect(testCasesApi.listDocuments).toHaveBeenLastCalledWith(1,{page:1,keyword:''}));
    await user.click(await screen.findByRole('button',{name:'Trang trước'}));
    await user.type(screen.getByRole('searchbox',{name:'Tìm tài liệu'}),'spec');
    await waitFor(()=>expect(testCasesApi.listDocuments).toHaveBeenLastCalledWith(1,{page:0,keyword:'spec'}));
    await user.click(screen.getByRole('button',{name:'Làm mới tài liệu'}));
    await user.click(screen.getByRole('button',{name:'Nhập Excel'}));
    expect(screen.getByRole('dialog')).toBeVisible();
    await user.click(screen.getByRole('button',{name:'Hủy'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('asks for a project before fetching documents or rows',()=>{
    state.currentProject=null;
    const {unmount}=render(<TestDocumentsPage navigate={vi.fn()}/>);
    expect(screen.getByRole('status')).toHaveTextContent('Chọn dự án');unmount();
    render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
    expect(screen.getByRole('status')).toHaveTextContent('Chọn dự án');
    expect(testCasesApi.listDocuments).not.toHaveBeenCalled();expect(testCasesApi.getDocument).not.toHaveBeenCalled();
  });
  it('opens a named workbook and keeps access to the existing case library',async()=>{
    const navigate=vi.fn(), user=userEvent.setup(); render(<TestDocumentsPage navigate={navigate}/>);
    await user.click(await screen.findByRole('button',{name:doc.fileName}));
    expect(navigate).toHaveBeenCalledWith('/tests/documents/9');
    await user.click(screen.getByRole('button',{name:'Tất cả test case'}));
    expect(navigate).toHaveBeenCalledWith('/tests/cases');
    expect(screen.getByText(/Kết quả tài liệu đã lưu/)).toBeVisible();
  });
  it('shows API errors and retries without prototype fallback',async()=>{
    testCasesApi.listDocuments.mockRejectedValueOnce(new Error('Lỗi kết nối'));
    const user=userEvent.setup(); render(<TestDocumentsPage navigate={vi.fn()}/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Lỗi kết nối');
    await user.click(screen.getByRole('button',{name:'Thử lại'}));
    expect(await screen.findByRole('button',{name:doc.fileName})).toBeVisible();
  });
  it('does not show import to a tester',async()=>{
    state.currentProject.projectRole='TESTER'; render(<TestDocumentsPage navigate={vi.fn()}/>);
    await screen.findByRole('button',{name:doc.fileName});
    expect(screen.queryByRole('button',{name:'Nhập Excel'})).not.toBeInTheDocument();
  });
  it('discards the previous project response',async()=>{
    let finish; testCasesApi.listDocuments.mockImplementationOnce(()=>new Promise(resolve=>finish=resolve));
    const view=render(<TestDocumentsPage navigate={vi.fn()}/>);
    state.currentProject={id:2,name:'B',projectRole:'TESTER'};
    testCasesApi.listDocuments.mockResolvedValue({items:[],totalItems:0,totalPages:0});
    view.rerender(<TestDocumentsPage navigate={vi.fn()}/>);
    await screen.findByText(/Chưa có tài liệu/);
    await act(async()=>finish({items:[doc],totalItems:1,totalPages:1}));
    expect(screen.queryByRole('button',{name:doc.fileName})).not.toBeInTheDocument();
  });
});
describe('Workbook case grid',()=>{
  it('restores the case menu and a clickable result instead of a read-only label',async()=>{
    const user=userEvent.setup();render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
    await user.click(await screen.findByRole('button',{name:'Tùy chọn test case 1'}));
    expect(screen.getByRole('button',{name:'Hiển thị lịch sử'})).toBeVisible();
    expect(screen.getByRole('button',{name:'Sao chép URL'})).toBeVisible();
    await user.click(screen.getByRole('button',{name:'Hiển thị chi tiết'}));
    expect(await screen.findByRole('dialog',{name:'Chi tiết test case 1'})).toHaveTextContent('Bước 1');
    await user.click(screen.getByRole('button',{name:'Đóng chi tiết tài liệu'}));
    expect(screen.getByRole('button',{name:'Kết quả test case 1'})).toBeEnabled();
  });
  it('uses mapped ID and outcome columns after columns are reordered',async()=>{
    const reorderedHeaders=['No','iPad*','Đối tượng test','ID','Kết quả mong đợi'];
    testCasesApi.getDocument.mockResolvedValue({...detail,headers:reorderedHeaders,columns:{sourceId:3,result:1,titleVi:2,expectedVi:4},
      rows:[{...detail.rows[0],cells:['extra','OK','Đăng nhập','1','Thành công']},{...detail.rows[0],rowNumber:3,caseId:22,sourceId:'2',cells:['extra','NG','Thoát','2','Đã thoát']}]});
    const user=userEvent.setup();render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
    await screen.findByRole('button',{name:'Mở test case 2'});
    expect(screen.getByRole('button',{name:'Kết quả test case 2'})).toHaveTextContent('Unexecuted');
    expect(screen.getByRole('button',{name:'Mở test case 2'})).toHaveTextContent('2');
    await user.click(screen.getByRole('button',{name:'Mở test case 2'}));
    expect(screen.getByRole('dialog')).toHaveTextContent('Case 22');
  });
  it('paginates and filters actual results without treating Excel source outcomes as executions',async()=>{
    const rows=Array.from({length:101},(_,i)=>({...detail.rows[0],rowNumber:i+2,sourceId:String(i+1),caseId:i+21,cells:[String(i+1),...cells.slice(1,8),i===100?'NG':'OK',...cells.slice(9)]}));
    testCasesApi.getDocument.mockResolvedValue({...detail,rows});
    const user=userEvent.setup();render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
    await screen.findByRole('heading',{name:doc.fileName});
    expect(screen.getAllByRole('button',{name:/Mở test case /})).toHaveLength(100);
    await user.click(screen.getByRole('button',{name:'Trang sau'}));
    expect(screen.getByRole('button',{name:'Mở test case 101'})).toBeVisible();
    await user.selectOptions(screen.getByRole('combobox',{name:'Lọc kết quả'}),'NG');
    expect(screen.queryAllByRole('button',{name:/Mở test case /})).toHaveLength(0);
    expect(rows[100].cells[8]).toBe('NG');
    expect(screen.getByText('Trang 1 / 1')).toBeVisible();
    await user.click(screen.getByRole('button',{name:'Xóa bộ lọc'}));
    expect(screen.getAllByRole('button',{name:/Mở test case /})).toHaveLength(100);
    await user.selectOptions(screen.getByRole('combobox',{name:'Số dòng mỗi trang'}),'20');
    expect(screen.getAllByRole('button',{name:/Mở test case /})).toHaveLength(20);
  },15000);
  it('toggles result highlighting and the summary without changing workbook data',async()=>{
    const user=userEvent.setup();render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
    await screen.findByRole('heading',{name:doc.fileName});
    const highlight=screen.getByRole('button',{name:'Tô màu kết quả'});
    expect(highlight).toHaveAttribute('aria-pressed','true');
    await user.click(highlight);expect(highlight).toHaveAttribute('aria-pressed','false');
    await user.click(screen.getByRole('button',{name:'Tổng quan tài liệu'}));
    expect(screen.getByRole('region',{name:'Tổng quan tài liệu'})).toBeVisible();
    expect(screen.getByRole('slider',{name:'Cỡ chữ bảng'})).toHaveValue('13');
  });
  it('labels legacy columns in Vietnamese and keeps archived/approved rows visible',async()=>{
    testCasesApi.getDocument.mockResolvedValue({...detail,document:{...doc,format:'INTERNAL_V1',hasSourceFile:false},headers:['caseNo','suiteCode','titleVi'],rows:[{...detail.rows[0],archived:true,cells:['TC-1','AUTH','Tiêu đề']},{...detail.rows[0],rowNumber:3,sourceId:'TC-2',approved:true,cells:['TC-2','AUTH','Bản duyệt']}]});
    render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
    expect(await screen.findByRole('columnheader',{name:/Mã case/})).toBeVisible();
    expect(screen.getByText('Đã lưu trữ')).toBeVisible();expect(screen.getByText('Đã duyệt')).toBeVisible();
    expect(screen.getByText(/Nội dung hiển thị theo phiên bản/)).toBeVisible();
  });
  it('recovers from a load failure, shows export errors and follows back/cycle links',async()=>{
    testCasesApi.getDocument.mockRejectedValueOnce(new Error('Đã hết quyền')).mockResolvedValue(detail);
    const user=userEvent.setup(),navigate=vi.fn();render(<TestDocumentPage documentId="9" navigate={navigate}/>);
    await user.click(await screen.findByRole('button',{name:'Thử lại'}));
    await screen.findByRole('heading',{name:doc.fileName});
    testCasesApi.exportDocument.mockRejectedValueOnce(new Error('Không tải được file'));
    await user.click(screen.getByRole('button',{name:'Xuất Excel'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được file');
    await user.click(screen.getByRole('button',{name:'Làm mới bảng case'}));
    await user.click(screen.getByRole('button',{name:'Đợt kiểm thử'}));expect(navigate).toHaveBeenLastCalledWith('/tests/cycles');
    await user.click(screen.getByRole('button',{name:'Danh sách tài liệu'}));expect(navigate).toHaveBeenLastCalledWith('/tests');
  });
  it('renders all source columns, opens real case details, filters and exports',async()=>{
    const user=userEvent.setup(); render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
    expect(await screen.findByRole('heading',{name:doc.fileName})).toBeVisible();
    expect(screen.getByText('Cột M (nguồn)')).toBeVisible(); expect(screen.getByText('Người khác')).toBeVisible();
    await user.click(screen.getByRole('button',{name:'Mở test case 1'}));
    expect(screen.getByRole('dialog')).toHaveTextContent('Case 21');
    await user.click(screen.getByRole('button',{name:'Đóng chi tiết'}));
    await user.click(screen.getByRole('button',{name:'Xuất Excel'}));
    await waitFor(()=>expect(testCasesApi.exportDocument).toHaveBeenCalledWith(1,'9',false));
    await user.click(screen.getByRole('button',{name:'Tải file gốc'}));
    await waitFor(()=>expect(testCasesApi.exportDocument).toHaveBeenCalledWith(1,'9',true));
    await user.type(screen.getByRole('searchbox',{name:'Tìm trong tài liệu'}),'Không khớp');
    expect(screen.getByText(/Không có dòng phù hợp/)).toBeVisible();
  });
  it('does not reuse a stale document after project change or 404',async()=>{
    const view=render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
    await screen.findByRole('heading',{name:doc.fileName});
    state.currentProject={id:2,name:'B',projectRole:'TESTER'};
    testCasesApi.getDocument.mockRejectedValue(new Error('Không tìm thấy tài liệu'));
    view.rerender(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy tài liệu');
    expect(screen.queryByText('Người khác')).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Xuất Excel'})).not.toBeInTheDocument();
  });
  it('offers current export but no original download for legacy imports',async()=>{
    testCasesApi.getDocument.mockResolvedValue({...detail,document:{...doc,hasSourceFile:false}});
    render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
    await screen.findByRole('heading',{name:doc.fileName});
    expect(screen.getByRole('button',{name:'Xuất Excel'})).toBeVisible();
    expect(screen.queryByRole('button',{name:'Tải file gốc'})).not.toBeInTheDocument();
  });
});
describe('Import opens committed documents',()=>{
  it('does not navigate or close the new screen when an unmounted import finishes',async()=>{
    const user=userEvent.setup(),onSuccess=vi.fn(),onClose=vi.fn();let finish;
    testCasesApi.createImportPreview.mockResolvedValue({id:9,status:'PREVIEW',validRows:1,errorRows:0,rows:[]});
    testCasesApi.commitImportPreview.mockImplementation(()=>new Promise(resolve=>finish=resolve));
    const view=render(<ImportExcelDialog projectId={1} onSuccess={onSuccess} onClose={onClose}/>);
    await user.upload(screen.getByLabelText('Chọn tệp Excel'),new File(['xlsx'],'source.xlsx'));
    await user.click(screen.getByRole('button',{name:/Xem trước kết quả/}));
    await user.click(await screen.findByRole('button',{name:/Xác nhận nhập/}));
    view.unmount();await act(async()=>finish({id:9,status:'COMMITTED'}));
    expect(onSuccess).not.toHaveBeenCalled();expect(onClose).not.toHaveBeenCalled();
  });
  it('validates selection, retries failed parsing and can reopen a committed document',async()=>{
    const user=userEvent.setup(),onSuccess=vi.fn();
    render(<ImportExcelDialog projectId={1} onSuccess={onSuccess} onClose={vi.fn()}/>);
    await user.click(screen.getByRole('button',{name:/Xem trước kết quả/}));
    expect(screen.getByRole('alert')).toHaveTextContent('Chọn tệp');
    await user.upload(screen.getByLabelText('Chọn tệp Excel'),new File(['xlsx'],'source.xlsx'));
    testCasesApi.createImportPreview.mockRejectedValueOnce(new Error('Không đúng mẫu')).mockResolvedValue({id:9,status:'COMMITTED',validRows:1,rows:[{rowNumber:2,valid:true,sourceCaseKey:'1',titleVi:'Test'}]});
    await user.click(screen.getByRole('button',{name:/Xem trước kết quả/}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không đúng mẫu');
    await user.click(screen.getByRole('button',{name:/Xem trước kết quả/}));
    await user.click(await screen.findByRole('button',{name:'Quay lại sửa'}));
    await user.click(screen.getByRole('button',{name:/Xem trước kết quả/}));
    await user.click(await screen.findByRole('button',{name:'Mở tài liệu đã nhập'}));
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({id:9,status:'COMMITTED'}));
  });
  it('downloads the internal template and reports failure for retry',async()=>{
    const user=userEvent.setup();testCasesApi.importTemplate.mockRejectedValueOnce(new Error('Tải mẫu thất bại')).mockResolvedValue(new Blob(['xlsx']));
    render(<ImportExcelDialog projectId={1} onSuccess={vi.fn()} onClose={vi.fn()}/>);
    await user.click(screen.getByRole('button',{name:'Tải mẫu Excel theo tiêu đề'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Tải mẫu thất bại');
    await user.click(screen.getByRole('button',{name:'Tải mẫu Excel theo tiêu đề'}));
    await waitFor(()=>expect(URL.createObjectURL).toHaveBeenCalled());
  });
  it('returns the committed ID so a concurrent duplicate can open the original document',async()=>{
    const user=userEvent.setup(),onSuccess=vi.fn();
    testCasesApi.createImportPreview.mockResolvedValue({id:9,status:'PREVIEW',format:'CUSTOMER_V1',sheetName:'タブレット',fileName:doc.fileName,totalRows:1,validRows:1,errorRows:0,rows:[]});
    testCasesApi.commitImportPreview.mockResolvedValue({id:8,status:'COMMITTED'});
    render(<ImportExcelDialog projectId={1} onSuccess={onSuccess} onClose={vi.fn()}/>);
    await user.upload(screen.getByLabelText('Chọn tệp Excel'),new File(['xlsx'],doc.fileName));
    await user.click(screen.getByRole('button',{name:/Xem trước kết quả/}));
    await user.click(await screen.findByRole('button',{name:/Xác nhận nhập/}));
    await waitFor(()=>expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({id:8})));
  });
});
it('formats dates in project timezone and tolerates missing legacy timestamps',()=>{
  expect(documentDate(null)).toBe('—');expect(documentDate('invalid')).toBe('—');
  expect(documentDate('2026-10-03T12:00:00Z','Asia/Ho_Chi_Minh')).toContain('19:00');
});
