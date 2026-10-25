import React from 'react';
import {render,screen,fireEvent,waitFor,act,within} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {FeatureIssueDetail} from './FeatureIssueDetail';

it.each(['BUG','QA'])('shows current Feature information for %s and refreshes it without changing an Issue draft',async(type)=>{
 const item={id:7,key:'P-7',title:'Issue',type,monkey:type==='BUG',featureId:8,featureName:'Test 25 tháng 10',featureEnvironment:'idec-test100',featureDescription:'Sử dụng test ST app Duolingo\nDòng thứ hai',description:'Issue description',canComment:true};
 const api={get:vi.fn().mockResolvedValueOnce(item).mockResolvedValue({...item,featureName:'Updated Feature',featureEnvironment:'staging-200',featureDescription:'<script>plain text</script>'}),comments:vi.fn().mockResolvedValue([])};
 render(<FeatureIssueDetail projectId={42} id={7} api={api}/>);
 const context=within(await screen.findByRole('region',{name:'Thông tin Feature hiện tại'}));
 expect(context.getByText('Test 25 tháng 10')).toBeInTheDocument();
 expect(context.getByText('Môi trường / server')).toBeInTheDocument();
 expect(context.getByText('idec-test100')).toBeInTheDocument();
 expect(context.getByText(/Sử dụng test ST app Duolingo/)).toHaveTextContent('Dòng thứ hai');
 const note=screen.getByLabelText('Ghi chú Issue');fireEvent.change(note,{target:{value:'Unsaved note'}});
 fireEvent.click(screen.getByRole('button',{name:'Tải lại Issue'}));
 expect(await context.findByText('staging-200')).toBeInTheDocument();
 expect(context.getByText('Updated Feature')).toBeInTheDocument();
 expect(context.getByText('<script>plain text</script>')).toBeInTheDocument();
 expect(context.queryByText('idec-test100')).not.toBeInTheDocument();
 expect(screen.getByText('Issue description')).toBeInTheDocument();expect(note).toHaveValue('Unsaved note');
 expect(document.querySelector('.feature-issue-context script')).toBeNull();
});

it.each([undefined,'  '])('labels missing Feature information explicitly (%s)',async(missing)=>{
 const api={get:vi.fn().mockResolvedValue({id:7,key:'P-7',title:'Issue',type:'QA',featureId:8,featureName:missing,featureEnvironment:missing,featureDescription:null}),comments:vi.fn().mockResolvedValue([])};
 render(<FeatureIssueDetail projectId={42} id={7} api={api}/>);
 const context=within(await screen.findByRole('region',{name:'Thông tin Feature hiện tại'}));
 expect(context.getByText('Feature #8')).toBeInTheDocument();
 expect(context.getByText('Chưa ghi môi trường / server')).toBeInTheDocument();
 expect(context.getByText('Chưa có mô tả Feature')).toBeInTheDocument();
});

it('links a source Issue back to its Feature, file and case and exposes priority to readers',async()=>{
 const api={get:vi.fn().mockResolvedValue({id:7,key:'P-7',title:'Linked',type:'BUG',featureId:8,featureName:'Login',documentId:9,fileName:'Login.xlsx',rowId:10,caseNo:'TC-001',priority:'HIGH'}),comments:vi.fn().mockResolvedValue([])};
 render(<FeatureIssueDetail projectId={42} id={7} api={api}/>);
 expect(await screen.findByRole('link',{name:'Mở case TC-001'})).toHaveAttribute('href','#/board/testing/features/8/documents/9?projectId=42&caseId=10');
 expect(screen.getByRole('link',{name:'Mở Feature Login'})).toHaveAttribute('href','#/board/testing/features/8?projectId=42');
 expect(screen.getByRole('link',{name:'Mở file Login.xlsx'})).toHaveAttribute('href','#/board/testing/features/8/documents/9?projectId=42');
 expect(screen.getByText('Mức ưu tiên: Cao')).toBeInTheDocument();
});

