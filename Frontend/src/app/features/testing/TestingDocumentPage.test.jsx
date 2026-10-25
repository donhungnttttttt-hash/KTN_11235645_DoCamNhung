import React from 'react';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {beforeEach,expect,test,vi} from 'vitest';
import {TestingDocumentPage} from './TestingDocumentPage';
import {testCasesApi} from '../../services/api/testCases';
beforeEach(()=>vi.clearAllMocks());

test('keeps a deleted version visible on its old case but unavailable for selection',async()=>{
 testCasesApi.getDocument.mockResolvedValue({document:{id:9,featureId:2,fileName:'Cases.xlsx'},testVersions:[{id:12,name:'Active version',createdAt:'2026-01-02T00:00:00Z'}],headers:['ID'],columns:{sourceId:0},rows:[{rowId:101,sourceId:'1',cells:['1'],resultStatus:'NG',resultVersion:3,canUpdateResult:true,testVersionId:11,testVersionName:'Old version',executedOn:'2026-01-05'}]});
 render(<TestingDocumentPage projectId={1} featureId={2} documentId={9}/>);
 const rowVersion=await screen.findByRole('combobox',{name:'Version test · case 1'});
 expect(rowVersion).toHaveValue('11');
 expect(within(rowVersion).getByRole('option',{name:'Old version (đã xóa)'})).toBeDisabled();
 expect(within(screen.getByLabelText('Version test')).queryByRole('option',{name:/Old version/})).not.toBeInTheDocument();
 expect(testCasesApi.updateDocumentResult).not.toHaveBeenCalled();
});

