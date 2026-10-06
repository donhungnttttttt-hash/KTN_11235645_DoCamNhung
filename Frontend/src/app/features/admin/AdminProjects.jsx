import React, { useCallback, useState } from 'react';
import { AdminProjectForm } from './AdminProjectForm';
import { adminApi } from '../../services/api/admin';
import { useAdminRead, ReadState, ProjectTable, percent } from './shared';

export function AdminProjects({projectId,api=adminApi}) {
  const [creating,setCreating]=useState(false);
  const [keyword,setKeyword]=useState('');const [page,setPage]=useState(0);
  const load=useCallback(signal=>api.projects({projectId,keyword,page,size:20},{signal}),[api,projectId,keyword,page]);
  const state=useAdminRead(`projects:${projectId}:${keyword}:${page}`,load);
  return <><div className="admin-page-heading"><h1>Dự án</h1><button onClick={()=>setCreating(true)}>Tạo dự án mới</button></div>{creating&&<AdminProjectForm api={api} onCancel={()=>setCreating(false)} onSaved={p=>{setCreating(false);window.location.hash=`/admin/projects/${p.id}`;state.retry();}}/>}<form onSubmit={e=>e.preventDefault()}><label htmlFor="admin-search">Tìm mã hoặc tên dự án</label><input id="admin-search" type="search" maxLength={100} value={keyword} onChange={e=>{setKeyword(e.target.value);setPage(0);}}/></form>
    <ReadState {...state}/>{state.data && <section className="admin-card"><p>{state.data.totalElements} dự án · Trang {page+1}</p>{state.data.items.length ? <ProjectTable items={state.data.items} scope={projectId ? `?projectId=${projectId}` : ''}/> : <p>Không có dự án phù hợp.</p>}<div className="admin-pagination"><button disabled={!page} onClick={()=>setPage(page-1)}>Trang trước</button><button disabled={(page+1)*20>=state.data.totalElements} onClick={()=>setPage(page+1)}>Trang sau</button></div></section>}
  </>;
}
export function AdminProjectDetail({id,api=adminApi}) {
  const load=useCallback(signal=>api.project(id,{signal}),[api,id]);const state=useAdminRead(`project:${id}`,load);
  if (!state.data) return <ReadState {...state}/>;
  const p=state.data;
  return <><div className="admin-page-heading"><h1>{p.code} · {p.name}</h1><button onClick={state.retry}>Tải lại</button></div><section className="admin-card"><p>{p.description || 'Chưa có mô tả.'}</p><p>Múi giờ: {p.timezone} · {p.archivedAt ? 'Lưu trữ' : 'Hoạt động'}</p><p>PM hoạt động: {p.pmNames || 'Chưa có PM hoạt động'}</p><p>{p.activeMembers} thành viên hoạt động · {p.openBugs} bug chưa kết thúc · {p.awaitingVerification} chờ xác minh</p><p>Đã thực thi: {percent(p.metrics.executionPercent)} · Đạt: {percent(p.metrics.passPercent)}</p><p>OK {p.metrics.ok} · NG {p.metrics.ng} · P {p.metrics.pending} · Chưa chạy {p.metrics.notRun} · NA {p.metrics.na}</p><p><a href={`#/admin/devices?projectId=${p.id}`}>{p.heldDevices??0} máy vật lý đang giữ</a></p></section><section className="admin-card"><h2>Mốc & tiến độ</h2>{p.milestones.length ? <div className="admin-table-scroll" tabIndex={0}><table><thead><tr><th>Mốc</th><th>Hạn</th><th>Cảnh báo</th></tr></thead><tbody>{p.milestones.map(m=><tr key={m.id}><th>{m.name}</th><td>{m.dueOn || 'Chưa có hạn'}</td><td>{m.deadlineStatus==='OVERDUE' ? 'Quá hạn' : m.deadlineStatus==='INSUFFICIENT_DATA' ? 'Chưa đủ dữ liệu' : 'Không có cảnh báo quá hạn'}</td></tr>)}</tbody></table></div> : <p>Chưa có mốc. Chưa đủ dữ liệu để đánh giá hạn.</p>}</section>
    <section className="admin-card"><h2>Bug đã xử lý, chờ xác minh ({p.awaitingVerification})</h2>{p.verificationBugs?.length ? <ul>{p.verificationBugs.map(b=><li key={b.id}><strong>{b.itemKey}</strong> · {b.title}</li>)}</ul> : <p>Không có bug chờ xác minh.</p>}<p>Hiển thị tối đa 20 bug đầu tiên. Chỉ đọc; xác minh tiếp tục theo quyền dự án hiện có.</p></section>
  </>;
}