it('keeps a manual retest note when saving fails and sends the current issue version',async()=>{
 const api={get:vi.fn().mockResolvedValue({id:7,key:'P-7',title:'Issue',type:'BUG',status:'open',version:2,canComment:true}),comments:vi.fn().mockResolvedValue([]),comment:vi.fn().mockRejectedValue(new Error('Chưa lưu ghi chú'))};
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);
 const input=await screen.findByLabelText('Ghi chú Issue');
 fireEvent.change(input,{target:{value:'Đã xác nhận kiểm thử lại, case hiện OK'}});
 fireEvent.click(screen.getByRole('button',{name:'Thêm ghi chú'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu ghi chú');
 expect(input).toHaveValue('Đã xác nhận kiểm thử lại, case hiện OK');
 expect(api.comment).toHaveBeenCalledWith(1,7,expect.objectContaining({expectedVersion:2,body:'Đã xác nhận kiểm thử lại, case hiện OK'}),expect.anything());
 fireEvent.click(screen.getByRole('button',{name:'Thêm ghi chú'}));await waitFor(()=>expect(api.comment).toHaveBeenCalledTimes(2));
 expect(api.comment.mock.calls[0][2].requestKey).toBe(api.comment.mock.calls[1][2].requestKey);
});

it('accepts a newly requested allowed status while the same detail remains open',async()=>{
 const api={get:vi.fn().mockResolvedValue({id:7,key:'P-7',title:'Issue',type:'BUG',status:'open',canTransition:true,allowedStatuses:[{id:'progress',label:'Đang xử lý'},{id:'resolved',label:'Đã xử lý'}]}),comments:vi.fn().mockResolvedValue([])};
 const view=render(<FeatureIssueDetail projectId={1} id={7} api={api} initialStatus="progress"/>);expect(await screen.findByLabelText('Trạng thái mới')).toHaveValue('progress');
 view.rerender(<FeatureIssueDetail projectId={1} id={7} api={api} initialStatus="resolved"/>);expect(screen.getByLabelText('Trạng thái mới')).toHaveValue('resolved');
});

it('keeps the edit draft and blocks a write until a failed assignment directory is retried',async()=>{
 const item={id:7,key:'P-7',title:'Original',type:'BUG',version:2,steps:'Steps',expectedResult:'Expected',actualResult:'Actual',priority:'MEDIUM',canEdit:true,canAssign:true};
 const api={get:vi.fn().mockResolvedValue(item),comments:vi.fn().mockResolvedValue([]),update:vi.fn().mockResolvedValue({...item,title:'Draft',version:3})};
 const memberApi={listMembers:vi.fn().mockRejectedValueOnce(new Error('Chưa tải DEV')).mockResolvedValue([{membershipId:11,displayName:'Eligible DEV',projectRole:'DEV',systemRole:'DEV',active:true,enabled:true}])};
 render(<FeatureIssueDetail projectId={1} id={7} api={api} memberApi={memberApi}/>);fireEvent.click(await screen.findByRole('button',{name:'Sửa nội dung Issue'}));await screen.findByText('Chưa tải DEV');
 fireEvent.change(screen.getByLabelText('Tiêu đề Issue'),{target:{value:'Draft'}});expect(screen.getByRole('button',{name:'Lưu nội dung Issue'})).toBeDisabled();expect(api.update).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Tải lại người phụ trách'}));await screen.findByRole('option',{name:'Eligible DEV'});expect(screen.getByLabelText('Tiêu đề Issue')).toHaveValue('Draft');
 fireEvent.change(screen.getByLabelText('Người phụ trách Issue'),{target:{value:'11'}});fireEvent.click(screen.getByRole('button',{name:'Lưu nội dung Issue'}));await waitFor(()=>expect(api.update).toHaveBeenCalledWith(1,7,expect.objectContaining({assigneeMembershipId:11,title:'Draft',expectedVersion:2}),expect.anything()));
});

it('shows read-only content without mutation controls when the API grants no capabilities',async()=>{
 const memberApi={listMembers:vi.fn()},api={get:vi.fn().mockResolvedValue({id:7,key:'P-7',title:'Read only',type:'QA',canEdit:false,canAssign:false,canDelete:false,canTransition:false,canComment:false}),comments:vi.fn().mockResolvedValue([])};
 render(<FeatureIssueDetail projectId={1} id={7} api={api} memberApi={memberApi}/>);await screen.findByText('P-7 · Read only');
 for(const name of ['Sửa nội dung Issue','Xóa Bug monkey','Lưu trạng thái','Thêm ghi chú'])expect(screen.queryByRole('button',{name})).not.toBeInTheDocument();expect(memberApi.listMembers).not.toHaveBeenCalled();
});

it('does not erase an appended note when an earlier comments read completes late',async()=>{
 let finishRead;const item={id:7,key:'P-7',title:'Issue',type:'BUG',version:2,canComment:true};
 const api={get:vi.fn().mockResolvedValue(item),comments:vi.fn(()=>new Promise(resolve=>{finishRead=resolve;})),comment:vi.fn().mockResolvedValue({id:3,body:'Saved note',version:3})};
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);const input=await screen.findByLabelText('Ghi chú Issue');fireEvent.change(input,{target:{value:'Saved note'}});fireEvent.click(screen.getByRole('button',{name:'Thêm ghi chú'}));await screen.findByText('Saved note');
 await act(async()=>finishRead([]));expect(screen.getByText('Saved note')).toBeInTheDocument();
});

it('ignores a late command result after the detail changes to another issue',async()=>{
 let finish;const changed=vi.fn(),api={get:vi.fn((_p,id)=>Promise.resolve({id,key:'P-'+id,title:'Issue '+id,type:'BUG',version:0,canComment:true})),comments:vi.fn().mockResolvedValue([]),comment:vi.fn(()=>new Promise(resolve=>{finish=resolve;}))};
 const view=render(<FeatureIssueDetail projectId={1} id={7} api={api} onChanged={changed}/>);fireEvent.change(await screen.findByLabelText('Ghi chú Issue'),{target:{value:'Old submission'}});fireEvent.click(screen.getByRole('button',{name:'Thêm ghi chú'}));
 view.rerender(<FeatureIssueDetail projectId={1} id={8} api={api} onChanged={changed}/>);await screen.findByText('P-8 · Issue 8');await act(async()=>finish({id:10,body:'Old submission',version:1}));
 expect(screen.queryByText('Old submission')).not.toBeInTheDocument();expect(changed).not.toHaveBeenCalled();expect(api.get).toHaveBeenCalledTimes(2);
});

it('retains a newer note draft and advances the version after comment success even if detail refresh fails',async()=>{
 let finish;const item={id:7,key:'P-7',title:'Issue',type:'BUG',version:2,canComment:true};
 const api={get:vi.fn().mockResolvedValueOnce(item).mockRejectedValue(new Error('Chưa tải nội dung mới')),comments:vi.fn().mockResolvedValue([]),comment:vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue({id:4,body:'Next note',version:4})};
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);const input=await screen.findByLabelText('Ghi chú Issue');fireEvent.change(input,{target:{value:'Submitted note'}});fireEvent.click(screen.getByRole('button',{name:'Thêm ghi chú'}));
 fireEvent.change(input,{target:{value:'Next note'}});await act(async()=>finish({id:3,body:'Submitted note',actorName:'Tester',version:3}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải nội dung mới');expect(input).toHaveValue('Next note');expect(screen.getByText('Submitted note')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Thêm ghi chú'}));await waitFor(()=>expect(api.comment).toHaveBeenLastCalledWith(1,7,expect.objectContaining({body:'Next note',expectedVersion:3}),expect.anything()));
});

