import React from 'react';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {FeatureIssueForm} from './FeatureIssueForm';
import {FeatureIssueDetail} from './FeatureIssueDetail';
import {FeatureIssueBoard} from './FeatureIssueBoard';

const contacts={assignees:[{membershipId:11,userId:'u1',displayName:'Spec contact'}]};
const members={canManage:true,members:[{membershipId:11,userId:'u1',displayName:'Spec contact',duties:['SPEC_REVIEWER'],version:0},{membershipId:12,userId:'u2',displayName:'Coordinator',duties:['BUG_COORDINATOR'],version:0}]};
const ticket={id:7,key:'P-7',title:'Question',type:'QA',ticketState:'SPEC_CONFIRM',boardColumn:'spec',version:2,canComment:true,canAssign:true,canConvertToBug:true,allowedTransitions:[{state:'CLOSED',closureReason:'UNSUPPORTED',columnId:'unsupported',label:'Không hỗ trợ'}]};
const apiFor=(item=ticket)=>({get:vi.fn().mockResolvedValue(item),comments:vi.fn().mockResolvedValue([]),responsibilities:vi.fn().mockResolvedValue(members),options:vi.fn().mockResolvedValue(contacts),action:vi.fn().mockResolvedValue({...item,version:3})});

it.each([[null,'USER'],[99,'USER'],[null,'PM']])('manager explicitly repairs coordinator %s through the same eligible %s assignee with confirmation',async (coordinatorMembershipId,projectRole)=>{
 const item={...ticket,type:'BUG',canConvertToBug:false,assigneeMembershipId:12,coordinatorMembershipId};const api=apiFor(item);api.action.mockResolvedValue({...item,coordinatorMembershipId:12,version:3});
 api.responsibilities.mockResolvedValue({...members,members:members.members.map(member=>member.membershipId===12?{...member,projectRole,duties:projectRole==='PM'?[]:member.duties}:member)});
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);await waitFor(()=>expect(within(screen.getByLabelText('Người phụ trách Issue')).getByRole('option',{name:'Coordinator'})).toBeInTheDocument());
 expect(screen.getByRole('button',{name:'Gửi cập nhật'})).toBeDisabled();fireEvent.change(screen.getByLabelText('Người phụ trách Issue'),{target:{value:'12'}});
 expect(screen.getByText(/Điều phối Bug sẽ được cập nhật thành: Coordinator/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Gửi cập nhật'})).toBeEnabled();fireEvent.click(screen.getByRole('button',{name:'Gửi cập nhật'}));expect(api.action).not.toHaveBeenCalled();
 expect(screen.getByRole('region',{name:'Xác nhận cập nhật Ticket'})).toHaveTextContent('Điều phối Bug sẽ được cập nhật thành: Coordinator');fireEvent.click(screen.getByRole('button',{name:'Xác nhận cập nhật'}));await waitFor(()=>expect(api.action).toHaveBeenCalledOnce());expect(api.action.mock.lastCall[2]).toMatchObject({assigneeMembershipId:12,expectedVersion:2});expect(api.action.mock.lastCall[2]).not.toHaveProperty('body');expect(screen.getByRole('button',{name:'Gửi cập nhật'})).toBeDisabled();
});
it('same-assignee selection of a worker without coordinator eligibility cannot repair a missing coordinator',async()=>{
 const api=apiFor({...ticket,type:'BUG',canConvertToBug:false,assigneeMembershipId:12,coordinatorMembershipId:null});api.responsibilities.mockResolvedValue({...members,members:[{membershipId:12,userId:'u2',displayName:'Worker',projectRole:'USER',duties:[]}]});render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);await waitFor(()=>expect(within(screen.getByLabelText('Người phụ trách Issue')).getByRole('option',{name:'Worker'})).toBeInTheDocument());fireEvent.change(screen.getByLabelText('Người phụ trách Issue'),{target:{value:'12'}});expect(screen.getByRole('button',{name:'Gửi cập nhật'})).toBeDisabled();expect(screen.queryByText(/Điều phối Bug sẽ được cập nhật/)).not.toBeInTheDocument();
});
it.each([true,false])('same-assignee comment preserves coordinator unless manager explicitly selects repair (manager=%s)',async canManage=>{
 const item={...ticket,type:'BUG',canConvertToBug:false,assigneeMembershipId:12,coordinatorMembershipId:null};const api=apiFor(item);api.responsibilities.mockResolvedValue({...members,canManage});
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);await waitFor(()=>expect(within(screen.getByLabelText('Người phụ trách Issue')).getByRole('option',{name:'Coordinator'})).toBeInTheDocument());
 if(!canManage){fireEvent.change(screen.getByLabelText('Người phụ trách Issue'),{target:{value:'12'}});expect(screen.queryByText(/Điều phối Bug sẽ được cập nhật/)).not.toBeInTheDocument();expect(screen.queryByLabelText('Người xác nhận lại')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Gửi cập nhật'})).toBeDisabled();}
 fireEvent.change(screen.getByLabelText('Ghi chú Issue'),{target:{value:'Just a comment'}});fireEvent.click(screen.getByRole('button',{name:'Gửi cập nhật'}));await waitFor(()=>expect(api.action).toHaveBeenCalledOnce());expect(api.action.mock.lastCall[2]).not.toHaveProperty('assigneeMembershipId');
});
it('selecting the current coordinator and assignee is still no change',async()=>{
 const api=apiFor({...ticket,type:'BUG',canConvertToBug:false,assigneeMembershipId:12,coordinatorMembershipId:12});render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);await waitFor(()=>expect(within(screen.getByLabelText('Người phụ trách Issue')).getByRole('option',{name:'Coordinator'})).toBeInTheDocument());fireEvent.change(screen.getByLabelText('Người phụ trách Issue'),{target:{value:'12'}});expect(screen.getByRole('button',{name:'Gửi cập nhật'})).toBeDisabled();expect(screen.queryByText(/Điều phối Bug sẽ được cập nhật/)).not.toBeInTheDocument();
});

