import React,{useEffect,useRef,useState} from 'react';
import {featureIssuesApi} from '../../services/api/featureIssues';
import {projectsApi} from '../../services/api/projects';
import {statuses} from './data';
import './feature-issues.css';
import {useModalActivity} from './components';

const eventLabels={CREATE:'Tạo Issue',UPDATE:'Sửa nội dung',STATUS:'Chuyển trạng thái',COMMENT:'Thêm ghi chú',DELETE:'Xóa mềm'};
const contentFields=[['title','Tiêu đề Issue'],['description','Mô tả Issue'],['steps','Các bước thực hiện'],['expectedResult','Kết quả mong đợi'],['actualResult','Kết quả thực tế']];
function eventTime(value){
 if(!value)return 'Không rõ thời điểm';
 const text=String(value).replace(' ','T'),date=new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(text)?text:text+'Z');
 return Number.isNaN(date.getTime())?'Không rõ thời điểm':new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(date);
}
const statusLabel=value=>statuses.find(status=>status.id===value)?.label||value;
const priorityLabel=value=>({HIGH:'Cao',MEDIUM:'Trung bình',LOW:'Thấp'}[value]||value||'Chưa xác định');
const mergeComments=(loaded,current)=>[...loaded,...current.filter(value=>!loaded.some(other=>other.id===value.id))];

