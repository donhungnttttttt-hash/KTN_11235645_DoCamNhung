import {useRefreshOnReturn} from '../../hooks/useRefreshOnReturn';
import {TicketAttachments} from './TicketAttachments';
import {SafeMarkdown} from '../reports/SafeMarkdown';
import React,{useEffect,useId,useRef,useState} from 'react';
import {Pencil} from 'lucide-react';
import {featureIssuesApi} from '../../services/api/featureIssues';
import {statuses} from './data';
import {TicketSupplementaryNotes} from './TicketSupplementaryNotes';
import {useModalActivity} from './components';
import {TicketActionComposer} from './TicketActionComposer';
import {ticketInitials} from './ticketPresentation';
import {chronological,ticketColumns,ticketContentFields as contentFields,ticketLabel,ticketTransitionLabel} from './ticketWorkflow';
import './feature-issues.css';
import './workspace-presentation.css';

const eventLabels={CREATE:'Tạo Ticket',UPDATE:'Sửa nội dung',STATUS:'Chuyển trạng thái',COMMENT:'Thêm ghi chú',DELETE:'Xóa mềm',RESTORE:'Khôi phục',CONVERT_TO_BUG:'Chuyển QA thành Bug',TICKET_ACTION:'Cập nhật Ticket'};
function eventTime(value){
 if(!value)return 'Không rõ thời điểm';
 const text=String(value).replace(' ','T'),date=new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(text)?text:text+'Z');
 return Number.isNaN(date.getTime())?'Không rõ thời điểm':new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(date);
}
const statusLabel=value=>statuses.find(status=>status.id===value)?.label||value;
const mergeComments=(loaded,current)=>chronological([...loaded,...current.filter(value=>!loaded.some(other=>other.id===value.id))]);
const metadata=['preconditions','frequency','environment','device'];

