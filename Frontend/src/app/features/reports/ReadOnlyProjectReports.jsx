import React,{useEffect,useRef,useState} from 'react';
import {managementReportsApi} from '../../services/api/managementReports';
import {SafeMarkdown} from './SafeMarkdown';
import {ProgressSummary} from './ProgressSummary';
import './management-analysis.css';

export function ReadOnlyProjectReports({projectId,api=managementReportsApi}) {
 return <Reports key={projectId} projectId={projectId} api={api}/>;
}
function Reports({projectId,api}) {
 const [page,setPage]=useState(0),[revision,setRevision]=useState(0);
 const [data,setData]=useState(null),[saved,setSaved]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lifetime=useRef(null),request=useRef(0);
 useEffect(()=>{const controller=new AbortController();lifetime.current=controller;return()=>controller.abort();},[]);
 useEffect(()=>{
  const controller=new AbortController();request.current++;setData(null);setSaved(null);setError('');setBusy(false);
  Promise.all([api.summary(projectId,{}, {signal:controller.signal}),api.list(projectId,{page,size:20},{signal:controller.signal})])
   .then(([summary,reports])=>{if(!controller.signal.aborted)setData({summary,reports});})
   .catch(failure=>{if(!controller.signal.aborted)setError(failure.message);});
  return()=>controller.abort();
 },[projectId,api,page,revision]);
 async function open(id){
  const generation=++request.current,signal=lifetime.current.signal;setBusy(true);setSaved(null);setError('');
  try{const report=await api.get(projectId,id,{signal});if(!signal.aborted&&generation===request.current)setSaved(report);}
  catch(failure){if(!signal.aborted&&generation===request.current){setError(failure.message);if([401,403,404].includes(failure.status))setData(null);}}
  finally{if(!signal.aborted&&generation===request.current)setBusy(false);}
 }
 async function download(){
  if(busy||!saved)return;const signal=lifetime.current.signal,generation=++request.current;setBusy(true);setError('');
  try{const response=await api.download(projectId,saved.id,{signal});const blob=await response.blob();if(signal.aborted||generation!==request.current)return;
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`bao-cao-${saved.id}.md`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(failure){if(!signal.aborted&&generation===request.current){setError(failure.message);if([401,403,404].includes(failure.status)){setSaved(null);setData(null);}}}
  finally{if(!signal.aborted&&generation===request.current)setBusy(false);}
 }
 return <section className="management-analysis">
  <div className="management-heading"><h2>Báo cáo dự án</h2><button className="cat-btn" onClick={()=>setRevision(value=>value+1)}>Tải lại</button></div>
  {error&&<p role="alert">{error}</p>}{!data&&!error&&<p role="status">Đang tải báo cáo…</p>}
  {data&&<><section className="management-summary"><ProgressSummary metrics={data.summary.metrics} asOf={data.summary.asOf}/></section>
  <section className="management-report-workspace"><h2>Báo cáo đã lưu</h2>
  {!data.reports.items.length&&<p>Chưa có báo cáo đã lưu.</p>}
  <ul>{data.reports.items.map(item=><li key={item.id}><button className="cat-btn" disabled={busy} aria-label={`Mở báo cáo ${item.title}`} onClick={()=>open(item.id)}>{item.title}</button></li>)}</ul>
  <div className="admin-pagination"><button disabled={!page||busy} onClick={()=>setPage(page-1)}>Trang trước</button><span>Trang {page+1} / {Math.max(1,data.reports.totalPages||1)}</span><button disabled={page+1>=(data.reports.totalPages||1)||busy} onClick={()=>setPage(page+1)}>Trang sau</button></div>
  {busy&&<p role="status">Đang tải nội dung…</p>}{saved&&<article><div className="management-heading"><h3>{saved.title}</h3><button className="cat-btn" disabled={busy} onClick={download}>Tải báo cáo</button></div><SafeMarkdown markdown={saved.markdown}/></article>}
  </section></>}
 </section>;
}