it('renders API ticket key and live Feature context without spreading the reserved React key',async()=>{
 const error=vi.spyOn(console,'error').mockImplementation(()=>{});
 try {
  render(<FeatureIssueDetail projectId={1} id={7} api={apiFor({...ticket,featureId:4,featureName:'Live feature',featureEnvironment:'Live environment'})}/>);
  await screen.findByText('Live environment',{exact:true});expect(screen.getByText('P-7 · Question',{exact:true})).toBeInTheDocument();
  expect(error.mock.calls.filter(args=>args.some(value=>typeof value==='string'&&value.includes('key')&&value.includes('spread')))).toHaveLength(0);
 } finally {error.mockRestore();}
});

it('reloads contacts after a duty is revoked, marks the invalid selection and retains the complete draft',async()=>{
 const api={options:vi.fn().mockResolvedValue(contacts),create:vi.fn()};
 render(<FeatureIssueForm projectId={1} featureId={2} monkey api={api}/>);
 await screen.findByRole('option',{name:'Spec contact'});
 fireEvent.change(screen.getByLabelText('Tiêu đề'),{target:{value:'Keep title'}});
 fireEvent.change(screen.getByLabelText('Môi trường phát hiện'),{target:{value:'Keep environment'}});
 fireEvent.change(screen.getByLabelText('Đầu mối tiếp nhận'),{target:{value:'11'}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu Issue'})).toBeEnabled());api.options.mockResolvedValue({assignees:[{membershipId:12,displayName:'Replacement'}]});
 fireEvent.click(screen.getByRole('button',{name:'Tải lại đầu mối'}));
 await screen.findByRole('option',{name:'Replacement'});
 expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Keep title');expect(screen.getByLabelText('Môi trường phát hiện')).toHaveValue('Keep environment');
 expect(screen.getByRole('option',{name:'Đầu mối không còn đủ điều kiện'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'Lưu Issue'})).toBeDisabled();expect(api.create).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Đầu mối tiếp nhận'),{target:{value:'12'}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu Issue'})).toBeEnabled());
});

