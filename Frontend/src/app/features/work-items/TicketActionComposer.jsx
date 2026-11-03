import React,{useEffect,useRef,useState} from 'react';
import {ticketAction,ticketStateLabel,ticketTransitionLabel} from './ticketWorkflow';

export function TicketActionComposer({projectId,item,api,initialStatus,blocked=false,onSaved,onActivity,onDirectory}) {
 const [body,setBody]=useState(''),[state,setState]=useState(''),[reason,setReason]=useState(''),[assignee,setAssignee]=useState(''),[verifier,setVerifier]=useState(''),[convert,setConvert]=useState(false);
 const [directory,setDirectory]=useState(null),[loading,setLoading]=useState(false),[directoryError,setDirectoryError]=useState(''),[reload,setReload]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[confirmation,setConfirmation]=useState(false);
 const lifetime=useRef(null),lock=useRef(false),command=useRef(null),bodyRef=useRef(body),cancel=useRef(null),submitButton=useRef(null),previousConfirmation=useRef(false),applied=useRef(null);bodyRef.current=body;
 const transitions=item.allowedTransitions||[],states=[...new Set(transitions.map(value=>value.state))],reasons=transitions.filter(value=>value.state==='CLOSED');
 const transition=transitions.find(value=>value.state===state&&(state!=='CLOSED'||value.closureReason===reason));
 const assignmentMembers=(directory?.members||[]).filter(member=>convert?member.projectRole==='PM'||member.duties.includes('BUG_COORDINATOR'):item.type==='QA'?member.projectRole==='PM'||member.duties.includes('SPEC_REVIEWER'):true);
 const selectedAssignee=assignmentMembers.find(member=>String(member.membershipId)===assignee);
 const repairCoordinator=!convert&&item.type==='BUG'&&item.canAssign&&directory?.canManage&&!!selectedAssignee&&(selectedAssignee.projectRole==='PM'||selectedAssignee.duties.includes('BUG_COORDINATOR'))&&String(item.coordinatorMembershipId)!==assignee;
 const coordinatorNotice=repairCoordinator?`Điều phối Bug sẽ được cập nhật thành: ${selectedAssignee.displayName}.`:'';
 const payload=ticketAction(item,{body,transition,assignee,verifier,convert,repairCoordinator}),hasChanges=Object.keys(payload).length>1;
 const hasDraft=!!body.trim()||!!state||!!assignee||!!verifier||convert;
 const revoked=!!body.trim()&&!item.canComment||convert&&!item.canConvertToBug||!!state&&!transition||!!assignee&&!item.canAssign&&!convert||!!verifier&&!directory?.canManage;
 const directoryNeeded=item.canAssign||item.canConvertToBug||transitions.length>0;
 useEffect(()=>{const controller=new AbortController();lifetime.current=controller;return()=>controller.abort();},[projectId,item.id,api]);
 useEffect(()=>{onActivity?.({busy,dirty:!!body.trim()||!!state||!!assignee||!!verifier||convert});return()=>onActivity?.({busy:false,dirty:false});},[onActivity,busy,body,state,assignee,verifier,convert]);
 useEffect(()=>{if(confirmation)cancel.current?.focus();else if(previousConfirmation.current)submitButton.current?.focus();previousConfirmation.current=confirmation;},[confirmation]);
 useEffect(()=>{
  const signature=JSON.stringify([item.id,initialStatus]);if(applied.current===signature)return;applied.current=signature;
  const requested=transitions.find(value=>value.columnId===initialStatus);setState(requested?.state||'');setReason(requested?.closureReason||'');
 },[item.id,initialStatus,transitions]);
 useEffect(()=>{
  if(!directoryNeeded)return;const controller=new AbortController();setLoading(true);setDirectoryError('');onDirectory?.(null);
  api.responsibilities(projectId,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted){setDirectory(data);onDirectory?.(data);}}).catch(e=>{if(!controller.signal.aborted){setDirectoryError(e.message);onDirectory?.(null);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[api,projectId,item.id,directoryNeeded,reload,onDirectory]);
 function changeState(value){setState(value);setReason(value==='CLOSED'?reasons[0]?.closureReason||'':'');setConvert(false);setConfirmation(false);}
 function toggleConvert(value){setConvert(value);setState('');setReason('');setAssignee('');setConfirmation(false);}
 async function execute(){
  if(lock.current||blocked||!hasChanges||revoked)return;
  if((assignee||verifier||convert)&&(loading||directoryError)){setError('Tải lại người phụ trách trước khi gửi thay đổi phân công.');return;}
  if(convert&&(!assignee||!assignmentMembers.some(member=>String(member.membershipId)===assignee))){setError('Chọn đầu mối điều phối Bug hiện tại.');return;}
  if(assignee&&!assignmentMembers.some(member=>String(member.membershipId)===assignee)||verifier&&!directory?.members.some(member=>String(member.userId)===verifier)){setError('Người nhận không còn đủ điều kiện. Tải lại danh sách và đối chiếu bản nháp.');return;}
  if(state&&!transition){setError('Quyền chuyển trạng thái đã thay đổi. Tải lại Issue và đối chiếu bản nháp.');return;}
  const signal=lifetime.current.signal,submitted=body,signature=JSON.stringify(payload);
  if(command.current?.signature!==signature)command.current={signature,key:crypto.randomUUID()};
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{
   const fresh=await api.action(projectId,item.id,{...payload,requestKey:command.current.key},{signal});if(signal.aborted)return;
   if(bodyRef.current===submitted)setBody('');setState('');setReason('');setAssignee('');setVerifier('');setConvert(false);setConfirmation(false);setNotice('Đã lưu cập nhật Ticket.');onSaved(fresh);
  }catch(e){if(!signal.aborted){setError((e.message||'Chưa lưu được cập nhật.')+' Bản nháp được giữ lại; tải lại Issue để đối chiếu nếu dữ liệu/quyền đã thay đổi.');setConfirmation(false);}}
  finally{if(!signal.aborted){lock.current=false;setBusy(false);}}
 }
 function submit(event){event.preventDefault();if(!hasChanges||busy||blocked||revoked)return;if(convert||transition||payload.assigneeMembershipId||payload.verifierUserId)setConfirmation(true);else execute();}
 const permitted=item.canComment||item.canAssign||item.canConvertToBug||transitions.length>0;
 if(!permitted&&!hasDraft)return null;
 return <section className="ticket-action" aria-label="Cập nhật Ticket" aria-busy={busy}>
  <h4>Bình luận và xử lý</h4>
  <form onSubmit={submit}>
   <div className="ticket-composer-grid">
    {(item.canComment||body)&&<label className="wi-field">Ghi chú Issue<textarea readOnly={!item.canComment} rows={6} maxLength={20000} value={body} onChange={event=>setBody(event.target.value)}/></label>}
    <fieldset disabled={busy||blocked} className="ticket-action-options"><legend>Thay đổi cùng bình luận</legend>
     {transitions.length>0&&<label className="wi-field">Trạng thái mới<select value={state} disabled={convert} onChange={event=>changeState(event.target.value)}><option value="">Giữ nguyên trạng thái</option>{states.map(value=><option key={value} value={value}>{ticketStateLabel(value)}</option>)}</select></label>}
     {state==='CLOSED'&&<label className="wi-field">Lý do đóng<select required value={reason} onChange={event=>{setReason(event.target.value);setConfirmation(false);}}>{reasons.map(value=><option key={value.closureReason} value={value.closureReason}>{ticketTransitionLabel(value)}</option>)}</select></label>}
     {item.canConvertToBug&&<label className="ticket-checkbox"><input type="checkbox" checked={convert} onChange={event=>toggleConvert(event.target.checked)}/>Chuyển QA thành Bug</label>}
     {(item.canAssign||convert)&&<label className="wi-field">Người phụ trách Issue<select value={assignee} required={convert} disabled={loading||!!directoryError} onChange={event=>{setAssignee(event.target.value);setConfirmation(false);}}><option value="">{convert?'Chọn điều phối Bug':'Giữ nguyên người phụ trách'}</option>{assignee&&!assignmentMembers.some(value=>String(value.membershipId)===assignee)&&<option disabled value={assignee}>Người nhận không còn đủ điều kiện</option>}{assignmentMembers.map(member=><option key={member.membershipId} value={member.membershipId}>{member.displayName}</option>)}</select></label>}
     {directory?.canManage&&<label className="wi-field">Người xác nhận lại<select value={verifier} disabled={loading||!!directoryError} onChange={event=>{setVerifier(event.target.value);setConfirmation(false);}}><option value="">Giữ nguyên: {item.verifierName||'Chưa ghi'}</option>{verifier&&!directory.members.some(value=>String(value.userId)===verifier)&&<option disabled value={verifier}>Người xác nhận không còn đủ điều kiện</option>}{directory.members.map(member=><option key={member.userId} value={member.userId}>{member.displayName}</option>)}</select></label>}
     {transition?.closureReason==='PROCESSED'&&<p className="wi-note">Đã xử lý, đang chờ tester xác nhận. Chưa hoàn tất.</p>}
     {coordinatorNotice&&<p className="wi-note">{coordinatorNotice}</p>}
    </fieldset>
   </div>
   {loading&&<p role="status">Đang tải người phụ trách…</p>}{directoryError&&<p role="alert">{directoryError}</p>}
   {directoryNeeded&&<button type="button" className="cat-btn" disabled={loading||busy} onClick={()=>setReload(value=>value+1)}>Tải lại người phụ trách</button>}
   <p className="wi-note">Bỏ trống lựa chọn để giữ nguyên. Bình luận và thay đổi được lưu cùng nhau. Chuyển trạng thái quản lý, Không xử lý hoặc Không được hỗ trợ cần ghi chú lý do.</p>
   {revoked&&<p role="alert">Quyền xử lý đã thay đổi. Bản nháp được giữ để đối chiếu; không thể gửi thay đổi chưa được cấp quyền.</p>}
   <button ref={submitButton} type="submit" className="cat-btn cat-btn-mint" disabled={busy||blocked||!hasChanges||revoked||((!!assignee||!!verifier||convert)&&(loading||!!directoryError))}>{busy?'Đang lưu…':'Gửi cập nhật'}</button>
  </form>
  {confirmation&&<section className="feature-issue-confirm" aria-label="Xác nhận cập nhật Ticket"><p>{convert?`Giữ nguyên mã ${item.key}, nguồn, bình luận và lịch sử; chuyển QA thành Bug / Chưa xử lý.`:`Xác nhận cập nhật ${item.key}${transition?' → '+ticketTransitionLabel(transition):''}?`}</p><p>Người nhận: {assignmentMembers.find(member=>String(member.membershipId)===assignee)?.displayName||item.assignee||'Giữ nguyên'}</p>{coordinatorNotice&&<p>{coordinatorNotice}</p>}<div className="wi-actions"><button ref={cancel} className="cat-btn" disabled={busy} onClick={()=>setConfirmation(false)}>Hủy xác nhận</button><button className="cat-btn cat-btn-mint" disabled={busy||blocked} onClick={execute}>Xác nhận cập nhật</button></div></section>}
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 </section>;
}
