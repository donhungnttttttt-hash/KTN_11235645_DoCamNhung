import React,{useEffect,useRef,useState} from 'react';
import {Pencil} from 'lucide-react';
import {featureIssuesApi} from '../../services/api/featureIssues';
import {statuses} from './data';
import {IssueFeatureContext} from './IssueFeatureContext';
import {useModalActivity} from './components';
import {TicketActionComposer} from './TicketActionComposer';
import {chronological,ticketContentFields as contentFields,ticketLabel,ticketClosureLabel,ticketTransitionLabel} from './ticketWorkflow';
import './feature-issues.css';

const eventLabels={CREATE:'Tạo Issue',UPDATE:'Sửa nội dung',STATUS:'Chuyển trạng thái',COMMENT:'Thêm ghi chú',DELETE:'Xóa mềm',CONVERT_TO_BUG:'Chuyển QA thành Bug',TICKET_ACTION:'Cập nhật Ticket'};
function eventTime(value){
 if(!value)return 'Không rõ thời điểm';
 const text=String(value).replace(' ','T'),date=new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(text)?text:text+'Z');
 return Number.isNaN(date.getTime())?'Không rõ thời điểm':new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(date);
}
const statusLabel=value=>statuses.find(status=>status.id===value)?.label||value;
const priorityLabel=value=>({HIGH:'Cao',MEDIUM:'Trung bình',LOW:'Thấp'}[value]||value||'Chưa xác định');
const mergeComments=(loaded,current)=>chronological([...loaded,...current.filter(value=>!loaded.some(other=>other.id===value.id))]);
const metadata=['preconditions','frequency','environment','device'];