it('retries only a failed comments read while retaining the unsaved note',async()=>{
 const api={get:vi.fn().mockResolvedValue({id:7,key:'P-7',title:'Issue',type:'BUG',version:2,canComment:true}),comments:vi.fn().mockRejectedValueOnce(new Error('Chưa tải ghi chú')).mockResolvedValue([{id:1,body:'Existing note',actorName:'Tester'}])};
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);const input=await screen.findByLabelText('Ghi chú Issue');fireEvent.change(input,{target:{value:'My unsaved note'}});await screen.findByText('Chưa tải ghi chú');
 fireEvent.click(screen.getByRole('button',{name:'Tải lại ghi chú'}));expect(await screen.findByText('Existing note')).toBeInTheDocument();expect(input).toHaveValue('My unsaved note');expect(api.get).toHaveBeenCalledTimes(1);
});

it('clears the previous issue editor, comments and history when navigating to another issue',async()=>{
 const api={get:vi.fn((_p,id)=>Promise.resolve({id,key:'P-'+id,title:'Issue '+id,type:'BUG',version:0,canEdit:true,canComment:true})),comments:vi.fn((_p,id)=>Promise.resolve([{id,body:'Note '+id,actorName:'Tester'}])),history:vi.fn().mockResolvedValue([{id:1,eventType:'CREATE',actorName:'Old actor'}])};
 const view=render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);fireEvent.click(await screen.findByRole('button',{name:'Sửa nội dung Issue'}));
 fireEvent.change(screen.getByLabelText('Tiêu đề Issue'),{target:{value:'Unsaved previous title'}});fireEvent.click(screen.getByRole('button',{name:'Xem lịch sử Issue'}));await screen.findByText('Old actor');
 view.rerender(<FeatureIssueDetail projectId={1} id={8} api={api}/>);await screen.findByText('P-8 · Issue 8');
 expect(screen.queryByDisplayValue('Unsaved previous title')).not.toBeInTheDocument();expect(screen.queryByText('Old actor')).not.toBeInTheDocument();expect(screen.queryByText('Note 7')).not.toBeInTheDocument();expect(await screen.findByText('Note 8')).toBeInTheDocument();
});