test('stamps the chosen version and execution date only on the case whose status is saved',async()=>{
 const versions=[{id:11,name:'iPad 1.0 (133)',createdAt:'2026-01-01T00:00:00Z'},{id:12,name:'iPad 1.1 (134)',createdAt:'2026-01-02T00:00:00Z'}];
 testCasesApi.getDocument.mockResolvedValue({document:{id:9,featureId:2,fileName:'Cases.xlsx'},testVersions:versions,headers:['ID','Ghi chú thực thi&'],columns:{sourceId:0,executionNote:1},rows:[1,2].map(n=>({rowId:100+n,sourceId:String(n),cells:[String(n),'Original note'],resultStatus:'UNEXECUTED',resultVersion:0,canUpdateResult:true}))});
 testCasesApi.updateDocumentResult.mockResolvedValue({rowId:101,status:'OK',version:1,testVersionId:11,testVersionName:'iPad 1.0 (133)',executedOn:'2026-01-01'});
 render(<TestingDocumentPage projectId={1} featureId={2} documentId={9} onBack={()=>{}}/>);
 const version=await screen.findByLabelText('Version test');
 fireEvent.change(screen.getByLabelText('Ngày thực hiện'),{target:{value:'2026-01-01'}});
 expect(version).toHaveValue('11');
 fireEvent.click(screen.getByRole('button',{name:'Kết quả test case 1'}));
 await waitFor(()=>expect(testCasesApi.updateDocumentResult).toHaveBeenCalledWith(1,9,101,expect.objectContaining({testVersionId:11,executedOn:'2026-01-01',status:'OK'})));
 const row1=screen.getByRole('button',{name:'1',exact:true}).closest('tr');
 await waitFor(()=>expect(within(row1).getByText('iPad 1.0 (133)')).toBeInTheDocument());
 const row2=screen.getByRole('button',{name:'2',exact:true}).closest('tr');
 expect(within(row2).getByRole('combobox',{name:'Version test · case 2'})).toHaveValue('');
 fireEvent.change(version,{target:{value:'12'}});
 expect(within(row1).getByText('iPad 1.0 (133)')).toBeInTheDocument();
 expect(testCasesApi.updateDocumentResult).toHaveBeenCalledTimes(1);
});
test('corrects one case version without changing its status, execution date or neighboring case',async()=>{
 const versions=[{id:11,name:'Version A',createdAt:'2026-01-01T00:00:00Z'},{id:12,name:'Version B',createdAt:'2026-01-02T00:00:00Z'}];
 testCasesApi.getDocument.mockResolvedValue({document:{id:9,featureId:2,fileName:'Cases.xlsx'},testVersions:versions,headers:['ID'],columns:{sourceId:0},rows:[1,2].map(n=>({rowId:100+n,sourceId:String(n),cells:[String(n)],resultStatus:'NG',resultVersion:3,canUpdateResult:true,testVersionId:11,testVersionName:'Version A',executedOn:'2026-01-05'}))});
 testCasesApi.updateDocumentResult.mockResolvedValue({rowId:101,status:'NG',version:4,testVersionId:12,testVersionName:'Version B',executedOn:'2026-01-05'});
 render(<TestingDocumentPage projectId={1} featureId={2} documentId={9}/>);
 fireEvent.change(await screen.findByRole('combobox',{name:'Version test · case 1'}),{target:{value:'12'}});
 await waitFor(()=>expect(testCasesApi.updateDocumentResult).toHaveBeenCalledWith(1,9,101,expect.objectContaining({status:'NG',expectedVersion:3,testVersionId:12,executedOn:'2026-01-05'})));
 await waitFor(()=>expect(screen.getByRole('combobox',{name:'Version test · case 1'})).toHaveValue('12'));
 expect(screen.getByRole('combobox',{name:'Version test · case 2'})).toHaveValue('11');
 expect(screen.getByRole('button',{name:'Kết quả test case 1'})).toHaveTextContent('NG');
 expect(testCasesApi.updateDocumentResult).toHaveBeenCalledTimes(1);
});
test('a rejected version correction keeps the saved version visible and requires reload',async()=>{
 testCasesApi.getDocument.mockResolvedValue({document:{id:9,featureId:2,fileName:'Cases.xlsx'},testVersions:[{id:11,name:'Version A',createdAt:'2026-01-01T00:00:00Z'},{id:12,name:'Version B',createdAt:'2026-01-02T00:00:00Z'}],headers:['ID'],columns:{sourceId:0},rows:[{rowId:101,sourceId:'1',cells:['1'],resultStatus:'NG',resultVersion:3,canUpdateResult:true,testVersionId:11,executedOn:'2026-01-05'}]});
 testCasesApi.updateDocumentResult.mockRejectedValueOnce(new Error('Case đã được người khác cập nhật'));
 render(<TestingDocumentPage projectId={1} featureId={2} documentId={9}/>);
 fireEvent.change(await screen.findByRole('combobox',{name:'Version test · case 1'}),{target:{value:'12'}});
 await screen.findByRole('alert');
 expect(screen.getByRole('combobox',{name:'Version test · case 1'})).toHaveValue('11');
 expect(screen.getByRole('combobox',{name:'Version test · case 1'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'Tải lại kết quả'})).toBeEnabled();
});
vi.mock('../../services/api/testCases',()=>({testCasesApi:{getDocument:vi.fn(),updateDocumentResult:vi.fn(),exportDocument:vi.fn(),documentCellHistory:vi.fn()}}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({hasRole:role=>role==='TESTER'})}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:{id:1,name:'Dự án',projectRole:'TESTER'}})}));
test('keeps each case identified by its source ID row header when source columns are reordered',async()=>{
 const token='https://example.test/'+('LongToken'.repeat(40));
 testCasesApi.getDocument.mockResolvedValue({document:{id:9,featureId:2,fileName:'Reordered.xlsx'},headers:['Nội dung','ID','Steps'],columns:{sourceId:1},canManage:false,rows:[{rowId:101,sourceId:'TC-Đăng nhập',cells:[token,'TC-Đăng nhập','Bước 1\nBước 2'],resultStatus:'UNEXECUTED',canUpdateResult:false}]});
 render(<TestingDocumentPage projectId={1} featureId={2} documentId={9} onBack={()=>{}}/>);
 const identity=await screen.findByRole('rowheader',{name:'TC-Đăng nhập'}),row=within(identity.closest('tr'));
 expect(within(identity).getByRole('button',{name:'TC-Đăng nhập'})).toBeEnabled();
 expect(row.getByRole('cell',{name:token})).toHaveTextContent(token);
 expect(row.getByRole('button',{name:'Kết quả test case TC-Đăng nhập'})).toBeDisabled();
 expect(screen.queryByRole('button',{name:/Sửa Nội dung/})).not.toBeInTheDocument();
});
test('counts P and NA as tested and saves Status without run or device inputs',async()=>{
  testCasesApi.getDocument.mockResolvedValue({document:{id:9,featureId:2,fileName:'Cases.xlsx',version:0},headers:['ID','Nội dung'],columns:{sourceId:0},canManage:false,selfMembershipId:10,cellVersions:{},rows:['UNEXECUTED','UNEXECUTED','OK','P','NA'].map((resultStatus,index)=>({rowId:101+index,caseId:201+index,sourceId:String(index+1),cells:[String(index+1),'Case thử'],resultStatus,resultVersion:0,canUpdateResult:true}))});
  testCasesApi.updateDocumentResult.mockResolvedValue({rowId:101,status:'OK',version:1});
  render(<TestingDocumentPage projectId={1} featureId={2} documentId={9} onBack={()=>{}}/>);
  expect(await screen.findByText('3/5 case · 60%')).toBeInTheDocument();
  expect(screen.getByRole('progressbar',{name:'Tiến độ file'})).toHaveAttribute('aria-valuenow','3');
  fireEvent.click(screen.getByRole('button',{name:'Kết quả test case 1'}));
  await waitFor(()=>expect(testCasesApi.updateDocumentResult).toHaveBeenCalledWith(1,9,101,expect.objectContaining({status:'OK',expectedVersion:0})));
  await waitFor(()=>expect(screen.getByRole('progressbar',{name:'Tiến độ file'})).toHaveAttribute('aria-valuenow','4'));
  fireEvent.change(screen.getByLabelText('Status'),{target:{value:'UNEXECUTED'}});
  expect(screen.getByRole('progressbar',{name:'Tiến độ file'})).toHaveAttribute('aria-valuetext','4/5 case · 80%');
  expect(screen.queryByText('Đợt kiểm thử')).not.toBeInTheDocument();
});
test('opens the page containing the linked row and marks that case',async()=>{
  testCasesApi.getDocument.mockResolvedValue({document:{id:9,featureId:2,fileName:'Cases.xlsx'},headers:['ID'],columns:{sourceId:0},rows:Array.from({length:25},(_,index)=>({rowId:101+index,caseId:201+index,sourceId:`CASE-${index+1}`,cells:[`CASE-${index+1}`],resultStatus:'UNEXECUTED'}))});
  render(<TestingDocumentPage projectId={1} featureId={2} documentId={9} caseId="125" onBack={()=>{}}/>);
  const linked=await screen.findByRole('button',{name:'CASE-25'});
  expect(linked.closest('tr')).toHaveAttribute('aria-current','true');
  expect(linked.closest('tr')).toHaveFocus();
});
test('a single cell tap opens its editor for a manager',async()=>{
  testCasesApi.documentCellHistory.mockResolvedValue([]);
  testCasesApi.getDocument.mockResolvedValue({document:{id:9,featureId:2,fileName:'Cases.xlsx'},headers:['ID','Content'],columns:{sourceId:0},canManage:true,rows:[{rowId:101,caseId:201,revisionId:301,sourceId:'TC1',cells:['TC1','Editable cell'],resultStatus:'UNEXECUTED'}]});
  render(<TestingDocumentPage projectId={1} featureId={2} documentId={9} onBack={()=>{}}/>);
  fireEvent.click(await screen.findByText('Editable cell'));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
});
test('shows current assignment names while hiding imported first and latest tester source cells',async()=>{
  testCasesApi.getDocument.mockResolvedValue({document:{id:9,featureId:2,fileName:'Cases.xlsx'},headers:['ID','Imported first','Imported latest','Imported status'],columns:{sourceId:0,tester:1,latestTester:2,result:3},rows:[{rowId:101,caseId:201,sourceId:'TC1',cells:['TC1','Imported first tester','Imported latest tester','OLD_IMPORT_STATUS'],resultStatus:'NG',firstTesterName:'Assigned first',latestTesterName:'Assigned latest'}]});
  render(<TestingDocumentPage projectId={1} featureId={2} documentId={9} onBack={()=>{}}/>);
  expect(await screen.findByText('Assigned latest')).toBeInTheDocument();
  expect(screen.queryByText('Imported first tester')).not.toBeInTheDocument();
  expect(screen.queryByText('Imported latest tester')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'TC1'}));
  const dialog=within(await screen.findByRole('dialog'));
  expect(dialog.queryByText('Imported first tester')).not.toBeInTheDocument();expect(dialog.queryByText('Imported latest tester')).not.toBeInTheDocument();expect(dialog.queryByText('OLD_IMPORT_STATUS')).not.toBeInTheDocument();
  expect(dialog.getByText('NG')).toBeInTheDocument();expect(dialog.getByText('Assigned first')).toBeInTheDocument();expect(dialog.getByText('Assigned latest')).toBeInTheDocument();
});
test('browses adjacent filtered cases in the detail dialog and returns to the selected case',async()=>{
 testCasesApi.getDocument.mockResolvedValue({document:{id:9,featureId:2,fileName:'Cases.xlsx'},headers:['ID','Nội dung'],columns:{sourceId:0},rows:[['TC1','Giữ'],['TC2','Ẩn'],['TC3','Giữ']].map(([sourceId,text],index)=>({rowId:101+index,sourceId,cells:[sourceId,text],resultStatus:'UNEXECUTED'}))});
 render(<TestingDocumentPage projectId={1} featureId={2} documentId={9} onBack={()=>{}}/>);
 await screen.findByRole('button',{name:'TC1'});fireEvent.change(screen.getByLabelText('Tìm trong file'),{target:{value:'Giữ'}});fireEvent.click(screen.getByRole('button',{name:'TC1'}));
 let dialog=within(screen.getByRole('dialog'));expect(dialog.getByRole('button',{name:'‹ Trước'})).toBeDisabled();expect(dialog.getByRole('button',{name:'Tiếp ›'})).toBeEnabled();
 fireEvent.click(dialog.getByRole('button',{name:'Tiếp ›'}));expect(screen.getByRole('dialog')).toHaveAccessibleName('Chi tiết test case TC3');
 dialog=within(screen.getByRole('dialog'));expect(dialog.getByRole('button',{name:'Tiếp ›'})).toBeDisabled();fireEvent.click(dialog.getByRole('button',{name:'Đóng chi tiết tài liệu'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'TC3'})).toHaveFocus());
});
test('explains that another Status is disabled while the current result is saving',async()=>{
 let finish;testCasesApi.updateDocumentResult.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 testCasesApi.getDocument.mockResolvedValue({document:{id:9,featureId:2,fileName:'Cases.xlsx'},headers:['ID'],columns:{sourceId:0},rows:[1,2].map(n=>({rowId:100+n,sourceId:String(n),cells:[String(n)],resultStatus:'UNEXECUTED',resultVersion:0,canUpdateResult:true}))});
 render(<TestingDocumentPage projectId={1} featureId={2} documentId={9} onBack={()=>{}}/>);fireEvent.click(await screen.findByRole('button',{name:'Kết quả test case 1'}));await screen.findByText('Đang lưu Status…');
 expect(screen.getByRole('button',{name:'Kết quả test case 2'})).toHaveAttribute('title','Đang lưu Status. Vui lòng chờ.');await act(async()=>finish({status:'OK',version:1}));
});
