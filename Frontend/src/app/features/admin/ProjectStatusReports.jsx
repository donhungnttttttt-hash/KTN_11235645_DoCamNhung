import React,{useCallback,useState} from 'react';
import {adminApi} from '../../services/api/admin';
import {useAdminRead,ReadState} from './shared';
import {useAuth} from '../auth/AuthProvider';
import {useProject} from '../projects/ProjectProvider';
import './status-reports.css';

export function ProjectStatusReports(props) {
 const auth=useAuth(),project=useProject()?.currentProject;
 const allowed=auth?.hasRole?.('ADMIN')||!props.admin&&String(project?.id)===String(props.projectId)&&project?.projectRole==='PM'&&!auth?.hasRole?.('DEV');
 if(!allowed)return <p role="alert">Báo cáo quản lý dành cho PM của dự án và ADMIN.</p>;
 return <Reports key={`${props.projectId}:${!!props.admin}`} {...props}/>;
}
function Reports({projectId,admin=false,api=adminApi}) {
 const [page,setPage]=useState(0);
 const load=useCallback(signal=>api.statusReports(projectId,{page,size:20},admin,{signal}),[api,projectId,page,admin]);
 const state=useAdminRead(`status-reports:${projectId}:${admin}:${page}`,load);
 const data=state.data,overdue=data?.milestones.filter(m=>m.deadlineStatus==='OVERDUE')||[];
 return <section className="status-reports admin-card ex-panel"><h2>Lịch sử báo cáo tiến độ của PM</h2>
  <p>Báo cáo cũ được giữ nguyên để tra cứu. Tạo và sửa báo cáo văn bản tại Tổng hợp &amp; Phân tích.</p>
  <p><a href={`#/analysis?projectId=${encodeURIComponent(projectId)}`}>Mở Tổng hợp &amp; Phân tích</a></p>
  <ReadState {...state}/>{data&&<>
   <div aria-label="Cảnh báo hạn thực tế">{overdue.length?<ul>{overdue.map(m=><li key={m.id}>Quá hạn: {m.name} · {m.dueOn}</li>)}</ul>:<p>Không có cảnh báo quá hạn. Điều này chưa khẳng định dự án đúng tiến độ.</p>}
    {data.milestones.some(m=>m.deadlineStatus==='INSUFFICIENT_DATA')&&<p>Có mốc chưa đủ dữ liệu về hạn hoặc phạm vi.</p>}</div>
   <h3>{page===0?'Báo cáo mới nhất và lịch sử':'Lịch sử báo cáo'} ({data.reports.totalElements})</h3>
   {!data.reports.items.length&&<p>Chưa có báo cáo PM.</p>}
   {data.reports.items.map((r,i)=><article className="status-report-entry" key={r.id}><h4>{page===0&&i===0?'Mới nhất · ':''}{r.authorName}</h4><time dateTime={r.createdAt} title={r.createdAt}>{new Date(r.createdAt).toLocaleString('vi-VN')}</time><p>{r.summary}</p>{r.delayReason&&<p><strong>Nguyên nhân: </strong>{r.delayReason}</p>}{r.recoveryPlan&&<p><strong>Kế hoạch xử lý: </strong>{r.recoveryPlan}</p>}{r.expectedFinishOn&&<p>Dự kiến hoàn thành: {r.expectedFinishOn}</p>}</article>)}
   <div className="admin-pagination"><button disabled={!page} onClick={()=>setPage(page-1)}>Báo cáo trước</button><button disabled={(page+1)*20>=data.reports.totalElements} onClick={()=>setPage(page+1)}>Báo cáo tiếp</button></div>
  </>}
 </section>;
}