it('retries a failed detail read without closing the drawer',async()=>{
 const api={get:vi.fn().mockRejectedValueOnce(new Error('Không tải được Issue')).mockResolvedValue({id:7,key:'P-7',title:'Recovered',type:'BUG'}),comments:vi.fn().mockResolvedValue([])};
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được Issue');
 fireEvent.click(screen.getByRole('button',{name:'Tải lại Issue'}));expect(await screen.findByText('P-7 · Recovered')).toBeInTheDocument();
});

it('lets a user compare fresh content after a version conflict while retaining the draft for explicit resubmission',async()=>{
 const item={id:7,key:'P-7',title:'Original',type:'BUG',steps:'Steps',expectedResult:'Expected',actualResult:'Actual',version:2,canEdit:true};
 const api={get:vi.fn().mockResolvedValueOnce(item).mockResolvedValue({...item,title:'Changed by teammate',version:3}),comments:vi.fn().mockResolvedValue([]),update:vi.fn().mockRejectedValueOnce(new Error('Issue đã thay đổi')).mockResolvedValue({...item,title:'My draft',version:4})};
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);fireEvent.click(await screen.findByRole('button',{name:'Sửa nội dung Issue'}));fireEvent.change(screen.getByLabelText('Tiêu đề Issue'),{target:{value:'My draft'}});fireEvent.click(screen.getByRole('button',{name:'Lưu nội dung Issue'}));await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'Tải lại Issue'}));await screen.findByText('P-7 · Changed by teammate');expect(screen.getByLabelText('Tiêu đề Issue')).toHaveValue('My draft');
 fireEvent.click(screen.getByRole('button',{name:'Lưu nội dung Issue'}));await waitFor(()=>expect(api.update).toHaveBeenLastCalledWith(1,7,expect.objectContaining({title:'My draft',expectedVersion:3}),expect.anything()));
});

it('retries history reads and shows the event reason, actor, time and plain text content',async()=>{
 const api={get:vi.fn().mockResolvedValue({id:7,key:'P-7',title:'Issue',type:'BUG'}),comments:vi.fn().mockResolvedValue([]),history:vi.fn().mockRejectedValueOnce(new Error('Chưa tải lịch sử')).mockResolvedValue([{id:2,eventType:'STATUS',actorName:'Project PM',createdAt:'2026-10-18T18:00:00Z',reason:'<script>literal note</script>',before:{status:'open'},after:{status:'closed'}}])};
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Xem lịch sử Issue'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải lịch sử');
 fireEvent.click(screen.getByRole('button',{name:'Tải lại lịch sử'}));
 expect(await screen.findByText('Project PM')).toBeInTheDocument();expect(screen.getByText('<script>literal note</script>')).toBeInTheDocument();expect(screen.getByText(/19\/10\/2026/)).toBeInTheDocument();expect(screen.getByText(/Chưa xử lý → Hoàn thành/)).toBeInTheDocument();
});

