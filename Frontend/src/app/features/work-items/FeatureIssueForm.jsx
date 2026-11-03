import React,{useEffect,useRef,useState} from 'react';
import {featureIssuesApi} from '../../services/api/featureIssues';
import {useModalActivity} from './components';
import {IssueFeatureContext} from './IssueFeatureContext';
import {ticketTitlePrefix,boundedTicketTitlePrefix,ticketStateLabel,ticketTransitionLabel} from './ticketWorkflow';

const empty={type:'BUG',title:'',description:'',preconditions:'',steps:'',expectedResult:'',actualResult:'',frequency:'',environment:'',device:'',assigneeMembershipId:'',manualTestVersion:'',ticketState:'NEW',closureReason:''};
const prefill=data=>({...empty,title:data?.title||'',preconditions:data?.preconditions||'',steps:data?.steps||'',expectedResult:data?.expectedResult||'',actualResult:data?.actualResult||''});
export function FeatureIssueForm({projectId,featureId,documentId,row,monkey=false,featureName,api=featureIssuesApi,onSaved,onCancel,authorized=true}) {
 const [draft,setDraft]=useState(empty),[source,setSource]=useState(null),[loading,setLoading]=useState(!!row&&!monkey),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sourceReload,setSourceReload]=useState(0),[sourceNotice,setSourceNotice]=useState('');
 const [contacts,setContacts]=useState([]),[contactsLoading,setContactsLoading]=useState(true),[contactsError,setContactsError]=useState(''),[contactsReload,setContactsReload]=useState(0);
 const [initialTransitions,setInitialTransitions]=useState(null);
 const lifetime=useRef(null),lock=useRef(false),command=useRef(null),initialized=useRef(false),baseline=useRef(empty);
 const rowId=monkey?null:row?.rowId,type=monkey?'BUG':draft.type;
 const initialAssignee=type==='BUG'?draft.assigneeMembershipId:'';
 const titleContext={source,featureName,monkey},prefix=boundedTicketTitlePrefix(titleContext),shortenedPrefix=prefix!==ticketTitlePrefix(titleContext),title=prefix?`${prefix} ${draft.title}`:draft.title;
 const invalidContact=!!draft.assigneeMembershipId&&!contacts.some(contact=>String(contact.membershipId)===draft.assigneeMembershipId);
 const initialStates=[...new Set((initialTransitions||[]).map(choice=>choice.state))],initialReasons=(initialTransitions||[]).filter(choice=>choice.state==='CLOSED');
 const invalidInitial=type==='BUG'&&initialTransitions!==null&&!initialTransitions.some(choice=>choice.state===draft.ticketState&&(choice.state!=='CLOSED'||choice.closureReason===draft.closureReason));
 const requestClose=useModalActivity(busy,Object.keys(empty).some(key=>draft[key]!==baseline.current[key]));
 useEffect(()=>{const controller=new AbortController();lifetime.current=controller;initialized.current=false;lock.current=false;command.current=null;baseline.current=empty;setDraft(empty);setSource(null);setError('');setSourceNotice('');setBusy(false);return()=>controller.abort();},[api,projectId,featureId,documentId,rowId,monkey]);
 useEffect(()=>{
  const controller=new AbortController();if(!rowId){setLoading(false);return()=>controller.abort();}setLoading(true);
  api.context(projectId,featureId,documentId,rowId,{signal:controller.signal}).then(data=>{
   if(controller.signal.aborted)return;setSource(data);setError('');
   if(!initialized.current){const next=prefill(data);baseline.current=next;setDraft(next);initialized.current=true;}
   else setSourceNotice('Đã tải lại nguồn. Bản nháp giữ nguyên; hãy đối chiếu nội dung, revision và version trước khi gửi lại.');
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[api,projectId,featureId,documentId,rowId,sourceReload]);
 useEffect(()=>{
  const controller=new AbortController();setContacts([]);setInitialTransitions(null);setContactsLoading(true);setContactsError('');
  api.options(projectId,type,{signal:controller.signal,...(initialAssignee?{assigneeMembershipId:Number(initialAssignee)}:{})}).then(data=>{if(!controller.signal.aborted){setContacts(data.assignees);setInitialTransitions(data.initialTransitions||[{state:type==='QA'?'SPEC_CONFIRM':'NEW',closureReason:null,columnId:type==='QA'?'spec':'new'}]);}}).catch(e=>{if(!controller.signal.aborted)setContactsError(e.message);}).finally(()=>{if(!controller.signal.aborted)setContactsLoading(false);});
  return()=>controller.abort();
 },[api,projectId,type,initialAssignee,contactsReload]);
 function change(name,value){setDraft(old=>({...old,[name]:value,...(name==='type'?{assigneeMembershipId:'',ticketState:value==='QA'?'SPEC_CONFIRM':'NEW',closureReason:''}:name==='ticketState'?{closureReason:''}:{})}));}
 async function submit(event) {
  event.preventDefault();if(!authorized||lock.current||loading||contactsLoading||contactsError||invalidInitial||!!rowId&&!source)return;
  if(title.length>300){setError('Tiêu đề gồm tiền tố vượt 300 ký tự. Hãy rút gọn phần tiêu đề.');return;}
  if(!contacts.some(contact=>String(contact.membershipId)===draft.assigneeMembershipId)){setError('Chọn đầu mối tiếp nhận hiện tại của dự án.');return;}
  lock.current=true;setBusy(true);setError('');const signal=lifetime.current.signal;
  const {manualTestVersion,assigneeMembershipId,ticketState,closureReason,...content}=draft;
  const payload={...content,title,type,featureId:Number(featureId),monkey,assigneeMembershipId:Number(assigneeMembershipId),ticketState:type==='QA'?'SPEC_CONFIRM':ticketState,...(type==='BUG'&&ticketState==='CLOSED'?{closureReason}:{}),...(monkey?{manualTestVersion}:{documentId:Number(documentId),rowId:Number(rowId),sourceRevisionId:source.revisionId,sourceResultVersion:source.resultVersion})};
  const serialized=JSON.stringify(payload);if(command.current?.serialized!==serialized)command.current={serialized,key:crypto.randomUUID()};
  try{const saved=await api.create(projectId,{...payload,requestKey:command.current.key},{signal});if(!signal.aborted)onSaved?.(saved);}
  catch(e){if(!signal.aborted)setError(e.message||'Chưa lưu được Issue. Nội dung đang soạn được giữ lại.');}
  finally{if(!signal.aborted){lock.current=false;setBusy(false);}}
 }
 return <form className="feature-issue-form" onSubmit={submit} aria-busy={loading||busy}>
  {source&&<IssueFeatureContext {...source} featureId={featureId}/>}
  <p className="wi-note">{source?[source.fileName,source.caseReference&&`Case ${source.caseReference}`].filter(Boolean).join(' · '):featureName||'Feature đã chọn'}{monkey?' · Bug monkey độc lập':''}</p>
  {loading&&<p role="status">Đang lấy nội dung case…</p>}{error&&<p role="alert" className="wi-error">{error} Bản nháp được giữ lại.</p>}
  {rowId&&<button type="button" className="cat-btn" disabled={loading||busy} onClick={()=>setSourceReload(value=>value+1)}>Tải lại nội dung case</button>}
  {sourceNotice&&<p role="status">{sourceNotice}</p>}
  {!authorized&&<p role="alert">Quyền tạo Issue đã thay đổi. Nội dung đang soạn được giữ lại; hãy kiểm tra quyền trước khi gửi tiếp.</p>}
  <fieldset disabled={!authorized||busy||loading||!!rowId&&!source}>
   <legend>Nội dung phát hiện</legend>
   <div className="ticket-field-grid"><label className="wi-field">Loại Issue<select value={type} disabled={monkey} onChange={e=>change('type',e.target.value)}><option value="BUG">Bug</option><option value="QA">QA</option></select></label><p>Trạng thái ban đầu: {ticketStateLabel(type==='QA'?'SPEC_CONFIRM':draft.ticketState)}</p></div>
   {prefix&&<p className="ticket-title-prefix">Tiền tố: <strong>{prefix}</strong></p>}
   {shortenedPrefix&&<p className="wi-note" role="status">Tiền tố đã được rút gọn bằng dấu … để dành chỗ cho phần tiêu đề. Thông tin nguồn đầy đủ vẫn giữ trong ngữ cảnh lúc phát hiện.</p>}
   <label className="wi-field">Tiêu đề<input required maxLength={300} value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
   <p className="wi-note">Tiêu đề đầy đủ ({title.length}/300): {title}</p>
   {title.length>300&&<p role="alert">Tiêu đề gồm tiền tố vượt 300 ký tự. Hãy rút gọn phần tiêu đề còn tối đa {300-(prefix?prefix.length+1:0)} ký tự.</p>}
   <label className="wi-field">{type==='QA'?'Nội dung câu hỏi':'Mô tả'}<textarea required={type==='QA'||draft.ticketState!=='NEW'} maxLength={20000} rows={3} value={draft.description} onChange={e=>change('description',e.target.value)}/></label>{type==='BUG'&&draft.ticketState!=='NEW'&&<p className="wi-note">Ghi lý do cho trạng thái ban đầu đã chọn trong Mô tả.</p>}
   {[['preconditions','Điều kiện tiên quyết'],['steps','Các bước thực hiện'],['expectedResult','Kết quả mong đợi'],['actualResult','Kết quả thực tế']].map(([key,label])=><label key={key} className="wi-field">{label}<textarea required={type==='BUG'&&key!=='preconditions'} maxLength={20000} rows={3} value={draft[key]} onChange={e=>change(key,e.target.value)}/></label>)}
   <div className="ticket-field-grid">{[['frequency','Tần suất tái hiện'],['environment','Môi trường phát hiện'],['device','Thiết bị phát hiện']].map(([key,label])=><label key={key} className="wi-field">{label}<input required={type==='BUG'} maxLength={1000} value={draft[key]} onChange={e=>change(key,e.target.value)}/></label>)}</div>
   <section className="ticket-source-evidence" aria-label="Nguồn lúc phát hiện"><h4>Nguồn lúc phát hiện</h4>
    {monkey?<label className="wi-field">Version kiểm thử thủ công<input maxLength={255} value={draft.manualTestVersion} onChange={e=>change('manualTestVersion',e.target.value)}/></label>:<><label className="wi-field">Version lúc phát hiện<input readOnly value={source?.testVersionName||'Chưa ghi version tại case'}/></label><p>{source?.testVersionName?'Version lấy từ kết quả đã lưu của case.':'Nguồn chưa có version. Bạn có thể ghi version tại case rồi tải lại nguồn.'}</p><p>Ngày thực hiện: {source?.executedOn||'Chưa ghi'} · Đối tượng test: {source?.testObject||'Chưa ghi'}</p><p>Revision: {source?.revisionId??'Chưa ghi'} · Revision kết quả: {source?.resultVersion??'Chưa ghi'}</p></>}
   </section>
   {source&&!source.testObject&&<p role="status">Chưa ghi đối tượng test tại nguồn. Tiêu đề giữ thông tin nguồn hiện có, không thay bằng tên Feature.</p>}
   <label className="wi-field">Đầu mối tiếp nhận<select required value={draft.assigneeMembershipId} disabled={contactsLoading||!!contactsError} onChange={e=>change('assigneeMembershipId',e.target.value)}><option value="">Chọn {type==='QA'?'đầu mối spec':'điều phối Bug'}</option>{draft.assigneeMembershipId&&!contacts.some(c=>String(c.membershipId)===draft.assigneeMembershipId)&&<option disabled value={draft.assigneeMembershipId}>Đầu mối không còn đủ điều kiện</option>}{contacts.map(contact=><option key={contact.membershipId} value={contact.membershipId}>{contact.displayName}</option>)}</select></label>
   <button type="button" className="cat-btn" disabled={busy||contactsLoading} onClick={()=>setContactsReload(value=>value+1)}>Tải lại đầu mối</button>
   {type==='BUG'&&<div className="ticket-field-grid"><label className="wi-field">Trạng thái ban đầu<select value={draft.ticketState} disabled={contactsLoading||!!contactsError} onChange={e=>change('ticketState',e.target.value)}>{!initialStates.includes(draft.ticketState)&&<option disabled value={draft.ticketState}>{ticketStateLabel(draft.ticketState)} · Không còn được phép</option>}{initialStates.map(state=><option key={state} value={state}>{ticketStateLabel(state)}</option>)}</select></label>{draft.ticketState==='CLOSED'&&<label className="wi-field">Lý do đóng ban đầu<select required value={draft.closureReason} disabled={contactsLoading||!!contactsError} onChange={e=>change('closureReason',e.target.value)}><option value="">Chọn lý do đóng</option>{draft.closureReason&&!initialReasons.some(choice=>choice.closureReason===draft.closureReason)&&<option disabled value={draft.closureReason}>{ticketTransitionLabel({state:'CLOSED',closureReason:draft.closureReason})} · Không còn được phép</option>}{initialReasons.map(choice=><option key={choice.closureReason} value={choice.closureReason}>{ticketTransitionLabel(choice)}</option>)}</select></label>}</div>}
   {!contactsLoading&&invalidInitial&&<p role="alert">Trạng thái hoặc lý do ban đầu chưa hợp lệ theo quyền hiện tại. Bản nháp được giữ; hãy chọn lại trạng thái và lý do được phép.</p>}
   {contactsLoading&&<p role="status">Đang tải đầu mối…</p>}{contactsError&&<p role="alert">{contactsError}</p>}{!contactsLoading&&!contactsError&&invalidContact&&<p role="alert">Đầu mối đã chọn không còn đủ điều kiện. Hãy chọn đầu mối hiện tại; bản nháp được giữ lại.</p>}{!contactsLoading&&!contactsError&&!contacts.length&&<p role="alert">Chưa có đầu mối đủ điều kiện. Cần quản lý dự án phân công trách nhiệm.</p>}
   <div className="wi-actions"><button type="submit" className="wi-btn wi-btn-primary" disabled={contactsLoading||!!contactsError||invalidContact||invalidInitial||!contacts.length||title.length>300}>{busy?'Đang lưu…':'Lưu Issue'}</button>{onCancel&&<button type="button" className="wi-btn" onClick={requestClose||onCancel}>Hủy</button>}</div>
  </fieldset>
 </form>;
}