export function FeatureIssueDetail({projectId,id,api=featureIssuesApi,memberApi=projectsApi,initialStatus,onChanged,onDeleted}) {
 const [item,setItem]=useState(null),[error,setError]=useState(''),[comments,setComments]=useState([]),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const lifetime=useRef(null),lock=useRef(false),command=useRef(null),draft=useRef(note);draft.current=note;
 const [nextStatus,setNextStatus]=useState(''),[reason,setReason]=useState('');
 const [editing,setEditing]=useState(false),[edit,setEdit]=useState(null),[members,setMembers]=useState([]),[membersError,setMembersError]=useState(''),[membersLoading,setMembersLoading]=useState(false),[membersReload,setMembersReload]=useState(0);
 const [confirmDelete,setConfirmDelete]=useState(false),[deleted,setDeleted]=useState(false);
 const [history,setHistory]=useState(null),[historyOpen,setHistoryOpen]=useState(false),[historyError,setHistoryError]=useState(''),[historyLoading,setHistoryLoading]=useState(false);
 const [reloading,setReloading]=useState(false);
 useModalActivity(busy||reloading,!!note.trim()||!!nextStatus||!!reason.trim()||!!(editing&&edit&&[...contentFields.map(([key])=>key),'priority','assigneeMembershipId'].some(key=>String(edit[key]??'')!==String(item?.[key]??''))));
 const [commentsError,setCommentsError]=useState(''),[commentsLoading,setCommentsLoading]=useState(false);
 const editButton=useRef(null),deleteButton=useRef(null),keepButton=useRef(null),previousEditing=useRef(false),previousDelete=useRef(false);
 const appliedStatusRequest=useRef(null);
 useEffect(()=>{
  const request=JSON.stringify([projectId,id,initialStatus]);
  if(!item||appliedStatusRequest.current===request)return;
  appliedStatusRequest.current=request;
  setNextStatus(item.allowedStatuses?.some(value=>value.id===initialStatus&&value.id!==item.status)?initialStatus:'');
 },[projectId,id,initialStatus,item]);
 useEffect(()=>{if(!editing&&previousEditing.current)editButton.current?.focus();previousEditing.current=editing;},[editing]);
 useEffect(()=>{if(confirmDelete)keepButton.current?.focus();else if(previousDelete.current)deleteButton.current?.focus();previousDelete.current=confirmDelete;},[confirmDelete]);
 useEffect(()=>{const controller=new AbortController();lifetime.current=controller;lock.current=false;command.current=null;setBusy(false);setReloading(false);setItem(null);setComments([]);setNote('');setError('');setNotice('');setEditing(false);setEdit(null);setMembers([]);setMembersError('');setMembersLoading(false);setConfirmDelete(false);setDeleted(false);setNextStatus('');setReason('');setHistory(null);setHistoryOpen(false);setHistoryError('');setHistoryLoading(false);
  api.get(projectId,id,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted){setItem(data);setNextStatus(data.allowedStatuses?.some(value=>value.id===initialStatus)?initialStatus:'');}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  setCommentsError('');setCommentsLoading(true);
  api.comments(projectId,id,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setComments(current=>mergeComments(data,current));}).catch(e=>{if(!controller.signal.aborted)setCommentsError(e.message);}).finally(()=>{if(!controller.signal.aborted)setCommentsLoading(false);});
  return()=>controller.abort();
 },[api,projectId,id]);
 async function reloadComments(){
  const signal=lifetime.current.signal;setCommentsError('');setCommentsLoading(true);
  try{const values=await api.comments(projectId,id,{signal});if(!signal.aborted)setComments(current=>mergeComments(values,current));}
  catch(e){if(!signal.aborted)setCommentsError(e.message);}
  finally{if(!signal.aborted)setCommentsLoading(false);}
 }
 async function reloadItem(){
  if(lock.current)return;lock.current=true;setReloading(true);setError('');const signal=lifetime.current.signal;
  try{const fresh=await api.get(projectId,id,{signal});if(!signal.aborted){setItem(fresh);setEdit(old=>old?{...old,version:fresh.version}:old);setNotice('Đã tải nội dung hiện tại. Bản nháp vẫn được giữ để đối chiếu trước khi lưu lại.');}}
  catch(e){if(!signal.aborted)setError(e.message);}
  finally{if(!signal.aborted){lock.current=false;setReloading(false);}}
 }
 async function loadHistory(){
  const signal=lifetime.current.signal;setHistoryOpen(true);setHistoryLoading(true);setHistoryError('');
  try{const values=await api.history(projectId,id,{signal});if(!signal.aborted)setHistory(values);}
  catch(e){if(!signal.aborted)setHistoryError(e.message);}
  finally{if(!signal.aborted)setHistoryLoading(false);}
 }
 useEffect(()=>{
  if(!editing||!item?.canAssign)return;
  const controller=new AbortController();setMembersLoading(true);setMembersError('');
  memberApi.listMembers(projectId).then(values=>{if(!controller.signal.aborted)setMembers(values.filter(value=>value.active===true&&value.enabled===true&&value.projectRole==='DEV'&&value.systemRole==='DEV'));}).catch(e=>{if(!controller.signal.aborted)setMembersError(e.message);}).finally(()=>{if(!controller.signal.aborted)setMembersLoading(false);});
  return()=>controller.abort();
 },[memberApi,projectId,id,editing,item?.canAssign,membersReload]);
 function startEdit(){setEdit(Object.fromEntries(['title','description','steps','expectedResult','actualResult','priority','assigneeMembershipId','version'].map(key=>[key,item[key]??''])));setEditing(true);setError('');}
 async function saveEdit(event){
  event.preventDefault();if(lock.current||!item.canEdit||item.canAssign&&(membersLoading||membersError))return;
  lock.current=true;setBusy(true);setError('');setNotice('');const signal=lifetime.current.signal;
  const input=Object.fromEntries(['title','description','steps','expectedResult','actualResult'].map(key=>[key,edit[key]]));input.expectedVersion=edit.version;
  if(item.canAssign){input.assigneeMembershipId=edit.assigneeMembershipId?Number(edit.assigneeMembershipId):null;input.priority=edit.priority;}
  try{const fresh=await api.update(projectId,id,input,{signal});if(!signal.aborted){setItem(fresh);setEditing(false);setNotice('Đã lưu nội dung Issue.');onChanged?.(fresh);}}
  catch(e){if(!signal.aborted)setError(e.message);}
  finally{if(!signal.aborted){lock.current=false;setBusy(false);}}
 }
 async function transition(event){
  event.preventDefault();if(lock.current||!item.canTransition||!item.allowedStatuses?.some(value=>value.id===nextStatus)||!reason.trim())return;
  lock.current=true;setBusy(true);setError('');setNotice('');const signal=lifetime.current.signal;
  try{const fresh=await api.transition(projectId,id,{status:nextStatus,reason:reason.trim(),expectedVersion:item.version},{signal});if(!signal.aborted){setItem(fresh);setReason('');setNextStatus('');setNotice('Đã cập nhật trạng thái.');onChanged?.(fresh);}}
  catch(e){if(!signal.aborted)setError(e.message);}
  finally{if(!signal.aborted){lock.current=false;setBusy(false);}}
 }
 async function remove(){
  if(lock.current||!confirmDelete||!item.canDelete||!item.monkey||item.type!=='BUG')return;
  lock.current=true;setBusy(true);setError('');const signal=lifetime.current.signal;
  try{await api.remove(projectId,id,item.version,{signal});if(!signal.aborted){setDeleted(true);onDeleted?.(id);}}
  catch(e){if(!signal.aborted)setError(e.message);}
  finally{if(!signal.aborted){lock.current=false;setBusy(false);}}
 }
 async function addNote(event){
  event.preventDefault();if(lock.current||!note.trim())return;lock.current=true;setBusy(true);setError('');setNotice('');
  const signal=lifetime.current.signal,submitted=note,signature=JSON.stringify([note,item.version]);
  if(command.current?.signature!==signature)command.current={signature,key:crypto.randomUUID()};
  try {
   const comment=await api.comment(projectId,id,{body:submitted,expectedVersion:item.version,requestKey:command.current.key},{signal});
   if(signal.aborted)return;setComments(old=>[...old.filter(value=>value.id!==comment.id),comment]);if(Number.isInteger(comment.version))setItem(old=>({...old,version:comment.version}));if(draft.current===submitted)setNote('');setNotice('Đã lưu ghi chú.');
   const fresh=await api.get(projectId,id,{signal});if(!signal.aborted){setItem(fresh);onChanged?.(fresh);}
  }catch(e){if(!signal.aborted)setError(e.message);}
  finally{if(!signal.aborted){lock.current=false;setBusy(false);}}
 }
 if(deleted)return <p role="status">Đã xóa mềm Bug monkey. Lịch sử Issue vẫn được giữ.</p>;
 if(error&&!item)return <div><p role="alert">{error}</p><button type="button" className="cat-btn" disabled={reloading} onClick={reloadItem}>Tải lại Issue</button></div>;
 if(!item)return <p role="status">Đang tải Issue…</p>;
 return <article className="feature-issue-detail" aria-busy={busy||reloading}>
  <header><h3>{item.key} · {item.title}</h3><button type="button" className="cat-btn" disabled={busy||reloading} onClick={reloadItem}>Tải lại Issue</button></header>
  {reloading&&<p role="status">Đang tải lại Issue…</p>}
  <p>{[item.featureName,item.fileName,item.caseNo].filter(Boolean).join(' · ')}{item.monkey?' · Bug monkey':''}</p>
  {item.featureId&&<nav className="feature-issue-source" aria-label="Nguồn Issue">
   <a href={`#/board/testing/features/${item.featureId}?projectId=${projectId}`}>Mở Feature {item.featureName||`#${item.featureId}`}</a>
   {item.documentId&&<a href={`#/board/testing/features/${item.featureId}/documents/${item.documentId}?projectId=${projectId}`}>Mở file {item.fileName||`#${item.documentId}`}</a>}
   {item.documentId&&item.rowId&&<a href={`#/board/testing/features/${item.featureId}/documents/${item.documentId}?projectId=${projectId}&caseId=${item.rowId}`}>Mở case {item.caseNo||`#${item.rowId}`}</a>}
  </nav>}
  <p>{item.type} · {item.statusLabel||statusLabel(item.status)} · {item.assignee||'Chưa phân công'}</p>
  <p>Mức ưu tiên: {priorityLabel(item.priority)}</p>
  <p className="wi-pre">{item.description}</p>
  <h4>Các bước thực hiện</h4><p className="wi-pre">{item.steps}</p>
  <h4>Kết quả mong đợi</h4><p className="wi-pre">{item.expectedResult}</p>
  <h4>Kết quả thực tế</h4><p className="wi-pre">{item.actualResult}</p>
  <div className="wi-actions">
   {item.canEdit&&!editing&&<button ref={editButton} className="cat-btn" disabled={busy||reloading} onClick={startEdit}>Sửa nội dung Issue</button>}
   {item.canDelete&&item.monkey&&item.type==='BUG'&&!confirmDelete&&<button ref={deleteButton} className="cat-btn" disabled={busy||reloading} onClick={()=>setConfirmDelete(true)}>Xóa Bug monkey</button>}
  </div>
  {confirmDelete&&item.canDelete&&item.monkey&&item.type==='BUG'&&<section className="feature-issue-confirm" aria-label="Xác nhận xóa Bug monkey">
   <p>Xóa mềm {item.key}? Lịch sử Issue vẫn được giữ.</p>
   <div className="wi-actions"><button className="cat-btn" disabled={busy||reloading} onClick={remove}>Xác nhận xóa mềm</button><button ref={keepButton} className="cat-btn" disabled={busy||reloading} onClick={()=>setConfirmDelete(false)}>Giữ lại Bug monkey</button></div>
  </section>}
  {editing&&item.canEdit&&<form onSubmit={saveEdit}><fieldset disabled={busy||reloading}>
   <legend>Sửa nội dung Issue</legend>
   {contentFields.map(([key,label])=><label className="wi-field" key={key}>{label}{key==='title'?
    <input autoFocus required maxLength={300} value={edit[key]} onChange={event=>setEdit(old=>({...old,[key]:event.target.value}))}/>:
    <textarea required={item.type==='BUG'?key!=='description':key==='description'} rows={3} maxLength={20000} value={edit[key]} onChange={event=>setEdit(old=>({...old,[key]:event.target.value}))}/>
   }</label>)}
   {item.canAssign&&<>
    <label className="wi-field">Người phụ trách Issue<select value={edit.assigneeMembershipId} disabled={membersLoading||!!membersError} onChange={event=>setEdit(old=>({...old,assigneeMembershipId:event.target.value}))}>
     <option value="">Chưa phân công</option>
     {edit.assigneeMembershipId&&!members.some(value=>String(value.membershipId)===String(edit.assigneeMembershipId))&&<option disabled value={edit.assigneeMembershipId}>Người được giao hiện không còn đủ điều kiện</option>}
     {members.map(member=><option key={member.membershipId} value={member.membershipId}>{member.displayName}</option>)}
    </select></label>
    <label className="wi-field">Mức ưu tiên<select value={edit.priority} onChange={event=>setEdit(old=>({...old,priority:event.target.value}))}><option value="HIGH">Cao</option><option value="MEDIUM">Trung bình</option><option value="LOW">Thấp</option></select></label>
    {membersLoading&&<p role="status">Đang tải DEV của dự án…</p>}
    {membersError&&<p role="alert">{membersError} <button type="button" className="cat-btn" onClick={()=>setMembersReload(value=>value+1)}>Tải lại người phụ trách</button></p>}
   </>}
   <div className="wi-actions"><button className="cat-btn" type="submit" disabled={item.canAssign&&(membersLoading||!!membersError)}>Lưu nội dung Issue</button><button type="button" className="cat-btn" onClick={()=>setEditing(false)}>Hủy sửa</button></div>
  </fieldset></form>}
  {item.canTransition&&<form onSubmit={transition}><fieldset disabled={busy||reloading}>
   <legend>Chuyển trạng thái</legend>
   <label className="wi-field">Trạng thái mới<select required value={nextStatus} onChange={event=>setNextStatus(event.target.value)}><option value="">Chọn trạng thái</option>{item.allowedStatuses?.filter(value=>value.id!==item.status).map(value=><option key={value.id} value={value.id}>{value.label}</option>)}</select></label>
   <label className="wi-field">Lý do chuyển trạng thái<textarea required maxLength={1000} value={reason} onChange={event=>setReason(event.target.value)}/></label>
   <button className="cat-btn" type="submit" disabled={!nextStatus||!reason.trim()}>Lưu trạng thái</button>
  </fieldset></form>}
  <section><h4>Ghi chú</h4>
   {commentsLoading&&<p role="status">Đang tải ghi chú…</p>}
   {commentsError&&<p role="alert">{commentsError} <button type="button" className="cat-btn" disabled={commentsLoading} onClick={reloadComments}>Tải lại ghi chú</button></p>}
   {comments.map(comment=><article className="feature-issue-event" key={comment.id}><strong>{comment.actorName}</strong><p><time>{eventTime(comment.createdAt)}</time></p><p className="wi-pre">{comment.body}</p></article>)}
   {item.canComment&&<form onSubmit={addNote}>
    <label className="wi-field">Ghi chú Issue<textarea rows={3} required maxLength={20000} value={note} onChange={event=>setNote(event.target.value)}/></label>
    <button type="submit" className="cat-btn" disabled={busy||reloading||!note.trim()}>{busy?'Đang lưu…':'Thêm ghi chú'}</button>
   </form>}
  </section>
  <section><h4>Lịch sử Issue</h4>
   <button type="button" className="cat-btn" disabled={historyLoading} onClick={loadHistory}>{historyOpen?'Tải lại lịch sử':'Xem lịch sử Issue'}</button>
   {historyLoading&&<p role="status">Đang tải lịch sử…</p>}{historyError&&<p role="alert">{historyError}</p>}
   {historyOpen&&history?.map(entry=><article className="feature-issue-event" key={entry.id}>
    <strong>{entry.actorName}</strong> · {eventLabels[entry.eventType]||entry.eventType}<p><time>{eventTime(entry.createdAt)}</time></p>
    {entry.before?.status&&entry.after?.status&&entry.before.status!==entry.after.status&&<p>{statusLabel(entry.before.status)} → {statusLabel(entry.after.status)}</p>}
    {(entry.reason||entry.after?.reason)&&<p className="wi-pre">{entry.reason||entry.after.reason}</p>}
    {(entry.body||entry.after?.body)&&<p className="wi-pre">{entry.body||entry.after.body}</p>}
    {contentFields.some(([key])=>entry.after?.[key]!=null&&entry.before?.[key]!==entry.after[key])&&<details><summary>Nội dung thay đổi</summary>{contentFields.filter(([key])=>entry.after?.[key]!=null&&entry.before?.[key]!==entry.after[key]).map(([key,label])=><div key={key}><strong>{label}</strong>{entry.before?.[key]&&<p className="wi-pre">Trước: {entry.before[key]}</p>}<p className="wi-pre">Sau: {entry.after[key]||'(trống)'}</p></div>)}</details>}
   </article>)}
   {historyOpen&&history?.length===0&&!historyLoading&&<p>Chưa có lịch sử Issue.</p>}
  </section>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 </article>;
}
