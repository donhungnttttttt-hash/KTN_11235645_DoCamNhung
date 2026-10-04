import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { TestDocumentPage } from './TestDocumentPage';
import { testCasesApi } from '../../services/api/testCases';
import { executionApi } from '../../services/api/execution';

const context=vi.hoisted(()=>({currentProject:{id:1,name:'Demo',projectRole:'TESTER'}}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>context}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({user:{id:'tester'}})}));
vi.mock('../../services/api/testCases',()=>({testCasesApi:{getDocument:vi.fn(),updateDocumentResult:vi.fn(),documentResultHistory:vi.fn(),exportDocument:vi.fn()}}));
vi.mock('../../services/api/execution',()=>({executionApi:{cycles:vi.fn(),record:vi.fn(),decideScope:vi.fn()}}));
beforeEach(()=>{
  vi.resetAllMocks();sessionStorage.clear();window.location.hash='';
  context.currentProject={id:1,name:'Demo',projectRole:'TESTER'};
  executionApi.cycles.mockResolvedValue({items:[],totalPages:0});
  const document={document:{id:9,fileName:'demo.xlsx',format:'CUSTOMER_V1'},headers:['ID','iPad*'],columns:{sourceId:0,result:1},rows:[1,2].map(id=>({rowId:id,caseId:id,sourceId:String(id),rowNumber:id+1,cells:[String(id),'Unexecuted'],sourceCells:[String(id),'OK'],resultStatus:'UNEXECUTED',resultVersion:0}))};
  testCasesApi.getDocument.mockImplementation(async()=>structuredClone(document));
  testCasesApi.updateDocumentResult.mockImplementation(async(p,d,id,input)=>{
    const row=document.rows.find(r=>r.rowId===id);expect(input.expectedVersion).toBe(row.resultVersion);
    row.resultStatus=input.status;row.resultVersion++;row.cells[1]=input.status;
    return {rowId:id,status:input.status,version:row.resultVersion,updatedBy:'Tester',updatedAt:'2026-10-04T12:00:00Z'};
  });
  testCasesApi.documentResultHistory.mockResolvedValue([]);
});
async function open(){const user=userEvent.setup();const view=render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);const button=await screen.findByRole('button',{name:'Kết quả test case 1'});await waitFor(()=>expect(button).toBeEnabled());return {user,button,...view};}

it('cycles repeatedly on the cell without any extra row, form, modal or context picker',async()=>{
  const {user,button}=await open();expect(button).toHaveTextContent('Unexecuted');
  for(let round=0;round<2;round++)for(const [label,color] of [['OK','ok'],['P','pending'],['NG','ng'],['Fixed','fixed'],['NA','na'],['Unexecuted','-']]){
    await user.click(button);expect(button).toHaveTextContent(label);
    expect(button.closest('td')).toHaveClass(`td-outcome-${color}`);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('region',{name:'Lưu kết quả test case 1'})).toBeNull();
    expect(screen.queryByLabelText('Đợt ghi kết quả')).toBeNull();
    expect(screen.queryByText('Chưa lưu',{exact:true})).toBeNull();
    expect(screen.getAllByRole('row')).toHaveLength(3);
  }
  expect(executionApi.record).not.toHaveBeenCalled();expect(executionApi.decideScope).not.toHaveBeenCalled();
});
it('keeps each row selection independently when filtering and changing another row',async()=>{
  const {user,button}=await open();await user.click(button);await user.click(button);
  await user.click(screen.getByRole('button',{name:'Kết quả test case 2'}));
  expect(button).toHaveTextContent('P');
  await user.selectOptions(screen.getByLabelText('Lọc kết quả'),'PENDING');
  expect(screen.getByRole('button',{name:'Kết quả test case 1'})).toHaveTextContent('P');
  expect(screen.queryByRole('button',{name:'Kết quả test case 2'})).toBeNull();
  await user.click(screen.getByRole('button',{name:'Xóa bộ lọc'}));
  expect(screen.getByRole('button',{name:'Kết quả test case 2'})).toHaveTextContent('OK');
});
it('persists choices across reload without overwriting Excel source',async()=>{
  const {user,button,unmount}=await open();await user.click(button);
  await screen.findByText(/Đã lưu · Tester/);
  unmount();await open();expect(screen.getByRole('button',{name:'Kết quả test case 1'})).toHaveTextContent('OK');
  expect((await testCasesApi.getDocument()).rows[0].sourceCells[1]).toBe('OK');
});
it('serializes quick clicks and prevents export until the last write completes',async()=>{
  const save=testCasesApi.updateDocumentResult.getMockImplementation();let resolve;
  testCasesApi.updateDocumentResult.mockImplementationOnce((...args)=>new Promise(done=>{resolve=()=>save(...args).then(done);}));
  const {user,button}=await open();await user.click(button);await user.click(button);await user.click(button);
  expect(button).toHaveTextContent('NG');expect(testCasesApi.updateDocumentResult).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button',{name:'Xuất Excel'})).toBeDisabled();
  resolve();await waitFor(()=>expect(testCasesApi.updateDocumentResult).toHaveBeenCalledTimes(3));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Xuất Excel'})).toBeEnabled());
  expect(testCasesApi.updateDocumentResult.mock.calls.map(c=>c[3].expectedVersion)).toEqual([0,1,2]);
});
it('shows save failures, restores saved state and requires reload before export or edits',async()=>{
  testCasesApi.updateDocumentResult.mockRejectedValueOnce(new Error('Xung đột phiên bản'));
  const {user,button}=await open();await user.click(button);
  expect(await screen.findByRole('alert')).toHaveTextContent('Xung đột phiên bản');
  expect(button).toHaveTextContent('Unexecuted');expect(button).toBeDisabled();
  expect(screen.getByRole('button',{name:'Xuất Excel'})).toBeDisabled();
  await user.click(screen.getByRole('button',{name:'Tải lại kết quả đã lưu'}));
  await waitFor(()=>expect(button).toBeEnabled());expect(screen.queryByRole('alert')).toBeNull();
});
it('keeps history as a separate explicit action',async()=>{
  const {user,button}=await open();await user.click(button);expect(screen.queryByRole('dialog')).toBeNull();
  await user.click(screen.getAllByRole('button',{name:'Lịch sử / chứng cứ'})[0]);
  expect(await screen.findByRole('dialog')).toBeVisible();
});
it('does not allow cycling archived project data',async()=>{
  context.currentProject.archived=true;
  render(<TestDocumentPage documentId="9" navigate={vi.fn()}/>);
  expect(await screen.findByRole('button',{name:'Kết quả test case 1'})).toBeDisabled();
});
