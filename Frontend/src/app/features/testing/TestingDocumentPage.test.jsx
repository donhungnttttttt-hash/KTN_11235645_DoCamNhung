import React from 'react';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {expect,test,vi} from 'vitest';
import {TestingDocumentPage} from './TestingDocumentPage';
import {testCasesApi} from '../../services/api/testCases';
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
