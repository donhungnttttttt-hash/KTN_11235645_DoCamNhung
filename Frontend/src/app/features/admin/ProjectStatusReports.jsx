import React,{useCallback,useEffect,useRef,useState} from 'react';
import {adminApi} from '../../services/api/admin';
import {useAdminRead,ReadState} from './shared';
import './status-reports.css';

export function ProjectStatusReports(props) {
 return <Reports key={`${props.projectId}:${!!props.admin}`} {...props}/>;
}
function Reports({projectId,admin=false,api=adminApi}) {
 const [page,setPage]=useState(0),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const empty={summary:'',delayReason:'',recoveryPlan:'',expectedFinishOn:''};
 const [draft,setDraft]=useState(empty);const request=useRef(null),live=useRef(true),sending=useRef(false);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const load=useCallback(signal=>api.statusReports(projectId,{page,size:20},admin,{signal}),[api,projectId,page,admin]);
 const state=useAdminRead(`status-reports:${projectId}:${admin}:${page}:${revision}`,load);
 const data=state.data,overdue=data?.milestones.filter(m=>m.deadlineStatus==='OVERDUE')||[];
 async function submit(event) {
  event.preventDefault();if(sending.current)return;sending.current=true;setBusy(true);setError('');setSuccess('');
  const body={...draft,expectedFinishOn:draft.expectedFinishOn||null};const serialized=JSON.stringify(body);
  if(request.current?.payload!==serialized)request.current={payload:serialized,key:crypto.randomUUID()};
  try {
   await api.createStatusReport(projectId,{...body,requestKey:request.current.key});
   if(!live.current)return;
   setDraft(empty);request.current=null;setPage(0);setRevision(n=>n+1);setSuccess('Đã ghi báo cáo. Cảnh báo tự động tiếp tục dựa trên mốc và công việc thực tế.');
  }catch(e){if(live.current)setError(e.message);}
  finally {sending.current=false;if(live.current)setBusy(false);}
 }
 const update=(key,value)=>setDraft(old=>({...old,[key]:value}));
 return <section className="status-reports admin-card ex-panel"><h2>Báo cáo tiến độ của PM</h2>
  <p>Báo cáo được giữ nguyên trong lịch sử; đính chính bằng báo cáo mới. Không thay hạn mốc hoặc kết quả kiểm thử.</p>
  <ReadState {...state}/>{data&&<>
   <div aria-label="Cảnh báo hạn thực tế">{overdue.length?<ul>{overdue.map(m=><li key={m.id}>Quá hạn: {m.name} · {m.dueOn}</li>)}</ul>:<p>Không có cảnh báo quá hạn. Điều này chưa khẳng định dự án đúng tiến độ.</p>}
    {data.milestones.some(m=>m.deadlineStatus==='INSUFFICIENT_DATA')&&<p>Có mốc chưa đủ dữ liệu về hạn hoặc phạm vi.</p>}</div>
   {!admin&&data.canPost&&<form onSubmit={submit}><fieldset disabled={busy}>
    <label>Nội dung cập nhật<textarea required maxLength={4000} value={draft.summary} onChange={e=>update('summary',e.target.value)}/></label>
    <label>Nguyên nhân / khó khăn<textarea required={overdue.length>0} maxLength={4000} value={draft.delayReason} onChange={e=>update('delayReason',e.target.value)}/></label>
    <label>Kế hoạch xử lý<textarea required={overdue.length>0} maxLength={4000} value={draft.recoveryPlan} onChange={e=>update('recoveryPlan',e.target.value)}/></label>
    <label>Dự kiến hoàn thành<input type="date" value={draft.expectedFinishOn} onChange={e=>update('expectedFinishOn',e.target.value)}/></label>
    {overdue.length>0&&<p>Có mốc quá hạn: bắt buộc nguyên nhân và kế hoạch xử lý.</p>}
    <button type="submit">{busy?'Đang gửi…':'Gửi báo cáo'}</button>
   </fieldset></form>}
   {error&&<p role="alert">{error} <button type="button" onClick={state.retry}>Tải cảnh báo hiện hành</button></p>}{success&&<p role="status">{success}</p>}
   <h3>{page===0?'Báo cáo mới nhất và lịch sử':'Lịch sử báo cáo'} ({data.reports.totalElements})</h3>
   {!data.reports.items.length&&<p>Chưa có báo cáo PM.</p>}
   {data.reports.items.map((r,i)=><article className="status-report-entry" key={r.id}><h4>{page===0&&i===0?'Mới nhất · ':''}{r.authorName}</h4><time dateTime={r.createdAt} title={r.createdAt}>{new Date(r.createdAt).toLocaleString('vi-VN')}</time><p>{r.summary}</p>{r.delayReason&&<p><strong>Nguyên nhân: </strong>{r.delayReason}</p>}{r.recoveryPlan&&<p><strong>Kế hoạch xử lý: </strong>{r.recoveryPlan}</p>}{r.expectedFinishOn&&<p>Dự kiến hoàn thành: {r.expectedFinishOn}</p>}</article>)}
   <div className="admin-pagination"><button disabled={!page} onClick={()=>setPage(page-1)}>Báo cáo trước</button><button disabled={(page+1)*20>=data.reports.totalElements} onClick={()=>setPage(page+1)}>Báo cáo tiếp</button></div>
  </>}
 </section>;
}
