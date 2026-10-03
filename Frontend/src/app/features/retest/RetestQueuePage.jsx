import React, { useEffect, useState } from 'react';
import { useProject } from '../projects/ProjectProvider';
import { retestApi } from '../../services/api/retest';
import { Pager, ErrorNotice } from '../test-execution/components';
import { RetestResult } from './RetestResult';
import { scopeLabel, requestLabels } from './shared';
import '../test-execution/execution.css';
import '../work-items/work-items-live.css';
import './retest.css';
export function RetestQueuePage({navigate}) {
  const {currentProject}=useProject()||{};
  return <Queue key={currentProject?.id||'none'} project={currentProject} navigate={navigate}/>;
}
function Queue({project,navigate}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[page,setPage]=useState(0),[mine,setMine]=useState(true),[status,setStatus]=useState('OPEN'),[reload,setReload]=useState(0),[active,setActive]=useState(null);
  useEffect(()=>{if(!project)return;let current=true;setData(null);setError('');
    retestApi.queue(project.id,page,mine,status).then(result=>{if(current)setData(result);}).catch(e=>{if(current)setError(e.message);});return()=>{current=false;};
  },[project?.id,page,mine,status,reload]);
  return <div className="cat-container ex-page py-3"><div className="ex-heading"><h2>Kiểm thử lại {project&&`· ${project.name}`}</h2></div>
    <p className="ex-help">Các yêu cầu xác minh bug trên build đã sửa. PM chuẩn bị phạm vi và phân công trong chi tiết bug.</p>
    {!project?<p>Chọn dự án để xem hàng chờ kiểm thử lại.</p>:<><div className="wi-actions"><label><input type="checkbox" checked={mine} onChange={e=>{setMine(e.target.checked);setPage(0);}}/> Được phân công cho tôi</label><label>Trạng thái <select className="cat-select" value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="">Tất cả</option>{Object.entries(requestLabels).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label><button className="cat-btn" onClick={()=>setReload(n=>n+1)}>Tải lại</button></div>
      <ErrorNotice error={error} retry={()=>setReload(n=>n+1)}/>{!data&&!error&&<p>Đang tải yêu cầu…</p>}
      {data&&<><div className="ex-table-wrap"><table className="ex-table"><thead><tr><th>Bug</th><th>Phạm vi</th><th>Build / cấu hình</th><th>Người thực hiện</th><th>Trạng thái</th></tr></thead><tbody>{data.items.map(q=><tr key={q.id}><td><button className="ex-link" onClick={()=>setActive(q.id)}>{q.bugKey} · Yêu cầu #{q.id}</button><small className="rt-subtitle">{q.bugTitle}</small></td><td>{scopeLabel(q.verificationScope)}</td><td>{q.buildLabel}<small className="rt-subtitle">{q.environmentName} / {q.deviceName}</small></td><td>{q.assigneeName}</td><td>{requestLabels[q.status]}</td></tr>)}{!data.items.length&&<tr><td colSpan={5}>Chưa có yêu cầu phù hợp bộ lọc.</td></tr>}</tbody></table></div><Pager data={data} onChange={setPage}/></>}
      {active&&<RetestResult key={active} projectId={project.id} requestId={active} writable={!project.archived} onSaved={()=>setReload(n=>n+1)} onClose={()=>setActive(null)}/>}</>}
  </div>;
}