it('prefills immutable source evidence and sends a QA spec contact with SPEC_CONFIRM while keeping Feature environment separate',async()=>{
 const api={options:vi.fn().mockResolvedValue(contacts),context:vi.fn().mockResolvedValue({title:'Login',steps:'Open',expectedResult:'Visible',actualResult:'Missing',preconditions:'Signed out',caseReference:'TC-9',testObject:'Login screen',testVersionId:4,testVersionName:'v4',executedOn:'2026-11-03',revisionId:8,resultVersion:3,featureName:'Live',featureEnvironment:'live-env'}),create:vi.fn().mockResolvedValue({id:9})};
 render(<FeatureIssueForm projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/>);
 expect(await screen.findByLabelText('Điều kiện tiên quyết')).toHaveValue('Signed out');
 expect(screen.getByLabelText('Version lúc phát hiện')).toHaveValue('v4');expect(screen.getByLabelText('Version lúc phát hiện')).toHaveAttribute('readonly');
 expect(screen.getByLabelText('Môi trường phát hiện')).toHaveValue('');
 fireEvent.change(screen.getByLabelText('Loại Issue'),{target:{value:'QA'}});
 fireEvent.change(screen.getByLabelText('Nội dung câu hỏi'),{target:{value:'Spec question'}});
 fireEvent.change(await screen.findByLabelText('Đầu mối tiếp nhận'),{target:{value:'11'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu Issue'}));
 await waitFor(()=>expect(api.create).toHaveBeenCalledOnce());
 expect(api.create.mock.calls[0][1]).toMatchObject({ticketState:'SPEC_CONFIRM',assigneeMembershipId:11,sourceRevisionId:8,sourceResultVersion:3,description:'Spec question'});
 expect(api.create.mock.calls[0][1]).not.toHaveProperty('testVersionId');
});

it('posts an ordinary comment atomically without assignment or state and retains draft and request key after conflict',async()=>{
 const api=apiFor();api.action.mockRejectedValue(new Error('Version conflict'));
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);
 fireEvent.change(await screen.findByLabelText('Ghi chú Issue'),{target:{value:'My draft'}});
 fireEvent.click(screen.getByRole('button',{name:'Gửi cập nhật'}));await screen.findByText(/Version conflict/);
 expect(screen.getByLabelText('Ghi chú Issue')).toHaveValue('My draft');
 const payload=api.action.mock.calls[0][2];expect(payload).toMatchObject({body:'My draft',expectedVersion:2});
 expect(payload).not.toHaveProperty('state');expect(payload).not.toHaveProperty('assigneeMembershipId');
 fireEvent.click(screen.getByRole('button',{name:'Gửi cập nhật'}));await waitFor(()=>expect(api.action).toHaveBeenCalledTimes(2));expect(api.action.mock.calls[1][2].requestKey).toBe(payload.requestKey);
});

it('chooses a CLOSED reason from server transitions and confirms same-ID QA conversion with coordinator',async()=>{
 const api=apiFor();render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);
 fireEvent.change(await screen.findByLabelText('Trạng thái mới'),{target:{value:'CLOSED'}});
 expect(screen.getByLabelText('Lý do đóng')).toHaveValue('UNSUPPORTED');
 fireEvent.click(screen.getByRole('button',{name:'Gửi cập nhật'}));
 expect(api.action).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Hủy xác nhận'}));
 fireEvent.click(screen.getByLabelText('Chuyển QA thành Bug'));
 fireEvent.change(await screen.findByLabelText('Người phụ trách Issue'),{target:{value:'12'}});
 fireEvent.click(screen.getByRole('button',{name:'Gửi cập nhật'}));
 expect(screen.getByText(/Giữ nguyên mã/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Hủy xác nhận'})).toHaveFocus();
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận cập nhật'}));
 await waitFor(()=>expect(api.action).toHaveBeenCalledWith(1,7,expect.objectContaining({convertToBug:true,assigneeMembershipId:12}),expect.anything()));
});

it('shows nine ordered server totals even when a page has no cards and offers column loading',()=>{
 const onColumn=vi.fn();render(<FeatureIssueBoard items={[]} columns={[{id:'new',count:35}]} onColumn={onColumn} onOpen={vi.fn()} onMove={vi.fn()}/>);
 const board=screen.getByRole('region',{name:'Bảng trạng thái Bug và QA'});
 expect(within(board).getAllByRole('region')).toHaveLength(9);
 const column=within(board).getByRole('region',{name:'Cột Chưa xử lý'});expect(within(column).getByLabelText('35 Issue theo bộ lọc')).toBeInTheDocument();
 expect(within(column).queryByText('Chưa có Issue')).not.toBeInTheDocument();
 fireEvent.click(within(column).getByRole('button',{name:'Xem cột Chưa xử lý'}));expect(onColumn).toHaveBeenCalledWith('new');
});

it('retains and exposes an action draft when reload revokes capabilities, and prevents resubmission',async()=>{
 const api=apiFor({...ticket,canAssign:false,canConvertToBug:false,allowedTransitions:[]});
 api.get.mockResolvedValueOnce({...ticket,canAssign:false,canConvertToBug:false,allowedTransitions:[]}).mockResolvedValue({...ticket,canComment:false,canAssign:false,canConvertToBug:false,allowedTransitions:[],version:3});
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);
 fireEvent.change(await screen.findByLabelText('Ghi chú Issue'),{target:{value:'Keep revoked draft'}});
 fireEvent.click(screen.getByRole('button',{name:'Tải lại Issue'}));
 await screen.findByText(/Đã tải nội dung hiện tại/);
 expect(screen.getByLabelText('Ghi chú Issue')).toHaveValue('Keep revoked draft');expect(screen.getByLabelText('Ghi chú Issue')).toHaveAttribute('readonly');
 expect(screen.getByRole('button',{name:'Gửi cập nhật'})).toBeDisabled();expect(api.action).not.toHaveBeenCalled();
});

it('edits converted QA without inventing missing Bug evidence and omits unchanged discovery metadata',async()=>{
 const item={...ticket,type:'BUG',convertedFromQa:true,canEdit:true,canComment:false,canAssign:false,canConvertToBug:false,allowedTransitions:[],description:'Original QA',steps:'',expectedResult:'',actualResult:'',frequency:'',environment:'',device:''};
 const api=apiFor(item);api.update=vi.fn().mockResolvedValue({...item,title:'Adjusted',version:3});
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);fireEvent.click(await screen.findByRole('button',{name:'Sửa nội dung Issue'}));
 fireEvent.change(screen.getByLabelText('Tiêu đề Issue'),{target:{value:'Adjusted'}});fireEvent.click(screen.getByRole('button',{name:'Lưu nội dung Issue'}));
 await waitFor(()=>expect(api.update).toHaveBeenCalledOnce());const payload=api.update.mock.calls[0][2];expect(payload).toMatchObject({steps:'',expectedResult:'',actualResult:'',expectedVersion:2});for(const key of ['frequency','environment','device','testVersionName'])expect(payload).not.toHaveProperty(key);
});

it('keeps source conflict drafts while visibly loading new source revisions for explicit resubmission',async()=>{
 const source={title:'Case title',steps:'Old steps',expectedResult:'Expected',actualResult:'Actual',revisionId:2,resultVersion:3,testVersionName:'v1',caseReference:'N-1'};
 const api={options:vi.fn().mockResolvedValue(contacts),context:vi.fn().mockResolvedValueOnce(source).mockResolvedValue({...source,revisionId:5,resultVersion:6,testVersionName:'v2',steps:'New steps'}),create:vi.fn().mockRejectedValueOnce(new Error('Source changed')).mockResolvedValue({id:9})};
 render(<FeatureIssueForm projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/>);
 await screen.findByRole('option',{name:'Spec contact'});await waitFor(()=>expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Case title'));
 fireEvent.change(screen.getByLabelText('Loại Issue'),{target:{value:'QA'}});fireEvent.change(screen.getByLabelText('Nội dung câu hỏi'),{target:{value:'Retained question'}});await screen.findByRole('option',{name:'Spec contact'});fireEvent.change(screen.getByLabelText('Đầu mối tiếp nhận'),{target:{value:'11'}});fireEvent.click(screen.getByRole('button',{name:'Lưu Issue'}));await screen.findByText(/Source changed/);
 fireEvent.click(screen.getByRole('button',{name:'Tải lại nội dung case'}));await waitFor(()=>expect(screen.getByLabelText('Version lúc phát hiện')).toHaveValue('v2'));
 expect(screen.getByLabelText('Nội dung câu hỏi')).toHaveValue('Retained question');expect(screen.getByLabelText('Các bước thực hiện')).toHaveValue('Old steps');expect(api.create).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:'Lưu Issue'}));await waitFor(()=>expect(api.create).toHaveBeenCalledTimes(2));expect(api.create.mock.lastCall[1]).toMatchObject({sourceRevisionId:5,sourceResultVersion:6,steps:'Old steps'});
});