it('requires monkey delete confirmation, preserves it on failure, and notifies only after a versioned success',async()=>{
 const item={id:7,key:'P-7',title:'Own monkey',type:'BUG',monkey:true,version:6,canDelete:true};
 const api={get:vi.fn().mockResolvedValue(item),comments:vi.fn().mockResolvedValue([]),remove:vi.fn().mockRejectedValueOnce(new Error('Không xóa được')).mockResolvedValue(undefined)};const deleted=vi.fn();
 render(<FeatureIssueDetail projectId={1} id={7} api={api} onDeleted={deleted}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Xóa Bug monkey'}));expect(api.remove).not.toHaveBeenCalled();
 expect(screen.getByText(/Lịch sử Issue vẫn được giữ/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận xóa mềm'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Không xóa được');expect(deleted).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận xóa mềm'}));
 await waitFor(()=>expect(deleted).toHaveBeenCalledOnce());expect(api.remove).toHaveBeenLastCalledWith(1,7,6,expect.anything());
});

it('never offers deletion for a case Issue even if an old response incorrectly grants canDelete',async()=>{
 const api={get:vi.fn().mockResolvedValue({id:7,key:'P-7',title:'Case Issue',type:'BUG',monkey:false,canDelete:true}),comments:vi.fn().mockResolvedValue([])};
 render(<FeatureIssueDetail projectId={1} id={7} api={api}/>);await screen.findByText('P-7 · Case Issue');expect(screen.queryByRole('button',{name:'Xóa Bug monkey'})).not.toBeInTheDocument();
});

it('edits with a version and offers only active enabled project DEV recipients when assignment is allowed',async()=>{
 const item={id:7,key:'P-7',title:'Old title',description:'Description',type:'BUG',steps:'Steps',expectedResult:'Expected',actualResult:'Actual',priority:'HIGH',assigneeMembershipId:11,version:3,canEdit:true,canAssign:true};
 const api={get:vi.fn().mockResolvedValue(item),comments:vi.fn().mockResolvedValue([]),update:vi.fn().mockRejectedValueOnce(new Error('Chưa lưu bản sửa')).mockResolvedValue({...item,title:'Edited title',version:4})};
 const memberApi={listMembers:vi.fn().mockResolvedValue([{membershipId:11,displayName:'Eligible DEV',projectRole:'DEV',systemRole:'DEV',active:true,enabled:true},{membershipId:12,displayName:'Wrong membership',projectRole:'TESTER',systemRole:'DEV',active:true,enabled:true},{membershipId:13,displayName:'Disabled DEV',projectRole:'DEV',systemRole:'DEV',active:true,enabled:false}])};
 render(<FeatureIssueDetail projectId={1} id={7} api={api} memberApi={memberApi}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Sửa nội dung Issue'}));
 expect(await screen.findByRole('option',{name:'Eligible DEV'})).toBeInTheDocument();
 expect(screen.queryByRole('option',{name:'Wrong membership'})).not.toBeInTheDocument();expect(screen.queryByRole('option',{name:'Disabled DEV'})).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Tiêu đề Issue'),{target:{value:'Edited title'}});fireEvent.change(screen.getByLabelText('Mức ưu tiên'),{target:{value:'LOW'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu nội dung Issue'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu bản sửa');expect(screen.getByLabelText('Tiêu đề Issue')).toHaveValue('Edited title');
 expect(api.update).toHaveBeenCalledWith(1,7,expect.objectContaining({title:'Edited title',assigneeMembershipId:11,priority:'LOW',expectedVersion:3}),expect.anything());
 fireEvent.click(screen.getByRole('button',{name:'Lưu nội dung Issue'}));
 await waitFor(()=>expect(screen.queryByLabelText('Tiêu đề Issue')).not.toBeInTheDocument());
});

it('does not fetch or expose assignment and priority for a Tester editing an own monkey',async()=>{
 const memberApi={listMembers:vi.fn()};const item={id:7,key:'P-7',title:'Own monkey',type:'BUG',version:1,canEdit:true,canAssign:false};
 const api={get:vi.fn().mockResolvedValue(item),comments:vi.fn().mockResolvedValue([])};
 render(<FeatureIssueDetail projectId={1} id={7} api={api} memberApi={memberApi}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Sửa nội dung Issue'}));
 expect(screen.getByLabelText('Tiêu đề Issue')).toHaveValue('Own monkey');
 expect(screen.queryByLabelText('Người phụ trách Issue')).not.toBeInTheDocument();expect(screen.queryByLabelText('Mức ưu tiên')).not.toBeInTheDocument();expect(memberApi.listMembers).not.toHaveBeenCalled();
});

it('uses the requested allowed status, preserves a failed reason, and submits the current version',async()=>{
 const item={id:7,key:'P-7',title:'Issue',type:'BUG',status:'open',version:4,canTransition:true,allowedStatuses:[{id:'progress',label:'Đang xử lý'},{id:'resolved',label:'Đã xử lý'}]};
 const api={get:vi.fn().mockResolvedValue(item),comments:vi.fn().mockResolvedValue([]),transition:vi.fn().mockRejectedValueOnce(new Error('Phiên bản đã thay đổi')).mockResolvedValue({...item,status:'resolved',version:5})};
 const changed=vi.fn();render(<FeatureIssueDetail projectId={1} id={7} api={api} initialStatus="resolved" onChanged={changed}/>);
 expect(await screen.findByLabelText('Trạng thái mới')).toHaveValue('resolved');
 expect(screen.queryByRole('option',{name:'Đóng'})).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Lý do chuyển trạng thái'),{target:{value:'Đã kiểm tra lại bên ngoài'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu trạng thái'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Phiên bản đã thay đổi');
 expect(screen.getByLabelText('Lý do chuyển trạng thái')).toHaveValue('Đã kiểm tra lại bên ngoài');
 expect(api.transition).toHaveBeenLastCalledWith(1,7,{status:'resolved',reason:'Đã kiểm tra lại bên ngoài',expectedVersion:4},expect.anything());
 fireEvent.click(screen.getByRole('button',{name:'Lưu trạng thái'}));
 await waitFor(()=>expect(changed).toHaveBeenCalledWith(expect.objectContaining({version:5})));
});
