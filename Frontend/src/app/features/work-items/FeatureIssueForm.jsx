import React,{useEffect,useRef,useState} from 'react';
import {featureIssuesApi} from '../../services/api/featureIssues';
import {useModalActivity} from './components';
import {IssueFeatureContext} from './IssueFeatureContext';

const empty={type:'BUG',title:'',description:'',steps:'',expectedResult:'',actualResult:''};
export function FeatureIssueForm({projectId,featureId,documentId,row,monkey=false,featureName,api=featureIssuesApi,onSaved,onCancel,authorized=true}) {
 const [draft,setDraft]=useState(empty),[source,setSource]=useState(null),[loading,setLoading]=useState(!!row),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sourceReload,setSourceReload]=useState(0);
 const lifetime=useRef(null),lock=useRef(false),command=useRef(null);
 const rowId=row?.rowId;
 const initial={...empty,title:source?.title||'',steps:source?.steps||'',expectedResult:source?.expectedResult||''};
 const requestClose=useModalActivity(busy,Object.keys(empty).some(key=>draft[key]!==initial[key]));
 useEffect(()=>{
  const controller=new AbortController();lifetime.current=controller;lock.current=false;command.current=null;setBusy(false);setError('');setDraft(empty);setSource(null);setLoading(!!rowId);
  if(rowId)api.context(projectId,featureId,documentId,rowId,{signal:controller.signal}).then(data=>{
   if(controller.signal.aborted)return;setSource(data);setDraft({...empty,title:data.title||'',steps:data.steps||'',expectedResult:data.expectedResult||''});
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[api,projectId,featureId,documentId,rowId,sourceReload]);
 function change(name,value){setDraft(old=>({...old,[name]:value}));}
 async function submit(event) {
  event.preventDefault();if(!authorized||lock.current||loading||!!rowId&&!source)return;
  lock.current=true;setBusy(true);setError('');const signal=lifetime.current.signal;
  const payload={...draft,type:monkey?'BUG':draft.type,featureId:Number(featureId),documentId:documentId?Number(documentId):null,rowId:rowId?Number(rowId):null,monkey};
  const serialized=JSON.stringify(payload);
  if(command.current?.serialized!==serialized)command.current={serialized,key:crypto.randomUUID()};
  try {
   const saved=await api.create(projectId,{...payload,requestKey:command.current.key},{signal});
   if(!signal.aborted)onSaved?.(saved);
  }catch(e){if(!signal.aborted)setError(e.message||'Chưa lưu được Issue. Nội dung đang soạn được giữ lại.');}
  finally{if(!signal.aborted){lock.current=false;setBusy(false);}}
 }
 return <form className="feature-issue-form" onSubmit={submit} aria-busy={loading||busy}>
  {source&&<IssueFeatureContext {...source} featureId={featureId}/>}
  <p className="wi-note">{source?[source.fileName,source.caseNo&&`Case ${source.caseNo}`].filter(Boolean).join(' · '):featureName||'Feature đã chọn'}{monkey?' · Bug monkey':''}</p>
  {loading&&<p role="status">Đang lấy nội dung case…</p>}
  {error&&<p role="alert" className="wi-error">{error}</p>}
  {authorized&&rowId&&!source&&!loading&&<button type="button" className="wi-btn" onClick={()=>setSourceReload(value=>value+1)}>Tải lại nội dung case</button>}
  {!authorized&&<p role="alert">Quyền tạo Issue đã thay đổi. Nội dung đang soạn được giữ lại; hãy kiểm tra quyền trước khi gửi tiếp.</p>}
  <fieldset disabled={!authorized||busy||loading||!!rowId&&!source}>
   <label className="wi-field">Loại Issue<select value={monkey?'BUG':draft.type} disabled={monkey} onChange={e=>change('type',e.target.value)}><option value="BUG">Bug</option><option value="QA">QA</option></select></label>
   <label className="wi-field">Tiêu đề<input required maxLength={300} value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
   <label className="wi-field">{draft.type==='QA'?'Nội dung câu hỏi':'Mô tả'}<textarea required={draft.type==='QA'} maxLength={20000} rows={3} value={draft.description} onChange={e=>change('description',e.target.value)}/></label>
   <label className="wi-field">Các bước thực hiện<textarea required={draft.type==='BUG'} maxLength={20000} rows={4} value={draft.steps} onChange={e=>change('steps',e.target.value)}/></label>
   <label className="wi-field">Kết quả mong đợi<textarea required={draft.type==='BUG'} maxLength={20000} rows={3} value={draft.expectedResult} onChange={e=>change('expectedResult',e.target.value)}/></label>
   {draft.type==='BUG'&&<label className="wi-field">Kết quả thực tế<textarea required maxLength={20000} rows={3} value={draft.actualResult} onChange={e=>change('actualResult',e.target.value)}/></label>}
   <div className="wi-actions"><button type="submit" className="wi-btn wi-btn-primary">{busy?'Đang lưu…':'Lưu Issue'}</button>{onCancel&&<button type="button" className="wi-btn" onClick={requestClose||onCancel}>Hủy</button>}</div>
  </fieldset>
 </form>;
}