it('converts a QA assigned to the same dual-duty coordinator with an explicit unchanged assignee',async()=>{
 const item={...ticket,assigneeMembershipId:11};const api=apiFor(item);
 api.responsibilities.mockResolvedValue({canManage:false,members:[{membershipId:11,userId:'u1',displayName:'Dual duty',projectRole:'USER',duties:['SPEC_REVIEWER','BUG_COORDINATOR'],version:0}]});
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);fireEvent.click(await screen.findByLabelText('Chuyển QA thành Bug'));
 await screen.findByRole('option',{name:'Dual duty'});fireEvent.change(screen.getByLabelText('Người phụ trách Issue'),{target:{value:'11'}});fireEvent.click(screen.getByRole('button',{name:'Gửi cập nhật'}));fireEvent.click(screen.getByRole('button',{name:'Xác nhận cập nhật'}));
 await waitFor(()=>expect(api.action).toHaveBeenCalledWith(1,7,expect.objectContaining({convertToBug:true,assigneeMembershipId:11,expectedVersion:2}),expect.anything()));
 expect(api.action.mock.lastCall[2]).not.toHaveProperty('state');
});

it('allows coordinator content editing and assignment while excluding manager-only priority from controls and PUT',async()=>{
 const item={...ticket,type:'BUG',canConvertToBug:false,canEdit:true,priority:'MEDIUM',steps:'Steps',expectedResult:'Expected',actualResult:'Actual'};const api=apiFor(item);api.responsibilities.mockResolvedValue({...members,canManage:false});api.update=vi.fn().mockResolvedValue({...item,title:'Coordinator edit',version:3});
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);await screen.findByRole('option',{name:'Coordinator'});fireEvent.click(screen.getByRole('button',{name:'Sửa nội dung Issue'}));
 expect(screen.queryByLabelText('Mức ưu tiên')).not.toBeInTheDocument();expect(screen.getByLabelText('Người phụ trách Issue')).toBeEnabled();fireEvent.change(screen.getByLabelText('Tiêu đề Issue'),{target:{value:'Coordinator edit'}});fireEvent.click(screen.getByRole('button',{name:'Lưu nội dung Issue'}));
 await waitFor(()=>expect(api.update).toHaveBeenCalledOnce());expect(api.update.mock.lastCall[2]).toMatchObject({title:'Coordinator edit',expectedVersion:2});expect(api.update.mock.lastCall[2]).not.toHaveProperty('priority');
});