export function FeatureIssueDetail({projectId,id,api=featureIssuesApi,initialStatus,onChanged,onDeleted}) {
 useRefreshOnReturn(()=>{if(!busy&&!reloading&&!actionActivity.busy)reloadItem();});
 const [item,setItem]=useState(null),[error,setError]=useState(''),[comments,setComments]=useState([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const lifetime=useRef(null),lock=useRef(false),[actionActivity,setActionActivity]=useState({busy:false,dirty:false});
 const [editing,setEditing]=useState(false),[edit,setEdit]=useState(null),[editBaseline,setEditBaseline]=useState(null);
 const editFormId=useId();
 const [confirmDelete,setConfirmDelete]=useState(false),[deleted,setDeleted]=useState(false),[history,setHistory]=useState(null),[historyOpen,setHistoryOpen]=useState(false),[historyError,setHistoryError]=useState(''),[historyLoading,setHistoryLoading]=useState(false);
 const [reloading,setReloading]=useState(false),[commentsError,setCommentsError]=useState(''),[commentsLoading,setCommentsLoading]=useState(false);
 const editButton=useRef(null),deleteButton=useRef(null),keepButton=useRef(null),previousEditing=useRef(false),previousDelete=useRef(false),commentRequest=useRef(0),historyRequest=useRef(0);
 useModalActivity(busy||reloading||actionActivity.busy,actionActivity.dirty||!!(editing&&edit&&contentFields.map(([key])=>key).some(key=>String(edit[key]??'')!==String(editBaseline?.[key]??''))));
 useEffect(()=>{if(!editing&&previousEditing.current)editButton.current?.focus();previousEditing.current=editing;},[editing]);
 useEffect(()=>{if(confirmDelete)keepButton.current?.focus();else if(previousDelete.current)deleteButton.current?.focus();previousDelete.current=confirmDelete;},[confirmDelete]);
 useEffect(()=>{
  const controller=new AbortController();lifetime.current=controller;lock.current=false;setBusy(false);setReloading(false);setItem(null);setComments([]);setError('');setNotice('');setEditing(false);setEdit(null);setConfirmDelete(false);setDeleted(false);setHistory(null);setHistoryOpen(false);setHistoryError('');setHistoryLoading(false);
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
 function startEdit(){const initial=Object.fromEntries([...contentFields.map(([key])=>key),'version'].map(key=>[key,item[key]??'']));setEdit(initial);setEditBaseline(initial);setEditing(true);setError('');}
 async function saveEdit(event){
  event.preventDefault();if(lock.current||actionActivity.busy||!item.canEdit)return;
  lock.current=true;setBusy(true);setError('');setNotice('');const signal=lifetime.current.signal;
  const input=Object.fromEntries(contentFields.filter(([key])=>!metadata.includes(key)||edit[key]!==editBaseline[key]).map(([key])=>[key,edit[key]]));input.expectedVersion=edit.version;
  try{const fresh=await api.update(projectId,id,input,{signal});if(!signal.aborted){setItem(fresh);setEditing(false);setNotice('Đã lưu nội dung Ticket.');onChanged?.(fresh);if(historyOpen)loadHistory();}}
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
 if(deleted)return <p role="status">Đã xóa mềm Bug monkey. Lịch sử Ticket vẫn được giữ.</p>;
 if(error&&!item)return <div><p role="alert">{error}</p>{(error)&&<button type="button" className="cat-btn" disabled={reloading} onClick={reloadItem}>Thử lại Ticket</button>}</div>;
 if(!item)return <p role="status">Đang tải Ticket…</p>;
 const blocked=busy||reloading||actionActivity.busy;
 function editField(key,label){
  const props={form:editFormId,'aria-label':label,disabled:blocked||!item.canEdit,value:edit[key],onChange:event=>setEdit(old=>({...old,[key]:event.target.value}))};
  if(key==='title')return <input {...props} autoFocus required maxLength={300}/>;
  if(metadata.includes(key)&&key!=='preconditions')return <input {...props} maxLength={1000} required={item.type==='BUG'&&!!editBaseline[key]}/>;
  return <textarea {...props} required={item.type==='QA'?key==='description':['steps','expectedResult','actualResult'].includes(key)&&(!item.convertedFromQa||!!editBaseline[key])} rows={key==='steps'?6:4} maxLength={20000}/>;
 }
 return <article className="feature-issue-detail" aria-busy={blocked}>
  {editing&&<form id={editFormId} className="ticket-inline-form" onSubmit={saveEdit} aria-label="Sửa nội dung Ticket"/>}
  <header className="ticket-detail-heading"><div className="ticket-detail-badges"><span className={`feature-kanban-type is-${item.type?.toLowerCase()}`}>{item.type==='BUG'?'Lỗi':'QA'}</span><strong>{item.key}</strong><span className="ticket-detail-status" style={{'--ticket-status-color':ticketColumns.find(column=>column.id===item.boardColumn)?.color||'#64748b'}}>{ticketLabel(item)}</span></div>{editing?<div className="ticket-inline-title">{editField('title','Tiêu đề Ticket')}</div>:<h3>{item.key} · {item.title}</h3>}<div className="wi-actions">{item.canEdit&&!editing&&<button ref={editButton} className="cat-btn" aria-label="Sửa nội dung Ticket" disabled={blocked} onClick={startEdit}><Pencil size={16}/> Chỉnh sửa</button>}{editing&&<><button className="cat-btn cat-btn-primary" type="submit" form={editFormId} disabled={blocked||!item.canEdit}>{busy?'Đang lưu…':'Lưu nội dung Ticket'}</button><button type="button" className="cat-btn" disabled={blocked} onClick={()=>setEditing(false)}>Hủy sửa</button></>}{(error)&&<button type="button" className="cat-btn" disabled={blocked} onClick={reloadItem}>Thử lại Ticket</button>}</div></header>
  <div className="ticket-detail-content"><div className="ticket-detail-author"><span className="ticket-person-avatar" aria-hidden="true">{ticketInitials(item.creator)}</span><div><strong>{item.creator||'Chưa ghi người tạo'}</strong><p>Ngày tạo <time>{eventTime(item.createdAt)}</time></p></div></div>
  {contentFields.filter(([key])=>!['title',...metadata,'device'].includes(key)).map(([key,label])=><section className="ticket-content-section" key={key}><h4>{key==='description'?'Hiện tượng / nội dung':label}</h4>{editing?editField(key,label):<p className="wi-pre">{item[key]||'Chưa ghi'}</p>}</section>)}
  {(editing||item.preconditions)&&<section className="ticket-content-section"><h4>Điều kiện tiên quyết</h4>{editing?editField('preconditions','Điều kiện tiên quyết'):<p className="wi-pre">{item.preconditions}</p>}</section>}
  <TicketSupplementaryNotes item={item} projectId={projectId} editing={editing} editField={editField}/>
  </div>
  <div className="wi-actions">{item.canDelete&&item.monkey&&item.type==='BUG'&&!confirmDelete&&<button ref={deleteButton} className="cat-btn" disabled={blocked} onClick={()=>setConfirmDelete(true)}>Xóa Bug monkey</button>}</div>
  {confirmDelete&&item.canDelete&&item.monkey&&item.type==='BUG'&&<section className="feature-issue-confirm" aria-label="Xác nhận xóa Bug monkey"><p>Xóa mềm {item.key}? Lịch sử Ticket vẫn được giữ.</p><div className="wi-actions"><button className="cat-btn" disabled={blocked} onClick={remove}>Xác nhận xóa mềm</button><button ref={keepButton} className="cat-btn" disabled={blocked} onClick={()=>setConfirmDelete(false)}>Giữ lại Bug monkey</button></div></section>}
  {editing&&editBaseline.version!==item.version&&<details className="ticket-edit-comparison"><summary>Nội dung hiện tại trên máy chủ</summary><p>{item.key} · {item.title}</p>{contentFields.filter(([key])=>key!=='title').map(([key,label])=><p key={key}><strong>{label}: </strong>{item[key]||'Chưa ghi'}</p>)}</details>}
  <section><h4>Ghi chú</h4>{commentsLoading&&<p role="status">Đang tải ghi chú…</p>}{commentsError&&<p role="alert">{commentsError} {(commentsError)&&<button type="button" className="cat-btn" disabled={commentsLoading} onClick={()=>reloadComments()}>Thử lại ghi chú</button>}</p>}{comments.map(comment=><article className="feature-issue-event" key={comment.id}><strong>{comment.actorName}</strong><p><time>{eventTime(comment.createdAt)}</time></p><SafeMarkdown markdown={comment.body||''}/><TicketAttachments files={comment.attachments} projectId={projectId} issueId={item.id} api={api}/></article>)}</section>
  <section><h4>Lịch sử Ticket</h4><button type="button" className="cat-btn" disabled={historyLoading} onClick={()=>historyOpen?setHistoryOpen(false):loadHistory()}>{historyOpen?'Thu gọn lịch sử':'Xem lịch sử Ticket'}</button>{historyLoading&&<p role="status">Đang tải lịch sử…</p>}{historyError&&<div role="alert">{historyError}<button type="button" className="cat-btn" disabled={historyLoading} onClick={loadHistory}>Thử lại lịch sử</button></div>}
   {historyOpen&&history?.map(entry=><article className="feature-issue-event" key={entry.id}><strong>{entry.actorName}</strong> · {eventLabels[entry.eventType]||entry.eventType}<p><time>{eventTime(entry.createdAt)}</time></p>{entry.before?.ticketState&&entry.after?.ticketState&&(entry.before.ticketState!==entry.after.ticketState||entry.before.closureReason!==entry.after.closureReason)?<p>{ticketTransitionLabel({state:entry.before.ticketState,closureReason:entry.before.closureReason})} → {ticketTransitionLabel({state:entry.after.ticketState,closureReason:entry.after.closureReason})}</p>:entry.before?.status&&entry.after?.status&&entry.before.status!==entry.after.status&&<p>{statusLabel(entry.before.status)} → {statusLabel(entry.after.status)}</p>}{(entry.reason||entry.after?.reason)&&<p className="wi-pre">{entry.reason||entry.after.reason}</p>}{(entry.body||entry.after?.body)&&<p className="wi-pre">{entry.body||entry.after.body}</p>}{contentFields.some(([key])=>entry.after?.[key]!=null&&entry.before?.[key]!==entry.after[key])&&<details><summary>Nội dung thay đổi</summary>{contentFields.filter(([key])=>entry.after?.[key]!=null&&entry.before?.[key]!==entry.after[key]).map(([key,label])=><div key={key}><strong>{label}</strong>{entry.before?.[key]&&<p className="wi-pre">Trước: {entry.before[key]}</p>}<p className="wi-pre">Sau: {entry.after[key]||'(trống)'}</p></div>)}</details>}</article>)}{historyOpen&&history?.length===0&&!historyLoading&&<p>Chưa có lịch sử Ticket.</p>}
  </section>{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <TicketActionComposer key={`${projectId}/${id}`} projectId={projectId} item={item} api={api} initialStatus={initialStatus} blocked={busy||reloading} onActivity={setActionActivity} onSaved={actionSaved}/>
 </article>;
}
