import React from 'react';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {ticketTitlePrefix} from './ticketWorkflow';
import {FeatureIssueForm} from './FeatureIssueForm';
import {FeatureIssueBoard} from './FeatureIssueBoard';
import {FeatureIssueDetail} from './FeatureIssueDetail';

const labels=['Xác nhận spec','Chưa xử lý','Đang xử lý','Chờ xác nhận','Đóng – Đã xử lý','Đóng – Đã sửa','Đóng – Không thể tái hiện','Đóng – Không xử lý','QA – Đóng – Không được hỗ trợ'];
it('uses immutable object/file/case title tokens independently of issue type and keeps the suffix editable',async()=>{
 const source={title:'Editable suffix',testObject:'Login',fileName:'cases.xlsx',caseReference:'No 8',revisionId:4,resultVersion:2};
 expect(ticketTitlePrefix({type:'QA',source})).toBe('[Login][cases.xlsx][No 8]');expect(ticketTitlePrefix({type:'BUG',source})).toBe('[Login][cases.xlsx][No 8]');
 const api={context:vi.fn().mockResolvedValue(source),options:vi.fn().mockResolvedValue({assignees:[{membershipId:1,displayName:'Spec'}]}),create:vi.fn().mockResolvedValue({id:8})};
 render(<FeatureIssueForm projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/>);await screen.findByText('[Login][cases.xlsx][No 8]',{exact:true});
 fireEvent.change(screen.getByLabelText('Loại Issue'),{target:{value:'QA'}});fireEvent.change(screen.getByLabelText('Tiêu đề'),{target:{value:'Changed suffix'}});fireEvent.change(screen.getByLabelText('Nội dung câu hỏi'),{target:{value:'Question'}});await screen.findByRole('option',{name:'Spec'});fireEvent.change(screen.getByLabelText('Đầu mối tiếp nhận'),{target:{value:'1'}});fireEvent.click(screen.getByRole('button',{name:'Lưu Issue'}));await waitFor(()=>expect(api.create).toHaveBeenCalledOnce());expect(api.create.mock.lastCall[1]).toMatchObject({type:'QA',title:'[Login][cases.xlsx][No 8] Changed suffix',ticketState:'SPEC_CONFIRM'});
});
it('keeps monkey naming separate and never invents a case token or Feature fallback for missing source object',()=>{
 expect(ticketTitlePrefix({type:'BUG',monkey:true,featureName:'Search',source:{fileName:'fake.xlsx',caseReference:'Fake'}})).toBe('[Search][Monkey]');
 expect(ticketTitlePrefix({source:{fileName:'old.xlsx',caseReference:'TC-1'},featureName:'Latest Feature'})).toBe('[old.xlsx][TC-1]');
});
it('can report a valid long source with a meaningful suffix and recover from an overlong suffix without changing source evidence',async()=>{
 const source=Object.freeze({title:'Source suffix',testObject:'Đ'.repeat(255),fileName:'Workbooks-'+ '📋'.repeat(120)+'.xlsx',caseReference:'No 123456',revisionId:4,resultVersion:2,testVersionName:'Discovery v1',executedOn:'2026-11-03',steps:'Original steps',expectedResult:'Expected',actualResult:'Actual'});
 const api={context:vi.fn().mockResolvedValue(source),options:vi.fn().mockResolvedValue({assignees:[{membershipId:1,displayName:'Spec'}]}),create:vi.fn().mockResolvedValue({id:8})};
 render(<FeatureIssueForm projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/>);
 await waitFor(()=>expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Source suffix'));
 expect(screen.getByText(/Tiền tố đã được rút gọn/)).toBeInTheDocument();
 expect(screen.getByText(source.fileName+' · Case '+source.caseReference,{exact:true})).toBeInTheDocument();expect(screen.getByText(/Ngày thực hiện:/)).toHaveTextContent(source.testObject);
 fireEvent.change(screen.getByLabelText('Loại Issue'),{target:{value:'QA'}});fireEvent.change(screen.getByLabelText('Nội dung câu hỏi'),{target:{value:'Question'}});await screen.findByRole('option',{name:'Spec'});fireEvent.change(screen.getByLabelText('Đầu mối tiếp nhận'),{target:{value:'1'}});
 fireEvent.change(screen.getByLabelText('Tiêu đề'),{target:{value:'x'.repeat(300)}});await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu Issue'})).toBeDisabled());expect(screen.getByText(/Hãy rút gọn phần tiêu đề/)).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Tiêu đề'),{target:{value:'A meaningful question about the expected result'}});await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu Issue'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Lưu Issue'}));await waitFor(()=>expect(api.create).toHaveBeenCalledOnce());
 const payload=api.create.mock.lastCall[1];expect(payload.title.length).toBeLessThanOrEqual(300);expect(payload.title).toContain('…');expect(payload.title).toContain('.xlsx][No 123456]');expect(payload.title).toMatch(/A meaningful question about the expected result$/);expect(payload.title.isWellFormed()).toBe(true);
 expect(payload).toMatchObject({featureId:2,documentId:3,rowId:4,sourceRevisionId:4,sourceResultVersion:2,steps:'Original steps'});expect(screen.getByLabelText('Version lúc phát hiện')).toHaveValue('Discovery v1');expect(source.fileName).toHaveLength(255);expect(source.testObject).toHaveLength(255);
});
it('presents all nine board labels and the initial state in Vietnamese without changing IDs',async()=>{
 render(<><FeatureIssueBoard items={[]} onOpen={vi.fn()} onMove={vi.fn()}/><FeatureIssueForm projectId={1} featureId={2} monkey api={{options:vi.fn().mockResolvedValue({assignees:[]})}}/></>);
 const board=screen.getByRole('region',{name:'Bảng trạng thái Bug và QA'});expect(within(board).getAllByRole('heading').map(e=>e.textContent)).toEqual(labels);
 expect(screen.getByText('Trạng thái ban đầu: Chưa xử lý',{exact:true})).toBeInTheDocument();
});
it('localizes server English transitions, close reason, help and confirmation while preserving canonical payload',async()=>{
 const ticket={id:7,key:'P-7',type:'BUG',boardColumn:'processed',ticketState:'CLOSED',closureReason:'PROCESSED',version:2,canComment:true,allowedTransitions:[{state:'NEW',closureReason:null,columnId:'new',label:'New'},{state:'CLOSED',closureReason:'FIXED',columnId:'fixed',label:'Closed / Fixed'}]};
 const api={get:vi.fn().mockResolvedValue(ticket),comments:vi.fn().mockResolvedValue([]),responsibilities:vi.fn().mockResolvedValue({canManage:false,members:[]}),action:vi.fn().mockResolvedValue({...ticket,version:3})};
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);const states=await screen.findByLabelText('Trạng thái mới');expect(within(states).getByRole('option',{name:'Chưa xử lý',exact:true})).toHaveValue('NEW');expect(within(states).getByRole('option',{name:'Đóng',exact:true})).toHaveValue('CLOSED');
 fireEvent.change(states,{target:{value:'CLOSED'}});expect(screen.getByRole('option',{name:'Đóng – Đã sửa',exact:true})).toHaveValue('FIXED');expect(screen.queryByText(/Won’t Fix|Unsupported/)).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Gửi cập nhật'}));expect(screen.getByText('Xác nhận cập nhật P-7 → Đóng – Đã sửa?',{exact:true})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Xác nhận cập nhật'}));await waitFor(()=>expect(api.action).toHaveBeenCalledWith(1,7,expect.objectContaining({state:'CLOSED',closureReason:'FIXED'}),expect.anything()));
});
it('localizes conversion confirmation and finalized closure instead of exposing enums',async()=>{
 const ticket={id:7,key:'P-7',type:'QA',boardColumn:'spec',ticketState:'SPEC_CONFIRM',version:2,canComment:true,canConvertToBug:true,allowedTransitions:[]};const api={get:vi.fn().mockResolvedValue(ticket),comments:vi.fn().mockResolvedValue([]),responsibilities:vi.fn().mockResolvedValue({canManage:false,members:[{membershipId:1,userId:'u',displayName:'Coordinator',projectRole:'USER',duties:['BUG_COORDINATOR']}]}),action:vi.fn()};
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);fireEvent.click(await screen.findByLabelText('Chuyển QA thành Bug'));await screen.findByRole('option',{name:'Coordinator'});fireEvent.change(screen.getByLabelText('Người phụ trách Issue'),{target:{value:'1'}});fireEvent.click(screen.getByRole('button',{name:'Gửi cập nhật'}));expect(screen.getByText(/chuyển QA thành Bug \/ Chưa xử lý\./)).toBeInTheDocument();
});
it('shows finalized reason and canonical history in Vietnamese instead of internal enum strings',async()=>{
 const ticket={id:7,key:'P-7',type:'BUG',ticketState:'CLOSED',closureReason:'FIXED',boardColumn:'fixed',finalized:true,allowedTransitions:[]};const api={get:vi.fn().mockResolvedValue(ticket),comments:vi.fn().mockResolvedValue([]),history:vi.fn().mockResolvedValue([{id:1,actorName:'Tester',eventType:'TICKET_ACTION',before:{ticketState:'NEW'},after:{ticketState:'CLOSED',closureReason:'FIXED'}}])};
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);await screen.findByText('Đã hoàn tất · Đã sửa',{exact:true});fireEvent.click(screen.getByRole('button',{name:'Xem lịch sử Issue'}));expect(await screen.findByText('Chưa xử lý → Đóng – Đã sửa',{exact:true})).toBeInTheDocument();
});