export function FeatureIssueDetail({projectId,id,api=featureIssuesApi,initialStatus,onChanged,onDeleted}) {
 const [item,setItem]=useState(null),[error,setError]=useState(''),[comments,setComments]=useState([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const lifetime=useRef(null),lock=useRef(false),[actionActivity,setActionActivity]=useState({busy:false,dirty:false});
 const [editing,setEditing]=useState(false),[edit,setEdit]=useState(null),[editBaseline,setEditBaseline]=useState(null);
 const [directory,setDirectory]=useState(null);
 const priorityChanged=!!edit&&edit.priority!==editBaseline?.priority;
 const priorityBlocked=priorityChanged&&!directory?.canManage;
 const [confirmDelete,setConfirmDelete]=useState(false),[deleted,setDeleted]=useState(false),[history,setHistory]=useState(null),[historyOpen,setHistoryOpen]=useState(false),[historyError,setHistoryError]=useState(''),[historyLoading,setHistoryLoading]=useState(false);
 const [reloading,setReloading]=useState(false),[commentsError,setCommentsError]=useState(''),[commentsLoading,setCommentsLoading]=useState(false);
 const editButton=useRef(null),deleteButton=useRef(null),keepButton=useRef(null),previousEditing=useRef(false),previousDelete=useRef(false),commentRequest=useRef(0),historyRequest=useRef(0);
 useModalActivity(busy||reloading||actionActivity.busy,actionActivity.dirty||!!(editing&&edit&&[...contentFields.map(([key])=>key),'priority'].some(key=>String(edit[key]??'')!==String(editBaseline?.[key]??''))));
 useEffect(()=>{if(!editing&&previousEditing.current)editButton.current?.focus();previousEditing.current=editing;},[editing]);
 useEffect(()=>{if(confirmDelete)keepButton.current?.focus();else if(previousDelete.current)deleteButton.current?.focus();previousDelete.current=confirmDelete;},[confirmDelete]);
 useEffect(()=>{
  const controller=new AbortController();lifetime.current=controller;lock.current=false;setBusy(false);setReloading(false);setItem(null);setDirectory(null);setComments([]);setError('');setNotice('');setEditing(false);setEdit(null);setConfirmDelete(false);setDeleted(false);setHistory(null);setHistoryOpen(false);setHistoryError('');setHistoryLoading(false);
  api.get(projectId,id,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setItem(data);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  reloadComments(controller.signal);return()=>controller.abort();
 },[api,projectId,id]);
 async function reloadComments(signal=lifetime.current.signal){
  const request=++commentRequest.current;setCommentsError('');setCommentsLoading(true);
  try{const values=await api.comments(projectId,id,{signal});if(!signal.aborted&&request===commentRequest.current)setComments(current=>mergeComments(values,current));}
  catch(e){if(!signal.aborted&&request===commentRequest.current)setCommentsError(e.message);}
  finally{if(!signal.aborted&&request===commentRequest.current)setCommentsLoading(false);}
 }
 async function reloadItem(){
  if(lock.current||actionActivity.busy)return;lock.current=true;setReloading(true);setError('');const signal=lifetime.current.signal;
  try{const fresh=await api.get(projectId,id,{signal});if(!signal.aborted){setItem(fresh);setEdit(old=>old?{...old,version:fresh.version}:old);setNotice('Đã tải nội dung hiện tại. Bản nháp vẫn được giữ để đối chiếu trước khi lưu lại.');}}
  catch(e){if(!signal.aborted)setError(e.message);}
  finally{if(!signal.aborted){lock.current=false;setReloading(false);}}
 }
 async function loadHistory(){
  const signal=lifetime.current.signal,request=++historyRequest.current;setHistoryOpen(true);setHistoryLoading(true);setHistoryError('');
  try{const values=await api.history(projectId,id,{signal});if(!signal.aborted&&request===historyRequest.current)setHistory(chronological(values));}
  catch(e){if(!signal.aborted&&request===historyRequest.current)setHistoryError(e.message);}
  finally{if(!signal.aborted&&request===historyRequest.current)setHistoryLoading(false);}
 }
 function startEdit(){const initial=Object.fromEntries([...contentFields.map(([key])=>key),'priority','version'].map(key=>[key,item[key]??'']));setEdit(initial);setEditBaseline(initial);setEditing(true);setError('');}
 async function saveEdit(event){
  event.preventDefault();if(lock.current||actionActivity.busy||!item.canEdit||priorityBlocked)return;
  lock.current=true;setBusy(true);setError('');setNotice('');const signal=lifetime.current.signal;
  const input=Object.fromEntries(contentFields.filter(([key])=>!metadata.includes(key)||edit[key]!==editBaseline[key]).map(([key])=>[key,edit[key]]));input.expectedVersion=edit.version;
  if(directory?.canManage&&edit.priority)input.priority=edit.priority;
  try{const fresh=await api.update(projectId,id,input,{signal});if(!signal.aborted){setItem(fresh);setEditing(false);setNotice('Đã lưu nội dung Issue.');onChanged?.(fresh);if(historyOpen)loadHistory();}}
  catch(e){if(!signal.aborted)setError(e.message+' Bản nháp được giữ lại.');}
  finally{if(!signal.aborted){lock.current=false;setBusy(false);}}
 }
 async function remove(){
  if(lock.current||actionActivity.busy||!confirmDelete||!item.canDelete||!item.monkey||item.type!=='BUG')return;
  lock.current=true;setBusy(true);setError('');const signal=lifetime.current.signal;
  try{await api.remove(projectId,id,item.version,{signal});if(!signal.aborted){setDeleted(true);onDeleted?.(id);}}
  catch(e){if(!signal.aborted)setError(e.message);}
  finally{if(!signal.aborted){lock.current=false;setBusy(false);}}
 }
 function actionSaved(fresh){setItem(fresh);onChanged?.(fresh);reloadComments();if(historyOpen)loadHistory();}
 if(deleted)return <p role="status">Đã xóa mềm Bug monkey. Lịch sử Issue vẫn được giữ.</p>;
 if(error&&!item)return <div><p role="alert">{error}</p><button type="button" className="cat-btn" disabled={reloading} onClick={reloadItem}>Tải lại Issue</button></div>;
 if(!item)return <p role="status">Đang tải Issue…</p>;
 const blocked=busy||reloading||actionActivity.busy;
 return <article className="feature-issue-detail" aria-busy={blocked}>
  <header><h3>{item.key} · {item.title}</h3><button type="button" className="cat-btn" disabled={blocked} onClick={reloadItem}>Tải lại Issue</button></header>
  {reloading&&<p role="status">Đang tải lại Issue…</p>}
  {item.featureId&&<IssueFeatureContext featureId={item.featureId} featureName={item.featureName} featureEnvironment={item.featureEnvironment} featureDescription={item.featureDescription}/>}
  {item.featureId&&<nav className="feature-issue-source" aria-label="Nguồn Issue"><a href={`#/board/testing/features/${item.featureId}?projectId=${projectId}`}>Mở Feature {item.featureName||`#${item.featureId}`}</a>{!item.monkey&&item.documentId&&<a href={`#/board/testing/features/${item.featureId}/documents/${item.documentId}?projectId=${projectId}`}>Mở file {item.fileName||`#${item.documentId}`}</a>}{!item.monkey&&item.documentId&&item.rowId&&<a href={`#/board/testing/features/${item.featureId}/documents/${item.documentId}?projectId=${projectId}&caseId=${item.rowId}`}>Mở case {item.caseReference||item.caseNo||`#${item.rowId}`}</a>}</nav>}
  <p>{item.monkey?'Bug monkey':item.type} · {ticketLabel(item)} · {item.assignee||'Chưa phân công'}</p>
  {item.legacyWorkflow&&<p role="status">Ticket lịch sử cần đối chiếu. Không suy diễn lý do đóng hay bằng chứng Đã sửa.</p>}
  {item.awaitingVerification&&<p className="ticket-awaiting">Đang chờ tester xác nhận · Chưa hoàn tất</p>}{item.finalized&&!item.legacyWorkflow&&<p>Đã hoàn tất · {ticketClosureLabel(item.closureReason)}</p>}
  <p>Mức ưu tiên: {priorityLabel(item.priority)} · Người xác nhận lại: {item.verifierName||'Chưa ghi'}</p>
  <section className="ticket-source-evidence" aria-label="Nguồn lúc phát hiện"><h4>Nguồn lúc phát hiện</h4><dl><div><dt>Version lúc phát hiện</dt><dd>{item.testVersionName||'Chưa ghi version lúc phát hiện'}</dd></div><div><dt>Ngày thực hiện</dt><dd>{item.executedOn||'Chưa ghi'}</dd></div><div><dt>Đối tượng test / No hoặc ID</dt><dd>{item.testObject||'Chưa ghi'} · {item.monkey?'Monkey độc lập':item.caseReference||'Chưa ghi'}</dd></div></dl><p className="wi-note">Bản lưu lúc phát hiện; thông tin Feature hiện tại được hiển thị riêng ở trên.</p></section>
  {item.convertedFromQa&&<p className="wi-note">Chuyển từ QA. Bằng chứng Bug còn thiếu được giữ nguyên để bổ sung dần.</p>}
  {contentFields.filter(([key])=>key!=='title').map(([key,label])=><section key={key}><h4>{label}</h4><p className="wi-pre">{item[key]||'Chưa ghi'}</p></section>)}
  <div className="wi-actions">{item.canEdit&&!editing&&<button ref={editButton} className="cat-btn ui-action-icon" aria-label="Sửa nội dung Issue" title="Sửa nội dung Issue" disabled={blocked} onClick={startEdit}><Pencil size={18} aria-hidden="true"/></button>}{item.canDelete&&item.monkey&&item.type==='BUG'&&!confirmDelete&&<button ref={deleteButton} className="cat-btn" disabled={blocked} onClick={()=>setConfirmDelete(true)}>Xóa Bug monkey</button>}</div>
  {confirmDelete&&item.canDelete&&item.monkey&&item.type==='BUG'&&<section className="feature-issue-confirm" aria-label="Xác nhận xóa Bug monkey"><p>Xóa mềm {item.key}? Lịch sử Issue vẫn được giữ.</p><div className="wi-actions"><button className="cat-btn" disabled={blocked} onClick={remove}>Xác nhận xóa mềm</button><button ref={keepButton} className="cat-btn" disabled={blocked} onClick={()=>setConfirmDelete(false)}>Giữ lại Bug monkey</button></div></section>}
  {editing&&item.canEdit&&<form onSubmit={saveEdit}><fieldset disabled={blocked}><legend>Sửa nội dung Issue</legend>
   {contentFields.map(([key,label])=><label className="wi-field" key={key}>{label}{key==='title'?<input autoFocus required maxLength={300} value={edit[key]} onChange={event=>setEdit(old=>({...old,[key]:event.target.value}))}/>:metadata.includes(key)&&key!=='preconditions'?<input maxLength={1000} required={item.type==='BUG'&&!!editBaseline[key]} value={edit[key]} onChange={event=>setEdit(old=>({...old,[key]:event.target.value}))}/>:<textarea required={item.type==='QA'?key==='description':['steps','expectedResult','actualResult'].includes(key)&&(!item.convertedFromQa||!!editBaseline[key])} rows={3} maxLength={20000} value={edit[key]} onChange={event=>setEdit(old=>({...old,[key]:event.target.value}))}/>}</label>)}
   {(directory?.canManage||priorityChanged)&&<label className="wi-field">Mức ưu tiên<select disabled={!directory?.canManage} value={edit.priority} onChange={event=>setEdit(old=>({...old,priority:event.target.value}))}><option value="">Chưa xác định</option><option value="HIGH">Cao</option><option value="MEDIUM">Trung bình</option><option value="LOW">Thấp</option></select></label>}
   {priorityBlocked&&<div role="alert"><p>Quyền sửa ưu tiên chưa được xác nhận hoặc đã thay đổi. Bản nháp ưu tiên giữ nguyên; tải lại người phụ trách để đối chiếu hoặc bỏ riêng thay đổi ưu tiên.</p><button type="button" className="cat-btn" onClick={()=>{setEdit(old=>({...old,priority:item.priority??''}));setEditBaseline(old=>({...old,priority:item.priority??''}));}}>Bỏ thay đổi ưu tiên</button></div>}
   <div className="wi-actions"><button className="cat-btn" type="submit" disabled={priorityBlocked}>{busy?'Đang lưu…':'Lưu nội dung Issue'}</button><button type="button" className="cat-btn" onClick={()=>setEditing(false)}>Hủy sửa</button></div>
  </fieldset></form>}
  <TicketActionComposer key={`${projectId}/${id}`} projectId={projectId} item={item} api={api} initialStatus={initialStatus} blocked={busy||reloading} onActivity={setActionActivity} onDirectory={setDirectory} onSaved={actionSaved}/>
  <section><h4>Ghi chú</h4>{commentsLoading&&<p role="status">Đang tải ghi chú…</p>}{commentsError&&<p role="alert">{commentsError} <button type="button" className="cat-btn" disabled={commentsLoading} onClick={()=>reloadComments()}>Tải lại ghi chú</button></p>}{comments.map(comment=><article className="feature-issue-event" key={comment.id}><strong>{comment.actorName}</strong><p><time>{eventTime(comment.createdAt)}</time></p><p className="wi-pre">{comment.body}</p></article>)}</section>
  <section><h4>Lịch sử Issue</h4><button type="button" className="cat-btn" disabled={historyLoading} onClick={loadHistory}>{historyOpen?'Tải lại lịch sử':'Xem lịch sử Issue'}</button>{historyLoading&&<p role="status">Đang tải lịch sử…</p>}{historyError&&<p role="alert">{historyError}</p>}
   {historyOpen&&history?.map(entry=><article className="feature-issue-event" key={entry.id}><strong>{entry.actorName}</strong> · {eventLabels[entry.eventType]||entry.eventType}<p><time>{eventTime(entry.createdAt)}</time></p>{entry.before?.ticketState&&entry.after?.ticketState&&(entry.before.ticketState!==entry.after.ticketState||entry.before.closureReason!==entry.after.closureReason)?<p>{ticketTransitionLabel({state:entry.before.ticketState,closureReason:entry.before.closureReason})} → {ticketTransitionLabel({state:entry.after.ticketState,closureReason:entry.after.closureReason})}</p>:entry.before?.status&&entry.after?.status&&entry.before.status!==entry.after.status&&<p>{statusLabel(entry.before.status)} → {statusLabel(entry.after.status)}</p>}{(entry.reason||entry.after?.reason)&&<p className="wi-pre">{entry.reason||entry.after.reason}</p>}{(entry.body||entry.after?.body)&&<p className="wi-pre">{entry.body||entry.after.body}</p>}{contentFields.some(([key])=>entry.after?.[key]!=null&&entry.before?.[key]!==entry.after[key])&&<details><summary>Nội dung thay đổi</summary>{contentFields.filter(([key])=>entry.after?.[key]!=null&&entry.before?.[key]!==entry.after[key]).map(([key,label])=><div key={key}><strong>{label}</strong>{entry.before?.[key]&&<p className="wi-pre">Trước: {entry.before[key]}</p>}<p className="wi-pre">Sau: {entry.after[key]||'(trống)'}</p></div>)}</details>}</article>)}{historyOpen&&history?.length===0&&!historyLoading&&<p>Chưa có lịch sử Issue.</p>}
  </section>{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 </article>;
}