it('preserves revoked priority visibly and offers explicit reset while retaining other content draft',async()=>{
 const item={...ticket,type:'BUG',canConvertToBug:false,canEdit:true,priority:'MEDIUM',steps:'Steps',expectedResult:'Expected',actualResult:'Actual'};const api=apiFor(item);api.update=vi.fn().mockResolvedValue({...item,title:'Retained title',version:3});
 api.responsibilities.mockResolvedValueOnce(members).mockResolvedValue({...members,canManage:false});
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);await screen.findByLabelText('Người xác nhận lại');fireEvent.click(screen.getByRole('button',{name:'Sửa nội dung Issue'}));
 fireEvent.change(screen.getByLabelText('Tiêu đề Issue'),{target:{value:'Retained title'}});fireEvent.change(screen.getByLabelText('Mức ưu tiên'),{target:{value:'HIGH'}});fireEvent.click(screen.getByRole('button',{name:'Tải lại người phụ trách'}));
 await waitFor(()=>expect(screen.queryByLabelText('Người xác nhận lại')).not.toBeInTheDocument());
 expect(screen.getByLabelText('Mức ưu tiên')).toHaveValue('HIGH');expect(screen.getByLabelText('Mức ưu tiên')).toBeDisabled();expect(screen.getByRole('button',{name:'Lưu nội dung Issue'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Bỏ thay đổi ưu tiên'}));expect(screen.queryByLabelText('Mức ưu tiên')).not.toBeInTheDocument();expect(screen.getByLabelText('Tiêu đề Issue')).toHaveValue('Retained title');
 fireEvent.click(screen.getByRole('button',{name:'Lưu nội dung Issue'}));await waitFor(()=>expect(api.update).toHaveBeenCalledOnce());expect(api.update.mock.lastCall[2]).not.toHaveProperty('priority');
});
