import {ConfirmationDialog} from '../../components/ConfirmationDialog';
import {useRefreshOnReturn} from '../../hooks/useRefreshOnReturn';
import {UnifiedSelect} from '../../components/UnifiedSelect';
import React,{useEffect,useRef,useState} from 'react';
import {ticketAction,ticketStateLabel,ticketTransitionLabel,ticketClosureLabel,ticketStateColor} from './ticketWorkflow';
import {TicketComposerAvatar} from './TicketComposerAvatar';
import {DraftAttachments,attachmentAccept} from './TicketAttachments';
import {TicketPlanningFields,planningOf} from './TicketPlanningFields';
import {Paperclip,Bold,Italic,List} from 'lucide-react';
import {SafeMarkdown} from '../reports/SafeMarkdown';

export function TicketActionComposer({projectId,item,api,initialStatus,blocked=false,onSaved,onActivity,onDirectory}) {
 useRefreshOnReturn(()=>{if(!busy&&!loading)setReload(v=>v+1);});
 const [files,setFiles]=useState([]),[planning,setPlanning]=useState(()=>planningOf(item));
 const editor=useRef(null),fileGeneration=useRef(0),planningBaseline=useRef(JSON.stringify(planningOf(item)));
 const serverPlanning=JSON.stringify(planningOf(item));
 useEffect(()=>{const previous=planningBaseline.current;planningBaseline.current=serverPlanning;setPlanning(current=>JSON.stringify(current)===previous?JSON.parse(serverPlanning):current);},[serverPlanning]);
 const planningChanged=JSON.stringify(planning)!==JSON.stringify(planningOf(item));
 const [expanded,setExpanded]=useState(!!initialStatus),[preview,setPreview]=useState(false);
 const [body,setBody]=useState(''),[state,setState]=useState(''),[reason,setReason]=useState(''),[assignee,setAssignee]=useState(''),[convert,setConvert]=useState(false);
 const [directory,setDirectory]=useState(null),[loading,setLoading]=useState(false),[directoryError,setDirectoryError]=useState(''),[reload,setReload]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[confirmation,setConfirmation]=useState(false);
 const lifetime=useRef(null),lock=useRef(false),command=useRef(null),bodyRef=useRef(body),cancel=useRef(null),submitButton=useRef(null),applied=useRef(null);bodyRef.current=body;
 const transitions=item.allowedTransitions||[],states=[...new Set(transitions.map(value=>value.state))],reasons=transitions.filter(value=>value.state==='CLOSED');
 const statusColors={'':ticketStateColor(item.ticketState,item.closureReason),...Object.fromEntries(states.map(value=>[value,ticketStateColor(value,reason||reasons[0]?.closureReason)]))};
 const transition=transitions.find(value=>value.state===state&&(state!=='CLOSED'||value.closureReason===reason));
 const assignmentMembers=(directory?.members||[]).filter(member=>convert?member.projectRole==='PM'||member.duties.includes('BUG_COORDINATOR'):item.type==='QA'?member.projectRole==='PM'||member.duties.includes('SPEC_REVIEWER'):true);
 const selectedAssignee=assignmentMembers.find(member=>String(member.membershipId)===assignee);
 const repairCoordinator=!convert&&item.type==='BUG'&&item.canAssign&&directory?.canManage&&!!selectedAssignee&&(selectedAssignee.projectRole==='PM'||selectedAssignee.duties.includes('BUG_COORDINATOR'))&&String(item.coordinatorMembershipId)!==assignee;
 const coordinatorNotice=repairCoordinator?`Điều phối Bug sẽ được cập nhật thành: ${selectedAssignee.displayName}.`:'';
 const payload={...ticketAction(item,{body,transition,assignee,convert,repairCoordinator}),...(planningChanged?{planning}:{})},hasChanges=Object.keys(payload).length>1||files.length>0;
 const hasDraft=!!body.trim()||!!state||!!assignee||convert||files.length>0||planningChanged;
 const revoked=(files.length>0&&!item.canComment)||(planningChanged&&!item.canEdit)||!!body.trim()&&!item.canComment||convert&&!item.canConvertToBug||!!state&&!transition||!!assignee&&!item.canAssign&&!convert;
 const directoryNeeded=(item.canEdit&&expanded)||item.canAssign||item.canConvertToBug||transitions.length>0;
 const hasActionOptions=item.canEdit||transitions.length>0||item.canConvertToBug||item.canAssign||convert||directory?.canManage||state==='CLOSED';
 useEffect(()=>{const controller=new AbortController();lifetime.current=controller;return()=>controller.abort();},[projectId,item.id,api]);
 useEffect(()=>{onActivity?.({busy,dirty:hasDraft});return()=>onActivity?.({busy:false,dirty:false});},[onActivity,busy,hasDraft]);
 useEffect(()=>{
  const signature=JSON.stringify([item.id,initialStatus]);if(applied.current===signature)return;applied.current=signature;
  const requested=transitions.find(value=>value.columnId===initialStatus);setState(requested?.state||'');setReason(requested?.closureReason||'');if(requested)setExpanded(true);
 },[item.id,initialStatus,transitions]);
 useEffect(()=>{
  if(!directoryNeeded)return;const controller=new AbortController();setLoading(true);setDirectoryError('');onDirectory?.(null);
  api.responsibilities(projectId,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted){setDirectory(data);onDirectory?.(data);}}).catch(e=>{if(!controller.signal.aborted){setDirectoryError(e.message);onDirectory?.(null);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[api,projectId,item.id,directoryNeeded,reload,onDirectory]);
 function changeState(value){setState(value);setReason(value==='CLOSED'?reasons[0]?.closureReason||'':'');setConvert(false);setConfirmation(false);}
 function changeClosureReason(value){setReason(value);setState(value?'CLOSED':'');setConvert(false);setConfirmation(false);}
 function toggleConvert(value){setConvert(value);setState('');setReason('');setAssignee('');setConfirmation(false);}
 function addFiles(incoming){
  const next=[...files,...Array.from(incoming||[])];
  if(next.length>10||next.reduce((sum,file)=>sum+file.size,0)>20*1024*1024){setError('Tối đa 10 tệp, tổng dung lượng 20 MiB.');return;}
  fileGeneration.current++;setFiles(next);setError('');setExpanded(true);
 }
 function format(before,after=''){const field=editor.current;if(!field)return;const start=field.selectionStart,end=field.selectionEnd;setBody(body.slice(0,start)+before+body.slice(start,end)+after+body.slice(end));field.focus();}
 async function execute(){
  if(lock.current||blocked||!hasChanges||revoked)return;
  if((assignee||convert)&&(loading||directoryError)){setError('Tải lại người phụ trách trước khi gửi thay đổi phân công.');return;}
  if(convert&&(!assignee||!assignmentMembers.some(member=>String(member.membershipId)===assignee))){setError('Chọn đầu mối điều phối Bug hiện tại.');return;}
  if(assignee&&!assignmentMembers.some(member=>String(member.membershipId)===assignee)){setError('Người nhận không còn đủ điều kiện. Tải lại danh sách và đối chiếu bản nháp.');return;}
  if(state&&!transition){setError('Quyền chuyển trạng thái đã thay đổi. Tải lại Ticket và đối chiếu bản nháp.');return;}
  const signal=lifetime.current.signal,submitted=body,signature=JSON.stringify([payload,fileGeneration.current]);
  if(command.current?.signature!==signature)command.current={signature,key:crypto.randomUUID()};
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{
   const fresh=await (files.length?api.actionWithFiles(projectId,item.id,{...payload,requestKey:command.current.key},files,{signal}):api.action(projectId,item.id,{...payload,requestKey:command.current.key},{signal}));if(signal.aborted)return;
   if(bodyRef.current===submitted)setBody('');setFiles([]);fileGeneration.current++;setPlanning(planningOf(Number(fresh.id)===Number(item.id)?fresh:item));setState('');setReason('');setAssignee('');setConvert(false);setConfirmation(false);setNotice('Đã lưu cập nhật Ticket.');onSaved(fresh);
  }catch(e){if(!signal.aborted){setError((e.message||'Chưa lưu được cập nhật.')+' Bản nháp được giữ lại; tải lại Ticket để đối chiếu nếu dữ liệu/quyền đã thay đổi.');setConfirmation(false);}}
  finally{if(!signal.aborted){lock.current=false;setBusy(false);}}
 }
 function submit(event){event.preventDefault();if(!hasChanges||busy||blocked||revoked)return;if(convert||transition||payload.assigneeMembershipId)setConfirmation(true);else execute();}
 const assigneeField=(item.canAssign||convert)&&<div className="ticket-assignee-field"><div className="ticket-field-heading"><label htmlFor={`ticket-assignee-${item.id}`}>Người phụ trách</label>{(item.canAssign||convert)&&assignmentMembers.some(m=>m.userId===directory?.currentUserId)&&<button type="button" className="ticket-self-assign" disabled={loading||!!directoryError} onClick={()=>setAssignee(String(assignmentMembers.find(m=>m.userId===directory.currentUserId).membershipId))}>Tôi phụ trách</button>}</div><div className="wi-field"><UnifiedSelect id={`ticket-assignee-${item.id}`} value={assignee} required={convert} disabled={loading||!!directoryError} onChange={event=>{setAssignee(event.target.value);setConfirmation(false);}}><option value="">{convert?'Chọn điều phối Bug':'Giữ nguyên người phụ trách'}</option>{assignee&&!assignmentMembers.some(value=>String(value.membershipId)===assignee)&&<option disabled value={assignee}>Người nhận không còn đủ điều kiện</option>}{assignmentMembers.map(member=><option key={member.membershipId} value={member.membershipId}>{member.displayName}</option>)}</UnifiedSelect></div></div>;
 const closureField=<div className="ticket-option-closure"><div className="ticket-field-heading"><label htmlFor={`ticket-closure-${item.id}`}>Lý do hoàn thành</label>{!convert&&reasons.some(value=>value.closureReason==='PROCESSED')&&<button type="button" className="ticket-self-assign" onClick={()=>changeClosureReason('PROCESSED')}>Đặt là đã xử lý</button>}</div><div className="wi-field"><UnifiedSelect id={`ticket-closure-${item.id}`} aria-label="Lý do đóng" title="Chọn lý do để chuyển Ticket sang Đóng; xác nhận trước khi lưu." disabled={!reasons.length||convert} required={state==='CLOSED'} value={state==='CLOSED'?reason:''} onChange={event=>changeClosureReason(event.target.value)}><option value="">{item.closureReason?`Giữ nguyên: ${ticketClosureLabel(item.closureReason)}`:reasons.length?'Chọn lý do hoàn thành':'Chưa có lý do được phép chọn'}</option>{reasons.map(value=><option key={value.closureReason} value={value.closureReason}>{ticketClosureLabel(value.closureReason)}</option>)}</UnifiedSelect></div></div>;
 const permitted=item.canEdit||item.canComment||item.canAssign||item.canConvertToBug||transitions.length>0;
 if(!permitted&&!hasDraft)return null;
 return <section className={`ticket-action ${expanded?'is-expanded':'is-collapsed'}`} aria-label="Cập nhật Ticket" aria-busy={busy}>
  <form onSubmit={submit}>
   <div className={hasActionOptions?'ticket-composer-grid':undefined}>
    {(item.canComment||body)&&<div className="ticket-editor-column"><TicketComposerAvatar/><div className="ticket-editor">{expanded&&preview&&<section role="region" aria-label="Xem trước bình luận" className="ticket-comment-preview">{body&&<SafeMarkdown markdown={body}/>}<DraftAttachments files={files} preview/></section>}<label style={{display:preview?'none':undefined}} className="wi-field ticket-comment-input"><span className="ticket-comment-label">Ghi chú Ticket</span><textarea ref={editor} onPaste={event=>{if(event.clipboardData.files.length){event.preventDefault();addFiles(event.clipboardData.files);}}} disabled={busy||blocked} placeholder="Viết bình luận…" readOnly={!item.canComment} rows={expanded?4:1} maxLength={20000} value={body} onFocus={()=>setExpanded(true)} onChange={event=>{setExpanded(true);setBody(event.target.value);}}/></label>{expanded&&!preview&&item.canComment&&<><div className="ticket-editor-toolbar"><label className="ticket-attach-button" title="Đính kèm file và ảnh"><Paperclip size={18}/><span>Đính kèm</span><input aria-label="Đính kèm file và ảnh" type="file" multiple accept={attachmentAccept} disabled={busy||blocked} onChange={e=>{addFiles(e.target.files);e.target.value='';}}/></label><button type="button" disabled={busy} aria-label="In đậm" onClick={()=>format('**','**')}><Bold size={17}/></button><button type="button" disabled={busy} aria-label="In nghiêng" onClick={()=>format('*','*')}><Italic size={17}/></button><button type="button" disabled={busy} aria-label="Danh sách" onClick={()=>format('\n- ')}><List size={17}/></button><small>Tối đa 10 tệp · tổng 20 MiB</small></div><DraftAttachments files={files} disabled={busy} onRemove={index=>{fileGeneration.current++;setFiles(files.filter((_,i)=>i!==index));}}/></>}</div></div>}
    {!expanded&&hasActionOptions&&<button type="button" className="ticket-expand-action" aria-expanded={false} onClick={()=>setExpanded(true)}>Thay đổi trạng thái</button>}
    {expanded&&hasActionOptions&&<fieldset disabled={busy||blocked} className="ticket-action-options"><legend>Thay đổi cùng bình luận</legend>
     {transitions.length>0&&<label className="wi-field ticket-option-state">Trạng thái<span className="ticket-status-select"><span className="ticket-selected-status-dot" aria-hidden="true" style={{backgroundColor:statusColors[state]}}/><UnifiedSelect aria-label="Trạng thái mới" optionColors={statusColors} value={state} disabled={convert} onChange={event=>changeState(event.target.value)}><option value="">{ticketStateLabel(item.ticketState)}</option>{states.map(value=><option key={value} value={value}>{ticketStateLabel(value)}</option>)}</UnifiedSelect></span></label>}
     {item.canConvertToBug&&<label className="ticket-checkbox"><input type="checkbox" checked={convert} onChange={event=>toggleConvert(event.target.checked)}/>Chuyển QA thành Bug</label>}
     {item.canEdit?<TicketPlanningFields layout="composer" assigneeField={assigneeField} closureField={closureField} value={planning} onChange={setPlanning} milestones={directory?.milestones||[]} savedMilestones={item.milestones||[]}/>:<>{assigneeField}{closureField}</>}
    </fieldset>}
   </div>
   {loading&&<p role="status">Đang tải người phụ trách…</p>}{directoryError&&<p role="alert">{directoryError}</p>}
   {expanded&&directoryNeeded&&(directoryError)&&<button type="button" className="cat-btn" disabled={loading||busy} onClick={()=>setReload(value=>value+1)}>Thử lại người phụ trách</button>}
   {revoked&&<p role="alert">Quyền xử lý đã thay đổi. Bản nháp được giữ để đối chiếu; không thể gửi thay đổi chưa được cấp quyền.</p>}

   {expanded&&<div className="ticket-composer-actions"><button type="button" className="cat-btn" aria-label="Thu gọn bình luận" disabled={busy||confirmation} onClick={()=>{setExpanded(false);setPreview(false);}}>Đóng</button><button type="button" className="cat-btn" aria-pressed={preview} onClick={()=>setPreview(value=>!value)}>Xem trước</button><button ref={submitButton} type="submit" className="cat-btn cat-btn-mint" disabled={busy||blocked||!hasChanges||revoked||((!!assignee||convert)&&(loading||!!directoryError))}>{busy?'Đang lưu…':'Đăng'}</button></div>}
  </form>
  {confirmation&&<ConfirmationDialog title="Xác nhận cập nhật Ticket" busy={busy} onCancel={()=>setConfirmation(false)} returnFocusRef={submitButton}><p>{convert?`Đóng QA ${item.key} và tạo Bug mới ở trạng thái Chưa xử lý. Nội dung và nguồn phát hiện được sao chép; bình luận, tệp đính kèm và lịch sử gốc được giữ tại QA.`:`Xác nhận cập nhật ${item.key}${transition?' → '+ticketTransitionLabel(transition):''}?`}</p><p>Người nhận: {assignmentMembers.find(member=>String(member.membershipId)===assignee)?.displayName||item.assignee||'Giữ nguyên'}</p>{coordinatorNotice&&<p>{coordinatorNotice}</p>}<div className="wi-actions"><button type="button" data-dialog-initial-focus ref={cancel} className="cat-btn" disabled={busy} onClick={()=>setConfirmation(false)}>Hủy xác nhận</button><button className="cat-btn cat-btn-mint" disabled={busy||blocked} onClick={execute}>Xác nhận cập nhật</button></div></ConfirmationDialog>}
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 </section>;
}
