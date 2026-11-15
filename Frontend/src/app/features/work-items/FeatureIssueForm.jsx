import {useRefreshOnReturn} from '../../hooks/useRefreshOnReturn';
import {UnifiedSelect} from '../../components/UnifiedSelect';
import React,{useEffect,useRef,useState} from 'react';
import {featureIssuesApi} from '../../services/api/featureIssues';
import {useModalActivity} from './components';
import {IssueFeatureContext} from './IssueFeatureContext';
import {ticketTitlePrefix,boundedTicketTitlePrefix,ticketStateLabel,ticketTransitionLabel} from './ticketWorkflow';
import {SafeMarkdown} from '../reports/SafeMarkdown';
import {IssueContentEditor} from './IssueContentEditor';

const empty={type:'BUG',title:'',description:'',preconditions:'',steps:'',expectedResult:'',actualResult:'',frequency:'',environment:'',device:'',assigneeMembershipId:'',manualTestVersion:'',ticketState:'NEW',closureReason:''};
const prefill=data=>({...empty,environment:data?.environmentName||'',title:data?.title||'',preconditions:data?.preconditions||'',steps:data?.steps||'',expectedResult:data?.expectedResult||'',actualResult:data?.actualResult||''});
export function FeatureIssueForm({projectId,featureId,documentId,row,monkey=false,featureName,api=featureIssuesApi,onSaved,onCancel,authorized=true,onActivity,presentation}) {
 useRefreshOnReturn(()=>{if(!busy&&!loading){setSourceReload(v=>v+1);setContactsReload(v=>v+1);};});
 const [preview,setPreview]=useState(false);
 const [draft,setDraft]=useState(empty),[source,setSource]=useState(null),[loading,setLoading]=useState(!!row&&!monkey),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sourceReload,setSourceReload]=useState(0),[sourceNotice,setSourceNotice]=useState('');
 const [contacts,setContacts]=useState([]),[contactsLoading,setContactsLoading]=useState(true),[contactsError,setContactsError]=useState(''),[contactsReload,setContactsReload]=useState(0);
 const [initialTransitions,setInitialTransitions]=useState(null);
 const lifetime=useRef(null),lock=useRef(false),command=useRef(null),initialized=useRef(false),baseline=useRef(empty),environmentEdited=useRef(false);
 const rowId=monkey?null:row?.rowId,type=monkey?'BUG':draft.type;
 const initialAssignee=type==='BUG'?draft.assigneeMembershipId:'';
 const titleContext={source,featureName,monkey},prefix=boundedTicketTitlePrefix(titleContext),shortenedPrefix=prefix!==ticketTitlePrefix(titleContext),title=prefix?`${prefix} ${draft.title}`:draft.title;
 const invalidContact=!!draft.assigneeMembershipId&&!contacts.some(contact=>String(contact.membershipId)===draft.assigneeMembershipId);
 const initialStates=[...new Set((initialTransitions||[]).map(choice=>choice.state))],initialReasons=(initialTransitions||[]).filter(choice=>choice.state==='CLOSED');
 const invalidInitial=type==='BUG'&&initialTransitions!==null&&!initialTransitions.some(choice=>choice.state===draft.ticketState&&(choice.state!=='CLOSED'||choice.closureReason===draft.closureReason));
 const requestClose=useModalActivity(busy,Object.keys(empty).some(key=>draft[key]!==baseline.current[key]));
 const dirty=Object.keys(empty).some(key=>draft[key]!==baseline.current[key]);
 useEffect(()=>{onActivity?.({busy,dirty});return()=>onActivity?.({busy:false,dirty:false});},[onActivity,busy,dirty]);
 useEffect(()=>{const controller=new AbortController();lifetime.current=controller;initialized.current=false;environmentEdited.current=false;lock.current=false;command.current=null;baseline.current=empty;setDraft(empty);setSource(null);setError('');setSourceNotice('');setBusy(false);return()=>controller.abort();},[api,projectId,featureId,documentId,rowId,monkey]);
 useEffect(()=>{
  const controller=new AbortController();if(!rowId){setLoading(false);return()=>controller.abort();}setLoading(true);
  api.context(projectId,featureId,documentId,rowId,{signal:controller.signal}).then(data=>{
   if(controller.signal.aborted)return;setSource(data);setError('');
   if(!initialized.current){const next=prefill(data);baseline.current=next;setDraft(next);initialized.current=true;}
   else {
    if(!environmentEdited.current){const environment=data.environmentName||'';baseline.current={...baseline.current,environment};setDraft(old=>({...old,environment}));}
    setSourceNotice(environmentEdited.current?'Đã tải lại nguồn. Bản nháp giữ nguyên; hãy đối chiếu nội dung, revision và version trước khi gửi lại.':'Đã tải lại nguồn và môi trường của case. Các nội dung khác trong bản nháp được giữ nguyên.');
   }
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[api,projectId,featureId,documentId,rowId,sourceReload]);
 useEffect(()=>{
  const controller=new AbortController();setContacts([]);setInitialTransitions(null);setContactsLoading(true);setContactsError('');
  api.options(projectId,type,{signal:controller.signal,...(initialAssignee?{assigneeMembershipId:Number(initialAssignee)}:{})}).then(data=>{if(!controller.signal.aborted){setContacts(data.assignees);setInitialTransitions(data.initialTransitions||[{state:type==='QA'?'SPEC_CONFIRM':'NEW',closureReason:null,columnId:type==='QA'?'spec':'new'}]);}}).catch(e=>{if(!controller.signal.aborted)setContactsError(e.message);}).finally(()=>{if(!controller.signal.aborted)setContactsLoading(false);});
  return()=>controller.abort();
 },[api,projectId,type,initialAssignee,contactsReload]);
 function change(name,value){if(name==='environment')environmentEdited.current=true;setDraft(old=>({...old,[name]:value,...(name==='type'?{assigneeMembershipId:'',ticketState:value==='QA'?'SPEC_CONFIRM':'NEW',closureReason:''}:name==='ticketState'?{closureReason:''}:{})}));}
 async function submit(event) {
  event.preventDefault();if(!authorized||lock.current||loading||contactsLoading||contactsError||invalidInitial||!!rowId&&!source)return;
  {
   const required=type==='QA'?['description']:['steps','expectedResult','actualResult',...(draft.ticketState!=='NEW'?['description']:[])];
   const missing=required.find(key=>!draft[key].trim());
   if(missing){setError('Bổ sung nội dung còn thiếu trong phần đang mở trước khi lưu.');return;}
  }
  if(title.length>300){setError('Tiêu đề gồm tiền tố vượt 300 ký tự. Hãy rút gọn phần tiêu đề.');return;}
  if(!contacts.some(contact=>String(contact.membershipId)===draft.assigneeMembershipId)){setError('Chọn đầu mối tiếp nhận hiện tại của dự án.');return;}
  lock.current=true;setBusy(true);setError('');const signal=lifetime.current.signal;
  const {manualTestVersion,assigneeMembershipId,ticketState,closureReason,...content}=draft;
  const payload={...content,title,type,featureId:Number(featureId),monkey,assigneeMembershipId:Number(assigneeMembershipId),ticketState:type==='QA'?'SPEC_CONFIRM':ticketState,...(type==='BUG'&&ticketState==='CLOSED'?{closureReason}:{}),...(monkey?{manualTestVersion}:{documentId:Number(documentId),rowId:Number(rowId),sourceRevisionId:source.revisionId,sourceResultVersion:source.resultVersion})};
  const serialized=JSON.stringify(payload);if(command.current?.serialized!==serialized)command.current={serialized,key:crypto.randomUUID()};
  try{const saved=await api.create(projectId,{...payload,requestKey:command.current.key},{signal});if(!signal.aborted)onSaved?.(saved);}
  catch(e){if(!signal.aborted)setError(e.message||'Chưa lưu được Ticket. Nội dung đang soạn được giữ lại.');}
  finally{if(!signal.aborted){lock.current=false;setBusy(false);}}
 }
 const previewMarkdown=`# ${title}\n\n${[['description','Hiện tượng / câu hỏi'],['preconditions','Điều kiện tiên quyết'],['steps','Các bước thực hiện'],['expectedResult','Kết quả mong đợi'],['actualResult','Kết quả thực tế'],['frequency','Tần suất tái hiện'],['environment','Môi trường'],['device','Thiết bị']].map(([key,label])=>`## ${label}\n\n${draft[key]||'Chưa ghi'}`).join('\n\n')}`;
 return <form className={`feature-issue-form${presentation==='page'?' issue-create-form':''}`} onSubmit={submit} aria-busy={loading||busy}>
  {source&&<details className="issue-create-context"><summary>Thông tin Đợt kiểm thử và nguồn tham chiếu</summary><IssueFeatureContext {...source} featureId={featureId}/></details>}
  <p className="wi-note">{source?[source.fileName,source.caseReference&&`Case ${source.caseReference}`].filter(Boolean).join(' · '):featureName||'Đợt kiểm thử đã chọn'}{monkey?' · Bug monkey độc lập':''}</p>
  {loading&&<p role="status">Đang lấy nội dung case…</p>}{error&&<p role="alert" className="wi-error">{error} Bản nháp được giữ lại.</p>}
  {rowId&&(error)&&<button type="button" className="cat-btn" disabled={loading||busy} onClick={()=>setSourceReload(value=>value+1)}>Thử lại nội dung case</button>}
  {sourceNotice&&<p role="status">{sourceNotice}</p>}
  {!authorized&&<p role="alert">Quyền tạo Ticket đã thay đổi. Nội dung đang soạn được giữ lại; hãy kiểm tra quyền trước khi gửi tiếp.</p>}
  <fieldset disabled={!authorized||busy||loading||!!rowId&&!source}>
   <legend>Nội dung phát hiện</legend>
   <div className="ticket-field-grid"><label className="wi-field">Loại Ticket<UnifiedSelect value={type} disabled={monkey} onChange={e=>change('type',e.target.value)}><option value="BUG">Bug</option><option value="QA">QA</option></UnifiedSelect></label>{type==='BUG'?<label className="wi-field">Trạng thái ban đầu<UnifiedSelect value={draft.ticketState} disabled={contactsLoading||!!contactsError} onChange={e=>change('ticketState',e.target.value)}>{!initialStates.includes(draft.ticketState)&&<option disabled value={draft.ticketState}>{ticketStateLabel(draft.ticketState)} · Không còn được phép</option>}{initialStates.map(state=><option key={state} value={state}>{ticketStateLabel(state)}</option>)}</UnifiedSelect></label>:<label className="wi-field">Trạng thái ban đầu<UnifiedSelect disabled value="SPEC_CONFIRM"><option value="SPEC_CONFIRM">Xác nhận spec</option></UnifiedSelect></label>}{type==='BUG'&&draft.ticketState==='CLOSED'&&<label className="wi-field">Lý do đóng ban đầu<UnifiedSelect required value={draft.closureReason} disabled={contactsLoading||!!contactsError} onChange={e=>change('closureReason',e.target.value)}><option value="">Chọn lý do đóng</option>{draft.closureReason&&!initialReasons.some(choice=>choice.closureReason===draft.closureReason)&&<option disabled value={draft.closureReason}>{ticketTransitionLabel({state:'CLOSED',closureReason:draft.closureReason})} · Không còn được phép</option>}{initialReasons.map(choice=><option key={choice.closureReason} value={choice.closureReason}>{ticketTransitionLabel(choice)}</option>)}</UnifiedSelect></label>}</div>
   {prefix&&<p className="ticket-title-prefix">Tiền tố: <strong>{prefix}</strong></p>}
   {shortenedPrefix&&<p className="wi-note" role="status">Tiền tố đã được rút gọn bằng dấu … để dành chỗ cho phần tiêu đề. Thông tin nguồn đầy đủ vẫn giữ trong ngữ cảnh lúc phát hiện.</p>}
   <label className="wi-field">Tiêu đề<input required maxLength={300} value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
   <p className="wi-note">Tiêu đề đầy đủ ({title.length}/300): {title}</p>
   {title.length>300&&<p role="alert">Tiêu đề gồm tiền tố vượt 300 ký tự. Hãy rút gọn phần tiêu đề còn tối đa {300-(prefix?prefix.length+1:0)} ký tự.</p>}
   <IssueContentEditor draft={draft} type={type} onChange={change}/>{type==='BUG'&&draft.ticketState!=='NEW'&&<p className="wi-note">Ghi lý do cho trạng thái ban đầu đã chọn trong Mô tả.</p>}
   <div className="ticket-field-grid">
    {[['frequency','Tần suất tái hiện'],['environment','Môi trường phát hiện'],['device','Thiết bị phát hiện']].map(([key,label])=><label key={key} className="wi-field">{label}<input required={type==='BUG'} maxLength={1000} value={draft[key]} onChange={e=>change(key,e.target.value)}/></label>)}
    <label className="wi-field">Version lúc phát hiện{monkey?<input maxLength={255} value={draft.manualTestVersion} onChange={e=>change('manualTestVersion',e.target.value)}/>:<input readOnly value={source?.testVersionName||'Chưa ghi version tại case'}/>}</label>
   </div>
   {!monkey&&source&&<p className="wi-note">{source.environmentName?'Môi trường được lấy từ case; bạn có thể chỉnh lại theo thực tế phát hiện.':'Case chưa chọn môi trường. Bạn có thể nhập tại đây hoặc chọn trong cột MT & Ver trước khi mở form.'}</p>}
   {!monkey&&source&&<div className="wi-note"><p>{source.testVersionName?'Version lấy từ kết quả đã lưu của case.':'Nguồn chưa có version. Bạn có thể ghi version tại case rồi tải lại nguồn.'}</p><p>Ngày thực hiện: {source.executedOn||'Chưa ghi'} · Đối tượng test: {source.testObject||'Chưa ghi'}</p><p>Revision: {source.revisionId??'Chưa ghi'} · Revision kết quả: {source.resultVersion??'Chưa ghi'}</p></div>}
   {source&&!source.testObject&&<p role="status">Chưa ghi đối tượng test tại nguồn. Tiêu đề giữ thông tin nguồn hiện có, không thay bằng tên Đợt kiểm thử.</p>}
   <label className="wi-field">Người phụ trách<UnifiedSelect required value={draft.assigneeMembershipId} disabled={contactsLoading||!!contactsError} onChange={e=>change('assigneeMembershipId',e.target.value)}><option value="">Chọn người phụ trách</option>{draft.assigneeMembershipId&&!contacts.some(c=>String(c.membershipId)===draft.assigneeMembershipId)&&<option disabled value={draft.assigneeMembershipId}>Người phụ trách không còn đủ điều kiện</option>}{contacts.map(contact=><option key={contact.membershipId} value={contact.membershipId}>{contact.displayName}</option>)}</UnifiedSelect></label>
   {(contactsError||invalidContact)&&<button type="button" className="cat-btn" disabled={busy||contactsLoading} onClick={()=>setContactsReload(value=>value+1)}>Thử lại đầu mối</button>}

   {!contactsLoading&&invalidInitial&&<p role="alert">Trạng thái hoặc lý do ban đầu chưa hợp lệ theo quyền hiện tại. Bản nháp được giữ; hãy chọn lại trạng thái và lý do được phép.</p>}
   {contactsLoading&&<p role="status">Đang tải đầu mối…</p>}{contactsError&&<p role="alert">{contactsError}</p>}{!contactsLoading&&!contactsError&&invalidContact&&<p role="alert">Đầu mối đã chọn không còn đủ điều kiện. Hãy chọn đầu mối hiện tại; bản nháp được giữ lại.</p>}{!contactsLoading&&!contactsError&&!contacts.length&&<p role="alert">Chưa có đầu mối đủ điều kiện. Cần quản lý dự án phân công trách nhiệm.</p>}
   {preview&&<section aria-label="Xem trước Ticket" className="issue-create-preview"><SafeMarkdown markdown={previewMarkdown}/></section>}
   <div className="wi-actions issue-create-submit"><button type="button" className="wi-btn" aria-pressed={preview} onClick={()=>setPreview(value=>!value)}>Xem trước</button><button type="submit" className="wi-btn wi-btn-primary" disabled={contactsLoading||!!contactsError||invalidContact||invalidInitial||!contacts.length||title.length>300}>{busy?'Đang lưu…':'Lưu Ticket'}</button>{onCancel&&<button type="button" className="wi-btn" onClick={requestClose||onCancel}>Hủy</button>}</div>
  </fieldset>
 </form>;
}
